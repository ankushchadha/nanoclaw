# Operator Procedures (procedural memory, from the rig's own cheat sheet)

> Captured 2026-06-16 from the team's printed "CTS Training - Generation 7" sheet and the Gen7 Swimming meet-setup / diagnostics screens. This is the operator's tribal knowledge: the exact key sequence and reconciliation rules used at this pool. Source dashes converted to colons/parens to keep the file clean; meaning preserved faithfully.

## The 4-key per-heat capture sequence (the core workflow)

The sheet's headline: **"95% of swim meet times are captured with the following 4 keys in the following order."**

1. **Turn Empty Lanes off.**
2. **Accept all backup.** (the thumbs-up control, bottom-right corner)
3. **Save Reset.** When the clock resets the machine, this stores all info internally. You can reset the machine without the clock stopping (see "Check times" below).
4. **Next Heat or Next Event.**

**Hard timing rule:** steps **1, 2, 3 MUST be completed BEFORE the starter starts the next heat/event.** Step **4 (Next Heat / Next Event) can be done after the next race has already started.**

This is the operator's rhythm every heat: empty lanes off, accept backup, save reset (before the next start), then advance.

## Add / Minus a Touch (14-SECOND DELAY)

There is a **14-second delay** on the add/minus-a-touch function. Two cases:

1. **Minus a touch:** when the pad was accidentally initiated (a false/early pad trigger to remove).
2. **Add a touch:** when a swimmer did NOT contact the pad, on a distance of **100 yards or greater** (so a real finish that the pad missed gets a touch added).

This is the manual pad-correction tool. The 14-second window is the operational constraint to remember.

## Finish Arm the Lane

**Finish-arm a lane** when the last swimmer is in the water AND either:
- a. a timer accidentally pushed the plunger, or
- b. the lane was not set to finish due to miscalculations of touches.

(This is the "S. ARM" control seen per-lane on the run screen: the lane's finish-arm state.)

## Pad vs button reconciliation, resolved

Putting the above together answers the earlier open question on how pad and backup-button times reconcile on this rig. It is operator-driven, not a silent automatic tolerance:
- **Accept all backup** (key 2) commits the backup-button times alongside the pad.
- **Add / Minus a touch** (14s window) corrects pad over- or under-triggers.
- **Finish Arm the lane** forces a lane to finish when touches are miscounted or a plunger misfired.
- The operator notes anomalies on paper (see codes below) so results can be reconciled afterward.

## CTS paperwork codes

In addition to writing the **race number**, the operator notes anything about the race using these codes:

| Code | Meaning |
|------|---------|
| **NS** | No show |
| **M** | Manual time needed |
| **DNF** | Swimmer did not finish |
| **Check times** | Machine was reset WITHOUT the clock stopping (verify those times) |

Writing the race number per heat is what lets Meet Manager pull times by **Race # (F2)** later. The paperwork is the human backup to the electronic record.

## Pre-Meet Check (lane diagnostic screen)

The Gen7 Swimming **Diagnostics** area has a **Pre-Meet Check** mode (Start Test / Stop Test, with a mode dropdown). Layout:
- Split into **Near End** (and Far End when far-end pads are used).
- One row per lane. Each row shows a **touchpad** icon plus three pushbutton/plunger icons labeled **A, B, C** (three plungers per lane), and a **Clear** button.
- As you physically press each pad and each plunger, a **green checkmark** appears next to that input, confirming it registers. **Clear** resets a lane's test state.

Use this before every meet to verify every pad and every backup button on every lane registers. A pad or plunger that never checks is a dead input to fix before racing. (Confirmed live: lane 4 showed A, B, C all checked during the test.)

> Confirms hardware fact: **each lane has 1 touchpad + 3 pushbuttons (A/B/C)** on the near end. Far-end adds a second pad set when far-end splits are enabled.

## Meet and session setup workflow (Gen7 Swimming)

The event-sequence/name workflow starts by creating the meet and session ON the Gen7 software, then downloading events from meet-management software.

**Step 1: Create or Select Meet** (Gen7 Swimming dialog):
- New Meet (radio) + name (example seen: "VSATest@Hox").
- Start date / End date.
- **Governing Body** dropdown: World Aquatics / USA Swimming / NCAA / NFHS / Other.

**Step 2: Edit Session Settings**:
- Session **Number** + **Tag** (e.g. "Fri. Prelims").
- **Pool Length** dropdown (example: **Short Course Yards / 25y/SCY**). THIS is where pool course/length is set, answering the earlier open question.
- **Start Time** (date + time).
- **Add Default Events** (No/Yes); if Yes, an event template dropdown (example: **Coed High School (NFHS)**) and **Include Junior Varsity?** (No/Yes).

**Critical note printed on both dialogs:** *"You must select a meet and session before downloading an event sequence from meet management software."* So the order is: Create/Select Meet, then Edit Session Settings, THEN import/download the event sequence (Import button on the Event Sequence editor). This is the live replacement for sneakernetting an event file on a USB drive.

## How this maps to memory buckets

- **Procedural:** the 4-key sequence, add/minus touch, finish-arm, pre-meet check. (This file.)
- **Instance/config:** pool length 25y/SCY, governing body USA Swimming, the rig's menu paths. (Also in file 07.)
- **Episodic:** to accumulate per meet, e.g. "7/23 VSATest@Hox: lane 6 pad B dead at pre-meet check, ran on plunger." Capture these going forward via the defer -> HITL -> write-back loop (file 08).
