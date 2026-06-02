# Lucas Site — CLAUDE.md

Recording studio booking site for "Weo's Studio" (Atlanta). Served at `lucas.weolopez.com` (or `/lucas/` on the main server).

## Files

| File | Role |
|------|------|
| `index.html` | Entire frontend — one self-contained HTML/CSS/JS file, no framework |
| `api.ts` | Backend — exports `handleLucasApi(req)`, wired into `static-server.ts` |
| `lucas.db` | Deno KV database (SQLite-backed) — do not delete |

## Backend (`api.ts`)

Exported function: `handleLucasApi(req: Request): Promise<Response>`

Routes:
- `GET /lucas/api/availability?date=YYYY-MM-DD` — booked ranges for a day
- `GET /lucas/api/availability/month?year=YYYY&month=M` — all booked ranges for a full month
- `POST /lucas/api/bookings` — create booking `{ clientName, clientEmail, date, startTime, durationHours }`
- `GET /lucas/api/calendar.ics` — iCal export of all confirmed bookings

Session pricing: `{ 3: $100, 6: $180, 9: $225, 12: $275 }`

Payment flow: Zelle to `lucasweolopez@gmail.com`. No payment processing in app — client pays manually after booking.

Email: sent via nodemailer SMTP (env vars below). Falls back to console.log if SMTP not configured. Two emails per booking: studio notification + client confirmation with Zelle instructions.

### Environment Variables

| Var | Purpose |
|-----|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

Set in `.env` at repo root (gitignored), loaded via `--env-file` in `deno.json`.

### Calendar Blocking (Radicale)

Reads `.ics` files from `/var/lib/radicale/collections/collection-root/lucas/studio` to block time from phone calendar (vacation, manual blocks). If directory is absent, silently skips.

## Database (`lucas.db`)

Deno KV at `/root/weolopez.github.io/lucas/lucas.db`.

KV key schema:
- `["lucas_booking", bookingId]` → full `Booking` object
- `["lucas_booking_date", date, bookingId]` → same object, indexed by date for fast day-range queries

`Booking` shape:
```ts
{
  id: string;          // UUID
  clientName: string;
  clientEmail: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:MM (24h)
  durationHours: number; // 3 | 6 | 9 | 12
  status: string;      // "confirmed" | "cancelled"
  createdAt: number;   // Date.now()
}
```

Overlap detection checks:
1. Phone calendar blocks (Radicale `.ics`)
2. Same-day confirmed bookings
3. Previous-day bookings that spill past midnight

## Frontend (`index.html`)

Single HTML file — all CSS and JS inline. No build step, no imports.

### Design tokens
```
--ink:    #0a0805  (near-black background)
--paper:  #f0ead8  (warm off-white text)
--rust:   #c4481a  (primary accent)
--tape:   #8b7355  (muted brown)
--ash:    #2a2520  (dark card bg)
--dust:   #d4c9b0  (subdued text)
--static: #1a1510  (section bg)
```
Fonts: Bebas Neue (display), Space Mono (mono/UI), Crimson Pro (italic body).

### Page sections (in order)
1. **Hero** — animated waveform bars, CTA → `#booking`
2. **Ticker** — scrolling marquee strip
3. **Digital Portfolio** (`#digital-portfolio`) — filterable grid of 12 track cards (Hip-Hop / R&B / Pop / Rock), SoundCloud username: `lucasweolopez`
4. **Gear** (`#gear`) — equipment list in 3 categories
5. **Audio Demos** (`#demos`) — tabbed SoundCloud embeds
6. **Booking** (`#booking`) — 3-step booking flow (see below)
7. **Contact** (`#contact`) — location / hours / email blocks
8. **Footer**

### Booking flow (3 steps)
1. **`#step-calendar`** — month calendar + time grid. Loads month availability on init via `GET /lucas/api/availability/month`. Clicking a date fetches `GET /lucas/api/availability?date=` to refresh. User picks duration (dur-btn) → clicks start hour in time grid → "Reserve this Slot" button.
2. **`#step-form`** — name + email inputs, submits `POST /lucas/api/bookings`.
3. **`#step-zelle`** — shows amount, Zelle recipient, and memo from API response.

### Key JS globals
- `calYear`, `calMonth`, `selDate`, `selHours`, `selStart` — booking state
- `availData` — `{ date, bookedRanges }` for selected date
- `monthData` — `{ "YYYY-MM-DD": [{start, end},...] }` for current month view

## Running

```bash
deno task dev   # from repo root — starts server on port 8081
```

All `/lucas/api*` routes are handled in-process by `handleLucasApi()` via `static-server.ts`.

Restart server: `systemctl restart http-server.service`

## Rules for Claude

- **No commits or PRs.** Edit files directly and restart the service.
- When changing the booking API shape, update both `api.ts` and the matching JS in `index.html` together.
- The frontend is one file. Keep it that way — do not split into multiple files or add a build step.
- SMTP email is optional — never make it required or throw on missing env vars.
- Do not change the KV key schema without migrating existing data.
