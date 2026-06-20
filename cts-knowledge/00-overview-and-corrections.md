# CTS Gen7 Swim Timing: System Overview and Critical Corrections

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value, with a `rig-confirmed` vs `candidate` status. See `08` for the convention.

> Episodic-memory reference for a specialized CTS timing agent. Compiled 2026-06-16 from a verified deep-research pass (25 claims, 3-vote adversarial verification, 0 killed). Confidence and source per claim. Treat the official CTS and Hy-Tek documents in `99-sources.md` as ground truth; treat anything tagged UNVERIFIED as a lead to confirm, not a fact to assert.

## The stack in one paragraph

A Colorado Time Systems (CTS) **Gen7** timing console captures swim times from **touchpads** (primary) and **pushbuttons / plungers** (backup) wired to per-lane inputs, started by a **start system**. On this rig the system is run by **FOUR separate computers**, not one (operator-confirmed 2026-06-19 — full detail in `07`):

1. **CTS laptop** — runs **Gen7 Swimming** (user's stack v2024.0.1), connected to the Gen7 timer (Ethernet, link-local APIPA). This is where the meet/session and event sequence are built on the timer.
2. **Scoreboard laptop (DisplayLink Plus)** — runs **DL+** and drives the LED **scoreboard**. Meet details / swimmer **names** are loaded here from a **USB stick**, then **Save and Send** pushes them to the board. Live **times** reach DL+ over serial **COM3** (CTS Timer #1).
3. **Meet Manager laptop (primary)** — runs **Hy-Tek Meet Manager**, wired to the Gen7 **MM (Meet Management) port** to pull race **times** (Get Times). The **operator vets race results** here.
4. **Meet Manager laptop (DQ entry)** — a second machine running Meet Manager, used **only to enter DQ data** into the race results, which the operator on machine 3 vets.

Do NOT describe this as one "operator laptop running all the apps" — that is wrong. The four roles are on four physical machines.

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
- **Refined (operator-confirmed 2026-06-19): DL+ and Meet Manager run on SEPARATE laptops**, so "COM3 on DisplayLink must match COM3 on Meet Manager" is NOT a cross-machine requirement. Each app simply has to point at the COM port that **its own Windows machine** assigned to the Gen7 cable plugged into it. On this rig both happen to be **COM3** (a per-machine coincidence — each laptop's serial port landed on COM3), which is what made the "must match" idea look like a rule. The real rule: on each machine, set the app to that machine's own correct local COM port (verify in **Device Manager > Ports**); if the number drifts after a reboot or a different USB/PCIe slot, that machine's link breaks. They need not be the same number across the two laptops.
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
- **Team Scores + Complete Event Results (live auto-feed): NOT available on this rig — a Gen7 Swimming upgrade is required. [HIGH, F1034 p.81]** Confirmed verbatim in the authoritative manual (verified 2026-06-19): *"Starting with Gen7 Swimming v2026 and DL+ v4.7.0, support for Team Scores and Complete Event Results was added."* So the floor is **BOTH Gen7 Swimming v2026 AND DL+ v4.7.0**. DL+ is met (v4.7.0); the **Gen7 Swimming software V2024.0.1 is below v2026** and is the limiting component → upgrading Gen7 Swimming to the v2026 line is required (current build **v2026.0.3**, released 2026-06-09). NOTE: the CTS *web product page* lists only "DisplayLink+ v4.7.0 required" and omits the Gen7 floor — that page is **incomplete vs the manual**; trust F1034. (Even on a v2026 stack, per F1034 p.85 these data relay to the scoreboard but do NOT render in the Gen7 software — see `07`.) Names work today regardless.

**Names-path reality (operator-confirmed 2026-06-17): names currently move via a USB STICK, not live.** The workflow: export the start list / names to a USB drive, then load them into DL+ on the scoreboard PC. The Gen7 setting "UDP Scoreboard Names = This Computer" exists, but UDP names are NOT the active transport on this rig. So the split is: **times** flow LIVE over serial **COM3** (Gen7 -> DL+ CTS Timer #1, and Gen7 -> Meet Manager CTS6 Pool 1); **names** are the manual USB download/upload. Eliminating that USB step (moving names onto the live UDP/RS-485 path, which needs RS-485 to DL+ plus Gen7 v2023+ / DL+ v4.6+) is the standing improvement goal. See `02` for the UDP-names requirements and `07` for the verified config.

## What was NOT verified (do not assert as fact)

The research confirmed the console-to-PC and scoreboard interfaces but did **not** verify:

- Exact touchpad/pushbutton lane-input **pinouts** and start-system cable wiring.
- Dual/multi-pad lane physical wiring and Gen7 menu configuration.
- The precise **pad-vs-button backup-time reconciliation logic / tolerance** (when the button overrides or flags the pad time).
- Where pool length / lane count / event sequence are set in the **Gen7 on-console menus**, and an authoritative step-by-step pre-meet checklist.

These are listed as open questions in `06-pre-meet-checklist.md` so the agent can ask or look them up rather than hallucinate.
