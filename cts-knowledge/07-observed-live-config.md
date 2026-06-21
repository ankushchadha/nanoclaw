# Observed Live Configuration (Ankush's actual rig)

> Ground truth captured 2026-06-16 from photographs of the running system. This OVERRIDES generic assumptions in the other files where they differ. Marked CONFIRMED (seen on screen) vs INFERRED (reasoned from what is shown).

## ⭐ RIG PARAMETERS — the authoritative single source for this rig's instance values

> This table is the **canonical source of truth** for every rig-specific (instance/config) value. The semantic files (00–06, 10, 11) state general CTS *rules*; where they mention a value for THIS rig, **this table governs.** Two-axis status per row: **rig-confirmed** (seen on the rig: photo/operator/date) vs **candidate** (derived or web-inferred — confirm on the rig before relying). See `08` for the convention.

| Parameter | This rig | Provenance | Status |
|---|---|---|---|
| Lanes / ends used | **10 lanes, NEAR-END only** (far-end pads not wired) | back-panel photos | rig-confirmed 2026-06-19 |
| Course | **25 yd / SCY** | Run-screen status bar | rig-confirmed 2026-06-17 |
| Timer model | **GEN7-TMR-L** (Legacy) | nameplate IMG_0468 | rig-confirmed 2026-06-19 |
| Timer S/N | **202214306** | nameplate + Available Timers | rig-confirmed |
| Gen7 Swimming software | **v2026.0.3** (UPGRADED from V2024.0.1 on 2026-06-20; timer firmware also updated, ~25 components) | installer UAC + release-notes screens IMG_0505/0506/0512 | rig-confirmed 2026-06-20 |
| **Team Scores + Complete Event Results (live)** | **NOW SUPPORTED** post-upgrade: Gen7 v2026.0.3 + DL+ v4.7.0 both floors met. Verify they render (per F1034 p.85 they show on the LED board, not the Gen7 operator screen). | F1034 p.81 + upgrade IMG_0505/0512 | floor met 2026-06-20; render not yet separately verified |
| DisplayLink Plus | **v4.7.0** (CC Express) | title bar/splash | rig-confirmed 2026-06-17 |
| Meet Manager | **8.0Gf Pro Multi-User** (Valley Swim Association) | MM screen IMG_0451 | rig-confirmed 2026-06-17 |
| Lane harness | **CH41-10** (10-lane primary; CH41-N = N lanes) | derived from lane count | **candidate** — confirm the actual harness label on the rig |
| Scoreboard output in use | **1/4" LEGACY jack**; RS-485 SCBD outputs (blue □ / black ◆) EMPTY | back-panel photos IMG_0467/0469 | rig-confirmed 2026-06-19 |
| Gen7 ↔ Meet Manager | **MM port USB Type-B → USB A-B → virtual COM3** | panel + CTS Quick Start Guide | rig-confirmed 2026-06-19 |
| Gen7 ↔ CTS laptop | **Ethernet / CAT6** ("CTS" RJ45 port) | panel + CTS guide | rig-confirmed 2026-06-19 |
| DL+ timer input | **CTS Timer #1 = COM3, "Colorado" protocol** | DL+ Comm Ports screen | rig-confirmed 2026-06-17 |
| Network | **APIPA link-local 169.254.x.x — changes per session, DO NOT hard-code** | Gen7 status bar | rig-confirmed; **volatile** |
| UDP Scoreboard Names setting | **"This Computer"** | Gen7 Settings screen | rig-confirmed 2026-06-17 |
| Names transport | **USB stick** (SCB files → loaded into BOTH Gen7 + DL+); live names not yet wired | operator | rig-confirmed 2026-06-19 |
| Start system | CTS Championship/Elite starter (strobe + horn); its cable joins the **on-deck harness** (same poolside breakout as the touchpad + plungers — START / BACKUP labeled), not a separate panel jack | operator + IMG_0482/0484 | rig-confirmed 2026-06-20 |

When any of these changes (re-cabling, a software update, a different harness), **update this table first**, then reconcile the semantic files against it (see the contradiction check in `08`).

## The machines on deck: FOUR separate computers (operator-confirmed 2026-06-19)

This rig is run by **four distinct computers**, each with one job. This is authoritative ground truth from the operator and OVERRIDES any text elsewhere that implies a single "operator laptop" runs everything.

| # | Machine | Software | Connection to the Gen7 | Role |
|---|---------|----------|------------------------|------|
| 1 | **CTS laptop** | Gen7 Swimming (v2024.0.1) | **Ethernet / link-local APIPA** (169.254.x.x, auto-discovery) | Build the meet/session + event sequence on the timer; run timing |
| 2 | **Scoreboard laptop** | DisplayLink Plus (DL+ v4.7.0) | **Serial COM3** (DL+ "CTS Timer #1") carries live **times**; **swimmer names loaded from a USB stick** then "Save and Send" | Drive the LED scoreboard |
| 3 | **Meet Manager laptop (primary)** | Hy-Tek Meet Manager (8.0Gf) | **Serial via the Gen7 MM (Meet Management) port** (this machine: COM3) | Pull race **times** (Get Times F3); **operator vets results here** |
| 4 | **Meet Manager laptop (DQ entry)** | Hy-Tek Meet Manager | (no direct timer link required) | **Enter DQ data only**, into results the operator on #3 vets |

Key consequences:
- **DL+ (#2) and Meet Manager (#3) are DIFFERENT physical machines.** They both happen to use **COM3**, but that is each machine's own local Windows COM number for its own Gen7 cable — NOT a single shared port and NOT a cross-machine "must match" rule. See the COM3 section below.
- The Gen7 feeds three of these over **separate links**: Ethernet to the CTS laptop (#1), the scoreboard serial stream to DL+ (#2, COM3), and the **MM port** serial link to Meet Manager (#3). The MM port is the Gen7↔Meet-Manager link only; it is NOT the scoreboard/names link (see `02`).
- **Names** ride a **USB stick** to the scoreboard laptop (#2); only **times** are live. Eliminating that USB step is the standing goal (`02`).
- A single Device-Manager capture (below) describes only the ONE machine it was taken on — it does not describe all four.

### Physical wiring CONFIRMED 2026-06-19 (back-panel photos + CTS Gen7 Quick Start Guide)
Timer model = **`GEN7-TMR-L`** ("L" = **Legacy** on-deck timer), S/N 202214306, 12VDC/7A. What is actually plugged in (full detail in `04`):
- **CTS laptop (#1):** Gen7 **Ethernet** ("CTS" RJ45 port) → **CAT6** → CTS laptop. [CTS guide ② "Timer Interface"]
- **Scoreboard laptop (#2, DL+):** Gen7 **1/4" LEGACY scoreboard output** (the jack by the green circle, labeled SCOREBOARD) → cable → DL+ laptop, read as **CTS Timer #1 = COM3, "Colorado" protocol** → DL+ drives the matrix LED board. [CTS guide ⑥ "Matrix / DL+"]. The Gen7's **RS-485 SCBD outputs (blue square / black diamond round connectors) are EMPTY** — that is the unused live-names path (`02`/`04`).
- **Meet Manager laptop (#3):** Gen7 **MM port = USB Type-B** → **USB A-B cable** → MM laptop (virtual COM3). [CTS guide ⑤]. NOT a 9-pin serial cable.
- **Near-end harness only:** the **FAR-END harness connectors are EMPTY** → this rig runs **near-end-only timing**, even though the Gen7 Swimming software setting reads "Far End = Pads" (that is capability config, not physical wiring).
- **Start system via the harness (corrected 2026-06-20):** the starter's cable **joins the on-deck harness** at the poolside breakout block (START / BACKUP labeled, alongside the touchpad + plungers — IMG_0482), not a separate panel START jack. (Supersedes an earlier note that said the start system was "not plugged in" — it is, through the harness path.)
- Lane harness for a 10-lane pool = **CH41-10** (not CH41-8). [shop.coloradotime.com]

## Resolved: which "DisplayLink"

CONFIRMED: the scoreboard app is **CTS DisplayLink Plus (DL+)** by Colorado Time Systems (window title bar read "DisplayLink Plus v4.6.8 (c) Colorado Time Systems"). This is the CTS scoreboard application, NOT the generic DisplayLink USB-graphics driver. So its version DOES gate CTS scoreboard features.

- Version seen in the photo: **v4.6.8**. Ankush states it has since been **updated (to ~4.7.x)**; the exact post-update number still needs to be read off the title bar.
- Implication: DL+ on the v4.7 line clears the **DL+ v4.7.0** floor for Team Scores / Complete Event Results. BUT the Gen7 software side does not (see version verdict below).

## Confirmed software / hardware versions

| Component | Value | Source |
|-----------|-------|--------|
| Gen7 Swimming software | **V2024.0.1** | App title bar |
| Gen7 timer firmware/version | **2024.0.1** | "Available Timers" dialog |
| Gen7 timer serial # | **202214306** | "Available Timers" dialog |
| DisplayLink Plus (DL+) | **v4.6.8** at photo time, updated to ~4.7.x since | DL+ title bar |
| Course | **25y / SCY** (25-yard short-course yards) | Run screen status bar |

## Confirmed network addressing (timer link)

CONFIRMED: the Gen7 timer is reached by the Gen7 Swimming software over **link-local / APIPA addressing (169.254.x.x)**, auto-discovered by serial number with **Auto Connect** enabled.

- Status bar at one point: `Timer: Connected [169.254.9.61]`.
- "Available Timers" dialog: serial 202214306, version 2024.0.1, IP `169.254.206.182`, with RGB **Case Lights** controllable per timer. (The IP differs between shots because APIPA reassigns; do not hard-code it.)
- Practical note for the agent: this rig uses a **direct/island Ethernet network with no DHCP**, so both ends self-assign 169.254.x.x. Auto-discovery (UDP 5353 mDNS, per F1066) finds the timer; "Manual" entry is the fallback. If discovery fails, suspect the two devices landed on different APIPA ranges or a switch/cable issue, not a routing problem.

## Confirmed: the COM3 setting and where it lives

CONFIRMED: In **DL+ > Settings tab > CTS Aquatic Sports > Communication Ports**:

| Port slot | State | COM | Protocol |
|-----------|-------|-----|----------|
| **CTS Timer #1** | **Enabled** | **COM3** | Colorado |
| CTS Timer #2 | Disabled | COM1 | Colorado |
| CTS Timer #3 | Disabled | (none) | Colorado |
| CTS Timer #4 | Disabled | (none) | Colorado |
| Meet Management | Disabled (Click To Enable) | (none) | n/a |

So the COM3 that "must match" is **DL+'s CTS Timer #1 input port**. DL+ reads the CTS timer/scoreboard data stream on COM3.

CORRECTED (operator-confirmed 2026-06-19): DL+ (scoreboard laptop) and Meet Manager (computers-desk laptop) are **separate machines** (see "The machines on deck" above). COM3 here is the **scoreboard laptop's own** local port for the Gen7 serial cable plugged into it; the Meet Manager laptop independently has its own COM3 for the Gen7 MM-port cable. So the rule is NOT "the two must share a COM number" — it is: on **each** machine, point the app at the COM port **that machine** assigned (Device Manager > Ports) to its Gen7 cable. Both being COM3 on this rig is a per-machine coincidence. So Ankush's "DisplayLink COM3 must match Meet Manager COM3" is better understood as "each machine must use its own correct local COM port," which both happen to be COM3.

> Note: the DL+ "Meet Management" port slot exists but is currently **disabled**, and CTS Timer #2 is parked on COM1. Only CTS Timer #1 / COM3 is live.

## Confirmed: scoreboard names are working

CONFIRMED: DL+ "Active Display" rendered a full heat board: `EVENT 6 / HEAT 2 / BOYS 7-8 25 FR`, ten lanes with PLACE and **swimmer NAMES** (MARTINEZ-FONT, HANSON, ELLSWORTH, KIRK, LLOYD, KEIFFNER, WANG, SVENSON, HOMENOCK, LYNN) plus a "GO HOX!" message line. Template `10LanesWireless.tpl`.

- This validates the live name-integration path end to end on this stack (Gen7 v2024.0.1 + DL+ 4.6.8/4.7), consistent with the names floor (Gen7 v2023+ / DL+ v4.6.0+).
- DL+ toolbar present: Settings, Quick Messages, Template Editor, Sequence Editor, Live Video, Scheduler, Swimming, Diving, Water Polo, Synchro, **Team Scores**, **Results**, MultiSport. (The Team Scores / Results buttons EXIST, but their live auto-feed from the timer is the version-gated part. See verdict.)
- DL+ template library on this rig: `Peak.tpl`, `Time of Day.tpl`, `tod w_trans bkgrd WHITE.tpl`, `water aerobics.tpl`, `WelcomeDel.tpl`, `~SEQUENCERev3.seq`, plus a "Masters Practices" group.

## Confirmed: Gen7 Swimming run-screen controls (Quick Options)

From the Gen7 Swimming software, the lightning-bolt **Quick Options** panel (tabs: Data, Diagnostics, Settings, Quick Options) exposes:

- **Backstroke Start Reaction**: On/Off toggle.
- **Scoreboard State**: `Scoreboard On` / `Blank (with Time of Day)` / `Totally Blank`.
- **EV/HT (event/heat) H/G**: `Normal` / `Swapped` (controls whether event/heat vs gender ordering is swapped on the board).
- **On-Screen Lane Order**: `Normal` / `Reversed`.
- **Cycle MM Port** button (cycles the Meet Management serial port).
- **Load Scoreboard Names** button (pushes the current heat's names to the board: this is the live replacement for the old USB-drive name load).
- **Clear Scoreboard Names** button.
- **New Session Or Meet** button.

The run grid shows per-lane backup inputs labeled **A: / B: / C:** with an `0/2` counter and `S. ARM` (start-arm) state per lane, and a **Final Time** column. (A/B/C are the multiple pushbutton/plunger inputs per lane for backup timing.)

## Confirmed: Gen7 Swimming event configuration (Event Sequence editor)

Events are built in the Gen7 Swimming **Session** tab > **Event Sequence** editor (toolbar: Add, Delete, Up, Down, Clear All, Sort, Import, Set All, Del). Per-event fields seen:

- **Number** (e.g. 99), **Tag** (e.g. "test").
- **Round**: None / Prelims / Semi-Finals / Finals / Swim Off / Time Trial / (Custom).
- **Gender**: None / Women's / Men's / Girls' / Boys' / Mixed / Custom.
- **Distance**: 25 / 50 / 100 / 200 / 400 / 500 / 800 / 1000 / 1500 / 1650 (+/-).
- **Stroke**: None / Freestyle / Backstroke / Breaststroke / Butterfly / Custom; Diving 1m / 3m / PL.
- **Relay**: On/Off.
- **Far End Splits**: No / Yes.
- **Start End**: Near / Far.
- **Age Group**: Lower / Upper.

This (plus the Course = 25y/SCY status) is where pool course, distances, and the event sequence are actually set on this rig. **Import** pulls the event sequence in (e.g. from Meet Manager), addressing the earlier open question about where events are configured.

## VERSION VERDICT for this exact stack

| Live feature | Floor | This rig (Gen7 **v2026.0.3** since 2026-06-20, DL+ v4.7.0) | Status |
|--------------|-------|--------------------------------------|--------|
| Swimmer **names** on board | Gen7 v2023+ / DL+ v4.6.0+ | meets both | **WORKING (confirmed on screen)** |
| **Team Scores** + **Complete Event Results** live auto-feed | Gen7 Swimming **v2026** / DL+ v4.7.0 | **BOTH met after the 2026-06-20 upgrade** (Gen7 v2026.0.3 + DL+ v4.7.0) | **✅ SUPPORTED (upgraded 2026-06-20). Verify it renders on the LED BOARD, not the Gen7 screen [F1034 p.85].** |

Bottom line (UPDATED 2026-06-20): the rig was upgraded **Gen7 Swimming V2024.0.1 → v2026.0.3** (plus a ~25-component firmware update), so it now meets **BOTH** floors (Gen7 v2026 + DL+ v4.7.0) for live Team Scores / Complete Event Results — they are now **supported** [F1034 p.81]. **Important nuance [F1034 p.85]:** even on a v2026 stack these data **relay to the scoreboard but do NOT render in the Gen7 operator screen** — "live results" means on the LED board, so verify they appear on the BOARD. Post-upgrade the operator tested the system + scoreboard and it worked. (The CTS web product page lists only DL+ v4.7.0 and omits the Gen7 floor — incomplete vs the manual.)

## Meet-day verified config (2026-06-17, meet "DEL@HOX2026")

Captured live from the operator laptops at a real meet. CONFIRMED the open items above and added the Meet Manager + Gen7 settings detail. (Swimmer rosters were visible but are intentionally NOT recorded here: minors' PII, irrelevant to timing.)

### DisplayLink Plus (DL+): exact version CONFIRMED
- **DisplayLink Plus v4.7.0** (title bar + splash; edition "CC Express 3.00.009"; core assemblies MainApplicationBase / DisplayLink = 4.7.0.0). Resolves the "exact DL+ version" open item.
- Comm Ports (Settings > CTS Aquatic Sports): only **CTS Timer #1 = COM3 is ENABLED** (the live timer feed; button reads "Click To Disable"). CTS Timer #2 is configured to **COM1 but currently DISABLED** (button reads "Click To Enable"); Timer #3/#4 and Meet Management blank/disabled. Protocol "Colorado". (Validated 2026-06-17 against the lossless image.)

### Meet Manager serial config (the other end of the COM3 link), CONFIRMED
- Hy-Tek Meet Manager, licensed to "Valley Swim Association". Console type = Colorado Time Systems 6.
- **Set-up > "Select Serial Port for CTS 6":** CTS6 Timer **Pool 1 = COM3**; Timer = 0; Scoreboard = 0 (there are TWO scoreboard fields, both 0); Open Water Button Timer = 0. ("Enter 0 to close serial port.")
- On opening the port, MM reports: **"Communication - Pool 1 - COM3 ... CTS 6000 Version Gen7 v2024.0.1.0 ... Communications Passed."** So Meet Manager (the primary MM laptop, #3) talks to the Gen7 over **its own COM3** via the MM port. DL+ (the scoreboard laptop, #2) separately uses **its own COM3** (CTS Timer #1) for the scoreboard stream. Same number, two different machines — see "The machines on deck" and the COM3 note above; this is not one shared port.

### Why COM3: the physical serial topology (Device Manager)
- The Device-Manager capture is from **one** of the four machines (it was photographed on a single laptop; given the four-machine split above we cannot assume it describes both the DL+ and the MM laptop). On that machine, Ports (COM & LPT) showed exactly three: **COM1 = Communications Port (native)**, **COM2 + COM3 = "PCIe to High Speed Serial Port"** (a multi-port PCIe serial card). So on that machine COM3 is a PCIe serial-card port. (An FTDI/FTD2XX USB-serial driver is bundled with DL+, but Device Manager showed NO active FTDI port, so that machine's live serial chain is the PCIe card + native COM1, not a USB adapter.) Do NOT generalize this to "both DL+ and MM share one COM3" — they are separate machines, each with its own port numbering (which independently landed on COM3 here). Verify each machine's own Device Manager.

### Gen7 Swimming settings (this rig's actual config)
- **General:** Default Governing Body = Other; **UDP Scoreboard Names = "This Computer"** (set, but UDP is NOT the active names transport here, see "Names path" below); Auto Connect = No; Flash Case Lights During Races = No; **Enable Meet Management File Export = Yes** (this export feeds the USB-stick names workflow).
- **Timing:** Near End = **Pads**, Far End = **Pads** (both ends pad); **Timing Resolution = Hundredths** (0.01s); **Start Reaction Window = 2 sec**; **Relay Judging Interval = 1.00 sec**; **Backup Comparison Interval = 0.30 sec** (the automatic pad-vs-backup compare window); **Near End Pad Delay = 12, Far End Pad Delay = 8** (read off a clear close-up; the UI labels them "sec", but 12 sec is implausibly long for a pad delay, so the unit/decimal is uncertain, treat as approximate and verify on the console); Backstroke Start Reaction = Disabled; Missed Pad Warnings = Yes; Allow Per-Lane Distance = No. The Even/Odd Length Count fields select which end finishes for even- vs odd-length races.
- **Scoreboard:** Wireless = No; Show Reaction Times = Yes; Lane Module Order = Lane Order; Clear Lanes on Next Race; Keep Finish Times if Lane Turned Off in Reset.
- **Update:** "All device firmware is up to date for this version of Gen7 Swimming." (Healthy.)

### Network (this session)
- Gen7 status bar: **"Timer: Connected [169.254.180.17]"**. APIPA link-local, and it CHANGES per session (earlier captures showed 169.254.9.61 and 169.254.206.182). So do not hard-code an IP; read the current one off the status bar / Available Timers when entering it manually. Timer serial remains 202214306.

### Names path (operator-confirmed)
- Swimmer NAMES currently move to the scoreboard via a **USB STICK** (manual download/upload), NOT a live UDP or serial feed. Times come live over COM3; names are loaded into DL+ from the USB drive. The Gen7 "UDP Scoreboard Names = This Computer" + "Meet Management File Export = Yes" settings support the export-to-file workflow that the USB carries. **Eliminating the USB step (live UDP names) is the standing improvement goal** and requires the RS-485 + Gen7 v2023+/DL+ v4.6+ path in `02`. So when troubleshooting "names wrong/old on the board", suspect the USB load step first, not a live link.

### Physical scoreboard (outdoor LED board)
- Confirmed layout from a board photo: columns **LANE | PLACE | NAME | TEAM | TIME | SPLIT**, with **EVENT** and **HEAT** shown at top and 10 lanes (1-10). On the idle/test event (99) the board shows the headers and lane numbers with no swimmer rows. (No DIP/module-address detail was captured; for a blank/garbled board see the System-6 vendor rows in `05`.)

### Gen7 run-screen lane controls (confirmed)
- Per lane: the touchpad + three plungers **A / B / C**, a **0/2** touch counter, and **S.ARM (Start Arm) / F.ARM (Finish Arm)** buttons, plus **S.ARM ALL / F.ARM ALL** to arm all lanes and per-lane **SCBD (scoreboard) up/down** toggles. Matches the "1 pad + 3 plungers per lane" hardware and the finish-arm procedure in `09`.

### Meet outcome (these are live-meet photos)
- The timing system ran **clean**: Communications Passed, Gen7 "READY FOR START", timer Connected, firmware current, finals times recorded, scoreboard names staged ("Save and Send"). No error dialogs, no blank/garbled screens, no missed-pad/DQ alerts in any frame.
