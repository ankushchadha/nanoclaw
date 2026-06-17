import fs from 'fs';
import os from 'os';
import path from 'path';

import { query as sdkQuery, type HookCallback, type PreCompactHookInput } from '@anthropic-ai/claude-agent-sdk';

/** Agentic-loop cap (circuit-breaker). Generous enough for real multi-doc
 *  research, low enough to stop a runaway well before the 30-min ceiling. */
const MAX_TURNS = Math.max(1, parseInt(process.env.NANOCLAW_MAX_TURNS || '150', 10) || 150);

import { clearContainerToolInFlight, setContainerToolInFlight } from '../db/connection.js';
import { findBlockedDomain, findDisallowedUrl, isPdftoppmRender, pdftoppmFullPageDpiViolation } from '../policy.js';
import { registerProvider } from './provider-registry.js';
import type { AgentProvider, AgentQuery, McpServerConfig, ProviderEvent, ProviderOptions, QueryInput } from './types.js';

function log(msg: string): void {
  console.error(`${new Date().toISOString()} [claude-provider] ${msg}`);
}

// Deferred SDK builtins that either sidestep nanoclaw's own scheduling or
// don't fit our async message-passing model (they're designed for Claude
// Code's interactive UI and would hang here).
//
// - CronCreate / CronDelete / CronList / ScheduleWakeup: we have durable
//   scheduling via mcp__nanoclaw__schedule_task.
// - AskUserQuestion: SDK returns a placeholder instead of blocking on a
//   real answer — we have mcp__nanoclaw__ask_user_question that persists
//   the question and blocks on the real reply.
// - EnterPlanMode / ExitPlanMode / EnterWorktree / ExitWorktree: Claude
//   Code UI affordances; in a headless container they'd appear stuck.
const SDK_DISALLOWED_TOOLS = [
  'CronCreate',
  'CronDelete',
  'CronList',
  'ScheduleWakeup',
  'AskUserQuestion',
  'EnterPlanMode',
  'ExitPlanMode',
  'EnterWorktree',
  'ExitWorktree',
];

// Tool allowlist for NanoClaw agent containers. MCP-tool entries are derived
// at the call site from the registered `mcpServers` map so that any server
// added via `add_mcp_server` (or wired in container.json directly) is
// reachable to the agent — without this, the SDK's allowedTools filter
// silently drops every MCP namespace not listed here.
const TOOL_ALLOWLIST = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'WebSearch',
  'WebFetch',
  'Task',
  'TaskOutput',
  'TaskStop',
  'TeamCreate',
  'TeamDelete',
  'SendMessage',
  'TodoWrite',
  'ToolSearch',
  'Skill',
  'NotebookEdit',
];

// MCP server names are sanitized by the SDK when forming tool prefixes:
// any character outside [A-Za-z0-9_-] becomes '_'. Mirror that here so our
// allowlist patterns match what the SDK actually exposes.
function mcpAllowPattern(serverName: string): string {
  return `mcp__${serverName.replace(/[^a-zA-Z0-9_-]/g, '_')}__*`;
}

interface SDKUserMessage {
  type: 'user';
  message: { role: 'user'; content: string };
  parent_tool_use_id: null;
  session_id: string;
}

/**
 * Push-based async iterable for streaming user messages to the Claude SDK.
 */
class MessageStream {
  private queue: SDKUserMessage[] = [];
  private waiting: (() => void) | null = null;
  private done = false;

  push(text: string): void {
    this.queue.push({
      type: 'user',
      message: { role: 'user', content: text },
      parent_tool_use_id: null,
      session_id: '',
    });
    this.waiting?.();
  }

  end(): void {
    this.done = true;
    this.waiting?.();
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<SDKUserMessage> {
    while (true) {
      while (this.queue.length > 0) {
        yield this.queue.shift()!;
      }
      if (this.done) return;
      await new Promise<void>((r) => {
        this.waiting = r;
      });
      this.waiting = null;
    }
  }
}

// ── Transcript archiving (PreCompact hook) ──

interface ParsedMessage {
  role: 'user' | 'assistant';
  content: string;
}

function parseTranscript(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'user' && entry.message?.content) {
        const text = typeof entry.message.content === 'string' ? entry.message.content : entry.message.content.map((c: { text?: string }) => c.text || '').join('');
        if (text) messages.push({ role: 'user', content: text });
      } else if (entry.type === 'assistant' && entry.message?.content) {
        const textParts = entry.message.content.filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text);
        const text = textParts.join('');
        if (text) messages.push({ role: 'assistant', content: text });
      }
    } catch {
      /* skip unparseable lines */
    }
  }
  return messages;
}

function formatTranscriptMarkdown(messages: ParsedMessage[], title?: string | null, assistantName?: string): string {
  const now = new Date();
  const dateStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  const lines = [`# ${title || 'Conversation'}`, '', `Archived: ${dateStr}`, '', '---', ''];
  for (const msg of messages) {
    const sender = msg.role === 'user' ? 'User' : assistantName || 'Assistant';
    const content = msg.content.length > 2000 ? msg.content.slice(0, 2000) + '...' : msg.content;
    lines.push(`**${sender}**: ${content}`, '');
  }
  return lines.join('\n');
}

/**
 * PreToolUse hook factory: record the current tool + its declared timeout so
 * the host sweep can widen its stuck tolerance while Bash runs a long script.
 * Defense-in-depth: block SDK_DISALLOWED_TOOLS here too. And — when the group
 * declares `blockedDomains` — HARD-deny any Bash command or WebFetch URL that
 * references one (known dead-end / out-of-lane sources), independent of and
 * un-overridable by soft instructions or accumulated session history.
 */
function createPreToolUseHook(
  blockedDomains: string[] = [],
  maxFullPageRenderDpi: number | null = null,
  maxRendersPerRun: number | null = null,
  maxIdenticalCommands: number | null = null,
  allowedDomains: string[] = [],
): HookCallback {
  // Per-run counters — this closure is created once per query() (one run), so
  // they reset each request. renderCount bounds pdftoppm renders; cmdCounts is
  // the loop-breaker (exact-identical Bash command repeated past the cap).
  let renderCount = 0;
  const cmdCounts = new Map<string, number>();
  return async (input) => {
    const i = input as { tool_name?: string; tool_input?: Record<string, unknown> };
    const toolName = i.tool_name ?? '';
    if (SDK_DISALLOWED_TOOLS.includes(toolName)) {
      return {
        decision: 'block',
        stopReason: `Tool '${toolName}' is not available in this environment — use the nanoclaw equivalent.`,
      } as unknown as ReturnType<HookCallback>;
    }
    // Hard per-run render-COUNT cap. Soft "fetch one map / a few renders" rules
    // leaked (201 Latera rendered ~50 sheets across 6 undisambiguated maps).
    // Once the budget is spent, deny further renders and steer to deliver.
    if (maxRendersPerRun && toolName === 'Bash' && isPdftoppmRender(String(i.tool_input?.command ?? ''))) {
      renderCount += 1;
      if (renderCount > maxRendersPerRun) {
        log(`PreToolUse: blocked pdftoppm render #${renderCount} (cap ${maxRendersPerRun}/run)`);
        return {
          decision: 'block',
          stopReason: `Blocked: render budget exhausted (${maxRendersPerRun} pdftoppm renders/run). You are map-hunting — likely rendering multiple candidate maps you couldn't disambiguate. STOP. Commit to the ONE recorded map whose Book/Page matches the tax-bill legal description (do not render more candidates), and if you cannot resolve it, record "recorded map: book/page unresolved" as an OPEN ITEM. Then write dossier.md and call deliver_dossier with the data you already have.`,
        } as unknown as ReturnType<HookCallback>;
      }
    }
    // Hard full-page render-DPI cap. Soft "render at 150" prompts kept leaking
    // to 300-DPI full pages (the dominant latency+token sink); enforce it. A
    // crop (poppler -x/-W) is always allowed — that's the sanctioned high-DPI path.
    if (maxFullPageRenderDpi && toolName === 'Bash') {
      const cmd = String(i.tool_input?.command ?? '');
      const dpi = pdftoppmFullPageDpiViolation(cmd, maxFullPageRenderDpi);
      if (dpi !== null) {
        log(`PreToolUse: blocked pdftoppm full-page render at ${dpi} DPI (cap ${maxFullPageRenderDpi})`);
        return {
          decision: 'block',
          stopReason: `Blocked: full-page \`pdftoppm -r ${dpi}\` exceeds the ${maxFullPageRenderDpi}-DPI full-page cap. Render the full page at ≤${maxFullPageRenderDpi}; to read fine detail, re-render a CROP at higher DPI with poppler crop flags (-x -y -W -H). Do not up-res the whole page — and don't page-hunt the map (use the index sheet; see locate-lot-on-map.md).`,
        } as unknown as ReturnType<HookCallback>;
      }
    }
    // Hard loop-breaker: the EXACT same Bash command repeated past the cap is a
    // grind (re-running an identical portal sub-flow chasing data that isn't
    // there). Block it and steer to flag-the-subgoal-open + deliver. Exact-match
    // so legit varied steps don't trip; only a literal repeat counts.
    if (maxIdenticalCommands && toolName === 'Bash') {
      const cmd = String(i.tool_input?.command ?? '').trim();
      if (cmd) {
        const n = (cmdCounts.get(cmd) ?? 0) + 1;
        cmdCounts.set(cmd, n);
        if (n > maxIdenticalCommands) {
          log(`PreToolUse: blocked identical command #${n} (cap ${maxIdenticalCommands}/run): ${cmd.slice(0, 80)}`);
          return {
            decision: 'block',
            stopReason: `Blocked: you've run this exact command ${maxIdenticalCommands}+ times — it is not yielding new data (a loop). STOP re-running it. Record whatever this sub-goal was after as an OPEN ITEM with a where-to-look pointer, then move on / deliver with the data you already have. Do NOT keep retrying the same step.`,
          } as unknown as ReturnType<HookCallback>;
        }
      }
    }
    // Hard domain deny. agent-browser rides through Bash; direct fetches use
    // Bash (curl) or WebFetch. Check both command and url fields.
    if (blockedDomains.length > 0) {
      const probe =
        toolName === 'Bash'
          ? String(i.tool_input?.command ?? '')
          : toolName === 'WebFetch'
            ? String(i.tool_input?.url ?? '')
            : '';
      const hit = findBlockedDomain(probe, blockedDomains);
      if (hit) {
        log(`PreToolUse: blocked '${toolName}' — references denied domain '${hit}'`);
        return {
          decision: 'block',
          stopReason: `Blocked: '${hit}' is a known dead-end / out-of-lane source for this agent. Do NOT navigate there. Follow your authoritative-source recipe instead; if you cannot retrieve the data from an approved source, STOP and ask the requester rather than improvising.`,
        } as unknown as ReturnType<HookCallback>;
      }
    }
    // Hard ALLOW-LIST egress. When the group declares allowedDomains, any http(s)
    // URL outside that set (in a WebFetch url or a Bash curl/wget command) is
    // denied — lane-keeping to a small vetted source set. Plain Bash with no URL
    // passes (no URL extracted → no match). Deny-list above takes precedence.
    if (allowedDomains.length > 0) {
      const probe =
        toolName === 'Bash'
          ? String(i.tool_input?.command ?? '')
          : toolName === 'WebFetch'
            ? String(i.tool_input?.url ?? '')
            : '';
      const bad = findDisallowedUrl(probe, allowedDomains);
      if (bad) {
        log(`PreToolUse: blocked '${toolName}' — host '${bad}' not in allowlist`);
        return {
          decision: 'block',
          stopReason: `Blocked: '${bad}' is not in this agent's allowed-source list. You may only fetch from: ${allowedDomains.join(', ')}. Answer from your local knowledge base first; if a fact is not covered there or on an allowed source, DEFER — tell the operator you don't have it and ask, rather than fetching an unapproved page.`,
        } as unknown as ReturnType<HookCallback>;
      }
    }
    // Bash exposes its timeout via the tool_input.timeout field (ms). Any other
    // tool: no declared timeout.
    const declaredTimeoutMs =
      toolName === 'Bash' && typeof i.tool_input?.timeout === 'number' ? (i.tool_input.timeout as number) : null;
    try {
      setContainerToolInFlight(toolName, declaredTimeoutMs);
    } catch (err) {
      log(`PreToolUse: failed to record container_state: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { continue: true };
  };
}

/** Clear in-flight tool on PostToolUse / PostToolUseFailure. */
/**
 * Sentinel written by the deliver_dossier MCP tool ONLY on a verified-success
 * delivery (real %PDF attached + single DONE emitted). Its presence in the
 * PostToolUse hook is the un-spoofable "task is truly done" signal used to
 * hard-end the turn — closing the post-DONE rambling leak ("standing by",
 * redundant re-summary) that the soft "END YOUR TURN" rule never bound.
 */
const DELIVERED_SENTINEL = '/workspace/outbox/.dossier-delivered';

const postToolUseHook: HookCallback = async (input) => {
  try {
    clearContainerToolInFlight();
  } catch (err) {
    log(`PostToolUse: failed to clear container_state: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Hard end-of-turn after a SUCCESSFUL deliver_dossier. A FAILED delivery
  // writes no sentinel → no stop → the agent can fix + retry.
  try {
    const toolName = (input as { tool_name?: string })?.tool_name ?? '';
    if (toolName.includes('deliver_dossier') && fs.existsSync(DELIVERED_SENTINEL)) {
      fs.unlinkSync(DELIVERED_SENTINEL);
      log('PostToolUse: deliver_dossier succeeded — ending turn (continue:false)');
      return {
        continue: false,
        stopReason: 'Dossier delivered via deliver_dossier — turn complete; no further messages.',
      } as unknown as ReturnType<HookCallback>;
    }
  } catch (err) {
    log(`PostToolUse: delivery-stop check failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  return { continue: true };
};

/**
 * Read a Claude transcript .jsonl, render a markdown summary, and drop it into
 * the agent's `conversations/` folder so context survives a compaction or a
 * session rotation. Best-effort: returns false (and logs) on any failure.
 */
function archiveTranscriptFile(transcriptPath: string | undefined, sessionId: string | undefined, assistantName?: string): boolean {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    log('No transcript found for archiving');
    return false;
  }

  try {
    const content = fs.readFileSync(transcriptPath, 'utf-8');
    const messages = parseTranscript(content);
    if (messages.length === 0) return false;

    // Try to get summary from sessions index
    let summary: string | undefined;
    const indexPath = path.join(path.dirname(transcriptPath), 'sessions-index.json');
    if (fs.existsSync(indexPath)) {
      try {
        const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        summary = index.entries?.find((e: { sessionId: string; summary?: string }) => e.sessionId === sessionId)?.summary;
      } catch {
        /* ignore */
      }
    }

    const name = summary
      ? summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
      : `conversation-${new Date().getHours().toString().padStart(2, '0')}${new Date().getMinutes().toString().padStart(2, '0')}`;

    const conversationsDir = process.env.NANOCLAW_CONVERSATIONS_DIR || '/workspace/agent/conversations';
    fs.mkdirSync(conversationsDir, { recursive: true });
    const filename = `${new Date().toISOString().split('T')[0]}-${name}.md`;
    fs.writeFileSync(path.join(conversationsDir, filename), formatTranscriptMarkdown(messages, summary, assistantName));
    log(`Archived conversation to ${filename}`);
    return true;
  } catch (err) {
    log(`Failed to archive transcript: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

function createPreCompactHook(assistantName?: string): HookCallback {
  return async (input) => {
    const preCompact = input as PreCompactHookInput;
    archiveTranscriptFile(preCompact.transcript_path, preCompact.session_id, assistantName);
    return {};
  };
}

// ── Continuation rotation (cold-resume guard) ──

/**
 * Resume cost is dominated by transcript size. Past this many bytes a fresh
 * cold container can't reload the .jsonl before the host's 30-min idle ceiling
 * fires, so the session is dropped and started clean. Operator-overridable.
 */
function transcriptRotateBytes(): number {
  return Number(process.env.CLAUDE_TRANSCRIPT_ROTATE_BYTES) || 12 * 1024 * 1024;
}

/**
 * Secondary age trigger, measured from the transcript's first entry. 0 (or a
 * non-positive value) disables the age check; size alone then governs.
 */
function transcriptRotateAgeMs(): number {
  const raw = process.env.CLAUDE_TRANSCRIPT_ROTATE_AGE_DAYS;
  if (raw === undefined || raw.trim() === '') return 14 * 86_400_000;
  const days = Number(raw);
  if (!Number.isFinite(days)) return 14 * 86_400_000;
  // Explicit non-positive override disables the age check; size alone governs.
  return days > 0 ? days * 86_400_000 : Infinity;
}

function claudeProjectsDir(): string {
  const base = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || os.homedir(), '.claude');
  return path.join(base, 'projects');
}

/**
 * Locate the .jsonl backing a session id. The SDK names project dirs by a
 * mangled cwd; rather than reproduce that convention we scan project dirs for
 * `<sessionId>.jsonl` (session ids are UUIDs, so this is unambiguous).
 */
function findTranscriptPath(sessionId: string): string | null {
  const projects = claudeProjectsDir();
  let dirs: string[];
  try {
    dirs = fs.readdirSync(projects);
  } catch {
    return null;
  }
  for (const dir of dirs) {
    const candidate = path.join(projects, dir, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Epoch-ms of the first transcript entry, or null if unreadable. */
function transcriptStartMs(transcriptPath: string): number | null {
  try {
    const fd = fs.openSync(transcriptPath, 'r');
    try {
      const buf = Buffer.alloc(4096);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      const firstLine = buf.toString('utf-8', 0, n).split('\n', 1)[0];
      const ts = JSON.parse(firstLine)?.timestamp;
      const ms = ts ? Date.parse(ts) : NaN;
      return Number.isNaN(ms) ? null : ms;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

// ── Provider ──

/**
 * Claude Code auto-compacts context at this window (tokens). Kept here so
 * the generic bootstrap doesn't need to know about Claude-specific env vars.
 *
 * Operator override: set CLAUDE_CODE_AUTO_COMPACT_WINDOW in the host env to
 * raise or lower the threshold without editing source — useful when running
 * with a 1M-context model variant or when emergency-tuning a deployment.
 */
const CLAUDE_CODE_AUTO_COMPACT_WINDOW = process.env.CLAUDE_CODE_AUTO_COMPACT_WINDOW || '165000';

/**
 * Stale-session detection. Matches Claude Code's error text when a
 * resumed session can't be found — missing transcript .jsonl, unknown
 * session ID, etc.
 */
const STALE_SESSION_RE = /no conversation found|ENOENT.*\.jsonl|session.*not found/i;

export class ClaudeProvider implements AgentProvider {
  readonly supportsNativeSlashCommands = true;

  private assistantName?: string;
  private mcpServers: Record<string, McpServerConfig>;
  private env: Record<string, string | undefined>;
  private additionalDirectories?: string[];
  private model?: string;
  private effort?: string;
  private blockedDomains: string[];
  private allowedDomains: string[];
  private maxFullPageRenderDpi: number | null;
  private maxRendersPerRun: number | null;
  private maxIdenticalCommands: number | null;

  constructor(options: ProviderOptions = {}) {
    this.assistantName = options.assistantName;
    this.mcpServers = options.mcpServers ?? {};
    this.additionalDirectories = options.additionalDirectories;
    this.model = options.model;
    this.effort = options.effort;
    this.blockedDomains = options.blockedDomains ?? [];
    this.allowedDomains = options.allowedDomains ?? [];
    this.maxFullPageRenderDpi = options.maxFullPageRenderDpi ?? null;
    this.maxRendersPerRun = options.maxRendersPerRun ?? null;
    this.maxIdenticalCommands = options.maxIdenticalCommands ?? null;
    this.env = {
      ...(options.env ?? {}),
      CLAUDE_CODE_AUTO_COMPACT_WINDOW,
    };
  }

  isSessionInvalid(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return STALE_SESSION_RE.test(msg);
  }

  maybeRotateContinuation(continuation: string): string | null {
    const transcriptPath = findTranscriptPath(continuation);
    if (!transcriptPath) return null;

    let size: number;
    try {
      size = fs.statSync(transcriptPath).size;
    } catch {
      return null;
    }

    const maxBytes = transcriptRotateBytes();
    const startMs = transcriptStartMs(transcriptPath);
    const ageMs = startMs === null ? 0 : Date.now() - startMs;
    const maxAgeMs = transcriptRotateAgeMs();

    let reason: string | null = null;
    if (size > maxBytes) {
      reason = `transcript ${(size / 1_048_576).toFixed(1)}MB > ${(maxBytes / 1_048_576).toFixed(0)}MB cap`;
    } else if (startMs !== null && ageMs > maxAgeMs) {
      reason = `transcript ${(ageMs / 86_400_000).toFixed(1)}d old > ${(maxAgeMs / 86_400_000).toFixed(0)}d cap`;
    }
    if (!reason) return null;

    // Preserve a readable summary, then move the heavy .jsonl out of the
    // resume path so the SDK starts a fresh session and the disk is reclaimed.
    archiveTranscriptFile(transcriptPath, continuation, this.assistantName);
    try {
      fs.renameSync(transcriptPath, `${transcriptPath}.rotated-${Date.now()}`);
    } catch (err) {
      log(`Failed to move rotated transcript aside: ${err instanceof Error ? err.message : String(err)}`);
    }
    return reason;
  }

  query(input: QueryInput): AgentQuery {
    const stream = new MessageStream();
    stream.push(input.prompt);

    const instructions = input.systemContext?.instructions;

    const sdkResult = sdkQuery({
      prompt: stream,
      options: {
        cwd: input.cwd,
        additionalDirectories: this.additionalDirectories,
        resume: input.continuation,
        pathToClaudeCodeExecutable: '/pnpm/claude',
        systemPrompt: instructions ? { type: 'preset' as const, preset: 'claude_code' as const, append: instructions } : undefined,
        allowedTools: [
          ...TOOL_ALLOWLIST,
          ...Object.keys(this.mcpServers).map(mcpAllowPattern),
        ],
        disallowedTools: SDK_DISALLOWED_TOOLS,
        env: this.env,
        model: this.model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        effort: this.effort as any,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        // Runaway/thrash circuit-breaker: cap the agentic loop so a stuck agent
        // (e.g. browser-automation churn on a hostile portal) ends its turn
        // instead of looping to the 30-min absolute-ceiling kill. Ending the
        // turn naturally also acks the inbound message → avoids the
        // kill→re-spawn→re-thrash loop. Override via NANOCLAW_MAX_TURNS.
        maxTurns: MAX_TURNS,
        settingSources: ['project', 'user', 'local'],
        mcpServers: this.mcpServers,
        hooks: {
          PreToolUse: [
            {
              hooks: [
                createPreToolUseHook(
                  this.blockedDomains,
                  this.maxFullPageRenderDpi,
                  this.maxRendersPerRun,
                  this.maxIdenticalCommands,
                  this.allowedDomains,
                ),
              ],
            },
          ],
          PostToolUse: [{ hooks: [postToolUseHook] }],
          PostToolUseFailure: [{ hooks: [postToolUseHook] }],
          PreCompact: [{ hooks: [createPreCompactHook(this.assistantName)] }],
        },
      },
    });

    let aborted = false;

    async function* translateEvents(): AsyncGenerator<ProviderEvent> {
      let messageCount = 0;
      for await (const message of sdkResult) {
        if (aborted) return;
        messageCount++;

        // Yield activity for every SDK event so the poll loop knows the agent is working
        yield { type: 'activity' };

        if (message.type === 'system' && message.subtype === 'init') {
          yield { type: 'init', continuation: message.session_id };
        } else if (message.type === 'assistant') {
          // Per-turn token usage (token-cost profiling). cache_read vs input shows
          // prompt-cache effectiveness; out tracks generation cost.
          const u = (
            message as unknown as {
              message?: {
                usage?: {
                  input_tokens?: number;
                  output_tokens?: number;
                  cache_read_input_tokens?: number;
                  cache_creation_input_tokens?: number;
                };
              };
            }
          ).message?.usage;
          if (u) {
            log(
              `Turn usage: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} ` +
                `cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}`,
            );
          }
        } else if (message.type === 'result') {
          const m = message as unknown as {
            result?: string;
            usage?: {
              input_tokens?: number;
              output_tokens?: number;
              cache_read_input_tokens?: number;
              cache_creation_input_tokens?: number;
            };
            total_cost_usd?: number;
            num_turns?: number;
          };
          const u = m.usage;
          if (u) {
            log(
              `Run usage (cumulative): in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} ` +
                `cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}` +
                `${m.num_turns != null ? ` turns=${m.num_turns}` : ''}` +
                `${m.total_cost_usd != null ? ` cost=$${m.total_cost_usd.toFixed(4)}` : ''}`,
            );
          }
          const text = m.result ?? null;
          yield { type: 'result', text };
        } else if (message.type === 'system' && (message as { subtype?: string }).subtype === 'api_retry') {
          yield { type: 'error', message: 'API retry', retryable: true };
        } else if (message.type === 'system' && (message as { subtype?: string }).subtype === 'rate_limit_event') {
          yield { type: 'error', message: 'Rate limit', retryable: false, classification: 'quota' };
        } else if (message.type === 'system' && (message as { subtype?: string }).subtype === 'compact_boundary') {
          const meta = (message as { compact_metadata?: { pre_tokens?: number } }).compact_metadata;
          const detail = meta?.pre_tokens ? ` (${meta.pre_tokens.toLocaleString()} tokens compacted)` : '';
          yield { type: 'result', text: `Context compacted${detail}.` };
        } else if (message.type === 'system' && (message as { subtype?: string }).subtype === 'task_notification') {
          const tn = message as { summary?: string };
          yield { type: 'progress', message: tn.summary || 'Task notification' };
        }
      }
      log(`Query completed after ${messageCount} SDK messages`);
    }

    return {
      push: (msg) => stream.push(msg),
      end: () => stream.end(),
      events: translateEvents(),
      abort: () => {
        aborted = true;
        stream.end();
      },
    };
  }
}

registerProvider('claude', (opts) => new ClaudeProvider(opts));
