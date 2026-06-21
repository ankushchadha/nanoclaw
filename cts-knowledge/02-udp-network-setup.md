# Path B: UDP / Ethernet Live-Data Link (names and events without a USB drive)

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value. See `08`.

> This is the path that eliminates the USB-drive download/upload workflow. It pushes start lists, swimmer names, and event sequence live. It uses a fixed UDP port and IP addressing, NOT a matched serial COM port.

> **Current state on this rig (verified 2026-06-19 from back-panel photos + CTS Quick Start Guide):** the Gen7 (model GEN7-TMR-L, "Legacy") feeds DL+ via its **1/4" LEGACY scoreboard output** (read by DL+ as CTS Timer #1 = COM3, "Colorado" protocol) — this carries times but NOT names. Names still move via a **USB stick** (manual download/upload). **The concrete upgrade for live names:** the Gen7's **RS-485 scoreboard output(s) are present but unused** for names — connect the DL+ computer to an RS-485 output via RS-485 to meet the name-integration requirement (software floors already met). (NOTE: this rig is the **Legacy** variant; its RS-485 outputs are NOT "blue/black SCBD"-named — that is the Serial guide's naming. It also has an RS-232 "Legacy Scoreboard" output, which is likely what the current 1/4" cable uses. See `04` "Legacy variant" deltas.) So "switch names off the USB stick" = wire up the unused RS-485 SCBD output to DL+ (or the Meet-Manager UDP path below). See `04` for the full back-panel wiring and `07` for the confirmed setup.

## Complete names architecture — current workflow + the two ways to drop the USB stick (operator-confirmed + F1034, 2026-06-19)

**How names + race info move TODAY:**
1. **Meet Manager** exports **SCB name files** (+ a `.sch` event sequence) to a **USB stick**.
2. That USB is loaded into **TWO machines** (same SCB files — F1034: "the same SCB files that are used to pre-load names to DL+"):
   - **CTS laptop (Gen7 Swimming):** Quick Options → **Load Scoreboard Names** → Select Folder. [F1034 p.88]
   - **Scoreboard laptop (DL+):** DL+'s own load-names-from-USB option.
3. **Times** flow live from the Gen7 over the scoreboard link (1/4" legacy output → DL+ as COM3, "Colorado"). DL+ renders **pre-loaded names + live times** → LED board.
   - So names are **pre-loaded into DL+ directly from USB** — they do NOT ride the timing link. (Corrects an earlier note: the legacy link carries times, not names.)

**Option A — replace the USB stick with the network, keep pre-loading (free, NO software upgrade):**
Windows file sharing [F1034 p.88 "File Sharing"]: both laptops on the same network + a shared folder; enable **"Meet Management File Export"** in Gen7 Settings → General. MM exports SCB names / `.sch` events to the share (and imports `.gen` results back). On the CTS laptop, point **Load Scoreboard Names** at the network folder instead of the USB. **CTS-laptop side is documented; the DL+ side (loading SCB from a network folder vs USB) is NOT documented — no DL+ manual — so TEST it.**

**Option B — live names, NO pre-loading anywhere (the real "no USB" path) = TWO legs, both required:**
- **UDP, MM → CTS laptop:** Gen7 Settings "**UDP Scoreboard Names = This Computer**" (ALREADY set on this rig). In MM: **Run → Interfaces → Scoreboard → "Set UDP Port and IP Address"** → **port 60287** + the **CTS laptop's IP** (lower-left timer-connection status in Gen7 Swimming), or **255.255.255.255** broadcast (single timer, same subnet). Both laptops on the **same subnet**. Send the first start list with **CTRL+F10**; auto-updates per heat after. May require the MM **Alpha-Scoreboard license**. [F1034 p.84]
- **RS-485, Gen7 → DL+:** the UDP-delivered data reaches the video board "with CTS RS-485 data" [F1034 p.34] — wire one of the **EMPTY blue-square / black-diamond RS-485 SCBD outputs** to the DL+ computer. [F1034 App C]
- **UDP (MM→CTS laptop) + RS-485 (Gen7→DL+) = live names, no USB anywhere.** No Gen7 software upgrade for plain names (floors met). Live **Team Scores / full results** is separate and DOES need Gen7 **v2026** [F1034 p.81].

## The headline facts

- **Fixed UDP port: `60287`.** This is the value that goes in the Remote Scoreboard Port box. [HIGH, F1034 pp. 84-85]
- Configured in Meet Manager as a **Generic / UDP Ethernet** scoreboard interface.
- Addressed by **IP**: the timer/Gen7 IP, or **`255.255.255.255` broadcast** for a single timer on the same subnet.
- Requires the **Alpha Scoreboard license option** in Meet Manager.
- Live name integration additionally requires an **RS-485** link from the Gen7 to the DisplayLink Plus computer (see version gating below). RS-232 is NOT supported for names.

## Meet Manager configuration (UDP names/events)

[HIGH, F1034 + Hy-Tek setupalphascbd.htm]

1. **Set-up > Alpha Scoreboard Interface.** Choose **Generic** with **UDP Ethernet**.
2. **Run > Interfaces > Scoreboard > Set UDP Port and IP Address.**
   - Port: **`60287`**.
   - IP: the Gen7/timer IP on the same subnet, or **`255.255.255.255`** (broadcast) when there is a single timer on the same subnet.
3. Push the **first start list** with **`CTRL+F10`**.
4. After the first push the link is **bi-directional**: Meet Manager **auto-requests a new start list** each time the event/heat changes. You do not re-trigger it manually per heat.

## Gen7 / scoreboard side and the RS-485 requirement

[HIGH, F1034 Appendix C "Athlete Name Integration"]

- Names flow from the Gen7 to the **DisplayLink Plus (DL+)** scoreboard computer over **RS-485**. **RS-232 will not carry name integration.**
- Software floors:

| Live feature | Gen7 Swimming | DL+ | Wiring |
|--------------|---------------|-----|--------|
| Swimmer **names** | v2023+ | v4.6.0+ | RS-485 |
| **Team Scores** + **Complete Event Results** | v2026 | v4.7.0 | RS-485 + UDP |

- **User's stack (Gen7 Swimming 2024.0.1 + DisplayLink 4.7):** clears the **names** floor. Does **not** meet the **v2026** Gen7 pairing required for Team Scores / Complete Event Results, so expect names to work but full live results/scores to be unavailable until the Gen7 software is on the v2026 line. Verify installed versions on the actual machines.

## Enabling live UDP names on THIS rig (the operator's upgrade question)

The plan is to move swimmer names off the USB stick onto a live port. Per the floors above, **the software is already new enough for names**: Gen7 v2024.0.1 clears the v2023+ floor and DL+ v4.7.0 clears the v4.6.0+ floor. So a **software upgrade is likely NOT what unlocks live names** here. The documented requirement that is probably missing is the **RS-485 link** between the Gen7 and the DL+ computer: the current serial run carries TIMES on COM3, but **names require RS-485 to DL+ (RS-232 / standard serial will not carry names)**. So the likely real blocker is RS-485 wiring/adapters, not a purchase.

Two distinct "live names" mechanisms exist; clarify which one applies before acting:
1. **Gen7 -> DL+ Athlete Name Integration over RS-485** (F1034 App C): the direct scoreboard-name path; needs RS-485 + the version floors above (already met).
2. **Meet Manager Alpha Scoreboard UDP** (port 60287): a Meet-Manager-driven generic-scoreboard path that needs the **Alpha Scoreboard license** in Meet Manager.

**Before buying any upgrade:** confirm with CTS exactly what THIS stack needs, since it already meets the version floors. You may be paying for a software upgrade when the gap is an RS-485 cable or a Meet Manager license. (The Gen7 **v2026** upgrade IS required for Team Scores / Complete Event Results, but plain **names do not** need it.) This is a lead to verify with CTS, not a guarantee.

## MM port vs the scoreboard-names link (do NOT conflate)

A common and costly mix-up. The **"MM port"** (Meet Management port on the Gen7) is the **Gen7 <-> Meet Manager** serial link (this rig: COM3, "Communications Passed"). It carries the event sequence and times between the timer and the meet-management software. **It is NOT the scoreboard-names link.**

Getting swimmer NAMES onto the scoreboard live is a **separate connection: Gen7 -> DisplayLink Plus** (the scoreboard PC), which the docs say needs **RS-485** (a different electrical interface than the MM serial port). So "I already have the MM port" does NOT mean names can ride it; the names path is a different cable to the DL+ computer. The likely missing piece for live names is that RS-485 link, not a software upgrade and not the MM port.

**CONFIRMED 2026-06-19 (operator):** the earlier guess is right — Meet Manager and DL+ run on **separate machines**, so COM3 appearing in both is two separate cables/ports on two different laptops (each its own local COM3), not one shared port. Specifically: the Gen7 **MM port** → the **Meet Manager laptop** (times for Get Times); the Gen7 **scoreboard serial output** → the **DisplayLink Plus laptop** (CTS Timer #1, COM3); and **names ride a USB stick** to the DL+ laptop. See `07` "The machines on deck" for the full four-computer layout. Still verify the exact RS-485-vs-software lever with CTS before buying (the names-live question), but the machine topology itself is now confirmed.

## The DisplayLink-naming caveat (resolve before trusting v2026 claims)

"DisplayLink 4.7" is ambiguous:

- If it is **DL+ (the CTS scoreboard app) v4.7.0**, it meets the DL+ floor for v2026 features, but the **Gen7 Swimming software still has to be v2026** for Team Scores/Complete Event Results. Names work today.
- If it is the **generic DisplayLink USB-graphics driver v4.7**, that version number is unrelated to CTS feature gates entirely. It only governs driving an extra display over USB.

Check the installed component before asserting feature availability. See open questions in `06-pre-meet-checklist.md`.

## Gen7 networking facts (for IP setup and firewall/egress)

[HIGH, F1066 Gen7 Networking Information]

- The Gen7 timer supports an **Ethernet connection** to an interface computer (laptop/PC) in addition to scoreboard connections.
- The **timer and control laptops must share the same physical network** (laptops may be on Wi-Fi, the timer on Ethernet) to enable **auto-discovery**: laptop software finds the timer automatically. If not found, **enter the IP manually**. [HIGH, F1066 + ManualsLib]
- An **Ethernet cable** connects the timer directly to the interface computer. (A prior note named this cable "R-SJ-xx" citing F1066; re-audit 2026-06-19 found **NO such part number in F1034 or F1066** — both only say "Ethernet cable." So **"R-SJ-xx" is UNVERIFIED — do not assert it**; it cannot be sourced to F1034/F1066.)
- **Three ports must be open within the subnet** (and need not route beyond it):

| Port | Service | Notes |
|------|---------|-------|
| **TCP 22** | SSH | No remote root login; factory-randomized password |
| **TCP 7105** | Primary Gen7 Control Service | Encrypted with authentication |
| **UDP 5353** | Zeroconf / mDNS | Used for auto-discovery (IANA mDNS port) |

> For the CTS agent's egress-allowlist / firewall guidance: if auto-discovery fails, suspect UDP 5353 blocked or the laptop being on a different subnet/VLAN than the timer. If control fails after discovery, suspect TCP 7105.

## Important scope nuance: do not conflate the two "UDP" toggles

Meet Manager's **generic timing-console interface** also exposes a Serial-vs-UDP Connection Method selector, but that **UDP Ethernet radio is surfaced for the OmniSport 2000**, a different (Daktronics) timer. [Verified, with 2-1 scope caveat]

- For the **Gen7**, the live UDP names/results path is the **Alpha Scoreboard Interface on port 60287**, NOT the OmniSport-2000 Connection Method toggle.
- So: Gen7 **times** come over the **serial/USB timer interface (Path A)**; Gen7 **live names/events** come over the **Alpha Scoreboard UDP interface, port 60287 (Path B)**. Two different Meet Manager menus.

## Quick UDP-path failure decode

| Symptom | Most likely cause |
|---------|-------------------|
| Names never appear on the board | RS-485 not connected, or RS-232 used by mistake (names need RS-485); or DL+/Gen7 below version floor |
| First start list never shows | Forgot `CTRL+F10` to push it; wrong UDP port (must be 60287); wrong IP/broadcast |
| Names show but Team Scores/full results do not | Needs Gen7 v2026 / DL+ v4.7.0. This rig now has both (Gen7 v2026.0.3 + DL+ v4.7.0 since 2026-06-20), so suspect the LED-board render path (F1034 p.85), not the version |
| Timer not auto-discovered | Laptop and timer on different physical networks/subnets, or UDP 5353 blocked. Enter IP manually |
| "Event Sequence not received from meet management software" | Meet-management cable not connected to both PC and the Gen7 **Meet Management port**, OR a race is currently active (wait until it finishes) [HIGH, Gen7 manual p.46] |
