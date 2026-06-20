# Hy-Tek Meet Manager Interface Reference

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value. See `08`.

> Consolidated Meet Manager (SWMM 6/7/8) settings for driving a Gen7. Cross-references Path A (serial times) and Path B (UDP names).

> **This rig (verified 2026-06-17):** Hy-Tek's MEET MANAGER for Swimming, **Release 8.0Gf, Pro Multi-User**, Licensed To "Valley Swim Association". Console type set to **Colorado Time Systems 6**, serial **CTS6 Timer Pool 1 = COM3** (reports "Communications Passed"). **Meet Mobile** is a Hy-Tek menu/feature (results to the Active "Meet Mobile" app) with no separate connection panel observed on this rig; treat its config as not-yet-documented. **Topology:** Gen7 (CTS) <-> Meet Manager over the **MM (Meet Management) serial port = COM3** for event/time data; swimmer **names go to the Gen7 and the scoreboard via a USB drive** (manual), not a live link.

## Console type selection (Set-up > Timing Console Interface / "Select Your Timing System")

- **CORRECTED 2026-06-17 (verified on MM 8.0Gf):** the timing-system list has a dedicated **"Colorado Time Systems 6 and Gen 7"** entry (the top CTS radio). **Select that for the Gen7.** The earlier research note ("no native Gen7 entry, use CTS 6") was from older Meet Manager versions; 8.0Gf added the combined CTS-6-and-Gen-7 option. Once selected, the serial sub-dialog still reads "Select Serial Port for CTS 6". Other CTS entries: Colorado Time Systems 5 / 4 / Dolphin / Dolphin with Splits.
- **CTS 5/6/Gen7 support event schedule download** (pushing names/events to the console). [HIGH, swmm7]
- **Connection Method** (same dialog): **Serial Port or USB to Serial** vs **UDP Ethernet**. The **UDP Ethernet** option is labeled **"OmniSport 2000 Only"** and does NOT apply to the CTS/Gen7. For the Gen7, use **Serial Port** (this rig: COM3). So this dialog is NOT a path to UDP scoreboard names; that is a separate mechanism (see `02` "Enabling live UDP names").

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
