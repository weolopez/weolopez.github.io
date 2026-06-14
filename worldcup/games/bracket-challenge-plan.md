# World Cup Bracket Challenge — Plan

March-madness-style bracket game for the 2026 World Cup knockout stage. When the group
stage ends, 32 teams advance to a single-elimination bracket. Fans fill out the full
bracket — every pick from Round of 32 through the Final — before the knockout stage
kicks off, then watch their bracket survive (or bust) over three weeks.

## Why it works

- The group-stage prediction game ends naturally on June 27; this re-engages every fan
  for the second half of the tournament with one big, familiar ritual.
- One-shot commitment (fill it once, locked forever) creates bragging rights and
  "bracket busted" drama that score predictions don't.
- Casual fans who missed the group stage can join fresh — day-one parity.

## Timeline (2026)

| Date | Event |
|---|---|
| Jun 27 | Last group matches end; Round of 32 field is set |
| Jun 27–28 | **Picks window opens** — push + personal msg + banner to all users |
| Jun 28 ~12:00 ET | **Brackets lock** at first R32 kickoff |
| Jun 28 – Jul 3 | Round of 32 |
| Jul 4–7 | Round of 16 |
| Jul 9–11 | Quarterfinals |
| Jul 14–15 | Semifinals |
| Jul 18 | Third place |
| Jul 19 | **Final** — bracket champion crowned |

## Game rules

1. Once the R32 field is known, users pick a winner for every slot in the bracket
   (31 picks: 16 + 8 + 4 + 2 + 1). Picks cascade — your R16 choices come from your own
   R32 winners, march-madness style.
2. One bracket per user. Editable until the first knockout kickoff, then locked.
3. Tiebreaker: predicted total goals in the Final.

### Scoring (escalating per round)

| Round | Points per correct pick | Max |
|---|---|---|
| Round of 32 | 1 | 16 |
| Round of 16 | 2 | 16 |
| Quarterfinals | 4 | 16 |
| Semifinals | 8 | 16 |
| Final (champion) | 16 | 16 |
| **Perfect bracket** | — | **80** |

A team you picked deep that gets eliminated early kills all its downstream picks
(standard bracket behavior). Bracket points are a **separate leaderboard** from the
group-stage prediction points; show both on the leaderboard with a toggle.

## Data model (Deno KV)

```
["bracket_entry", userId]  → { userId, picks: { [slotId]: teamId }, tiebreaker: number,
                               createdAt, updatedAt, locked: boolean (derived) }
["bracket_slots"]          → computed bracket structure: 31 slots, each
                               { slotId, round, feeds: slotId|null, homeFrom, awayFrom,
                                 matchId?: number }  — built from group standings + the
                               knockout match data already in data.ts / bracket view
```

Bracket scoring is recomputed from finished knockout matches in `_recalcScores`-style
pass; store result on the user as `bracketPoints`.

## API

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/bracket/structure` | public | Slot tree + which teams/matches fill each slot |
| `GET /api/bracket/entry` | session | Current user's bracket |
| `POST /api/bracket/entry` | session | Save full picks `{ picks, tiebreaker }` — 403 after lock |
| `GET /api/bracket/leaderboard` | public | Users sorted by bracketPoints |
| `GET /api/bracket/entry/:userId` | public | View any locked bracket (share/compare) |
| `POST /admin/bracket/recalc` | admin | Force rescore |

## UI

- **`games/bracket.html`** — the fill-out page. Mobile-first: one round per screen,
  tap a team to advance it, horizontal swipe between rounds (reuse the site's
  scroll-snap pattern). Desktop: classic full-bracket tree. Gold = your pick,
  red strike = busted, green = correct.
- **Leaderboard tab** in `index.html` gets a third sub-tab: 🏆 Bracket.
- **`bracket-info.html`** *(built now)* — infographic explaining the game; target of
  the promo banner.
- **Promo banner** *(built now)* — swipeable banner slot on the done screen, managed
  from admin → ✏️ Copy.

## Engagement hooks

- Push + personal message to all users when picks open ("Your bracket is waiting").
- Daily push during knockouts: "3 of your Sweet-16 teams play today."
- "Bracket busted" personal message with snark when a user's champion is eliminated.
- Fan-token integration: small token bonus for submitting a bracket; sponsor offer for
  the bracket winner.
- Share image: render your bracket as an image for the group chat.

## Build order

1. `bracket_slots` builder from group standings + existing knockout fixtures (data.ts)
2. API endpoints + lock logic
3. `games/bracket.html` fill-out UI (mobile tap-to-advance first)
4. Scoring pass + leaderboard sub-tab
5. Engagement: open-day push, busted notifications, token bonus
6. Share image (stretch)
