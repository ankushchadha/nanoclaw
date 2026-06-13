/**
 * Per-group runner policy — read at startup from an OPTIONAL
 * `/workspace/agent/runner-policy.json` in the mounted group folder.
 *
 * This is intentionally NOT `container.json` (which the host re-materializes
 * from the DB on every spawn and would clobber). The policy file lives in the
 * group's own folder, is install-local, and lets a group opt into runner
 * behaviors without a central-DB schema change:
 *
 *   {
 *     "stateless": true,                       // never resume prior session
 *     "blockedDomains": ["parcelquest.com"]    // hard pre-tool deny list
 *   }
 *
 * Both default off/empty, so groups without the file are unaffected.
 */
import fs from 'fs';

export interface RunnerPolicy {
  /**
   * When true, the poll-loop never resumes a prior Claude session — every
   * container spawn starts with a clean context. For stateless research
   * workers (each request independent; durable memory lives in the brain +
   * workspace files, not chat history) this prevents one request's browsing
   * habits from polluting the next. Conversational hubs should leave this off.
   */
  stateless: boolean;
  /**
   * Domains the agent must never navigate to / fetch. Enforced as a HARD
   * PreToolUse deny (Bash + WebFetch) — independent of, and un-overridable by,
   * any soft instruction or accumulated session history. Use for known
   * dead-ends (anti-bot / token-gated portals) and out-of-lane sources.
   */
  blockedDomains: string[];
  /**
   * Cap on `pdftoppm` FULL-PAGE render DPI (null = no cap). A full-page render
   * above this is HARD-blocked at PreToolUse; high-DPI is allowed only with an
   * explicit crop region (poppler `-x -y -W -H`). Soft "render at 150" prompts
   * kept leaking to 300-DPI full pages (the dominant latency+token sink); this
   * converts the cap from advisory to enforced.
   */
  maxFullPageRenderDpi: number | null;
}

const DEFAULT_POLICY: RunnerPolicy = { stateless: false, blockedDomains: [], maxFullPageRenderDpi: null };
const DEFAULT_POLICY_PATH = '/workspace/agent/runner-policy.json';

/** Read + validate the policy file. Missing/malformed → safe defaults. */
export function loadRunnerPolicy(policyPath: string = DEFAULT_POLICY_PATH): RunnerPolicy {
  let raw: string;
  try {
    raw = fs.readFileSync(policyPath, 'utf-8');
  } catch {
    return { ...DEFAULT_POLICY };
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      stateless: parsed.stateless === true,
      blockedDomains: Array.isArray(parsed.blockedDomains)
        ? parsed.blockedDomains.filter((d): d is string => typeof d === 'string' && d.trim().length > 0).map((d) => d.trim().toLowerCase())
        : [],
      maxFullPageRenderDpi:
        typeof parsed.maxFullPageRenderDpi === 'number' && parsed.maxFullPageRenderDpi > 0
          ? parsed.maxFullPageRenderDpi
          : null,
    };
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

/**
 * Pure matcher: is this a `pdftoppm` FULL-PAGE render above the DPI cap?
 * Returns the offending DPI if so (→ block), else null. A render WITH a crop
 * region (poppler `-x -y -W -H`) is always allowed regardless of DPI — cropping
 * is the sanctioned way to read fine detail. Only bare full-page high-DPI is denied.
 */
export function pdftoppmFullPageDpiViolation(command: string, capDpi: number): number | null {
  if (!/\bpdftoppm\b/.test(command)) return null;
  const m = command.match(/(?:^|\s)-r\s+(\d+)/);
  if (!m) return null;
  const dpi = parseInt(m[1], 10);
  if (!Number.isFinite(dpi) || dpi <= capDpi) return null;
  // A genuine crop sets all four poppler crop flags; allow those at any DPI.
  const hasCrop = /(?:^|\s)-x\s+\d/.test(command) && /(?:^|\s)-W\s+\d/.test(command);
  return hasCrop ? null : dpi;
}

/**
 * Pure matcher: does a command/URL string reference a blocked domain?
 * Case-insensitive substring match — `blockedDomains` are already lowercased
 * by the loader. Returns the matched domain, or null if clear.
 */
export function findBlockedDomain(text: string, blockedDomains: string[]): string | null {
  if (!text || blockedDomains.length === 0) return null;
  const haystack = text.toLowerCase();
  for (const domain of blockedDomains) {
    if (haystack.includes(domain)) return domain;
  }
  return null;
}
