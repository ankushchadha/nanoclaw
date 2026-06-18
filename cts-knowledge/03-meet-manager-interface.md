# Hy-Tek Meet Manager Interface Reference

> Consolidated Meet Manager (SWMM 6/7/8) settings for driving a Gen7. Cross-references Path A (serial times) and Path B (UDP names).

> **This rig (verified 2026-06-17):** Hy-Tek's MEET MANAGER for Swimming, **Release 8.0Gf, Pro Multi-User**, Licensed To "Valley Swim Association". Console type set to **Colorado Time Systems 6**, serial **CTS6 Timer Pool 1 = COM3** (reports "Communications Passed"). **Meet Mobile** is a Hy-Tek menu/feature (results to the Active "Meet Mobile" app) with no separate connection panel observed on this rig; treat its config as not-yet-documented. **Topology:** Gen7 (CTS) <-> Meet Manager over the **MM (Meet Management) serial port = COM3** for event/time data; swimmer **names go to the Gen7 and the scoreboard via a USB drive** (manual), not a live link.

## Console type selection

- **Set-up > Timing Console Interface.**
- Select **Colorado Time Systems 6** or **Colorado Time Systems 5**. **No native Gen7 entry exists**; the Gen7 is driven through the CTS 5/6 mapping. [HIGH]
- Officially supported CTS consoles in Meet Manager: **CTS 4, CTS 5, CTS 6, CTS Dolphin**. **CTS 5 and 6 support event schedule download** (pushing names/events to the console). [HIGH, swmm7]
- Caveat: the CTS-5/6 designation is a **legacy mapping**; a future Meet Manager could add a native Gen7 option, so do not hard-code the assumption that "Gen7 == pick CTS 6 forever."

## Two Meet Manager menus, two jobs

| Job | Meet Manager menu | Key value |
|-----|-------------------|-----------|
| Pull race **times** from the Gen7 | **Set-up > Timing Console Interface** (CTS 5/6) → **Run > Interfaces > Timer > Open/Close Serial Port** | COM port = the PC's Device Manager port |
| Push **names / start lists / events** live (UDP) | **Set-up > Alpha Scoreboard Interface** (Generic, UDP Ethernet) → **Run > Interfaces > Scoreboard > Set UDP Port and IP Address** | Port **60287** + timer IP / `255.255.255.255` |

Do not expect one menu to do both. Times = timer interface. Names/results = Alpha Scoreboard interface.

## Connection Method selector nuance

- The **generic timing-console interface** has a **Serial Port (or USB-to-Serial) vs UDP Ethernet** Connection Method selector. [HIGH, swmm6 setuptimingconsoles.htm]
- The **UDP Ethernet** option there is surfaced for the **OmniSport 2000** timer, not the Gen7. For the Gen7 the standard timer interface is **serial**; the Gen7's UDP capability is the separate Alpha Scoreboard path. [Verified, 2-1 scope caveat]
- Most timing consoles communicate with Meet Manager over a **serial connection** by default. [HIGH]

## Serial port specifics

- **Run > Interfaces > Timer > Open/Close Serial Port**, enter the cable's COM port. [HIGH]
- Range **1-64** (older docs 1-60, normally 1-8). [HIGH]
- COM number is the **meet-management PC's** port (console is internally COM 1). Verify in **Device Manager > Ports**. [HIGH]
- A **negative/failed response resets the port to zero**. [HIGH]

## Retrieving times

- **Get Times = F3** (by Event/Heat). [HIGH]
- **Race # = F2** (by Race Number). [HIGH]
- Times are available **after the operator does Store/Print (Save and Reset)** on the Gen7. [HIGH]
- Each retrieval brings pad, backup-button, and split times for the lanes so the operator/referee can reconcile. [HIGH]

### Run-screen hotkeys (verified at the 2026-06-17 meet)
On the Meet Manager Run screen (Finals/Prelims, "Heat N of M, Event X"): **Get Times F3**, **Race # F2**, **Backup 1 / Backup 2 / Backup 3** (the A/B/C plunger columns), **JD (Judges Decision) = Ctrl-J**, **Unseeded = Ctrl-U**, **Restore Pads = Ctrl-K**, **Adjust = FB**, **Awards = Ctrl-A**, **Rel Names = Ctrl-P**, **Score Sheet = F9**. Results window also exposes **Enter Results by Lane = Ctrl-E**. The top menu bar carries Set-up, Reports, Labels, Preferences, **Interfaces**, **OW Module**, **Meet Mobile**, Help. [verified, IMG 0419/0421]

## Data-format / baud / null/d0/d4 notes

> PARTIALLY UNVERIFIED. The research confirmed the menu paths, console-type mapping, COM range, and Get Times keys, but did **not** independently verify specific baud rate or a "null / d0 / d4" data-format field for the Gen7 path. For USB the Gen7 needs **no baud configuration** (the virtual COM presents the link). If a legacy CTS-6 serial setup needs an explicit baud/data-format, confirm against the Hy-Tek CTS 6 timing-console help page before asserting values. Do not invent a baud number.
