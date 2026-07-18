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

## Wireless scoreboard blanking/skipping at away venues (general — this rig is wired, not wireless)

> Not applicable to this rig today: this rig's scoreboard link is **wired** (RS-485 / 1/4" legacy serial — see `04`/`07`), so it can't suffer this failure mode. Kept here as general knowledge for away meets, or if this rig ever adds a wireless CTS scoreboard link (Otter board integrated radio, or a WA-2/WA-3 adapter).

[OBSERVED, different venue, 2026-07-17 — Ankush's own field report] At a different meet location, the scoreboard kept blanking. It was on a wireless link, and the venue had 3 separate WiFi networks (timer, staff, guest) — suspected as a contributing cause.

- CTS's wireless scoreboard link (Otter board integrated radio, WA-2/WA-3 adapter) runs in the unlicensed **2.4 GHz** ISM band — the same band as nearly all WiFi and Bluetooth. [HIGH, CTS Otter Boards manual F1004: "2.4 GHz Integrated Wireless"]
- CTS's own docs don't address WiFi coexistence. The closest evidence is a **different vendor** (Daktronics), which documents the identical failure mode for their own similarly-banded wireless scoreboards: skipping/blanking/lagging from "low signal strength or interference from excessive use of wireless devices in the area," explicitly naming **WiFi hotspots** as a cause, alongside line-of-sight obstructions and antenna positioning. [reasoned by analogy — not CTS-confirmed for CTS gear specifically]
- CTS's channel/PAN scheme (channels 0–11, PAN 0–15, set via DIP switches or the MultiSport Firmware Reprogramming tool) is a **proprietary addressing system for matching the timer to the scoreboard** — it is NOT the same numbering as WiFi's channels 1–11. Picking a different CTS channel number does not reliably dodge a specific WiFi channel; the risk is aggregate 2.4GHz spectrum congestion, not a numeric collision.
- **Mitigation: switching venue APs to 5GHz-only** removes that AP's contribution to 2.4GHz airtime entirely (5GHz and 2.4GHz are non-overlapping bands) — a standard toggle on virtually any enterprise/consumer AP. This is likely the single biggest controllable lever, since the venue's own AP beaconing/traffic is usually the dominant 2.4GHz contributor. It is a partial fix, not a complete one — see limitations below.
- A venue's "timer WiFi" network is probably for meet-management data sync (laptop↔laptop, results/streaming), not the scoreboard's actual over-the-air link — the CTS radio is a separate proprietary protocol, not IP/WiFi, so it doesn't ride that SSID at all.

### Limitations of a 5GHz-only fix [reasoned, general RF engineering — not CTS-specific]

- **Must re-test connectivity of all meet hardware after the switch.** Disabling 2.4GHz drops any client that can't do 5GHz: older laptops/tablets (check-in, heat sheets), older printers, concession POS, older scanners, or single-band IoT gear on the venue network. Do a dry run connecting the actual meet-management laptop, tablets, and printers to the 5GHz-only network before relying on it live.
- **Does not remove other 2.4GHz sources, which are common on a pool deck and outside venue IT's control:**
  - **Bluetooth** (wireless mice/keyboards, earbuds/AirPods, wireless speakers, some wireless mic systems) shares the **same 2.4–2.4835 GHz ISM band** as WiFi and the CTS radio — not adjacent spectrum, literally overlapping. A deck full of coaches/officials wearing Bluetooth earbuds is a real, uncontrollable noise source.
  - **Phone hotspots** — most default to 2.4GHz for broad client compatibility (some newer phones support 5GHz hotspot, but often not as the default), so a spectator's or official's phone hotspot is a live risk regardless of the venue AP config.
  - **Microwave ovens** (common in venue concession areas) radiate around 2.45GHz — a classic non-WiFi 2.4GHz interferer, especially older/cheaper units.
- **5GHz range/penetration is worse.** Higher frequency attenuates faster over distance and through obstacles (walls, and especially the metal roof trusses/concrete common in natatoriums) — expect to need **more APs** for equivalent coverage than 2.4GHz gave.
- **DFS channels can cause their own disconnects.** Many 5GHz channels (the UNII-2/UNII-2e range) require **Dynamic Frequency Selection** — the AP must scan for radar and vacate/switch channels if one is detected, causing a brief but real disconnect. Ask venue IT to pin APs to **non-DFS 5GHz channels** (UNII-1: 36–48, or UNII-3: 149–165) to avoid a radar-triggered channel hop mid-meet.

### Recommended layered solution for a wireless CTS scoreboard deployment [reasoned synthesis]

1. **Prefer a wired link over wireless whenever physically feasible.** This is the only fix that sidesteps the 2.4GHz contention problem entirely — it's why this rig's own wired RS-485 link (see `04`/`07`) doesn't have this failure mode. If cable runs are practical for the venue, wire it.
2. If wireless is genuinely required: ask venue IT to run guest/staff WiFi **5GHz-only, on non-DFS channels**, and to minimize 2.4GHz AP density/power near the pool deck — understanding this reduces but does not eliminate 2.4GHz congestion (Bluetooth/hotspots/microwaves remain).
3. Apply physical-layer basics for the CTS radio components themselves: keep clear line-of-sight and minimal distance between the Gen7/WA-2/WA-3 transmitter and the scoreboard's antenna; avoid obstacles (fencing, low-E glass, crowds) between them. [reasoned by analogy to the Daktronics guidance above — CTS does not publish its own range/obstruction figures, so don't cite specific distances as CTS numbers.]
4. **Test the wireless link on-site before the meet**, ideally during a lower-traffic window, rather than discovering interference live during competition.
5. **Bring a wired fallback if at all possible** (an RS-485/scoreboard data cable, e.g. `R-015-674-xx`) even at a venue whose default setup is wireless — diagnosing RF interference mid-meet is impractical, and a cable you can run in a pinch is a much faster recovery than chasing a wireless dropout.
6. **Practical ask for venue IT/facilities when troubleshooting or setting up a wireless CTS scoreboard:** run staff/guest APs 5GHz-only on non-DFS channels (or at least reduce 2.4GHz AP density/power near the pool deck), keep the CTS radio components close with clear line-of-sight, and don't assume a differently-numbered CTS channel avoids WiFi interference.

### SSID strategy: dedicated 2.4GHz SSID for meet gear + true 5GHz-only for everyone else [reasoned, general networking — not CTS-specific]

- **Multiple SSIDs bound to specific radios is standard and supported on any decent AP.** E.g. `MeetGear-2.4` broadcasting only on the 2.4GHz radio (for meet-management laptop, printer, wireless mic, sound system — check which of these are actually 2.4GHz-only first), plus a separate `GuestWiFi-5G` / `StaffWiFi-5G` bound only to 5GHz.
- **Watch for "Smart Connect" / band-steering.** Many APs default to merging 2.4GHz + 5GHz under one SSID name and steering capable clients to 5GHz, but weaker/older devices can still fall back to 2.4GHz *under that same SSID*. If left on, a "5GHz" network isn't actually 5GHz-only. **Fix: explicitly disable Smart Connect / band-steering and create fully separate SSIDs per band**, with the 5GHz SSID bound only to the 5GHz radio. Done this way, an old 2.4GHz-only device simply can't see that SSID — there's no silent auto-downgrade, because the radio isn't broadcasting it there.
- **Important limitation: a separate SSID isolates at the network/security layer, not the RF layer.** Radio spectrum doesn't know about SSID names — `MeetGear-2.4` traffic and a spectator's phone hotspot both physically transmit on the same 2.4GHz channels regardless of what either network is called. A dedicated SSID buys you network segmentation, a separate password, and the ability to set higher QoS priority for the meet-gear SSID on the AP — it does **not** shield that gear from the uncontrollable RF sources (other people's Bluetooth, hotspots, microwaves) covered above.
- **What actually reduces interference to the meet-gear SSID:** fewer of the venue's *own* 2.4GHz APs/channels active near the deck, a clean non-overlapping channel (1, 6, or 11) picked for that SSID, and physical proximity between that AP and the meet gear it serves — not the SSID name itself.

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
