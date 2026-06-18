# Cabling, Ports, and Hardware Interconnect

> What plugs into what. Confirmed items are tagged; lane-input pinouts and start-system wiring were NOT fully verified and are flagged as such.

## Confirmed cables and ports

### Console-to-PC (serial times, Path A)
- **9-pin RS-232 serial cable**: 9-pin female one end, 9-pin male the other. [HIGH, Hy-Tek swmm6]
- CTS guidance: **standard / straight-through, no null modem**. Hy-Tek note: some **early CTS 6** need a **null modem**. [Vendor conflict, 2-1]
- Modern PC with no serial port: **USB-to-serial adapter**, or the CTS **USB-Connect** device (emulates a 9-pin null-modem link over USB, appears as a virtual COM port). [HIGH, F1034]

### Console-to-PC (Ethernet, Path B / control)
- **R-SJ-xx** is the named **Ethernet timer-to-computer cable**. [HIGH, F1066]
- Timer and laptops must be on the **same physical network** for auto-discovery. [HIGH]

### Gen7 rear ports referenced by the docs
- **Meet Management port** on the back of the Gen7: the meet-management cable connects here and to the meet-management PC. A missing cable here causes "Event Sequence not received." [HIGH, Gen7 manual p.46]
- Ethernet port for the control/UDP network. [HIGH]
- **Gen7 Serial Connect Hubs** are a CTS product for the serial fan-out. [HIGH, CTS product page]

### Lane input harness
- **CH41-8**: an **8-lane touchpad-and-pushbutton primary cable harness** (CTS product). This is the per-lane bundle carrying both pad and pushbutton lines. [HIGH, CTS shop page]

### Start system
- **Championship / Elite Starter** (CTS) documented in **F1064**. The start system connects to the console to provide the gun/horn start reference. [Source present; specific pinout NOT extracted]

## RS-232 vs RS-485 (important distinction)

| Interface | Used for | Notes |
|-----------|----------|-------|
| **RS-232** | Console-to-PC serial **times** (Path A) | 9-pin; point-to-point; short runs |
| **RS-485** | Gen7-to-DisplayLink-Plus **name integration** (Path B) | **Required** for names; differential, longer runs. **RS-232 will not carry names.** [HIGH, F1034 App. C] |

A frequent mistake: trying to drive name integration over the RS-232 serial line. Names need the **RS-485** link to the DL+ computer.

## Lane harness / per-lane connectors (verified at the 2026-06-17 meet)

Each lane has a per-lane cable harness with a small breakout block carrying **labeled connectors**:
- **PRIME** = the **touchpad** (the primary timing input for that lane).
- **BUTTON A**, **BUTTON B**, **BUTTON C** = the three **pushbuttons / plungers** for that lane (the backup timing inputs).

So a lane is wired: touchpad -> PRIME; plungers -> BUTTON A / B / C. On this rig the working convention is **pad + plunger A + plunger B as the active backups, with C as an extra/spare backup**. The harness floats on foam at the deck end and runs back toward the lane module / console. This is the connector-LEVEL labeling (which plug goes where, what an operator needs when re-cabling a lane). The pin-level signal/ground assignment inside each connector was not captured. [verified, IMG 0449/0450 + operator caption]

## NOT VERIFIED (lead, not fact)

The research explicitly did **not** confirm these. The agent should look them up in F1034 / the Gen7 hardware guide / F1064 or ask the operator, rather than assert:

- Exact **lane-input PIN-level pinouts** (which pin in the PRIME/BUTTON connectors carries pad signal, button signal, ground). Connector-level labeling (PRIME, BUTTON A/B/C) is now confirmed above; the wiring inside the connector is not.
- **Start-system cable wiring / pinout** (gun-to-console connector).
- **Dual / multi-pad lane** physical wiring and how it is configured in the Gen7 menu (e.g. pads on both ends for relays/turns).
- Lane-module internal wiring.

A community blog (Marco's Corner) documents the **CTS scoreboard serial protocol** at the byte level and may help if you ever need to decode/emulate the scoreboard data stream, but it is a blog (lower confidence than CTS docs). See `99-sources.md`.
