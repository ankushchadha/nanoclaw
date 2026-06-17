# Observed Live Configuration (Ankush's actual rig)

> Ground truth captured 2026-06-16 from photographs of the running system. This OVERRIDES generic assumptions in the other files where they differ. Marked CONFIRMED (seen on screen) vs INFERRED (reasoned from what is shown).

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

INFERRED (the operational rule, stated carefully): the COM port number set here in DL+ (COM3) must equal the COM port that the **data source transmits the scoreboard stream on**. On this rig the source is the Gen7 Swimming software's scoreboard/serial output (and/or Meet Manager's scoreboard output if MM drives the board). All endpoints reading/writing that one serial stream must name the **same Windows COM number** (here, COM3). This is the precise meaning of Ankush's "DisplayLink COM3 must match Meet Manager COM3" rule. Confirm the source-side port number on the Gen7 Swimming / Meet Manager machine in Device Manager and set it to match COM3.

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

| Live feature | Floor | This rig (Gen7 v2024.0.1, DL+ ~4.7) | Status |
|--------------|-------|--------------------------------------|--------|
| Swimmer **names** on board | Gen7 v2023+ / DL+ v4.6.0+ | meets both | **WORKING (confirmed on screen)** |
| **Team Scores** + **Complete Event Results** live auto-feed | Gen7 Swimming **v2026** / DL+ v4.7.0 | DL+ side OK (~4.7), **Gen7 side is v2024.0.1, below v2026** | **NOT available until Gen7 Swimming upgrades to the v2026 line** |

Bottom line: updating DisplayLink Plus to 4.7 was necessary but not sufficient for live Team Scores / Complete Event Results. The **Gen7 Swimming software (currently V2024.0.1) is the limiting component** and would need the v2026 release for those live features. Names work today regardless.

## Still to read off the screen

- The **exact current DL+ version** after the update (title bar string), to confirm it is >= 4.7.0.
- Whether the Gen7 Swimming **scoreboard output** is on serial COM3 (to literally confirm the COM3<->COM3 match end to end) or whether names are flowing over the UDP/Alpha-Scoreboard path instead.
