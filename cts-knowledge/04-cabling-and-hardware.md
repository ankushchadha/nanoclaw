# Cabling, Ports, and Hardware Interconnect

> What plugs into what. The "This rig's actual wiring" section below is ground truth from the operator's own back-panel photos + the CTS Gen7 Quick Start Guide (2026-06-19) and OVERRIDES the generic options where they differ. Pin-level pinouts remain unverified.

## This rig's actual back panel + wiring (GEN7-TMR-L "Legacy", verified 2026-06-19)

**Model: `GEN7-TMR-L`** (the **"L" = Legacy** on-deck Gen7 timer), S/N 202214306, 12VDC / 7A. Confirmed from the device nameplate + back-panel photos.

**Back-panel ports, left → right** (photos IMG_0467/0469/0470/0471):
- **Scoreboard outputs (left cluster, labeled SCOREBOARD):**
  - a **1/4-inch phone jack** (the legacy CTS scoreboard-data output), next to a **green circle** marker — **THIS is the output in use on this rig.**
  - two **round 4-pin connectors** marked with a **blue square** and a **black diamond** = the **RS-485 SCBD outputs** (F1034: "Scoreboard output: RS-485, differential pair"). **Currently UNUSED / empty.**
- **CTS Expansion Port** (monitor/computer icon): **USB Type-B**. Unused.
- **Meet Management port** (stopwatch+report icon, "MM" sticker): **USB Type-B**. → Meet Manager laptop.
- **USB-A** port. Unused.
- **Ethernet** (network icon, "CTS" sticker): RJ45. → CTS laptop.
- **START** inputs (left, round): start-system. Not plugged in in this state.
- **NEAR END** harness connectors (2 large, in use) + **FAR END** harness connectors (4 slots, **all empty** — far-end not physically wired; near-end-only timing).
- **12VDC / 7A** power.

**The CTS Quick Start Guide's 6 connections (authoritative topology, photos IMG_0472–0475):**
| # | Connection | Cable | Endpoint |
|---|-----------|-------|----------|
| ① | Power | Power supply | GFCI outlet |
| ② | **Timer Interface** | **CAT6 / Ethernet** | **CTS laptop** (Gen7 Swimming) |
| ③ | Near-end timing | CH41-10 harness | pads + pushbuttons |
| ④ | Far-end timing (**OPTIONAL**) | harness | far-end pads (not used here) |
| ⑤ | **Meet Management** | **USB A-B cable** | **Meet Manager laptop** |
| ⑥ | **Scoreboard** | scoreboard cable | **"Otter SCBD" or "Matrix / DL+"** (this rig = DL+ → matrix LED board) |

**So the real data paths on this rig:**
- **Times/scoreboard data → DL+:** Gen7 **1/4" legacy scoreboard output** → cable → **DL+ scoreboard laptop**, read as **CTS Timer #1 = COM3, "Colorado" protocol** (see `07`) → DL+ drives the matrix LED board. (A laptop has no 1/4" jack, so a 1/4"-to-serial/USB adapter is in that path; the COM number is the laptop's, not the cable's.) **This is NOT RS-232 and NOT the RS-485 SCBD outputs.**
- **Times/events → Meet Manager:** Gen7 **MM port (USB Type-B)** → **USB A-B cable** → MM laptop, seen as a virtual COM port (here COM3).
- **Control → CTS laptop:** Gen7 **Ethernet** → **CAT6** → CTS laptop (APIPA/auto-discovery).

**The live-names upgrade (now concrete):** names can't ride the legacy 1/4" output. The Gen7's **RS-485 SCBD outputs (the blue-square / black-diamond round connectors) are present and EMPTY** — connect the DL+ computer to one of those via **RS-485** to meet F1034's name-integration requirement (software floors already met). The upgrade is "move/add the DL+ link to the unused RS-485 port," not a mystery cable. [F1034 Appendix C]

## W-1236 cable (the "monster jack") — caveat

The operator's scoreboard cable has a **1/4" phone-plug** end (fits the Gen7's 1/4" legacy output). The operator guessed it is a **"W-1236"** — but W-1236 is a **Daktronics/Fairplay** scoreboard cable (male-to-male 1/4" stereo), **NOT a CTS part** (CTS store returns no results for it). So the *connector* matches, but the exact part number is UNVERIFIED — it may be a Daktronics W-1236 or a CTS 1/4" scoreboard cable. Do not assert "W-1236" as the CTS cable.

## Lane input harness

- **CH41-10**: the **10-lane** touchpad-and-pushbutton **primary** cable harness (correct for this 10-lane pool). The `CH41-N` suffix is the lane count (CTS sells CH41-6 / CH41-8 / CH41-10); the matching 10-lane pushbutton **backup** harness is **CH41-10-3**. [HIGH, shop.coloradotime.com] *(An 8-lane CH41-8 would cover only 8 of the 10 lanes — do not spec it for this pool.)*
- Per-lane breakout block carries labeled connectors: **PRIME** = touchpad; **BUTTON A / B / C** = the three pushbuttons/plungers. Working convention on this rig: pad + plunger A + B active, C spare. [verified, IMG 0449/0450]

## Alternative console-to-PC methods (not used on this rig, for reference)

F1034 documents other ways to connect Meet Manager to the timer if the USB A-B path isn't used:
- **9-pin RS-232 serial cable** (standard/straight-through; CTS says no null modem, Hy-Tek notes some early CTS-6 need a null modem — [vendor conflict, 2-1]).
- **USB-Connect device** (emulates a 9-pin null-modem serial link entirely over USB → virtual COM port). [HIGH, F1034]
- **Gen7 Serial Connect Hubs** (CTS product for serial fan-out).
This rig uses the **USB A-B** MM-port path instead (see above).

## Start system

- **Championship / Elite Starter** (CTS, documented in **F1064**) — a poolside unit with a **strobe + horn** (IMG_0484). It provides the gun/horn start reference. **Wiring (operator-confirmed 2026-06-20):** the starter's cable **joins the on-deck harness** at the poolside breakout block, alongside the touchpad and plungers (the breakout is labeled **START / BACKUP** — IMG_0482). So the start signal reaches the Gen7 through the harness path, not a separate dedicated run. Pinout NOT extracted.

## NOT VERIFIED (lead, not fact)

- Exact **lane-input PIN-level pinouts** inside the PRIME/BUTTON connectors (connector-level labeling is confirmed above; pin-level is not).
- **Start-system cable wiring / pinout.**
- **Dual / far-end pad** physical wiring (far-end is unused here).
- The exact electrical signaling of the **1/4" legacy scoreboard output** vs the RS-485 outputs (F1034 specs RS-485 for the round connectors; it does not separately spec the 1/4" jack's signaling — DL+ reads it as the "Colorado" protocol).
- The **R-SJ-xx** cable name (previously cited to F1066) is **absent from F1034 and F1066** — UNVERIFIED; the CTS guide just calls the timer-interface cable "CAT6."

A community blog (Marco's Corner) documents the CTS scoreboard serial protocol at the byte level (lower confidence than CTS docs). See `99-sources.md`.
