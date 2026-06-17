# Path A: Serial / USB Timer Link (pulling times into Meet Manager)

> How finished race times move from the Gen7 console into Hy-Tek Meet Manager over a serial or USB-serial connection. This is the COM-port path.

## How the connection physically exists

Two primary connection methods to the meet-management PC: [HIGH, F1034]

1. **USB connection.** A USB cable, or the CTS **USB-Connect** device, presents the Gen7 to the PC as a **virtual COM port**. The USB-Connect device internally emulates a **9-pin null-modem serial link entirely over USB**, so you get serial semantics without a real serial cable. **No baud/serial configuration is required on the Gen7 side for USB.**
2. **Network-based file sharing.** The alternative documented method (file exchange over the network).

For a modern PC with no native serial port, a **USB-to-serial adapter** is used. [HIGH, Hy-Tek swmm6]

## Finding the COM port (the rule people get wrong)

- The COM port number you enter in Meet Manager is the **meet-management computer's own COM port** that Windows assigned to the cable/adapter coming from the Gen7. It is **NOT the timing console's port** (the console is always COM 1 internally). [HIGH, CTS support page]
- Find it in **Control Panel > System > Device Manager > Ports (COM & LPT)**. Look for the USB Serial Port entry; the number in parentheses (e.g. `USB Serial Port (COM3)`) is the value to enter. [HIGH, Hy-Tek Gen7 article + swmm6]
- This number can **drift** if you plug into a different USB slot or after a reboot. Re-verify in Device Manager whenever the link stops working. This is the practical core of the "COM3 must match COM3" rule: every piece of software reading that serial stream must name the same Windows-assigned COM number.

## Configuring Meet Manager (serial path)

1. **Set-up > Timing Console Interface.** Select console type **Colorado Time Systems 6** or **Colorado Time Systems 5**. There is **no dedicated Gen7 option**; the Gen7 is driven through the CTS 5/6 legacy mapping. CTS 5 and 6 support **event schedule download** (sending names/events to the console). [HIGH, Hy-Tek Gen7 article + swmm7]
2. **Run > Interfaces > Timer > Open/Close Serial Port.** Enter the port number assigned to the cable coming from the Gen7 timer (the Device Manager value above). [HIGH, Hy-Tek Gen7 article]
3. Selectable COM range is **1-64** (older docs say 1-60, normally 1-8). [HIGH, Hy-Tek CTS-5/6 + swmm6]
4. On a **failed/negative connection the serial port resets to zero** in Meet Manager. If you see the port revert to 0, the open failed: wrong COM, cable, or the console is not presenting the port. [HIGH, Hy-Tek CTS-5/6]

## Cable type (the one place vendors disagree)

- **CTS official guidance:** always use a **standard / straight-through cable and NO null modem**. [HIGH, CTS support page]
- **Hy-Tek note:** some **early CTS 6 models require a null-modem cable**. [Vendor conflict, verified 2-1]
- The serial cable is **9-pin**: 9-pin female on one end, 9-pin male on the other. [HIGH, Hy-Tek swmm6]
- **For a Gen7 specifically this conflict is largely moot:** the USB-Connect device already emulates a null-modem link internally, so you do not choose a cable polarity. If using a real RS-232 cable into a legacy port, start with straight-through (CTS guidance); if no link, a null modem or a null-modem adapter is the next thing to try.

## How times actually flow (touchpad to Meet Manager)

[HIGH, Hy-Tek CTS-5/6 article + F1034]

1. As each athlete **touches the pad** in their lane, a **time is stored in the Gen7 console**.
2. **Finish, backup-button (plunger), and split times** are committed to console memory on **Store/Print** (the Gen7 "Save and Reset" action). On Save and Reset they become **immediately available** to Meet Manager.
3. Meet Manager **retrieves** them:
   - **By Event/Heat** using the **Get Times** button (**F3**).
   - **By Race Number** using the **Race #** button (**F2**).
4. Both the pad time and the backup-button time for a lane are stored and retrieved **together**, which is what lets the operator/referee reconcile them in Meet Manager.

> NOTE (UNVERIFIED): the exact automatic pad-vs-button reconciliation tolerance (when the button time overrides or flags the pad time) was not confirmed by research. Operators reconcile manually in Meet Manager's results screen using the displayed pad + backup + split columns. Confirm against F1034 / Meet Manager docs before stating a numeric threshold.

## Quick serial-path failure decode

| Symptom | Most likely cause |
|---------|-------------------|
| Meet Manager port field snaps back to 0 | Serial open failed: wrong COM, cable not connected, console not presenting port |
| No times arrive on Get Times | Times not yet committed (operator must Store/Print / Save and Reset on the Gen7), or wrong event/heat selected |
| Worked yesterday, dead today | COM number drifted (different USB slot / reboot). Re-check Device Manager and re-enter |
| Garbage/partial times | Cable polarity (straight vs null-modem) or a flaky USB-serial adapter |
