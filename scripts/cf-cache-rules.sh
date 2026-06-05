#!/usr/bin/env bash
#
# Create/update Cloudflare Cache Rules for the weolopez.com zone:
#   1. Static assets → cache everything, respect origin TTL
#   2. World Cup API → edge-cache /worldcup/api/{matches,leaderboard} GETs (origin sends max-age=10)
#
# These are the two manual steps from docs/scalability-plan.md (A2 + B4). Idempotent:
# re-running replaces only the two rules it manages, preserving any other cache rules.
#
# REQUIRES a Cloudflare API token with:
#   Zone > Cache Rules > Edit   AND   Zone > Zone > Read
# Create one at: https://dash.cloudflare.com/profile/api-tokens
#
# Usage:
#   CLOUDFLARE_API_TOKEN=xxxx ./scripts/cf-cache-rules.sh
#   # or put CLOUDFLARE_API_TOKEN=xxxx in .env, then: set -a; source .env; set +a; ./scripts/cf-cache-rules.sh
#   # other zone (e.g. atlantasoccer.news): CF_ZONE_NAME=atlantasoccer.news CLOUDFLARE_API_TOKEN=xxxx ./scripts/cf-cache-rules.sh
#
set -euo pipefail

ZONE_NAME="${CF_ZONE_NAME:-weolopez.com}"
: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (needs Zone:Cache Rules:Edit + Zone:Read)}"

api() {
  curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
           -H "Content-Type: application/json" "$@"
}

echo "→ resolving zone id for ${ZONE_NAME}…"
ZONE_ID=$(api "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["result"][0]["id"] if d.get("success") and d.get("result") else "")')
[ -n "${ZONE_ID}" ] || { echo "✗ could not resolve zone id for ${ZONE_NAME} — check token scope + zone name"; exit 1; }
echo "  zone ${ZONE_NAME} → ${ZONE_ID}"

PHASE="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/rulesets/phases/http_request_cache_settings/entrypoint"

# Fetch existing cache-phase rules (may 404 if the phase has never been configured).
EXISTING=$(api "${PHASE}" || true)

# Merge: drop any rules previously created by this script (matched by description tag),
# keep everything else, then append our two managed rules. PUT replaces the whole phase,
# so this preserves hand-made rules while staying idempotent.
PAYLOAD=$(python3 - "$EXISTING" <<'PY'
import sys, json
TAG = "[managed:cf-cache-rules.sh]"
try:
    existing = json.loads(sys.argv[1])
    rules = existing.get("result", {}).get("rules", []) or []
except Exception:
    rules = []
rules = [r for r in rules if TAG not in (r.get("description") or "")]

ASSET_EXTS = ["js","css","png","jpg","jpeg","gif","webp","svg","ico","woff","woff2","ttf","otf","mp3","wav","mp4","webm"]
ext_set = " ".join(f'"{e}"' for e in ASSET_EXTS)

rules += [
    {
        "description": f"Static assets — cache everything {TAG}",
        "expression": f"(http.request.uri.path.extension in {{{ext_set}}})",
        "action": "set_cache_settings",
        "action_parameters": {"cache": True, "edge_ttl": {"mode": "respect_origin"}, "browser_ttl": {"mode": "respect_origin"}},
    },
    {
        "description": f"World Cup API micro-cache {TAG}",
        "expression": '(http.request.method eq "GET" and http.request.uri.path in {"/worldcup/api/matches" "/worldcup/api/leaderboard"})',
        "action": "set_cache_settings",
        "action_parameters": {"cache": True, "edge_ttl": {"mode": "respect_origin"}},
    },
]
print(json.dumps({"rules": rules}))
PY
)

echo "→ applying ${ZONE_NAME} cache rules…"
RESP=$(api -X PUT "${PHASE}" --data "${PAYLOAD}")
echo "${RESP}" | python3 -c '
import sys, json
d = json.load(sys.stdin)
if d.get("success"):
    rs = d.get("result", {}).get("rules", [])
    print(f"✓ applied — phase now has {len(rs)} cache rule(s)")
    for r in rs:
        print("   •", r.get("description"))
else:
    print("✗ failed:"); print(json.dumps(d.get("errors"), indent=2)); sys.exit(1)
'

echo
echo "verify:  curl -sI https://worldcup.weolopez.com/worldcup/api/matches | grep -i cf-cache-status"
echo "         (warm it once, then a second request should report HIT)"
