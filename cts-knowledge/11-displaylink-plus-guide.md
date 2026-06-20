# DisplayLink Plus (DL+) — Scoreboard Application Guide

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value. See `08`.

> Ingested 2026-06-19 from a verified pass over CTS web docs (sources in `99-sources.md`). DL+ knowledge elsewhere in this KB (file `07`) is rig-observed from photos; this file grounds DL+ in actual documentation where it exists.

> **KEY FINDING — does a real DL+ manual exist? NO.** The CTS manuals portal lists **no comprehensive DisplayLink Plus user manual** (no F-number PDF for the application itself). DL+ documentation is **scattered**: one PDF for the video-broadcast add-on (F1062), a few text support pages, and YouTube tutorials. Treat any DL+ menu path not on this page as UNVERIFIED, and when asked for "the DL+ manual," say plainly that there isn't one. [HIGH — coloradotime.com/support/manuals lists only F1062 under DisplayLink]

## Version floor for live Team Scores / Event Results (RESOLVED 2026-06-19)

The floor is **BOTH Gen7 Swimming v2026 AND DL+ v4.7.0** [HIGH — F1034 p.81, verified verbatim: *"Starting with Gen7 Swimming v2026 and DL+ v4.7.0, support for Team Scores and Complete Event Results was added."*]. The CTS **web** pages (product + support) mention only **DL+ v4.7.0** and omit the Gen7 floor — they are **incomplete relative to the manual, not contradictory**; trust F1034. This rig has DL+ v4.7.0 (met) but Gen7 Swimming **v2024.0.1 (below v2026)** → live Team Scores/Results need a **Gen7 Swimming upgrade** (current build **v2026.0.3**, 2026-06-09, on the CTS downloads page). Even then, per **F1034 p.85**, these data **relay to the scoreboard but do NOT render in the Gen7 software**. (History: an interim note here flagged a "conflict" and called "v2026.0.3" a hallucination — the re-audit corrected both: the Gen7 v2026 floor is REAL, and "v2026.0.3" is the REAL current build. The earlier error was misattributing that build number as the requirement, which the web page states as DL+ v4.7.0 only.)

## What DL+ is
- DisplayLink Plus is CTS's Windows scoreboard-control application: it drives CTS LED/video display boards from a dedicated control PC, building scoreboard layouts and feeding them live timing + meet data. [HIGH — coloradotime.com/software/dlplus; F1062]
- Current version: **v4.7.0**. Requires **Windows 10 or 11**. [HIGH — coloradotime.com/software/dlplus]
- **License gate on upgrade:** upgrading from **v4.4.x or lower requires a new license file** — contact CTS Customer Support before upgrading. [HIGH — coloradotime.com/software/dlplus]
- Pre-v4.6.0 installs also needed **.NET Framework 3.5 SP1**. [HIGH — coloradotime.com/software/dlplus]
- A download link is **not public** — CTS support must provide it. [HIGH — coloradotime.com/software/dlplus]
- **Editions:** the rig runs the **CC Express** edition. CTS publicly sells a standalone **Template Editor for DisplayLink customers (R-470-121, $49.95)** and a **Record Board Image Generator (R-470-122, $495)**, plus per-board designer templates ($14.99). A formal "CC Express vs full" edition comparison is **not documented publicly**. [HIGH for SKUs — shop.coloradotime.com/collections/displaylink-plus] [UNVERIFIED — edition feature split]

## Communication Ports (Settings screen)
- DL+ has a **Settings** screen where communication ports are configured; selecting **"CTS Aquatics"** exposes the timer + Meet Management port slots. [HIGH — coloradotime.com/support/displaylink-plus-team-scores-and-event-results]
- The **Meet Management** port is enabled/set there to receive scores+results from meet-management software. "Consult your Meet Management documentation for the other side of the connection." [HIGH — same page]
- **CTS Timer #1–#4 slots / COM port / "Colorado" protocol / enable-disable per feed:** this is the rig's observed config (see `07`), but is **NOT confirmed in any fetched CTS document**. [UNVERIFIED — no doc names the timer slots or the "Colorado" protocol selector]

## Connecting to the Gen7 (times)
- The Gen7 sends timing data to the scoreboard over **serial**, supporting **RS-232 / RS-485**. [HIGH — coloradotime.com/products/gen7-swim-timing-serial]
- The rig reads the live timer stream on **serial COM3 ("CTS Timer #1", protocol "Colorado")** — rig-observed, not in a CTS doc. [UNVERIFIED — see `07`]

## Connecting Meet Management → DL+ computer
- Connect the **Meet Manager laptop** to the DL+ computer with a **USB-to-serial / 1/4" male stereo jack** into the deck receptacle labeled **"Meet Management out."** [HIGH — coloradotime.com/support/connecting-meet-management-to-system-6-and-dl-computer]
- Identify the COM ports in Windows **Device Manager → Ports (COM & LPT)** by unplugging USB-serial devices one at a time. [HIGH — same page]
- In Meet Manager: run event → select session → **Interfaces** → select **"Scoreboard Genser"** → enter the COM port → expect **"testing passed"** → download the meet to a slot (1–9). [HIGH — same page] (Matches the MM-side Genser interface in `10`.)
- In DL+: go to the **Swimming** tab → **download all events**. [HIGH — same page]

## Loading names
- **Current rig workflow (USB stick):** names are exported to an **XML file**, carried on a **USB stick** to the DL+ computer, imported via the module's **Import** function, paired to the correct timer in **Event/Timer pairings**, then pushed with **"Save and Send."** [HIGH for structure — coloradotime.com/support/exporting-from-divemeets-and-importing-into-displaylink] *(The cited doc is the diving/Divemeets flow; the swimming USB-stick flow is structurally the same — XML import + Save and Send — but a swimming-specific page was not located. Lower confidence on the exact swimming menu labels.)*
- **Live names path (upgrade target):** with **RS-485 data to DL+, you do NOT need to load names manually** — DL+ Names outputs names to an XML file the DL+ software reads automatically. [HIGH — coloradotime.com/products/gen7-swim-timing-serial]
- The rig's planned live path = **UDP names (port 60287, per F1034 in `02`) + RS-485 to DL+**. CTS docs confirm RS-485 is the live-names requirement; the **port number 60287 comes from F1034** (`02`), not these DL+ web pages. [RS-485: HIGH; port 60287: HIGH per F1034 in `02`]

## Templates & layout
- Scoreboard layouts are built in DL+'s **Template Editor**; the **Sequence Editor** chains templates into a running display. [HIGH — listed as "Template Editor Tutorial" and "Master Tutorial: Sequence Editor" on coloradotime.com/support]
- Template Editor exposes data **items** you drop onto a layout (see Team Scores / Results below). [HIGH — coloradotime.com/support/displaylink-plus-team-scores-and-event-results]
- **.tpl / .seq file extensions** (seen on the rig in `07`): plausible but **NOT confirmed** in any fetched doc. [UNVERIFIED in docs; rig-observed in `07`]

## Team Scores / Event Results modules
- DL+ can show **live team scores** and **fully aggregated results** for any already-swum event, fed from compatible Meet Management software. [HIGH — coloradotime.com/support/displaylink-plus-team-scores-and-event-results]
- **Team Scores** template items: team name, abbreviation, rank, score, and an indicator for **women's / men's / combined**. **Results** items: swimmer name, team, rank, time, **event title**, and an **Official/Unofficial** tag toggled from the **Results** screen. [HIGH — same page]
- Display controls (both): **page one frame at a time** vs **scroll one line at a time**, change speed, items shown at once, and how many of the full set to show (e.g. top 16). [HIGH — same page]
- **Licensing caveat:** some Meet Management packages (**incl. Hy-Tek Meet Manager**) may require an **extra license** to use Scores/Results. [HIGH — same page]
- **Version gating:** the floor is **Gen7 Swimming v2026 AND DL+ v4.7.0** [HIGH — F1034 p.81]. The Gen7 Swim Timing web page states only "Integrated start lists, team scores, and event results (DisplayLink+ v4.7.0 required)" — it omits the Gen7 floor (incomplete vs the manual). See the RESOLVED note at the top.

## Live Video / Video-to-Broadcast (F1062)
- F1062 covers feeding the **video board's output into a live stream** (e.g. OBS), separate from scoreboard control. **F1062 Rev. 202104.** [HIGH — F1062 PDF]
- Chain: **DL+ control PC → video controller → video capture device → streaming PC → broadcast software.** Two controller classes: **Type 1** (MCTRL-300/600, MIC-VPU-01 — need a pass-through capture device, HDMI→DVI) and **Type 2** (VX4, MCTRL-660 — any USB capture dongle). [HIGH — F1062 PDF]
- In OBS: add a **Video Capture Device** source → device **"USB Video"** → then **Crop/Pad** filter (Left/Top = 0; Right/Bottom = monitor resolution minus board size) to isolate the board. The **whole DL+ monitor** is transmitted, which is why the capture must be cropped. [HIGH — F1062 PDF]

## Scoreboard troubleshooting (symptom → cause)
| Symptom | Likely cause / check | Confidence |
|---|---|---|
| Board blank / no data | DL+ not started on the control PC; start DL+ first | [HIGH — F1062] |
| Times not arriving | Timer COM port wrong/disabled in Settings; verify in Device Manager | [HIGH connection page / UNVERIFIED exact timer slot] |
| Names stale / wrong | USB-stick names not re-imported + **Save and Send** not re-run for current session | [HIGH — Divemeets import page] |
| Names need manual reload every session | Not on the live RS-485 path; RS-485 to DL+ removes manual loading | [HIGH — gen7-swim-timing-serial] |
| Team Scores / Results empty | Meet Management port not enabled (Settings → CTS Aquatics → Meet Management); or missing Hy-Tek extra license; or DL+ below v4.7.0 | [HIGH — team-scores page + gen7 serial page] |
| Wrong layout showing | Wrong template/sequence active in Template/Sequence Editor | [HIGH modules exist / mechanism UNVERIFIED] |
| Broadcast shows full desktop not just board | Crop/Pad filter not applied in OBS | [HIGH — F1062] |
| Results show "Unofficial" | Official/Unofficial tag toggle on the Results screen | [HIGH — team-scores page] |

## Not found in the docs (defer / verify)
- No DL+ application manual exists (compose from scattered pages; say so when asked).
- The timer-side Settings UI (CTS Timer #1–#4 slots, "Colorado" protocol selector) is only in YouTube tutorials, not fetched — rig-observed only (`07`).
- `.tpl/.seq` extensions, exact Template/Sequence Editor steps, CC-Express-vs-full feature split, and the MM/timer serial baud rate are undocumented in the fetched text. A video-transcription pass would fill the editor-UI gap.
