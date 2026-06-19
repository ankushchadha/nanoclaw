# Memory Architecture and Grounding Design (meta)

> This file is about HOW the CTS agent should use the rest of this knowledge base, not about CTS itself. It records the design discussion (2026-06-16) on memory layers, citation/defer guardrails, the human-in-the-loop write-back loop, and where RAG fits. Keep it separate from the domain files (00-07).

## Memory taxonomy

| Layer | Where it lives | What it holds | Citeable? | CTS examples |
|-------|----------------|---------------|-----------|--------------|
| **Parametric** | Model weights | Fuzzy, general knowledge | No | "what a CTS Gen7 roughly is" |
| **Semantic** | External docs / KB | Durable general facts | Yes | port 60287, version gates, RS-485-for-names |
| **Instance / config** | External docs | Durable facts about THIS deployment | Yes | file 07: COM3, serial 202214306, APIPA IPs, course 25y/SCY |
| **Episodic** | External log | Time-indexed events/experiences | Yes | "at the Jan meet, lane 4 pad read low, swapped to plunger B" |
| **Procedural** | Skills / tools / routines | How to do things | n/a | the pre-meet checklist run as a routine |

Key distinction people blur: **instance/config is not episodic.** Instance memory is stable but scoped to one rig (file 07). Episodic memory is events over time (the running per-meet log). Keep them in separate buckets:
- **Semantic** = true for every CTS rig (the manuals). Shareable / upstreamable.
- **Instance** = true for *our* rig. Travels with this pool.
- **Episodic** = what happened at *this* meet. Grows every meet; the real tribal-knowledge capture.

The documented general-facts layer is called **semantic memory** (cognitive term) or a **knowledge base / knowledge corpus** (systems term). Externalized and retrieved, it is also called **non-parametric memory**, **external knowledge**, or **grounding/retrieval context**. Same thing.

## What deep-research produced, precisely

Deep-research did two jobs, not one:
1. **Grounded** the model's fuzzy parametric knowledge by mapping it to specific primary docs (verification).
2. **Retrieved facts the model lacked or held unreliably** (port 60287, exact v2026/v4.7.0 gate). This is new information, not just mapping.

It also attached **provenance + confidence tags**. Those are not decoration. They are what let a human or the agent tell a verified fact from a lead, and what keeps the grounding honest as docs age. Grounding shifts the trust problem from "the model's fuzzy memory" to "the quality of the curated context." Strictly better (auditable, updatable), but it introduces a new failure mode: **stale or wrong context cited confidently**, which reads as more authoritative than vagueness. Provenance is the defense.

## KB-building verification (how facts get INTO this KB — the build-time rule)

The grounding guarantees below are only as good as the facts ingested. The failure mode to design out: a **fetch-then-summarize tool puts a model between you and the source**, and that summary paraphrases, blends in the model's own training knowledge, or **misattributes** a real value to the wrong claim. This actually happened (2026-06-19): a `WebFetch` summary presented the real Gen7 build "v2026.0.3" as the Team-Scores *requirement floor* (the page stated only DL+ v4.7.0), and a separate summary made the genuine F1034 "Gen7 v2026" floor look unverified. Both were resolved only by going to raw source. Lesson: **a model summary is the wrong instrument for confirming a discrete fact.**

**The rule (mandatory for any value added to this KB):**
- **Discrete facts** — versions, ports, part numbers, menu paths, hotkeys, thresholds — must be confirmed by **raw-fetch + deterministic extraction + literal match**, never by a model summary:
  - `curl`/download the raw source → `pdftotext` (PDFs) or strip tags (HTML) → **`grep` for the literal token** (a string is in the bytes or it isn't) → record a **verbatim quote + locator** (page/line/section).
  - JS- or Cloudflare-gated pages: render with a **headless browser (Playwright)** first, then grep the rendered text.
- **Prose / interpretation** — what something means, how a procedure flows — a model reading is fine. Use a model to *interpret*, **never to *confirm* a discrete value**.
- **WebFetch (and any summarizing fetch) is a lead-finder, not ground truth.** It tells you where to look; the verbatim grep is what makes the claim citeable.
- Every `[HIGH]` tag should be backed by a literal source quote, not a paraphrase. No verbatim quote → it is at best a lead (`UNVERIFIED`), not a fact.

This is the **build-time twin of the citation guardrail below**: the runtime guardrail checks that the agent's answer is supported by the KB; this rule checks that the KB is supported by the source. Same principle — verify the claim against the actual source, never trust an intermediary.

## Citation guardrail (show your source)

Two halves. The positive half is easy; the teeth are on the negative half.

- **Positive:** every KB-sourced claim carries its source (file + section).
- **Negative (the teeth):** every claim NOT reachable in the KB is visibly flagged as model-knowledge / uncited, never blended in to look sourced.

Without the negative half, the model can drop an uncited fabrication next to cited facts and it reads as equally authoritative. The guardrail's real job is to **make the boundary visible**: cited = grounded, uncited = treat with suspicion.

**Hard cap:** the model can only cite what retrieval surfaces. Citation quality is bounded by retrieval quality. Bad retrieval falls back to parametric memory, and then the negative half is the only thing catching it.

Implementation tiers:
- **Soft:** system-prompt rule + output contract (every factual sentence ends with `[07-observed-live-config.md]` or similar).
- **Hard:** a post-response check (hook or LLM-judge) that rejects/flags any factual claim lacking a citation, or verifies the cited passage actually supports the claim. This is the inference-time analog of deep-research's adversarial-verify step.

## Defer guardrail (abstain beyond your sources)

Defer is two steps; HITL only covers the second.

1. **Detection:** the agent recognizes it is past its sources. Signals: retrieval returned nothing relevant, no citation available, hit an `UNVERIFIED` / open-question tag. HITL does nothing here. If the agent never detects the gap, it never escalates and just confabulates.
2. **Action:** what to do once it knows. **HITL (human-in-the-loop) is the right action**: route to the operator, ask, wait. Abstention ("the docs don't cover this") is the lighter action.

**Tier by stakes.** Cannot HITL every gap or the agent is useless. Low-stakes gap, abstain. High-stakes or human reachable, escalate.

## The write-back loop (the actual tribal-knowledge capture)

This is the payoff for the swim agent:

```
gap detected -> defer -> HITL -> human answers -> write answer to KB -> next time it is citeable, no defer
```

Every meet the agent defers on something new, the operator answers once, it becomes a cited fact (instance or episodic memory), and it never asks again. Defers shrink over time as the KB fills. That is the "pre-meet anxiety goes away" outcome, mechanized. Classic read-only retrieval does NOT do this; the write-back loop is what makes the memory self-improving.

## Is this RAG?

Yes, this is the RAG family, with caveats.

- **Vanilla RAG** = Retrieval-Augmented Generation: at inference, retrieve relevant external docs, put them in context, generate a grounded answer. The KB-of-markdown + retrieve-relevant-chunks + cite pattern IS canonical RAG.
- **What we layered on top is more than vanilla RAG:** citation enforcement, defer/abstention, HITL escalation, and the write-back loop. Those make it **agentic RAG / verified RAG / self-updating memory**. Vanilla RAG is read-only and does not abstain, cite-enforce, or grow itself.
- **Degenerate case:** if the KB is small enough to fit entirely in the context window and the agent just loads all of files 00-08 every turn, that is **context stuffing / full-context grounding**, NOT retrieval. RAG specifically implies a retrieval step that *selects a subset*. Below a few thousand lines, skip retrieval and load everything; it is simpler and loses nothing. Add real retrieval (embeddings / vector store) only when the KB outgrows the context budget.

So: the headline is "yes, RAG." The footnotes: it is RAG plus verification, abstention, and write-back; and at this KB's size it may not even need the retrieval step yet.

## Implementation notes for the NanoClaw CTS agent

- Load files 00-08 as the agent's grounding context (full-context while small; add retrieval later if it grows).
- System prompt: enforce the citation contract (cite KB claims; flag uncited ones) and license abstention (`UNVERIFIED`/open-question -> defer, do not guess port numbers or menu paths).
- Escalation path: defer routes to the operator (the existing approval/HITL primitive), tiered by stakes.
- Write-back: when the operator answers a deferred question, append it to the right bucket (instance -> file 07-style; episodic -> a new per-meet log file).
- Ties to the security stance: a tight egress allowlist keeps the agent reading only this bounded source set, so "cite and defer" is enforced by containment, not just by prompt. See the project memory and the pretool-vs-egress note.
