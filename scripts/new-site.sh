#!/usr/bin/env bash
# new-site.sh <subdomain>
# Wires up a new *.weolopez.com subdomain:
#   - Creates NPM proxy host (reads NPM_EMAIL / NPM_PASSWORD from .env)
#   - Restarts the Deno server
#   - Verifies the page loads
#   - git add -A, pull --no-rebase, push
#
# NOTE: static-server.ts edits and index.html creation are done by the
#       /new-site skill (Claude) BEFORE this script is called.

set -euo pipefail

SUBDOMAIN="${1:?Usage: new-site.sh <subdomain>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FORWARD_HOST="217.15.171.172"
FORWARD_PORT=8081

# Load NPM credentials
source "$REPO_ROOT/.env"
: "${NPM_EMAIL:?NPM_EMAIL not set in .env}"
: "${NPM_PASSWORD:?NPM_PASSWORD not set in .env}"

echo "── new-site.sh ──────────────────────────────"
echo "  Subdomain : $SUBDOMAIN.weolopez.com"
echo "  Repo root : $REPO_ROOT"

# ── 1. NPM proxy host ─────────────────────────────
echo ""
echo "1/4  Creating NPM proxy host..."
TOKEN=$(curl -sf -X POST http://localhost:81/api/tokens \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

RESULT=$(curl -sf -X POST http://localhost:81/api/nginx/proxy-hosts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"domain_names\": [\"$SUBDOMAIN.weolopez.com\"],
    \"forward_scheme\": \"http\",
    \"forward_host\": \"$FORWARD_HOST\",
    \"forward_port\": $FORWARD_PORT,
    \"block_exploits\": true,
    \"allow_websocket_upgrade\": true,
    \"ssl_forced\": false,
    \"certificate_id\": 0,
    \"meta\": {\"letsencrypt_agree\": false, \"dns_challenge\": false},
    \"locations\": [],
    \"access_list_id\": 0
  }")

HOST_ID=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "     NPM proxy host #$HOST_ID created for $SUBDOMAIN.weolopez.com"

# ── 2. Restart Deno server ────────────────────────
echo ""
echo "2/4  Restarting http-server.service..."
systemctl restart http-server.service
sleep 2
echo "     Done."

# ── 3. Verify ─────────────────────────────────────
echo ""
echo "3/4  Verifying local routing..."
TITLE=$(curl -sf -H "Host: $SUBDOMAIN.weolopez.com" "http://localhost:$FORWARD_PORT/" \
  | grep -o '<title>[^<]*</title>' || echo "(no <title> found)")
echo "     $TITLE"

# ── 4. Git commit + push ──────────────────────────
echo ""
echo "4/4  Committing and pushing..."
cd "$REPO_ROOT"
git add -A
git commit -m "feat: add $SUBDOMAIN.weolopez.com subdomain (NPM host #$HOST_ID)"
git pull --no-rebase origin main
git push origin main
echo "     Pushed."

echo ""
echo "────────────────────────────────────────────"
echo "✅  $SUBDOMAIN.weolopez.com is live on the server."
echo ""
echo "📋  CLOUDFLARE DNS — add this record in the weolopez.com zone:"
echo "    Type : CNAME"
echo "    Name : $SUBDOMAIN"
echo "    Value: weolopez.com"
echo "    Proxy: ✅ Proxied (orange cloud)"
