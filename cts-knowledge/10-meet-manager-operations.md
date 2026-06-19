# Hy-Tek MEET MANAGER for Swimming — Timing Operator Operations

> Ingested 2026-06-19 from a verified pass over the Hy-Tek SWMM7/8 user guides (sources in `99-sources.md`). Scope: operating the **Run screen** of Hy-Tek MEET MANAGER for Swimming (this rig: Release 8.0Gf, Pro Multi-User) as the *timing operator* driving a CTS Gen7. The CTS↔MM serial interface (console select, Open/Close Serial Port, the COM-port rule) is in `03-meet-manager-interface.md` and is NOT repeated here. Docs cited are the SWMM7 user guide (menus/hotkeys match SWMM8 unless flagged); confirm edge cases on the actual 8.0Gf install.

## The Run screen and getting times

- Times reach MM from two sources the console stores before transfer: a timer pushing a **button** and an athlete **touching a pad**. [HIGH] [swmm7 timingconsoleinterface]
- **Get Times = F3** retrieves the result for the **event + heat currently shown on the Run screen**; the requested event/heat must match the active event/heat in Run. Preferred method because it assumes correct operator entry. [HIGH] [swmm7 gettimesf3andracef2sel]
- **Race # = F2** retrieves by the timer's sequential **Race Number** (assigned by the timer starting at 1), entered manually. Less safe — it returns any race regardless of event match — but useful when the wrong event/heat was set in the timer. [HIGH] [swmm7 gettimesf3andracef2sel]
- Both pull **final times, backup button times, and splits**. CTS 4/5/6 stores finish times, backup button times, and split times, all immediately available. [HIGH] [swmm7 gettimesf3andracef2sel] [swmm7 ctstimer]
- On retrieval MM validates: active event/heat, expected split count, number of athletes/relays, and lanes used. On mismatch you get an alert with **Accept or Reject**. [HIGH] [swmm7 gettimesf3andracef2sel]
- Lanes with no times (scratched / missed race) are auto-entered in the Heat List as **NS (No Show)**. [HIGH] [swmm7 gettimesf3andracef2sel]
- View splits: **Splits = F9**. [HIGH] [swmm7 timingconsoleinterface]

## Run-screen columns and toggles (Heat Window)

| Column | Meaning | Source |
|---|---|---|
| Finals Time (blue) / Prelim Time | where the result lands (Prelims shows Seed Time instead) | [HIGH] [swmm7 heatwindow] |
| React | start reaction time | [HIGH] [swmm7 heatwindow] |
| DQcode | disqualification code | [HIGH] [swmm7 heatwindow] |
| Competitor # | assign athlete to an empty lane | [HIGH] [swmm7 heatwindow] |
| AdjStat | adjustment status of pad time vs backup | [HIGH] [swmm7 heatwindow] |

- **Ctrl-B** toggles the **3 backup-time columns** in the heat-results grid. [HIGH] [swmm7 runscreenappearance]
- **Ctrl-T** toggles the **Reaction Times** column. Reaction times require a compatible timer (CTS 6, Omega ARES 21 Bi-Directional, latest OSM6, OmniSport 2000). [HIGH] [swmm7 runscreenappearance] [swmm7 timingconsoleinterface]
- **Ctrl-Q** toggles the **DQ Codes** column. [HIGH] [swmm7 runscreenappearance]
- **Ctrl-I** toggles Records vs Splits in the upper-right window; **Ctrl-Y** swaps team scores for records. [HIGH] [swmm7 runscreenappearance]

## Reconciling pad vs backup (Lane Malfunction)

MM compares pad-touch time to backup button time and flags lanes for review. [HIGH] [swmm7 lanemalfunction] This is the Meet-Manager side of the pad-vs-button reconciliation; the console side (Accept-backup / Add-Minus-touch / Finish-Arm) is in `09-operator-procedures.md`.

| Flag | Meaning |
|---|---|
| Yellow "y" | official backup is **0.31s+ faster** than pad (likely late touch) [HIGH] [swmm7 lanemalfunction] |
| Blue "b" | official backup is **0.31s+ slower** than pad (off by default) [HIGH] [swmm7 lanemalfunction] |
| Blue (no mark) | pad time exists, no official backup — needs watch-time check [HIGH] [swmm7 lanemalfunction] |
| Green "g" | two backups with conflicting accuracy (off by default) [HIGH] [swmm7 lanemalfunction] |

- Open the time-adjustment window via the **Calc** button, **Ctrl-K**, or clicking the b/y/g flag. [HIGH] [swmm7 lanemalfunction] (NOTE: the rig's observed run-screen legend in `03` labeled Ctrl-K "Restore Pads"; the SWMM7 doc maps Ctrl-K to this adjustment window. Confirm the exact Ctrl-K label on the live 8.0Gf install — possible version/label difference.)
- Window columns: **Button Calc** (official backup), **Difference** (vs primary), **Adjusted** (replacement time, FINA-rule default), **Adjusted HPL / Adjusted PL** (recomputed places), **Use** checkbox (per-lane override). Apply with **Accept Adjusted**; keep originals with **Reject Adjusted**. Uncheck **Use** to keep the pad time. [HIGH] [swmm7 lanemalfunction]
- Threshold rationale: a backup **0.30s or more** different from the pad is "likely a bad touch." [HIGH] [swmm7 backuptimeaveraging] (Consistent with this rig's Gen7 Backup Comparison Interval = 0.30s, `07`.)

## Backup-time averaging (two backups)

Set under **Preferences (Alt-P) / Backup Times** (Run menu). [HIGH] [swmm7 runmenupreferences] [swmm7 backuptimeaveraging]

- Averaging method for two backups: **Truncate** (USA Swimming), **Round up** (Canada), **Use the Slowest** (Australia/NZ); FINA averages without specifying. [HIGH] [swmm7 backuptimeaveraging]
- **Hide Backup Button 3** option if only two backup buttons are used. [HIGH] [swmm7 backuptimeaveraging]

## DQ entry (note: a dedicated machine does DQ on this rig — see `07` machines #4)

- Enter the code in the **DQcode** column (toggle with **Ctrl-Q**); right-click a DQ code to pick the official's name if entered in the Officials Menu. [HIGH] [swmm7 heatwindow]
- You may check **DQ and still enter a time** so the coach sees it; the Meet **Results Report shows only "DQ"**. [HIGH] [swmm7 faq / swmm7 enterresults]
- Result indicators on reports: **J** = Judge's Decision, **X** = Exhibition, **x** = ineligible to score. [HIGH] [swmm7 resultsreport]

## Scoreboard / Alpha Scoreboard interface (MM side)

Menu: **Run bar > Interfaces / Scoreboard**. [HIGH] [swmm7 scoreboardinterface] (See `02` and `03` for how this relates to the Gen7's serial/COM3 times path vs the live-names path.)

- For a generic scoreboard, use **Interfaces / Scoreboard (Genser)**. UDP path: **Interfaces / Scoreboard (Genser) / Set UDP Port and IP Address** — enter Port + IP; data broadcasts to that IP/port. Serial path: **Open/Close Serial Port** then **Configure Serial Port** (baud 1200/2400/4800/9600). [HIGH] [swmm7 scoreboardinterface]
- An **Alpha Scoreboard** = scoreboard + computer that displays names/teams; vendor choices include Daktronics, Fairtron, Generic, None (Generic exports a parseable format for any controller). [HIGH] [swmm7 scoreboardinterface] [swmm7 setupalphascbd]
- Generic-interface push hotkeys: **Ctrl-F10** send current heat start list; **Ctrl-F11** send top-8 (or 9–16) results; **Ctrl-F9** send team scores for the gender; **Ctrl-F12** send the full compiled event results. [HIGH] [swmm7 scoreboardinterface]

> UDP **port 60287** is part of this rig's CTS Alpha-Scoreboard config (per F1034, see `02`) but is **NOT stated in the Hy-Tek SWMM7/8 docs** — the Hy-Tek side just says "enter Port + IP." So 60287 is the CTS-manual value, not a Hy-Tek default. [HIGH per F1034 in `02`; not in Hy-Tek docs]

## Meet Mobile publishing

- Meet Mobile = an Apple/Android app by ACTIVE Network. Enable at **Set-up / Meet Mobile Publishing** from the MM main screen. [HIGH] [swmm7 meetmobilepublishing]
- Publishes: meet info/schedule, psych sheets, rosters, records/time standards, optional heat sheets, and **meet results + team scores in real time as MM receives data**; upload is automatic with an internet connection. [HIGH] [swmm7 meetmobilepublishing]
- Tiers: Restrict Heat Sheet Data (free), Free Heat Sheets (free), Full Meet Data (from $1.99, 40% host revenue share; non-USA locked at $1.99). [HIGH] [swmm7 meetmobilepublishing]
- **Version note:** menu path, real-time results, and revenue model are **identical in SWMM8**. [HIGH] [swmm8 meetmobilepublishing]

## Reports / labels (timing-relevant)

- **Results Report**: Reports / Results. Shows places, times, DQ, splits (None / Cumulative / Subtracted / Legal / Combined), can include DQ/No-Show/Scratch via checkboxes. Formats include Results-by-Heat (common for summer leagues), Dual-Meet, Flat HTML. [HIGH] [swmm7 resultsreport]
- **Re-Score = Alt-O** rescoring all events; **Scores Report** via Reports / Scores. [HIGH] [swmm7 runthemeetmenubar]
- **Lane/Timer Sheets**: Reports / Lane/Timer Sheets (printed per-lane sheets for manual backup). [HIGH] [swmm7 lanetimersheets]

## Troubleshooting (timing)

- **Negative response / no connection → serial port resets to 0**; reopen the port. Check: console on and in Swimming, cable to console **port 1**, correct COM in MM, cable firmly seated. [HIGH] [salesforce CTS5/6 article] [swmm7 ctstimer]
- **"Port already Open"** = another program holds the COM port. [HIGH] [swmm7 ctstimer]
- Power-cycle the CTS before each meet to force a new "CTS meet." CTS 4/5/6 **cannot store Prelims and Finals for the same event in one CTS meet**; use Next/Previous Meet on the console to pick the right data set. [HIGH] [swmm7 ctstimer]
- **"No Results found" on Get Times** typically follows MM being **restarted after the meet started**. Recover via Interfaces / Timer / "Select data set stored" → Previous Meet → pick the right meet. [COMMUNITY — Superior Swim Timing, not Hy-Tek; verify before relying]

## Not found in the docs (defer / verify — do not assert)

- The **"Event Sequence not received from meet management software"** error string is in the CTS/Gen7 docs (`02`/`05`), NOT in any fetched Hy-Tek page — do not source a Hy-Tek-side fix for it.
- A distinct **"Restore Pads"** button/hotkey and **Judge's Decision (JD)** as a discrete Run action were not found in the SWMM7 docs (JD appears only as a results indicator "J"). The rig's photo legend (`03`) shows these labels; reconcile on the live install.
- **Release 8.0Gf-specific deltas** beyond Meet Mobile (confirmed identical to SWMM7) were not located; treat hotkeys/menus as SWMM7-accurate and re-confirm edge cases on 8.0Gf.
