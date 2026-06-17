# CTSAgent staging artifacts

These are authored and reviewed but NOT yet wired into a live agent. They are staged here (rather than in `groups/cts/`) so they do not collide with `initGroupFilesystem`, which seeds the group folder at creation time.

## Drop-in map (apply at create time, after the photo-path gate passes)

| Staged file | Goes to | How |
|---|---|---|
| `CLAUDE.local.md.template` | `groups/cts/CLAUDE.local.md` | Version-controlled source (the live `CLAUDE.local.md` is gitignored). Pass its contents as the `instructions` arg to `create_agent`, or copy in after creation |
| `runner-policy.json` | `groups/cts/runner-policy.json` | Copy in after creation (host never clobbers this file) |
| `../../cts-knowledge/*.md` | `groups/cts/knowledge/` | Copy the KB in; the agent reads it as ground truth |

## Runbook (status + remaining steps)

Grounded in the live install (service `com.nanoclaw-v2-a603825e`; central DB `data/v2.db`).

### DONE (2026-06-17)
- CTSAgent created (agent group `ag-1781691493789-gj9cz8`, folder `ctsagent`); full `CLAUDE.local.md` + `knowledge/` + `runner-policy.json` installed; egress allow-list loads.
- Brain smoke test via Nano: 2/2 grounded + cited answers; defer discipline + self-correction confirmed.
- Photo path diagnosed: Telegram inbound images DO stage; the A2A relay drops the file (Nano transcribes to text instead). Real-pixel photos need a DIRECT wire (Option B), not the Nano hub.
- Channel decision: Option B (dedicated 2nd Telegram bot), shipped in code (commit `b045a36`) — `registerTelegramInstance` + a CTS instance keyed on `TELEGRAM_BOT_TOKEN_CTS`. Inert until that token is set.
- Realtime fetch of the 5 allow-listed doc domains works today (locked container reaches them via the OneCLI proxy; the hook confines to the 5). No change needed; do NOT label the group "open".

### REMAINING (operational, on the live host)

1. **Create the CTS bot.** @BotFather -> /newbot -> get the token. If volunteers type plain messages in a group, /setprivacy -> Disable so the bot sees all group messages (otherwise it only sees @mentions/replies/commands).
2. **Configure the token.** Add to `.env`: `TELEGRAM_BOT_TOKEN_CTS=<token>`. Must DIFFER from `TELEGRAM_BOT_TOKEN` (a shared token is rejected to avoid a getUpdates 409).
3. **Restart the host** so it registers the second instance: `launchctl kickstart -k gui/$(id -u)/com.nanoclaw-v2-a603825e`. Verify the log: `Channel adapter started ... instance=telegram-cts`.
4. **Create the CTS Telegram group**, add the CTS bot, send one message so the router registers the group (a `messaging_groups` row, channel_type `telegram`, instance `telegram-cts`).
5. **Wire it to CTSAgent.** `/manage-channels` -> wire that messaging group to CTSAgent (`ag-1781691493789-gj9cz8`) via the sanctioned register path (creates the destination row so replies route back). Set that group's `unknown_sender_policy='public'` so every volunteer you add to the group reaches CTSAgent with no per-person approval (group membership is your access control). Do NOT grant any volunteer a role/membership on Nano or Mira.
6. **Test the photo path (the must-have):** drop a photo (blank board / error screen) in the CTS group; confirm it stages to CTSAgent's session inbox and the agent reads the actual image and diagnoses from `knowledge/05`.
7. **Flow-4 (defer + write-back):** ask something the KB does not cover; confirm CTSAgent defers; answer it; confirm it writes the answer to `knowledge/episodic/<meet>.md` and cites it next time.

### Notes
- `runner-policy.json` `allowedDomains` is enforced by the agent-runner PreToolUse hook (committed `fbefa7e`). Agent-runner src is bind-mounted, so no image rebuild — the next container respawn picks it up.
- The "uncited advice goes in the separate section too" tweak is live in `groups/ctsagent/CLAUDE.local.md`.
