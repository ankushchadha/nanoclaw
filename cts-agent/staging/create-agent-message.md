# Message to send Nano (creates CTSAgent)

Send this to Nano over Telegram. It keeps Nano's job deterministic: call `create_agent` with a short, safe seed. The full `CLAUDE.local.md` and knowledge base are installed by file copy in the step right after (so Nano does not paraphrase the long personality).

## The message (copy-paste, send as one block)

```
Please create a new agent for me using your create_agent tool.

Name: CTSAgent

Use exactly the text between the BEGIN and END markers below as its CLAUDE.local.md. Do not rewrite, summarize, or expand it. I will install the full instructions and knowledge base by hand right after. After it is created, reply with the name I should use to message it (the destination handle) and its folder name.

=== BEGIN CLAUDE.local.md ===
# CTSAgent
You are CTSAgent, a swim-meet timing specialist for the Colorado Time Systems (CTS) Gen7 console, Hy-Tek Meet Manager, and the DisplayLink Plus scoreboard. Your full operating instructions and a knowledge base are being installed into your workspace knowledge/ folder.

Until your knowledge base is present, do NOT answer timing questions from memory. Say your setup is still being installed and ask the operator to wait.

Once installed: answer only from knowledge/, cite every fact to its file, put anything uncited in a clearly labeled separate section, and never invent COM ports, software versions, or menu paths. When unsure, say so and ask.
=== END CLAUDE.local.md ===
```

## Get the real agent group id (from the DB, not the agent)

Do NOT ask the agent for its `agent_group_id`. `create_agent` tells the parent only the new agent's NAME/handle (how to message it), not its internal id, so when asked for the id the agent confabulates a plausible wrong one (it reported its OWN id last time). Read the id from the system of record instead:

```
pnpm exec tsx scripts/q.ts data/v2.db "SELECT id, name, folder FROM agent_groups WHERE folder='<folder>'"
```

Use that `id` for all DB/config work (`ncl groups config update --id <id> ...`, wiring, destinations). Treat the agent's reply as the name to address it by, not as an identifier of record.

## If create_agent asks for approval

Nano may surface an admin-approval request before creating (confined groups need owner approval). You are the owner, so approve it. If Nano's group is global cli_scope, it creates immediately with no prompt.

## Immediately after creation (file copy, on the host)

1. Overwrite the seed with the full personality:
   `cp cts-agent/staging/CLAUDE.local.md.template groups/<folder>/CLAUDE.local.md`
2. Install the policy:
   `cp cts-agent/staging/runner-policy.json groups/<folder>/runner-policy.json`
3. Install the knowledge base:
   `mkdir -p groups/<folder>/knowledge && cp cts-knowledge/*.md groups/<folder>/knowledge/`
4. Restart/wake the agent so it reloads (or just message it). Confirm the allow-list loaded in the host log: `Runner policy: egress allow-list of 5 domain(s)`.

(Replace `<folder>` with the folder name Nano reports, likely `ctsagent`.)
