#!/usr/bin/env bash
# agentSQ smoke test — no LLM, ~$0. Drives agent-browser (in the agentSQ image)
# against the two source portals the recipes depend on, and asserts the entry
# form is present and NOT anti-bot-gated. Catches "site changed / down /
# now Cloudflare-gated" before agentSQ ever burns a token on it.
#
# Usage: bash scripts/agentsq-smoke.sh
# Exit 0 = all sources healthy; non-zero = at least one failed.
set -uo pipefail

IMG="nanoclaw-agent-v2-a603825e:ag-agentsq"
C="agentsq-smoke-$$"
FAIL=0

docker rm -f "$C" >/dev/null 2>&1
docker run -d --name "$C" --entrypoint sleep "$IMG" 180 >/dev/null 2>&1 || { echo "FAIL: cannot start container from $IMG"; exit 2; }
trap 'docker rm -f "$C" >/dev/null 2>&1' EXIT

probe() { # name, url, expect-substring
  local name="$1" url="$2" expect="$3"
  local snap
  snap=$(docker exec "$C" bash -lc "export PATH=/pnpm:\$PATH; agent-browser open '$url' >/dev/null 2>&1; agent-browser wait 5000 >/dev/null 2>&1; agent-browser snapshot -i 2>&1" 2>&1)
  if echo "$snap" | grep -qiE "verify you are human|cloudflare|just a moment"; then
    echo "FAIL  $name — anti-bot challenge detected (Cloudflare/Turnstile)"; FAIL=1; return
  fi
  if echo "$snap" | grep -qiF "$expect"; then
    echo "PASS  $name — entry form present ('$expect')"
  else
    echo "FAIL  $name — expected element '$expect' not found (site changed or down?)"; FAIL=1
  fi
}

echo "=== agentSQ source smoke test ==="
probe "tax-collector lookup (address→APN+bill)" "https://taxcolp.cccttc.us/lookup/" "Select Bill Type"
probe "Laserfiche recorded maps (maps/ROS)"     "https://records.pw.contra-costa.org/WebLink/CustomSearch.aspx?SearchName=RecordedMaps" "Record Type"

echo "=== $( [ $FAIL -eq 0 ] && echo 'ALL HEALTHY' || echo 'DEGRADED — see failures above' ) ==="
exit $FAIL
