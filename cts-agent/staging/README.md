# CTSAgent staging artifacts

These are authored and reviewed but NOT yet wired into a live agent. They are staged here (rather than in `groups/cts/`) so they do not collide with `initGroupFilesystem`, which seeds the group folder at creation time.

## Drop-in map (apply at create time, after the photo-path gate passes)

| Staged file | Goes to | How |
|---|---|---|
| `CLAUDE.local.md` | `groups/cts/CLAUDE.local.md` | Pass as the `instructions` arg to `create_agent` (it seeds CLAUDE.local.md), or copy in after creation |
| `runner-policy.json` | `groups/cts/runner-policy.json` | Copy in after creation (host never clobbers this file) |
| `../../cts-knowledge/*.md` | `groups/cts/knowledge/` | Copy the KB in; the agent reads it as ground truth |

## Tomorrow's runbook (operational, on the live host)

Grounded in the current install (service `com.nanoclaw-v2-a603825e` running; central DB `data/v2.db`):
- Existing agent groups: Nano (owner hub, folder `dm-with-ankush`), Researcher, Coach, propertyIQ, agentSQ, Mira.
- Pattern in use: Nano is the hub; sub-agents (agentSQ, propertyIQ, Mira) are reached via A2A delegation.
- Two Telegram messaging groups exist (Ankush DM -> Nano is one).

### Step 0 — GATE: verify Telegram inbound images
Send a photo to the Telegram bot. Confirm it stages to `/workspace/sessions/<id>/inbox/<msgId>/` (the host `extractAttachmentFiles` only stages when the adapter emits base64 `data`). If it does not stage, fix the Telegram adapter on the channels branch before wiring. This is the must-have and it gates the rest.

### Step 1 — DECIDE the wiring topology (the photo path depends on it)
- **Option A (recommended for photos): direct Telegram wire to CTSAgent.** A dedicated Telegram bot/chat wired straight to CTSAgent. Inbound photo crosses ONE gap (the Telegram adapter), no A2A hop. Cleanest for the photo must-have. Cost: set up a second Telegram bot via `/add-telegram` / `/manage-channels`.
- **Option B (less setup): reach CTSAgent through Nano via A2A.** No new bot; Ankush asks Nano, Nano delegates to CTSAgent (the Mira -> agentSQ pattern). Cost: a Telegram photo would ride the Telegram-adapter gap PLUS the suspected A2A file-forward gap, so photo troubleshooting is at higher risk. Replies route via Nano.

Given photos are a must-have, prefer Option A unless Step 0 and an A2A photo-forward test both pass cleanly.

### Step 2 — Create the agent
Via the sanctioned `create_agent` path (ask Nano to create it). Name "CTSAgent", instructions = the contents of `CLAUDE.local.md`. Do NOT use low-level `ncl groups create` (digit-leading UUID breaks OneCLI). This scaffolds the group folder, seeds `CLAUDE.local.md`, and auto-wires Nano<->CTSAgent destinations.

### Step 3 — Drop in policy + knowledge
Copy `runner-policy.json` to the new group folder, and `cts-knowledge/*.md` to `groups/<folder>/knowledge/`. Confirm the runner picks up the allow-list: startup log line `Runner policy: egress allow-list of 5 domain(s)`.

### Step 4 — Wire the channel (per Step 1)
Option A: `/add-telegram` (new bot) then `/manage-channels` to wire that messaging group to CTSAgent via the sanctioned register path (creates the agent_destinations row so replies route correctly). Option B: confirm the Nano<->CTSAgent A2A destinations from Step 2 and test delegation.

### Step 5 — Smoke test the four day-one flows
1. A setup question (cited from KB).
2. An ideal-config question (cited).
3. A blank-board photo troubleshoot (send a photo; agent reads it and diagnoses from `knowledge/05`).
4. A deliberate defer on an `UNVERIFIED` item -> you answer -> agent writes it back to `knowledge/episodic/`.

## Dependency

`runner-policy.json` uses `allowedDomains`, which requires the allow-list support added to the agent-runner PreToolUse hook (`container/agent-runner/src/policy.ts` + `providers/claude.ts`). That change is committed to the tree and must be picked up by the container (agent-runner src is bind-mounted, so no rebuild needed for src changes; verify the policy loads via the startup log line "Runner policy: egress allow-list of N domain(s)").
