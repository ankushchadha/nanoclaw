# LiteLLM Integration — Findings

> **REMOVED 2026-06-12.** The integration was ripped out: the `/v1/messages`
> pass-through gap below was still unfixed as of LiteLLM 1.87.2 (#24004 and
> #24320 open; #20507 closed stale), so the fallback this was introduced for
> never worked. Wiring removed from `src/config.ts`, `src/container-runner.ts`,
> and `.env`; the compose stack at `~/projects/docker-compose.yml` was brought
> down (file kept for reference). Agents call Anthropic directly through the
> OneCLI gateway again. Kept as a record of what was tried and why it failed.

**Date:** May 11, 2026
**LiteLLM version at time of finding:** 1.83.10 (latest stable: 1.83.14-stable.patch.3, latest pre-release: 1.84.0-rc.1)

---

## Why It Was Introduced

Anthropic pay-as-you-go credits ran out, killing all agents simultaneously. LiteLLM was introduced to provide model routing with Gemini Pro as a fallback so agents could continue working when Anthropic was unavailable or credits were exhausted.

---

## What Was Configured

- LiteLLM runs as a Docker container on the `nanoclaw` network
- Agent containers point at LiteLLM via `ANTHROPIC_BASE_URL=http://litellm:4000/v1`
- `default_fallbacks: ["gemini-pro"]` with a `gemini-pro → gemini-flash` chain
- Both Anthropic and Gemini keys are `dummy-replaced-by-onecli` in `litellm_config.yaml` — real keys injected by OneCLI at the network level via `HTTP_PROXY`
- `NO_PROXY=litellm` on agent containers so OneCLI doesn't intercept the internal agent→LiteLLM leg

---

## What Was Tested

Only the happy path — verified implicitly by agents responding normally after the wiring:

| Path | Tested | Result |
|------|--------|--------|
| Agent → LiteLLM (URL wiring) | Implicit | ✅ Works |
| LiteLLM → OneCLI → Anthropic | Implicit | ✅ Works |
| LiteLLM → OneCLI → Gemini | Health probes only | ✅ Works for direct calls |
| **Agent → LiteLLM → Gemini (actual fallback)** | **Never tested** | **❌ Doesn't work** |

The fallback path was never explicitly tested by cutting Anthropic access and verifying agents continued on Gemini.

---

## What Was Caught Later

### 1. Gemini Plus usage — misread as fallback working

Gemini usage appeared in OneCLI logs shortly after setup. This was LiteLLM's own model health probing — it periodically pings all configured models to check availability for routing decisions. It was not agent fallback traffic. The fallback was never actually triggered by an agent.

### 2. The `/v1/messages` pass-through gap (root cause)

NanoClaw's agent-runner uses `@anthropic-ai/claude-agent-sdk`, which spawns the Claude Code CLI (`/pnpm/claude`). Claude Code CLI always calls the Anthropic Messages API format: `POST /v1/messages`. LiteLLM handles this endpoint in **pass-through mode** — it proxies directly to Anthropic without applying any routing or fallback logic.

Consequences:
- `default_fallbacks` never fires for any agent turn
- If Anthropic returns "credit balance too low", agents fail immediately — Gemini is never tried
- The original problem (credits run out → agents die) is **not solved**

Call chain that exposes the gap:
```
agent-runner
  └── Claude Agent SDK (sdkQuery)
        └── Claude Code CLI (/pnpm/claude)
              └── POST /v1/messages → LiteLLM
                    └── pass-through → Anthropic (no fallback logic applied)
```

Compare with the path that would have fallback:
```
anything calling POST /v1/chat/completions → LiteLLM router → fallback applies ✅
```

### 3. Budget exhaustion doesn't trigger fallback

LiteLLM's own `max_budget` cap raises a `BudgetExceededError` internally before the request reaches any provider. `default_fallbacks` only catches provider-level errors — it cannot catch LiteLLM-internal budget blocks. When the monthly budget ceiling is hit, every model fails equally.

### 4. No alerting wired

`success_callback: []` and `failure_callback: []` are both empty in `litellm_config.yaml`. The `soft_budget: $20` warning fires silently with no notification. There is no alert when spend approaches the ceiling or when a fallback triggers (or fails to trigger).

---

## Relevant Open Bugs in LiteLLM

| Issue | Description | Status |
|-------|-------------|--------|
| [#20507](https://github.com/BerriAI/litellm/issues/20507) | `anthropic_messages` route raises `BaseLLMException` instead of typed exceptions (`RateLimitError`, etc.), so Router fallback logic never matches | Open — marked stale |
| [#24004](https://github.com/BerriAI/litellm/issues/24004) | No `FallbackStreamWrapper` on `/v1/messages` path; mid-stream Anthropic errors pass through silently with zero fallback attempts. Root cause identified in `router.py` | Open |
| [#24320](https://github.com/BerriAI/litellm/issues/24320) | Anthropic "credit balance too low" (HTTP 400) classified as non-retryable client error, not a fallback trigger | Open |

All three open as of LiteLLM 1.83.10 and unaddressed in 1.84.0-rc.1.

**Issue to watch:** [#24004](https://github.com/BerriAI/litellm/issues/24004) has the most complete root cause analysis and affects the broadest set of users (anyone using Anthropic → Bedrock fallback). Most likely to be prioritised.

---

## Net Position

| Capability | Status |
|------------|--------|
| Spend capping (`max_budget`) | ✅ Works |
| Cost visibility (LiteLLM dashboard) | ✅ Works |
| Key security (OneCLI injection for LiteLLM→API leg) | ✅ Works |
| Fallback to Gemini when Anthropic credits run out | ❌ Does not work |
| Fallback to Gemini when Anthropic API is down | ❌ Does not work |
| Alert when soft budget hit | ❌ Not wired |

LiteLLM currently provides spend capping and cost visibility but not the resilience it was introduced for. If Anthropic credits hit zero, agents go offline exactly as before.

---

## Interim Mitigations (until upstream fix)

1. **Set a billing alert in the Anthropic console** — get notified before credits run out, not after
2. **Wire LiteLLM's `failure_callback`** — at minimum a log webhook so spend events are visible:
   ```yaml
   litellm_settings:
     failure_callback: ["langfuse"]  # or a webhook URL
   ```
3. **Keep a credit buffer** — top up on a fixed schedule rather than running to zero
4. **Watch [#24004](https://github.com/BerriAI/litellm/issues/24004)** — comment with the NanoClaw/Claude Code CLI use case to increase visibility; reset the stale timer on [#20507](https://github.com/BerriAI/litellm/issues/20507) with a comment before it gets auto-closed
