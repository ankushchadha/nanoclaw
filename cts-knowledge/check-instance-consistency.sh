#!/usr/bin/env bash
# Instance-consistency check for the CTS KB.
# Cross-checks the SEMANTIC files (00-06,10,11) against the canonical RIG
# PARAMETERS in 07. Surfaces values that may contradict the rig's confirmed
# parameters (the CH41-8 failure class). It FLAGS for human review; it does not
# auto-edit. Re-run whenever 07's RIG PARAMETERS table changes.
# See 08 "Separating SEMANTIC from INSTANCE memory".
set -u
cd "$(dirname "$0")"
SEM="00-overview-and-corrections.md 01-serial-com-port-setup.md 02-udp-network-setup.md 03-meet-manager-interface.md 04-cabling-and-hardware.md 05-troubleshooting.md 06-pre-meet-checklist.md 10-meet-manager-operations.md 11-displaylink-plus-guide.md 12-software-upgrade.md"
flags=0

# hard <label> <grep-output>  (called in the main shell so the counter persists)
hard() { [ -n "$2" ] && { echo "‼️  HARD FLAG — $1"; echo "$2" | sed 's/^/      /'; flags=$((flags+1)); }; }
soft() { [ -n "$2" ] && { echo "ℹ️  REVIEW — $1"; echo "$2" | sed 's/^/      /'; }; }

echo "=== CTS instance-consistency check (semantic files vs 07 RIG PARAMETERS) ==="
echo

# 1) HARNESS: rig = CH41-10. Flag any other CH41-N (the literal CH41-8 bug class),
#    excluding legit forms (CH41-10, CH41-10-3, CH41-N) and lines that frame the
#    wrong size as NOT-this-rig (the docs that explain why CH41-8 is wrong here).
h=$(grep -nE "CH41-(6|8|12|16|20)\b" $SEM 2>/dev/null | grep -viE "CH41-N|only cover|would only|wrong for|do not spec|not for this|8-lane would")
hard "non-CH41-10 harness asserted (rig = CH41-10)" "$h"

# 2) GEN7 SWIMMING VERSION: rig = v2026.0.3 (UPGRADED 2026-06-20 from V2024.0.1).
#    Flag V2024.0.1 implied as the CURRENT/installed version; exclude historical/
#    dated/"upgraded from" framings (those correctly record the pre-upgrade state).
h=$(grep -niE "(runs|running|now on|current|installed|our stack is|this rig (is|runs|has)).{0,25}V?2024\.0\.1" $SEM 2>/dev/null | grep -viE "upgraded|was |from V?2024|2026-0[0-9]|history|prior|earlier")
hard "V2024.0.1 implied as CURRENT (rig is now Gen7 Swimming v2026.0.3 since 2026-06-20)" "$h"

# 3) DL+ VERSION: rig = v4.7.0. Review 4.6.x unless it's a floor/history/install-prereq line.
h=$(grep -nE "4\.6\.[0-9]" $SEM 2>/dev/null | grep -viE "v?4\.6\.0\+|4\.6\.0 or (greater|newer)|floor|photo|updated|since|>=|≥|pre-v?4\.6|\.NET")
soft "DL+ 4.6.x mention — confirm it's a floor/history, not 'current' (rig = v4.7.0)" "$h"

# 4) COURSE: rig = 25y/SCY. Review any other course tied to this rig.
h=$(grep -niE "\bSCM\b|\bLCM\b|50 ?m\b|long course" $SEM 2>/dev/null)
soft "non-SCY course mentioned (rig = 25y/SCY) — confirm framed as general" "$h"

# 5) SCOREBOARD OUTPUT: rig uses the 1/4\" LEGACY output. Review RS-232 tied to the scoreboard link.
h=$(grep -niE "RS-?232.{0,45}scoreboard|scoreboard.{0,45}RS-?232" $SEM 2>/dev/null)
soft "RS-232 + scoreboard (rig uses 1/4\" LEGACY output; RS-485 ports empty) — confirm general" "$h"

# 6) INVENTORY: every canonical param keyword + sample values, for eyeball review.
echo
echo "--- Canonical-param inventory (eyeball for stray values) ---"
for kw in "CH41" "GEN7-TMR" "2026\.0\.3" "4\.7\.0" "8\.0Gf" "COM3" "169\.254" "25 ?y|SCY"; do
  echo "[$kw]"
  grep -nhE "$kw" $SEM 2>/dev/null | sed 's/^/    /' | head -3
done

echo
if [ "$flags" -eq 0 ]; then
  echo "=== ✅ 0 hard flags. (Review any ℹ️ items as general-vs-this-rig.) ==="
else
  echo "=== ‼️  $flags hard flag(s) — reconcile against 07 RIG PARAMETERS, then re-run. ==="
fi
