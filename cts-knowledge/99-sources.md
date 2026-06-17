# Sources and Verification Provenance

> Generated from a deep-research pass on 2026-06-16: 6 search angles, 21 sources fetched, 80 claims extracted, top 25 verified with 3-vote adversarial verification (need 2/3 refutes to kill). Result: 25 confirmed, 0 killed. Quality tags are the workflow's source ratings.

## Primary sources (CTS official)

- **Gen7 Serial Timer User Guide (F1034)**, current Rev 202603. The single richest source; carries the UDP port 60287, RS-485 name-integration requirement, version floors, USB-Connect details, and Save-and-Reset dataflow.
  https://coloradotime.com/hubfs/CTS%20Website%20%20Assets/Manuals/Swim%20Timing%20Components/Gen7/Gen7SerialTimerUserGuide_F1034.pdf
- **Gen7 Networking Information (F1066)**. Same-network requirement, auto-discovery, R-SJ-xx cable, ports TCP 22 / TCP 7105 / UDP 5353.
  https://coloradotime.com/hubfs/CTS%20Website%20%20Assets/Manuals/Swim%20Timing%20Components/Gen7/Gen7_Networking_Information_F1066.pdf
- **CTS Support: Manuals portal** (lists F1034, F1066, F1041, F1044, F1049 Gen7 docs; F1062 DisplayLink Video to Broadcast).
  https://coloradotime.com/support/manuals
- **CTS Support: System 6 Troubleshooting Guide** (symptom-based: blank/garbled scoreboard, DIP/logical address, pad-armed indicator, start system, event-sequence download). System-6-era but the scoreboard/pad/serial concepts carry to Gen7; mined into file 05.
  https://coloradotime.com/support/system-6-troubleshooting-guide
- **CTS Support: Connecting a meet-management computer to a CTS timing console** (COM port is the PC's, not the console's; always standard cable, no null modem).
  https://coloradotime.com/support/connecting-a-meet-management-computer-to-a-cts-timing-console
- **CTS Support: DisplayLink Plus Team Scores and Event Results** (v2026 / DL+ v4.7.0 feature gating).
  https://coloradotime.com/support/displaylink-plus-team-scores-and-event-results
- **CTS Gen7 User Manual (ManualsLib mirror)** (Ethernet support, "Event Sequence not received" troubleshooting p.46).
  https://www.manualslib.com/manual/2016962/Colorado-Time-Systems-Gen7.html
- **Championship Elite Starter (F1064)** (start system).
  https://www.coloradotime.com/hubfs/CTS%20Website%20%20Assets/Manuals/Swim%20Timing%20Components/Start%20Systems/Elite/Championship%20Elite%20Starter_F1064.pdf
- **CH41-8 8-lane touchpad + pushbutton primary cable harness** (product page).
  https://shop.coloradotime.com/products/8-lane-touchpad-and-pushbutton-primary-cable-harness-ch41-8
- **Gen7 Serial Connect Hubs** (product page).
  https://coloradotime.com/products/gen7-swim-timing-serial-connect-hubs

## Primary sources (Hy-Tek / Active)

- **Interface with Colorado Gen 7 Timer** (Gen7-specific: pick CTS 6 or 5; Run > Interfaces > Timer > Open/Close Serial Port; Device Manager port).
  https://activenetwork.my.salesforce-sites.com/hytekswimming/articles/en_US/Article/Interface-with-Colorado-Gen-7-Timer
- **Interface with CTS 5 or CTS 6** (dataflow: pad touch stores time; Store/Print; Get Times F3 / Race # F2; COM range 1-64; port resets to 0 on failure).
  https://support.activenetwork.com/hytekswimming/articles/en_US/Article/Interface-with-CTS-5-or-CTS-6
- **SWMM 7 Timing Console Interface** (supported consoles CTS 4/5/6/Dolphin; CTS 5/6 support event schedule download).
  https://hytek.active.com/user_guides_html/swmm7/timingconsoleinterface.htm
- **SWMM 6 CTS Timer** (9-pin cable; some early CTS 6 need null modem; COM 1-60 normally 1-8; verify via Device Manager).
  https://hytek.active.com/user_guides_html/swmm6/ctstimer.htm
- **SWMM 6 Set-up Timing Consoles** (Serial vs UDP Ethernet Connection Method; UDP surfaced for OmniSport 2000; USB-to-serial adapter).
  https://hytek.active.com/user_guides_html/swmm6/setuptimingconsoles.htm

## Lower-confidence / supporting

- **Marco's Corner: Colorado timing console scoreboard protocol** (blog; byte-level scoreboard serial protocol, useful for stream decoding only).
  https://marcoscorner.walther-family.org/2015/07/colorado-timing-console-scoreboard-protocol/

## Sources fetched but rated unreliable / yielded no verified claims

- PVSwim CTS Training Manual PDF (rated unreliable).
- SwimTopia CTS troubleshooting / running-your-meet beta articles (rated unreliable).

## Verification stats

| Metric | Value |
|--------|-------|
| Search angles | 6 |
| Sources fetched | 21 |
| Claims extracted | 80 |
| Claims verified (top set) | 25 |
| Confirmed | 25 |
| Killed | 0 |
| Findings after dedup/synthesis | 12 |
| Adversarial verification | 3-vote (2/3 refutes to kill) |

## Confidence legend used across these files

- **[HIGH]** = verified 3-0 against a primary source (often two).
- **Vendor conflict / 2-1** = verified but with a documented disagreement between CTS and Hy-Tek (the cable null-modem question).
- **UNVERIFIED / NOT VERIFIED / open question** = not covered by the verified claim set; treat as a lead to confirm from F1034 or by asking the operator, never assert as fact.
