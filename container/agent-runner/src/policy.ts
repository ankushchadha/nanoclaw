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
   * ALLOW-LIST egress. When non-empty, the agent may only fetch URLs whose host
   * is one of these domains (exact or subdomain) — every other http(s) URL in a
   * WebFetch or a Bash command (curl/wget/agent-browser) is HARD-blocked at
   * PreToolUse. Empty = allow-listing OFF (no restriction from this field).
   * This is the lane-keeping intent layer (a cooperative PreToolUse hook, not a
   * network perimeter): it steers the agent to a small, vetted set of
   * authoritative/community sources. `blockedDomains` (deny) takes precedence
   * over this (allow) when both match. Plain Bash with no URL always passes.
   */
  allowedDomains: string[];
  /**
   * Cap on `pdftoppm` FULL-PAGE render DPI (null = no cap). A full-page render
   * above this is HARD-blocked at PreToolUse; high-DPI is allowed only with an
   * explicit crop region (poppler `-x -y -W -H`). Soft "render at 150" prompts
   * kept leaking to 300-DPI full pages (the dominant latency+token sink); this
   * converts the cap from advisory to enforced.
   */
  maxFullPageRenderDpi: number | null;
  /**
   * Cap on the TOTAL number of `pdftoppm` renders (full-page OR crop) per run
   * (null = no cap). Beyond this, further renders are HARD-blocked at PreToolUse.
   * The DPI cap bounds the cost of ONE render; this bounds the COUNT. A single
   * map read is ~3-5 renders (index + target sheet + a crop); a healthy
   * multi-document parcel ~10. The 201-Latera grind rendered ~50 sheets across
   * SIX candidate recorded maps it couldn't disambiguate — soft "fetch one map /
   * few renders" rules leaked. This converts the count cap from advisory to
   * enforced, forcing the agent to commit to one map and deliver.
   */
  maxRendersPerRun: number | null;
  /**
   * Cap on how many times the EXACT same Bash command may be issued per run
   * (null = no cap). The (N+1)th identical command is HARD-blocked at PreToolUse
   * with a steer to stop looping and flag-the-subgoal-open + deliver. Catches
   * the "go-back → re-search → re-click the same tab" grind (201/7591 burned
   * ~20 turns re-running the identical tax-collector assessment-tab flow chasing
   * a field that tab doesn't expose). Soft "few attempts then flag" leaked; this
   * is the deterministic loop-breaker. Set high enough that legit repeated steps
   * don't trip it.
   */
  maxIdenticalCommands: number | null;
}

const DEFAULT_POLICY: RunnerPolicy = {
  stateless: false,
  blockedDomains: [],
  allowedDomains: [],
  maxFullPageRenderDpi: null,
  maxRendersPerRun: null,
  maxIdenticalCommands: null,
};
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
      // Normalize to bare host: strip any scheme, path, port, and trailing dot so
      // a config entry like "activenetwork.my.salesforce-sites.com/hytekswimming"
      // or "https://coloradotime.com" matches by host. Then REJECT single-label,
      // wildcard, or malformed entries — a bare TLD like "com" (typo/paste) would
      // otherwise make endsWith('.'+d) admit every *.com host (silent total bypass).
      allowedDomains: Array.isArray(parsed.allowedDomains)
        ? parsed.allowedDomains
            .filter((d): d is string => typeof d === 'string' && d.trim().length > 0)
            .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].replace(/:\d+$/, '').replace(/\.$/, ''))
            .filter((d) => d.includes('.') && !d.startsWith('.') && !d.includes('*') && !d.includes('@'))
        : [],
      maxFullPageRenderDpi:
        typeof parsed.maxFullPageRenderDpi === 'number' && parsed.maxFullPageRenderDpi > 0
          ? parsed.maxFullPageRenderDpi
          : null,
      maxRendersPerRun:
        typeof parsed.maxRendersPerRun === 'number' && parsed.maxRendersPerRun > 0
          ? parsed.maxRendersPerRun
          : null,
      maxIdenticalCommands:
        typeof parsed.maxIdenticalCommands === 'number' && parsed.maxIdenticalCommands > 0
          ? parsed.maxIdenticalCommands
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
 * Pure matcher: is this command a `pdftoppm` render invocation (any DPI, full
 * page or crop)? Used to COUNT renders per run against `maxRendersPerRun`.
 * Distinct from the DPI matcher above (which judges a single render's cost);
 * this just asks "is this one more render?" so the per-run total can be capped.
 */
export function isPdftoppmRender(command: string): boolean {
  return /\bpdftoppm\b/.test(command);
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

/**
 * Pure matcher for ALLOW-LIST egress. Extracts every http(s) URL from `text`
 * and returns the host of the FIRST one whose host is NOT within any allowed
 * domain (→ block); null if all URLs are allowed, if there are no URLs (plain
 * commands pass), or if `allowedDomains` is empty (allow-listing off).
 *
 * Host match is EXACT or SUBDOMAIN (`host === domain || host.endsWith('.' +
 * domain)`), never substring — so an allowed `coloradotime.com` does NOT admit
 * `coloradotime.com.evil.com` or `evilcoloradotime.com`.
 *
 * The authority is normalized to the TRUE host before matching: userinfo is
 * stripped (`user:tok@evil.com` -> `evil.com`, so credentials can't disguise the
 * real destination), then the port and a single trailing FQDN dot are removed.
 */
export function findDisallowedUrl(text: string, allowedDomains: string[]): string | null {
  if (!text || allowedDomains.length === 0) return null;
  const urlRe = /https?:\/\/([^/\s'"<>)]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    let host = m[1].toLowerCase();
    const at = host.lastIndexOf('@');
    if (at !== -1) host = host.slice(at + 1); // real host is after userinfo
    host = host.replace(/:\d+$/, '').replace(/\.$/, '');
    const allowed = allowedDomains.some((d) => host === d || host.endsWith('.' + d));
    if (!allowed) return host;
  }
  return null;
}
