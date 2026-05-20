# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

`worldcup/` is a sub-site inside the monorepo at `weolopez.github.io/`. It is served by the parent `static-server.ts` on **port 8081** (`deno task dev` from the repo root). The full-featured World Cup backend lives in the sibling directory `../world_cup/server.ts`, which runs its own Deno KV-backed API on **port 8000**.

## Development

```bash
# From repo root — single command starts everything (static files + world cup API)
deno task dev
```

The `worldcup/index.html` is served at `http://localhost:8081/worldcup/`.

The world_cup API (`world_cup/api.ts`) is loaded in-process by `static-server.ts` — no separate server needed. It uses Deno KV for persistence and auto-seeds the database on first run. To force a re-seed after changing match data, POST to `/world_cup/api/seed` or use the admin dashboard at `/world_cup/admin`.

## Backend API (world_cup/server.ts)

All routes use the `/world_cup/` prefix to match the routing in `static-server.ts`.

### Authentication
- **Google OAuth** via `id_token` posted to `POST /world_cup/auth/verify` — sets a `session` cookie (1 week, HttpOnly)
- Dev shortcut: `POST /world_cup/auth/dev-login` with `{ userId }` to impersonate a seeded user
- `GET /world_cup/api/me` — returns current user from session cookie
- Admin password login: `POST /world_cup/admin/login` with `{ password }` → sets `admin_session` cookie

### Data API
| Endpoint | Auth | Description |
|---|---|---|
| `GET /world_cup/api/matches` | public | All matches (sorted by id) |
| `GET /world_cup/api/predictions` | session | Current user's predictions |
| `POST /world_cup/api/predict` | session | `{ matchId, homeScore, awayScore }` — locked once match starts |
| `GET /world_cup/api/leaderboard` | public | All users sorted by points |
| `GET /world_cup/api/leagues` | session | Leagues the user belongs to |
| `POST /world_cup/api/leagues` | session | Create league `{ name }` |
| `POST /world_cup/api/leagues/join` | session | Join by `{ code }` |
| `GET /world_cup/api/leagues/:id` | public | League + member leaderboard |
| `GET /world_cup/api/events` | public | SSE stream for live updates |

### Data Types (from world_cup/data.ts)
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
Deno KV with key prefixes: `["matches", id]`, `["users", id]`, `["predictions", userId, matchId]`, `["leagues", id]`, `["sessions", sessionId]`.

## Frontend Architecture (world_cup/static/components/)

The existing `world_cup` site uses **native Web Components** with Shadow DOM — no framework. Reuse or reference these patterns when enhancing `worldcup/`:

- `wc-app.js` — `<app-shell>`, root component managing auth state and view routing
- `wc-match-card.js` — Individual match prediction card, fires `prediction-submitted` custom event
- `wc-schedule.js` — Full match schedule grouped by matchday/group
- `wc-leaderboard.js` — Global leaderboard
- `wc-leagues.js` — League create/join/view UI
- `admin-dashboard.js` — Admin login + match score management

Components communicate via custom events dispatched upward; parent components call `fetch` and pass data down via element properties (`.match = obj`, `.prediction = obj`).

## Google Sign-In Integration

The `wc/google-login.js` component (at repo root `/wc/`) handles Google OAuth. Include it as:
```html
<script type="module" src="/wc/google-login.js"></script>
```
After Google's GSI library calls back, post the `credential` (id_token) to `/world_cup/auth/verify`. On success the server sets the `session` cookie — subsequent requests to protected endpoints are automatically authenticated.

Google Client ID: `671385367166-4118tll0ntluovkdm5agd85arvl1ml9h.apps.googleusercontent.com`

## Match Data

`../world_cup/data.ts` has the full group stage: **48 teams, 12 groups (A–L), 72 matches** across 3 matchdays (June 11 – July 7, 2026). After changing match data, force a DB re-seed:

```bash
curl -X POST http://localhost:8000/world_cup/api/seed   # or use admin dashboard
```

The Deno KV database only auto-seeds when empty (server first start). If you change data.ts you must manually trigger a re-seed.

## Design Tokens

The existing `worldcup/index.html` uses:
- `--primary: #0052B4`, `--secondary: #00DF89`, `--dark: #1A1A1A`, `--light: #F4F6F9`

The `world_cup` app uses a premium theme: `--color-primary: #10284B` (deep navy), `--color-secondary: #BFA260` (gold). When integrating, pick one system and be consistent.
