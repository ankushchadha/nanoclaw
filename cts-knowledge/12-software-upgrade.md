# Gen7 Software / Firmware Upgrade Procedure

> **Instance values defer to `07`.** This is the GENERAL Gen7 upgrade procedure (applies to any Gen7); this rig's actual upgrade history (e.g. V2024.0.1 → v2026.0.3 on 2026-06-20) lives in `07`'s RIG PARAMETERS. See `08`.

> Source: **F1049 "Gen7 Software Updates"** (Rev v1.6.0), bundled inside the Gen7 Swimming installer zip. The procedure is general and version-independent. [HIGH, F1049]

The Gen7 software upgrade also pushes **firmware** to the timer and its peripheral devices, so the laptop-software install is only step 2 of 3. Do all three in order.

## 1. Connect the interface computer to the timer [F1049]
- Timer connected to the interface device (Windows tablet/laptop) **wirelessly or via Ethernet**, with the Gen7 power supply connected to the timer and to AC power. Keep the **laptop on its AC adapter** too (the update is long).
- **No USB cables plugged into the timer** during the update.
- Press the **power button** on the front of the Gen7 timer.
- Wait until the **CTS-logo LED sweep shows a slow pulse for ~30 seconds** (timer ready).

## 2. Update the Gen7 laptop software [F1049]
- Run the **MSI installer** all the way through, accepting the license terms. (This rig's build was `InstallGen7Swimming_v2026.0.3.exe`.)
- Requires **Administrator privileges**.

## 3. Update server software + peripheral device firmware [F1049]
- Start **Gen7 Software** on the laptop.
- After it connects to the timer, it **notifies you of pending updates**.
- The **Update screen** estimates how long it will take. **On larger serial systems the process can take up to ~30 minutes.**
- Click **Update**. The system applies all pending updates **in the correct order**:
  - internal timer software + firmware as **one batch**;
  - on a serial system, **node** updates as a **second batch**;
  - the system **may disconnect and reconnect** during this — expected.
- When finished, the software prompts you to **select a meet**.

## Notes / completion [F1049]
- **Power Controller update:** if the Power Controller is updated, the timer **turns off** after that step. **Turn the timer back on** before restarting the software and continuing.
- **The update is complete when the Version-number column matches the Latest column for every listed device.**
- **Power-cycle the timer** (off, then on) after all components are updated.

## Operator-experience notes (this rig)
- CTSAgent has been used to **pre-brief and de-risk** an upgrade (the 2026-06-20 V2024.0.1 → v2026.0.3 run): walk the operator through what to expect, then the human runs it. Post-upgrade, **test the system + scoreboard** before relying on it (this rig tested clean). [operator-confirmed 2026-06-20; see `07`]
- The ~25-step firmware batch on this rig touched components like **ScoreSaver** and the **Scoreboard controller** (IMG_0510), consistent with step 3 above.
