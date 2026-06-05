# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

`worldcup/` is a self-contained sub-site inside the monorepo at `weolopez.github.io/`.
As of the June 2026 consolidation, **both the frontend and the backend live in this single
folder** (the old split between `worldcup/` and a sibling `world_cup/` is gone). It is
served by the parent `static-server.ts` on **port 8081** (`deno task dev` from the repo
root). Public hosts: `worldcup.weolopez.com` and `predict.atlantasoccer.news`.

## Development

```bash
# From repo root — single command starts static files + the World Cup API in one process
deno task dev
```

`worldcup/index.html` is the SPA shell. The API (`worldcup/api.ts`) is loaded **in-process**
by `static-server.ts` — there is no separate backend server. It uses Deno KV
(`worldcup/worldcup.db`) for persistence and auto-seeds on first run. To force a re-seed
after changing match data, POST to `/worldcup/api/seed` or use the admin dashboard at
`/worldcup/admin`.

## Backend API (`worldcup/api.ts`)

All routes use the `/worldcup/` prefix to match the routing in `static-server.ts`
(`static-server.ts` strips the prefix and forwards anything under `/worldcup/api`,
`/worldcup/auth`, `/worldcup/admin` to `handleWorldCupApi`).

### Authentication
- Shared SSO via `../shared_auth.ts` — a `weo_session` cookie on `.weolopez.com`
- **Google OAuth** via `id_token` posted to `POST /worldcup/auth/verify`
- Dev shortcut: `POST /worldcup/auth/dev-login` with `{ userId }` to impersonate a seeded user
- `GET /worldcup/api/me` — returns current user from session cookie
- Admin login: `POST /worldcup/admin/login` with `{ password }` → sets `admin_session` cookie

### Data API
| Endpoint | Auth | Description |
|---|---|---|
| `GET /worldcup/api/matches` | public | All matches (sorted by id) |
| `GET /worldcup/api/predictions` | session | Current user's predictions |
| `POST /worldcup/api/predict` | session | `{ matchId, homeScore, awayScore }` — locked once match starts |
| `GET /worldcup/api/leaderboard` | public | All users sorted by points |
| `GET /worldcup/api/teams/:id` | public | Team odds, follower count, per-user accuracy |
| `GET /worldcup/api/leagues` | session | Leagues the user belongs to |
| `POST /worldcup/api/leagues` | session | Create league `{ name }` |
| `POST /worldcup/api/leagues/join` | session | Join by `{ code }` |
| `GET /worldcup/api/leagues/:id` | public | League + member leaderboard |
| `GET /worldcup/api/chat/:matchId` | public | Last 50 chat messages for a match |
| `GET /worldcup/api/events` | public | SSE stream for live updates |

### Data Types (from `data.ts`)
```ts
Match   { id, matchday, date, group, home, away, venue, homeScore?, awayScore?, status }
Team    { id, name, flag }
User    { id, email, name, avatar, points, exact }
Prediction { userId, matchId, homeScore, awayScore, timestamp }
League  { id, name, code, ownerId, members[] }
```

### Scoring Logic
- Correct winner: 1 point
- Exact score: 3 points
- Predictions locked once `Date.now() >= new Date(match.date).getTime()`

### Database
Deno KV (`worldcup/worldcup.db`) with key prefixes: `["matches", id]`, `["users", id]`,
`["predictions", userId, matchId]`, `["leagues", id]`, `["team_follow", teamId, userId]`,
`["chat", matchId, ts]`, `["push", userId]`.

> Note: `admin/api.ts` and `admin/monitor.ts` open this DB read-only at
> `../worldcup/worldcup.db` to count users — keep that path in sync if the DB ever moves.

## Frontend Architecture

The live frontend is plain HTML pages + native Web Components (Shadow DOM, no framework),
served from this folder via the subdomain static resolution in `static-server.ts`:

- `index.html` — SPA shell (auth state, schedule, leaderboard). Defines `const API = '/worldcup'`.
- `match.html` — single-match view with prediction + live chat (SSE)
- `team.html` / `wc-team-page.js` / `wc-team-panel.js` — team pages with follow + title odds
- `meetup.html`, `friendlies.html`, `randoms.html`, `asn.html`, `predict-groups.html` — feature pages
- `admin.html` — admin login + match score management
- `sw.js` — service worker (served at `/sw.js`, scope `/`, always `no-store`)

Components fetch via the `api()` helper (prepends `/worldcup`) and communicate via custom
events dispatched upward; parents pass data down via element properties.

## Google Sign-In Integration

The `wc/google-login.js` component (at repo root `/wc/`, shared) handles Google OAuth:
```html
<script type="module" src="/wc/google-login.js"></script>
```
After Google's GSI callback, post the `credential` (id_token) to `/worldcup/auth/verify`.
On success the server sets the shared session cookie.

Google Client ID: `671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com`

## Match Data

`data.ts` holds the group stage plus friendlies. After changing match data, force a
re-seed (the DB only auto-seeds when empty):

```bash
curl -X POST http://localhost:8081/worldcup/api/seed   # or use the admin dashboard
```

## Design Tokens

- `index.html`: `--primary: #0052B4`, `--secondary: #00DF89`, `--dark: #1A1A1A`, `--light: #F4F6F9`
- Premium accents elsewhere: `--color-primary: #10284B` (deep navy), `--color-secondary: #BFA260` (gold)
