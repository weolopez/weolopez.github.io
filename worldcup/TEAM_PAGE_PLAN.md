# Team Page — Data Collection & UI/UX Plan

Plan for turning the current minimal team page (`team.html` + `wc-team-panel.js`) into a
**mobile-first, info-rich, engagement-driving** national-team hub for WC 2026.

---

## 1. Goals

- **Info-rich** — every team is a destination: identity, history, squad, live form, standings, fixtures.
- **Mobile-first** — single-column, thumb-reachable, sticky nav, fast first paint, progressive load.
- **Engagement** — follow a team, predict its matches, join watch parties, chat, share, get notified.
- **Low-maintenance** — static editorial data curated once; live data computed from the existing API.

---

## 2. Current state

| Asset | What it holds |
|---|---|
| `worldcup/team-data.js` | All **48 teams**, each with: `capital, population, continent, fifaRanking, wcAppearances, bestResult, funFact`, and **6 players** (`name, pos, club, age`). |
| `world_cup/data.ts` | `TEAMS` (id, name, flag) and `TEAM_TIER` (odds/strength tier per team). |
| `/world_cup/api/matches` | All 72 matches with group, date, venue, scores, status — enough to derive standings, fixtures, form, head-to-head. |
| `wc-team-panel.js` | Renders header + fun fact + info chips + player cards from `team-data.js`. |

**Gap:** no live data on the team page (standings/fixtures/form), no media (crests/photos), thin squad
data (no caps/goals/number/star flag), no manager/honors/qualification, and **zero engagement features**.

---

## 3. Target data model

Split into three layers by volatility — this dictates *where* each field lives and *how* it's collected.

### Layer A — Static editorial (curated, lives in `team-data.js`, expanded)
```js
ARG: {
  // identity
  nickname: 'La Albiceleste',
  confederation: 'CONMEBOL',
  colors: { primary: '#75AADB', secondary: '#FFFFFF' },   // drives page theming
  crest: '/worldcup/icons/teams/arg.svg',                 // optional, flag is fallback
  language: 'Spanish',
  // demographics (existing)
  capital, population, continent,
  // history
  wcAppearances, bestResult,
  titles: ['1978', '1986', '2022'],
  firstAppearance: 1930,
  honors: ['3× World Cup', '15× Copa América'],
  rivals: ['BRA', 'ENG'],
  // tournament 2026
  qualification: 'CONMEBOL — 1st (qualified Sep 2025)',
  manager: { name: 'Lionel Scaloni', since: 2018, nationality: 'ARG' },
  captain: 'Lionel Messi',
  // editorial
  funFacts: ['…', '…'],                                   // promote single → array
  // squad (expanded)
  formation: '4-3-3',
  players: [{ name, pos, club, age, number, caps, goals, isCaptain, isStar, photo }]
}
```

### Layer B — Semi-static (refreshed periodically, can stay in `team-data.js` or a seasonal seed)
- `fifaRanking` (+ previous value for trend arrow)
- squad list (changes near tournament)
- qualification status

### Layer C — Dynamic (computed at request time, **never** hand-authored)
Served by a new **`GET /world_cup/api/teams/:id`** endpoint that aggregates from existing match data:
- **Group standing** — P, W, D, L, GF, GA, GD, Pts (mirror `index.html`/`predict-groups.html` logic).
- **Fixtures & results** — the team's matches with opponent, date, venue, score, status.
- **Form guide** — last N results as W/D/L.
- **Head-to-head** — vs the next opponent.
- **Win probability / strength** — derive from `TEAM_TIER` (or `/admin/odds`).

### Layer D — Engagement (new KV-backed)
- `followers` count + `isFollowing` (per user)
- aggregate fan predictions for the team's matches
- watch parties for the team's matches (reuse `/api/matches/:id/meetups`)
- team fan-wall / chat (reuse the match chat pattern, keyed by team)
- the signed-in user's prediction accuracy for this team

---

## 4. Data collection plan (phased)

**Phase 0 — Schema & migration**
- Lock the schema above; write a `team-data.schema` validator + a **coverage script** that prints
  `% complete` per field across all 48 teams (gate: 100% on required fields).
- Migrate existing entries (`funFact` → `funFacts[]`, add empty new keys).

**Phase 1 — Editorial enrichment (all 48 teams)**
- Fields: nickname, confederation, colors, manager, captain, honors, titles, qualification, formation,
  rivals, expanded player stats (number/caps/goals/star).
- **Sources:** FIFA.com (rankings, confederation), Wikipedia (squads, honors, manager, history),
  official federation sites; team kit colors from Wikipedia infobox / curated palette.
- **Method:** LLM-assisted draft per team → **human spot-check** against source → commit in batches of ~12.
  Treat funFacts and bios as draft-then-verify (avoid hallucinated stats).

**Phase 2 — Media (progressive, optional)**
- Team crests: Wikimedia Commons SVG (check licensing) → `worldcup/icons/teams/`. **Flag emoji is the
  fallback**, so the page never blocks on media.
- Player photos: only if a clean licensed source exists; otherwise initials avatar (already a pattern).

**Phase 3 — Dynamic aggregation endpoint**
- Build `GET /world_cup/api/teams/:id` (standings, fixtures, form, h2h, win prob). Pure computation over
  KV matches — no new authored data, auto-correct as scores update.

**Phase 4 — Engagement endpoints**
- `POST/DELETE /world_cup/api/teams/:id/follow`, `GET …/followers`, team fan-wall, per-team accuracy.

**Validation/quality gates:** coverage script in CI-style check; admin "data completeness" view;
required vs optional fields documented; no team renders empty (graceful fallbacks already in component).

---

## 5. UI/UX — mobile-first team page

### Layout principles
- **Single column**, max-width ~640px centered on tablet+.
- **Team-color theming**: set CSS variables from `colors.primary/secondary` on the host so each team
  feels distinct (hero gradient, accent, active states).
- **Sticky top bar** (back + team name) and **sticky pill sub-nav** with scrollspy.
- **Progressive load**: hero + overview first; squad/matches/standings/fan-zone hydrate lazily.
- **Tap targets ≥44px**, skeleton loaders, optimistic UI for follow/predict.

### Wireframe (mobile)
```
┌─────────────────────────────┐
│ ←  Argentina           ⤴ ★  │  sticky bar: back · share · follow
├─────────────────────────────┤
│      🇦🇷  (team-color grad)  │  HERO
│        Argentina            │
│     "La Albiceleste"        │
│   CONMEBOL · Group C        │
│  ┌────┬────┬────┐           │  quick stats
│  │ #1 │ 3× │ 18 │           │  Rank↑ · Titles · WC Apps
│  │Rank│Cups│Apps│           │
│  └────┴────┴────┘           │
│   [ ★ Follow ] 4,182 fans   │  social proof + CTA
├─────────────────────────────┤
│ Overview Squad Matches …    │  sticky pill nav (scrollspy)
├─────────────────────────────┤
│ ▸ Win probability  ████░ 22%│  OVERVIEW
│ ▸ Did you know? (carousel)  │
│ ▸ Manager · Captain · Kit   │
│ ▸ Honors timeline           │
│ ▸ Next: vs 🇲🇽  (H2H 5-2-3) │
├─────────────────────────────┤
│ Formation 4-3-3  (pitch viz)│  SQUAD
│ FW [Messi★][Lautaro][…]     │  grouped by position
│ MID … DEF … GK …            │  tap → player sheet
├─────────────────────────────┤
│ Form  W W D L W             │  MATCHES
│ ◦ Jun 11 vs 🇲🇽  [Predict]  │  inline predict / scores
│ ◦ Jun 16 vs … 2–1 ✓         │
├─────────────────────────────┤
│ Group C  (team row hilite)  │  STANDINGS (live)
├─────────────────────────────┤
│ 💬 Fan wall · 📍 Watch party│  FAN ZONE
│ Your accuracy for ARG: 71%  │
│ 🔔 Notify me for ARG matches│
└─────────────────────────────┘
```

### Sections
1. **Hero** — themed gradient, flag/crest, name, nickname, confederation + group chips, FIFA rank with
   **trend arrow**, 3 quick-stat tiles, **Follow** button + follower count (social proof).
2. **Overview** — win-probability bar, swipeable "Did you know?" facts, manager/captain/kit/stadium chips,
   honors timeline, **head-to-head vs next opponent**.
3. **Squad** — formation pitch graphic + position-grouped player cards (GK/DEF/MID/FWD), star player
   highlighted, tap opens a player bottom-sheet (caps, goals, club, age).
4. **Matches** — form guide pills (W/D/L), the team's fixtures with **inline predict** (reuse existing
   predict flow) and live/final scores.
5. **Standings** — live group table with this team's row highlighted; tap a rival row → its team page.
6. **Fan Zone** — fan-wall/chat, watch-party CTA + list, the user's prediction accuracy for this team,
   per-team match notifications toggle.

---

## 6. Engagement features (ranked by impact/effort)

| Feature | Hook | Effort |
|---|---|---|
| **Follow team** | ★ in hero → personalized home + push before matches | M (KV + push reuse) |
| **Social proof** | "4,182 fans backing Argentina" | S (counter) |
| **Inline predict** | Predict the team's next match without leaving page | S (reuse predict) |
| **Per-team accuracy** | "Your ARG accuracy: 71%" → competitive pull | S (compute) |
| **Watch parties** | Surface/post parties for the team's matches | S (reuse meetups) |
| **Fan wall / chat** | Team-scoped chat | M (reuse match chat) |
| **Share card** | Generate an image card → social loops | M |
| **Compare teams** | Side-by-side stat bars | M |
| **Fan badges/streaks** | Reward following + predicting | M |

Engagement should be **viewable logged-out** (read), **gated on action** (follow/predict/post → sign-in
prompt), reusing the existing `signin-modal.js`.

---

## 7. Technical implementation phases

1. **Data** — expand `team-data.js` schema + coverage script (Phase 0–1 above).
2. **Dynamic API** — `GET /world_cup/api/teams/:id` aggregation.
3. **Componentize** — split the page into composable web components mounted by `team.html`:
   - `wc-team-hero` · `wc-team-overview` · `wc-team-squad` · `wc-team-fixtures` ·
     `wc-team-standings` · `wc-team-fanzone` (today's `wc-team-panel` becomes Overview+Squad or is split).
   - Shared sticky pill-nav with scrollspy.
   - Team-color theming via CSS custom properties from `colors`.
4. **Engagement API** — follow / followers / fan-wall / per-team accuracy (KV), push reuse.
5. **Polish** — skeletons, share card, compare, badges, a11y + perf pass.

---

## 8. Open questions

- **Media licensing** — are we OK relying on Wikimedia crests/photos, or stay flag-only (zero risk)?
- **Auto vs curate** — how much editorial (funFacts, bios) is LLM-drafted vs hand-written?
- **Engagement gating** — read-everything logged-out, or require sign-in to view fan zone?
- **Notifications** — extend existing push (admin app pattern) to per-team match reminders?
