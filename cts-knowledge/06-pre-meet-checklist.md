# Pre-Meet Checklist and Open Questions

> **Instance values defer to `07`.** Any rig-specific value (lane count, model, harness, ports, course, versions, network, what's wired) is authoritative in `07`'s **RIG PARAMETERS** table — this file states the general rule; `07` governs the rig's actual value. See `08`.

> A working checklist assembled from the verified interface facts, plus the gaps the agent should fill from primary docs or by asking the operator. Items derived from confirmed claims are tagged; assembled/sequenced steps are best-practice synthesis, not a verbatim CTS checklist (no authoritative step-by-step checklist was verified).

## Pre-meet checklist (synthesis; verify on-site)

### Hardware and cabling
- [ ] Touchpads + pushbuttons connected per lane via the lane harness (**CH41-10** for this 10-lane pool — see `07`). [hardware confirmed]
- [ ] Start system connected to the console (gun/horn reference).
- [ ] Console-to-PC serial/USB link in place (9-pin RS-232, USB-to-serial, or USB-Connect). [HIGH]
- [ ] Meet-management cable seated in the Gen7 **Meet Management port** AND the PC. [HIGH]
- [ ] If using live names: **RS-485** link from Gen7 to the DL+ scoreboard computer (NOT RS-232). [HIGH]
- [ ] Ethernet: timer and laptops on the **same physical network**. [HIGH]

### Software and versions
- [ ] Confirm **Gen7 Swimming version** (user: 2024.0.1). Names work; Team Scores/Complete Event Results need **v2026**. [HIGH]
- [ ] Confirm whether scoreboard PC runs **DL+ (CTS app) v4.6.0+/v4.7.0** vs the generic DisplayLink USB driver. [open question]
- [ ] Meet Manager: **Alpha Scoreboard** license option enabled if using UDP names. [HIGH]

### Meet Manager configuration
- [ ] **Set-up > Timing Console Interface** = **Colorado Time Systems 6** (or 5). [HIGH]
- [ ] **Run > Interfaces > Timer > Open/Close Serial Port** = the **PC's** COM port from **Device Manager > Ports** (confirm the number; port must not reset to 0). [HIGH]
- [ ] For live names: **Set-up > Alpha Scoreboard Interface** = Generic/UDP Ethernet; **Run > Interfaces > Scoreboard > Set UDP Port and IP Address** = port **60287** + timer IP / `255.255.255.255`. [HIGH]

### Network ports (if firewalled)
- [ ] **TCP 22**, **TCP 7105**, **UDP 5353** open within the subnet. [HIGH]

### Lane diagnostic (do this every meet)
- [ ] Gen7 Swimming **Diagnostics > Pre-Meet Check > Start Test**. Physically press **every pad and every plunger (A/B/C) on every lane**, near end (and far end if used); confirm each shows a green check. **Clear** to reset a lane. Any input that never checks is dead. See `09-operator-procedures.md`. [observed]

### Functional smoke test before warm-up
- [ ] Run a test race (or touch pads) → **Store/Print (Save and Reset)** on the Gen7. [HIGH]
- [ ] In Meet Manager, **Get Times (F3)** for the test event/heat: times arrive with pad + backup + splits. [HIGH]
- [ ] Push the first start list with **`CTRL+F10`**; confirm names appear on the board and that changing heats auto-requests the next list. [HIGH]
- [ ] Verify the scoreboard shows correct lane assignments and the clock.

### Gen7 on-console configuration (VERIFY: menu paths not confirmed)
- [ ] Pool length, number of lanes, event/sequence setup. (Exact Gen7 menu locations NOT verified by research; confirm against F1034 or on the console.)

## Per-heat operating rhythm (from the rig's cheat sheet, file 09)

Every heat, in order: **1) Turn Empty Lanes off → 2) Accept all backup → 3) Save Reset** (these three BEFORE the starter starts the next heat) **→ 4) Next Heat / Next Event** (this one can wait until after the next race has started). Add/Minus a touch has a 14-second window. Note race # and any NS / M / DNF / Check-times codes on paper.

## Operator quick reference (hotkeys / values)

| Action | Value |
|--------|-------|
| Meet Manager: Get Times by event/heat | **F3** |
| Meet Manager: Race # retrieval | **F2** |
| Push first start list (UDP names) | **CTRL+F10** |
| UDP live-data port | **60287** |
| UDP broadcast IP (single timer, same subnet) | **255.255.255.255** |
| Gen7 control ports | TCP 22, TCP 7105, UDP 5353 |
| Meet Manager console type for Gen7 | Colorado Time Systems 6 (or 5) |
| Commit times on the Gen7 | Store/Print = Save and Reset |

## Open questions (gaps for the agent to resolve, NOT to guess)

1. **Lane-input and start-system pinouts.** Exact touchpad/pushbutton pin assignments and start-system cable wiring; dual/multi-pad lane wiring. (Still not verified. Confirmed though: each near-end lane has 1 pad + 3 plungers A/B/C, see `09-operator-procedures.md`.)
2. ~~**Pad-vs-button reconciliation logic.**~~ RESOLVED 2026-06-16: it is operator-driven, not a silent auto-tolerance. Accept-all-backup commits button times; Add/Minus-a-touch (14-second window) corrects pad over/under-triggers; Finish-Arm forces a lane to finish. See `09-operator-procedures.md`.
3. ~~**Gen7 on-console menus.**~~ RESOLVED 2026-06-16: Pool length/course set in **Edit Session Settings**; meet + governing body in **Create or Select Meet**; events in **Session > Event Sequence** (Import pulls from MM). See `07` and `09`.
4. ~~**DisplayLink identity.**~~ RESOLVED 2026-06-16: it is **DL+ the CTS app** (was v4.6.8, updated to ~4.7). Names work; live Team Scores/Complete Event Results still blocked by the Gen7 Swimming V2024.0.1 software (needs v2026). Remaining: read the exact post-update DL+ version string. See `07-observed-live-config.md`.
5. **Baud / data-format (null/d0/d4).** Whether the Gen7 serial path needs an explicit baud or data-format setting in Meet Manager (USB needs none). Not verified; do not invent a value.

## Source-strength caveats (for honest answering)

- The UDP/RS-485/port-60287/version facts rest **substantially on a single primary document** (CTS Gen7 Serial Timer User Guide **F1034**). Authoritative, but the most specific values (port 60287, RS-485 requirement) were not independently cross-verified by a second primary source.
- The Hy-Tek interface procedure was largely drawn from **CTS-5/6** articles; the Gen7-specific Hy-Tek article confirms the same workflow, but "CTS 5/6" is a **legacy mapping** for the Gen7.
- **One genuine vendor conflict:** CTS says always use a straight-through cable and never a null modem; Hy-Tek says some early CTS 6 need a null modem. Only split-vote (2-1) item. Largely moot for a Gen7 USB-Connect setup.
