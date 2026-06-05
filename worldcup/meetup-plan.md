# Task: Create a standalone meetup site for World Cup 2026 watch parties

**Working directory:** `/root/weolopez.github.io`

**Goal:** Create `/root/weolopez.github.io/meetup/index.html` and wire it up as `meetup.weolopez.com` in `static-server.ts`. This site will eventually replace the meetup tab inside `/worldcup/match.html`.

---

## Context

The repo is a Deno monorepo served by `static-server.ts` on port 8081. The World Cup app lives in `worldcup/` with its API at `worldcup/api.ts`. All backend routes use the `/worldcup/` prefix. The site is deployed live; to apply changes run `systemctl restart http-server.service`. Do NOT create git commits or PRs — edit files directly.

---

## How to wire up the new subdomain in `static-server.ts`

Look at how `worldcup.weolopez.com` is wired (around line 257) and add the same pattern for `meetup`:

```ts
const isMeetupSubdomain = reqHost === "meetup.weolopez.com" || reqHost.startsWith("meetup.weolopez.com:");
```

Then in the static file serving section (around line 482), add:

```ts
if (isMeetupSubdomain && !hasExtension) return await serveHtml(request, "./meetup/index.html");
```

---

## API the new site will use (already exists — no backend changes needed)

Base: `/worldcup`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/me` | cookie | Current user |
| GET | `/api/matches` | public | All matches |
| GET | `/api/meetups` | public | All meetups enriched with match data |
| GET | `/api/matches/:id/meetups` | public | Meetups for one match |
| POST | `/api/matches/:id/meetups` | session | Create meetup `{message, locationName?, locationUrl?}` |
| POST | `/api/matches/:id/meetups/:id/interested` | session | Toggle "I'm in" |
| POST | `/auth/magic-link/verify` | — | Verify email magic link token |
| POST | `/auth/verify` | — | Verify Google id_token |

**Meetup data shape:**

```ts
{ id, matchId, userId, userName, userAvatar, message, location, locationName, locationUrl, timestamp, interested: string[],
  match?: { id, home: {id,name,flag}, away: {id,name,flag}, date, group, stage, status } }
```

---

## Auth

- Import `openSignInModal`, `closeSignInModal` from `/worldcup/signin-modal.js`
- Check session via `GET /worldcup/api/me` (credentials: 'include')
- On sign-in success, `document.dispatchEvent(new CustomEvent('wc:signin', {detail: user}))` fires
- Handle `?magic=TOKEN` on load → POST to `/worldcup/auth/magic-link/verify`
- Show sticky sign-in bar at bottom when logged out
- Topbar: sign-in button when logged out, avatar + first name when logged in

---

## Three tabs

### 1. 📍 Near Me

- Two hardcoded fan zone hero cards (gradient style):
  - *Atlanta Soccer News Fan Festival™ — Centennial Olympic Park*, 265 Park Ave W NW. Free + GA+ $45-65 + VIP $225-325. June 11–early July. Link: `https://atlantafwc26.com/fan-fest/`
  - *Decatur WatchFest '26 — Decatur Square*. 100% Free. June 11–July 19. Live concerts Big Boi + Indigo Girls. Link: `https://decaturwatchfest26.com/`
  - Each has: Directions button (open Google Maps), "📣 Post Meetup Here" button (pre-fills venue in Post tab, requires sign-in)
- Seven curated Atlanta bar cards (standard card style):
  1. Brewhouse Cafe — Little Five Points, 401 Moreland Ave NE. `brewhousecafe.com`. America's Best Soccer Bar, est. 1997. lat:33.7652 lng:-84.3488
  2. Brewhouse Cafe — South Downtown (badge: NEW), 89 Broad St. `brewhousecafe.com`. New for WC2026. lat:33.7503 lng:-84.3910
  3. STATS Brewpub, 300 Marietta St NW. `statsatl.com`. 70 TV screens, craft brewery. lat:33.7580 lng:-84.3960
  4. Der Biergarten, 300 Marietta St NW. `derbiergarten.com`. 7,000+ sq ft indoor/outdoor. lat:33.7574 lng:-84.3958
  5. District Atlanta, 180 Walker St SW. `districtatlanta.com/fifa.php`. 30-ft LED wall. lat:33.7484 lng:-84.3917
  6. Sports & Social at The Battery, 800 Battery Ave SE. `sports-and-social.com/atlanta/`. Massive LED. lat:33.8900 lng:-84.4678
  7. Jolene Jolene, Midtown Atlanta. Atlanta's first women's sports bar. lat:33.7789 lng:-84.3847
  - Each has distance in km when GPS is available (haversine formula)
  - Each has: 🗺 Maps, 🔗 Website (if url exists), 📣 Post Meetup Here
- GPS search button: uses Overpass API to find bars/pubs within 3km, renders Leaflet map with numbered pins + list below
- "📣 Post Meetup Here" switches to Post tab with venue pre-filled

### 2. 🎉 Parties

- Filter chips: All | Upcoming | Today
- Load from `GET /worldcup/api/meetups`
- Party card: user avatar (image or initials placeholder), name, time-ago, match badge (home flag vs away flag + date, clickable to filter to that match), message, location link (📍 prefix), "🙋 I'm In · N" toggle button (requires auth), "📤 Share" button
- Share: Web Share API or clipboard; URL = `https://meetup.weolopez.com?matchId=X`
- Empty state: "No watch parties yet" + "Post the first one →" button
- When `?matchId=X` is active, filter list to that match and show the match badge at top of panel
- Tab shows a count badge with total meetup count

### 3. ✏️ Post

- Requires auth — show CTA if logged out
- Match selector dropdown (upcoming matches only, sorted by date; format: `🇧🇷 Brazil vs 🇩🇪 Germany · Jun 15, 3:00 PM`)
- Message textarea
- Venue name field with Nominatim autocomplete dropdown (search after 3 chars, 400ms debounce) + 📍 GPS button (reverse geocode via Nominatim)
- Maps link field + "🗺 Open Google Maps" button + "📋 Paste & Parse URL" button (parse Google Maps URLs to extract name/coords)
- On submit: POST to `/worldcup/api/matches/:matchId/meetups`, then switch to Parties tab

---

## Deep link support

- `?matchId=X` → show match hero banner at top (team flags, score if finished, date, venue), pre-select match in Post tab, filter Parties tab to that match by default
- `?tab=nearby|parties|post` → start on that tab
- Match hero has an "✕ Show all watch parties" button that clears the filter
- When user clicks a match badge in a party card → sets `?matchId=X` and re-filters
- Tab clicks update `?tab=` in the URL via `history.replaceState`

---

## Design tokens (match worldcup style)

```css
:root {
    --primary: #0a1f44; --primary-light: #1a3a6b; --gold: #BFA260;
    --dark: #111827; --mid: #374151; --muted: #6B7280;
    --border: #E5E7EB; --bg: #f3f4f6; --card: #ffffff;
    --red: #ef4444; --green: #15803D; --accent: #00c58e;
}
```

Fan zone cards use `background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)` (navy) or gold gradient for the official festival. Sticky topbar height 54px, sticky tab bar top:54px.

---

## PWA

Add `<link rel="manifest" href="/worldcup/manifest.json">` and iOS meta tags (`apple-mobile-web-app-capable`, theme-color `#0a1f44`).

---

## After creating the files

Run `systemctl restart http-server.service` to apply. The site will be reachable at `meetup.weolopez.com` once the subdomain resolves (wildcard DNS already set — no DNS change needed).
