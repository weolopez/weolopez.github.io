# Social Agent — CLAUDE.md

This agent is scoped to `/root/weolopez.github.io/social/`.

## Server

The shared Deno server serves all subdomains. To restart it after editing `api.ts` or other server-side files:

```bash
systemctl restart http-server.service
```

## This site

- URL: `https://social.weolopez.com`
- Entry point: `social/index.html`
- Backend API: `social/api.ts` (mounted into the main server via `site-routes.generated.ts`)

## Scope

This agent can write freely inside `/root/weolopez.github.io/social/`. All other paths in the repo are read-only.
