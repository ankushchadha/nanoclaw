# CTS Gen7 Swim Timing: System Overview and Critical Corrections

> Episodic-memory reference for a specialized CTS timing agent. Compiled 2026-06-16 from a verified deep-research pass (25 claims, 3-vote adversarial verification, 0 killed). Confidence and source per claim. Treat the official CTS and Hy-Tek documents in `99-sources.md` as ground truth; treat anything tagged UNVERIFIED as a lead to confirm, not a fact to assert.

## The stack in one paragraph

A Colorado Time Systems (CTS) **Gen7** timing console captures swim times from **touchpads** (primary) and **pushbuttons / plungers** (backup) wired to per-lane inputs, started by a **start system**. The Gen7 runs **Gen7 Swimming** software (user's stack: v2024.0.1). Times move to **Hy-Tek Meet Manager for Swimming** running on a separate **meet-management PC**, and event/swimmer data plus live results drive a **scoreboard**. A scoreboard computer running **DisplayLink / DisplayLink Plus** can render names and results to an LED/video board.

## Two distinct data paths (do not conflate them)

The Gen7 talks to the outside world over **two separate channels** that serve different purposes:

| Path | Medium | Purpose | Key config value |
|------|--------|---------|------------------|
| **A. Serial / USB timer link** | RS-232 9-pin cable, or USB-Connect virtual COM port | Pulls race **times** into Meet Manager (Get Times) | A COM port number on the **meet-management PC** |
| **B. UDP / Ethernet live-data link** | UDP over Ethernet (+ RS-485 to the scoreboard computer for names) | Pushes **start lists / swimmer names / events** live, eliminating the USB-drive download/upload | **UDP port 60287** + IP address |

Path A is how *finished times* get from the console into Meet Manager. Path B is how *names and event sequence* get pushed live to the scoreboard so you no longer sneakernet a file on a USB drive.

## Three corrections to the working assumptions in the request

These came directly out of verification. They matter because the agent must not parrot a wrong premise.

### Correction 1: "COM3 on DisplayLink must match COM3 on Meet Manager" applies to the SERIAL path, and the match is more subtle than it sounds. [HIGH]

- The COM-port-matching rule is real **only for the serial/RS-232 timer path (Path A)**, not for the UDP path.
- In Meet Manager, the COM port you enter is **the meet-management computer's own local COM port** (the port Windows assigned to the cable/USB-serial adapter coming from the Gen7), verified in **Device Manager > Ports**. It is **not** the console's port (the console internally is always COM 1).
- So "both must be COM3" really means: whatever serial endpoint feeds the board/Meet Manager has to be pointed at the *same physical COM port number Windows assigned*. If two pieces of software on the same PC read the same serial stream they must name the same COM number; if the number drifts after a reboot or a different USB slot, the link breaks. Always re-check Device Manager.
- Source: CTS "Connecting a meet-management computer to a CTS timing console" + Hy-Tek CTS-5/6 and Gen7 interface articles.

### Correction 2: The UDP path does NOT use a matched COM port at all. It uses fixed UDP port 60287 + IP. [HIGH]

- UDP live integration is configured by **port number and IP address**, not a serial COM port. The port is **60287** (fixed). See `02-udp-network-setup.md`.
- This is the mechanism that removes the USB-drive download/upload step, and it is genuinely separate from any COM-port matching.

### Correction 3: Live name integration requires RS-485, not RS-232, AND it is version-gated. Your stated software pairing supports names but NOT team scores / full results. [HIGH]

- Names over the live link require an **RS-485** connection between the Gen7 timer and the **DisplayLink Plus (DL+)** computer. **RS-232 is explicitly not supported** for name integration.
- Version floor for **names**: Gen7 Swimming **v2023+** with **DL+ v4.6.0+**.
- Version floor for **Team Scores + Complete Event Results**: Gen7 Swimming **v2026** with **DL+ v4.7.0**.
- The user's stack (Gen7 Swimming **2024.0.1**, DisplayLink **4.7**) clears the names floor but does **not** meet the v2026 pairing, so live Team Scores and Complete Event Results are likely unavailable until the Gen7 software is on the v2026 line. Confirm the actual installed versions.
- Source: CTS Gen7 Serial Timer User Guide F1034, Appendix C (Athlete Name Integration), and CTS "DisplayLink Plus Team Scores and Event Results" support page.

## Version compatibility matrix (memorize this)

| Live feature | Gen7 Swimming software | DisplayLink Plus (DL+) | Wiring |
|--------------|------------------------|------------------------|--------|
| Swimmer **names** over live link | v2023 or newer | v4.6.0 or newer | **RS-485** (RS-232 not supported) |
| **Team Scores** + **Complete Event Results** | v2026 | v4.7.0 | RS-485 + UDP |
| Pulling race **times** into Meet Manager | any (USB needs no Gen7 config) | n/a | RS-232 9-pin or USB-Connect virtual COM |

## RESOLVED (2026-06-16): which "DisplayLink", and the version verdict

There are two different things both called "DisplayLink": (1) the generic DisplayLink USB-graphics driver, and (2) **DisplayLink Plus (DL+)**, the CTS scoreboard application. **On Ankush's rig it is confirmed to be DL+ the CTS app**, and the exact version is now confirmed: **DisplayLink Plus v4.7.0** (title bar + splash, verified at the 2026-06-17 meet; edition "CC Express 3.00.009"; core assemblies MainApplicationBase/DisplayLink 4.7.0.0). So its version DOES gate CTS features. See `07-observed-live-config.md` for the full ground-truth capture.

**Version verdict for this stack (Gen7 Swimming V2024.0.1 + DL+ v4.7.0), CONFIRMED 2026-06-17:**
- **Names: WORKING** (confirmed live on the board). Meets the Gen7 v2023+ / DL+ v4.6.0+ floor.
- **Team Scores + Complete Event Results (live auto-feed): NOT available.** That needs Gen7 Swimming **v2026** AND DL+ v4.7.0. **DL+ now meets its v4.7.0 floor exactly**, so the scoreboard side is ready, but the **Gen7 Swimming software (V2024.0.1) is below v2026** and is the sole limiting component. Upgrading the Gen7 software to the v2026 line is the only remaining step for those live features.

**Names-path reality (operator-confirmed 2026-06-17): names currently move via a USB STICK, not live.** The workflow: export the start list / names to a USB drive, then load them into DL+ on the scoreboard PC. The Gen7 setting "UDP Scoreboard Names = This Computer" exists, but UDP names are NOT the active transport on this rig. So the split is: **times** flow LIVE over serial **COM3** (Gen7 -> DL+ CTS Timer #1, and Gen7 -> Meet Manager CTS6 Pool 1); **names** are the manual USB download/upload. Eliminating that USB step (moving names onto the live UDP/RS-485 path, which needs RS-485 to DL+ plus Gen7 v2023+ / DL+ v4.6+) is the standing improvement goal. See `02` for the UDP-names requirements and `07` for the verified config.

## What was NOT verified (do not assert as fact)

The research confirmed the console-to-PC and scoreboard interfaces but did **not** verify:

- Exact touchpad/pushbutton lane-input **pinouts** and start-system cable wiring.
- Dual/multi-pad lane physical wiring and Gen7 menu configuration.
- The precise **pad-vs-button backup-time reconciliation logic / tolerance** (when the button overrides or flags the pad time).
- Where pool length / lane count / event sequence are set in the **Gen7 on-console menus**, and an authoritative step-by-step pre-meet checklist.

These are listed as open questions in `06-pre-meet-checklist.md` so the agent can ask or look them up rather than hallucinate.
