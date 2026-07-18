# Troubleshooting Guide

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value. See `08`.

> Symptom-to-cause table for the Gen7 + Meet Manager + scoreboard chain. Confirmed causes are tagged; reasoned/likely causes are marked as such so the agent does not present inference as documented fact.

## No times reaching Meet Manager

| Check | Detail |
|-------|--------|
| Times committed? | Operator must do **Store/Print (Save and Reset)** on the Gen7 before times are available. [HIGH] |
| Right COM port? | Meet Manager COM = the **PC's** Device Manager port, not the console's. If the field **reset to 0**, the open failed. [HIGH] |
| COM drifted? | Different USB slot or a reboot can change the Windows COM number. Re-check **Device Manager > Ports**. [HIGH] |
| Cable polarity | Start straight-through (CTS). If garbage/no link on a legacy CTS-6 serial port, try a null modem. For Gen7 USB-Connect this is internal/moot. [HIGH / conflict] |
| Right retrieval | **Get Times = F3** by event/heat, **Race # = F2**. Wrong event/heat selected returns nothing. [HIGH] |

## "Event Sequence not received from meet management software"

[HIGH, Gen7 manual p.46] Two documented causes:
1. **Meet-management cable not connected** to both the meet-management computer **and** the **Meet Management port** on the back of the Gen7. Check both ends.
2. A **race is currently active**. Wait until the race finishes; sequences are not received during an active race.

## Names not appearing on the scoreboard

| Check | Detail |
|-------|--------|
| Wrong physical interface | Name integration needs **RS-485** to the DL+ computer. **RS-232 does not carry names.** [HIGH] |
| Version floor | Names need **Gen7 Swimming v2023+** and **DL+ v4.6.0+**. Below either: no names. [HIGH] |
| Start list never pushed | Press **`CTRL+F10`** to send the first start list. [HIGH] |
| UDP misconfig | Port must be **60287**; IP must be the timer's, or **255.255.255.255** broadcast on the same subnet. [HIGH] |
| Alpha Scoreboard license | The UDP names path needs the **Alpha Scoreboard option** enabled in Meet Manager. [HIGH] |
| Which "DisplayLink"? | Confirm it is **DL+ the CTS app**, not the generic USB-graphics driver. (Open question.) |

## Team Scores / Complete Event Results not showing

- Needs Gen7 **v2026** + DL+ **v4.7.0**. This rig was upgraded to **v2026.0.3 + v4.7.0** on 2026-06-20, so both are met; if Team Scores/Results still don't show, suspect the LED-board render path (F1034 p.85), not the version. [HIGH] Names work regardless.

## Scoreboard blank or garbled

> LIKELY-CAUSE reasoning (not all individually verified). Work the layers:
- **Blank:** no data being sent (start list not pushed / wrong UDP port or IP), board not addressed, board power, or wrong scoreboard interface selected in Meet Manager.
- **Garbled:** protocol/format mismatch, wrong baud on a serial scoreboard link, or cable polarity on the serial run. The CTS scoreboard byte protocol is documented at Marco's Corner if you need to inspect the stream.
- **Wrong COM (serial scoreboard):** every component reading the serial stream must name the **same Windows COM number** (the "both COM3" rule). Re-verify in Device Manager.

## COM3 missing from DisplayLink Plus after a firmware update

[OBSERVED, this rig, 2026-07-17] After the scoreboard firmware was updated, DL+ only listed **COM1 and COM2** in its port dropdown — COM3 (the Gen7 timer link) was missing, even though it had worked before. **Fix: restart the Windows PC.** After reboot, COM3 reappeared in DL+ and the full chain (Gen7 timer + CTS laptop + scoreboard) worked correctly in an end-to-end test meet.

Likely cause (reasoned, not confirmed): a firmware/USB re-enumeration event can leave Windows' COM-port table stale until a fresh boot re-scans devices; DL+ only reads the port list it sees at launch. Not confirmed whether reopening DL+ alone (without a full reboot) would have been sufficient — a full restart is the tested fix.

**Takeaway for pre-meet checklist:** after any firmware update (scoreboard, DL+, or Gen7), reboot the Windows PC before verifying COM ports in DL+, not just relaunching the app.

## Timer not auto-discovered on the network

[HIGH, F1066]
- Laptop and timer must be on the **same physical network/subnet**. A different VLAN/subnet breaks discovery.
- **UDP 5353 (mDNS)** must be open within the subnet.
- Fallback: **enter the timer IP manually**.
- If control fails after discovery, suspect **TCP 7105** blocked.

## Lane not registering / false starts / dual-pad lanes

> NOT VERIFIED by research. Do not assert specific Gen7 menu steps or reconciliation thresholds. General known-good direction:
- **Lane not registering:** suspect the per-lane harness (CH41-10 on this 10-lane rig — see `07`) connection, the pad cable, or a disabled lane in the Gen7 lane config.
- **Pad vs button mismatch:** both pad and backup-button times are stored and retrieved together; reconcile in Meet Manager. The exact auto-override tolerance is unconfirmed (see open questions).
- **False starts / dual-pad lanes:** Gen7 menu configuration for these was not verified. Consult F1034 / the Gen7 hardware guide or ask the operator.

## Layered mental model for any failure

1. **Power and physical cable** at both ends (console port, PC port, board).
2. **Right interface for the job**: times = serial/USB timer interface; names = RS-485 + UDP Alpha Scoreboard.
3. **Right address**: COM number (Device Manager) for serial; port 60287 + IP for UDP.
4. **Right software state**: versions meet the feature floor; license option enabled; start list pushed (CTRL+F10); times committed (Save and Reset).
5. **Right selection in Meet Manager**: correct event/heat, correct console type (CTS 5/6).

## Vendor troubleshooting reference (CTS System 6 guide, applies to Gen7 except where flagged)

> Source: CTS official System 6 Troubleshooting Guide (`coloradotime.com/support/system-6-troubleshooting-guide`). [vendor/primary, but written for System 6. The scoreboard / pad / start-system / serial concepts carry over to Gen7; items marked (S6) are System-6-specific and should be checked against Gen7 F1034 before asserting for this rig.]

### Scoreboard not working at all
- Make sure the scoreboard has power and is turned on.
- Make sure the scoreboard is **not blanked** (Scoreboard softkey / Scoreboard State on Gen7 = Scoreboard On).
- Make sure the scoreboard cable is properly connected.
- Check cable connectors for corrosion; clean or replace.

### Scoreboard showing incorrect / missing results
- Verify cable connection per the scoreboard manual; check connectors for corrosion.
- **Ensure the scoreboard DIP switches for each module are set to the proper physical address.**
- **Check logical addresses in the Swimming software** (Setups). Wrong physical-vs-logical address mapping is a classic cause of garbled or wrong-lane scoreboard output.

### Software does not register a pad or backup-button hit
- **Ensure the pad-armed indicator is displayed in the appropriate lane(s).** (A lane that is not armed will not record a touch.)
- Confirm lane mapping is set correctly.
- Verify touchpad and button cables are properly and securely connected; clean connectors; check cabling; test the touchpad(s) / button(s).

### Race timer does not start
- Verify the start-system cable is properly and securely attached; clean connectors; check cabling; check the start system.

### Event Sequence download does not work (Meet Manager)
- (S6) Make sure **Allow Remote Setup** is enabled (Setups / Hardware Setup).
- **Exit Setups first.** You cannot download an event sequence while the swim software is in setup mode. (Mirrors the Gen7 "must select a meet and session, and not be in an active race" rule in `09`.)
- (S6) Make sure the meet-management cable is connected to **Com Port 1 on the System 6 back panel** (Gen7 equivalent: the Meet Management port, see `02`/`04`).

### Other
- No display at power-on: check the power adapter and wall outlet.
- (S6) Relay-judging printout missing: verify the RJP cable connects to the "Button A" connector.
- (S6) Backup-button times not showing: connect backup buttons to the stackable banana plug on the RJP cable harness.
- Printer not printing: check online status, paper, secure/clean connectors, cabling, try form feed.
