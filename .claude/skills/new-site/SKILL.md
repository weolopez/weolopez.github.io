---
name: new-site
description: Create a new *.weolopez.com subdomain — generates the page, wires up static-server.ts, creates the NPM proxy host, and pushes to GitHub.
---

# New Site

Use this skill whenever the user asks to "make a new website", "add a subdomain", or "create a new page at X.weolopez.com".

## Step 1 — Gather requirements

Ask the user (in a single message, max two questions):

1. **Subdomain name** — what should the URL be? (e.g. `lucas` → `lucas.weolopez.com`)
2. **Purpose / content** — who is it for and what should the page do or say?

If the user's request already answers both (e.g. "make a site for Lucas with a hello world"), skip asking and proceed.

## Step 2 — Create the page

Create `/root/weolopez.github.io/<subdomain>/index.html`.

Design guidelines:
- Single self-contained HTML file (no external build step)
- Match the content to the stated purpose — not a generic placeholder
- Use the site's design tokens if relevant: `--primary: #0052B4`, `--secondary: #00DF89`
- Mobile-first, no framework dependencies
- Include a `<title>` that matches the subdomain/purpose

## Step 3 — Wire up static-server.ts

Edit `/root/weolopez.github.io/static-server.ts` in two places:

**3a. Detection constant** — add alongside the existing subdomain vars (around line 249):
```typescript
const is<Name>Subdomain = reqHost === "<subdomain>.weolopez.com" || reqHost.startsWith("<subdomain>.weolopez.com:");
```

**3b. SPA routing line** — add in the subdomain → SPA routing block (after the isWorldCupSubdomain line):
```typescript
if (is<Name>Subdomain && !hasExtension) return await serveHtml(request, "./<subdomain>/index.html");
```

Use PascalCase for the variable name: `isLucasSubdomain`, `isJohnSubdomain`, etc.

## Step 4 — Run the script

```bash
bash /root/weolopez.github.io/scripts/new-site.sh <subdomain>
```

This script:
- Creates the NPM proxy host via the admin API (reads creds from `.env`)
- Restarts `http-server.service`
- Verifies the page loads locally
- Runs `git add -A && git pull --no-rebase && git push`

If the script fails at the NPM step (host already exists), check existing hosts:
```bash
source /root/weolopez.github.io/.env
TOKEN=$(curl -s -X POST http://localhost:81/api/tokens -H "Content-Type: application/json" \
  -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:81/api/nginx/proxy-hosts \
  | python3 -c "import sys,json; [print(h['id'], h['domain_names']) for h in json.load(sys.stdin)]"
```

## Step 5 — Remind about Cloudflare DNS

After the script completes, tell the user:

> One manual step: add a **CNAME** record in the [Cloudflare dashboard](https://dash.cloudflare.com) for the `weolopez.com` zone:
>
> | Type | Name | Content | Proxy |
> |---|---|---|---|
> | CNAME | `<subdomain>` | `weolopez.com` | ✅ Proxied |

## Notes

- All `*.weolopez.com` subdomains are behind Cloudflare — no SSL cert needed in NPM.
- The forward host is always `217.15.171.172`, port `8081`.
- If the site needs Google Sign-In, add `https://<subdomain>.weolopez.com` to Authorized JavaScript Origins on the OAuth client (`818213215011-3jb441bllviapgv220aurs1240f08jp7`).
- If the site needs its own backend API, follow the pattern in `vacation/api.ts` and import it in `static-server.ts`.
