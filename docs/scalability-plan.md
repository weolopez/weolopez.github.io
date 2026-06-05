# High-Traffic Hardening Plan — weolopez.com origin

Status legend: ✅ done · 🔜 queued · 💤 out of scope (for now)

## Context

The whole site runs as a **single Deno process** (`static-server.ts`, port 8081) behind
Nginx Proxy Manager → Cloudflare (wildcard `*.weolopez.com`, orange-cloud proxied). The
origin was *defeating* the CDN it already pays for: HTML was served `no-store` and
JS/CSS/images carried **no `Cache-Control` at all**, so nearly every asset request traveled
all the way to the Deno box. The busiest backend — **World Cup** (`worldcup.weolopez.com`
+ `predict.atlantasoccer.news`, code in `worldcup/api.ts`) — does full-table Deno-KV scans
and non-atomic read-modify-write on hot request paths. If a match goes viral, the single
process is the bottleneck on both fronts.

**Goal (quick wins, no new servers):** let Cloudflare serve static assets from the edge,
and make the World Cup API survive a traffic spike via in-memory caching, atomic KV ops,
list limits, and basic rate limiting. Everything is deployable incrementally on the current
single box (edit files in place + `systemctl restart http-server.service`). Horizontal
scaling (multi-instance + shared state) is explicitly deferred.

---

## Part A — Static assets to the (existing) Cloudflare edge

Goal: ~90% of static requests served from Cloudflare edge, never touching Deno.

- ✅ **A1. Origin `Cache-Control` headers** — `static-server.ts` now maps file extension →
  cache policy: long-lived assets (`js, css, png, jpg, webp, svg, woff2, …`) get
  `public, max-age=3600, stale-while-revalidate=86400`; HTML gets
  `public, max-age=0, must-revalidate` (ETag revalidation instead of full re-download);
  `sw.js` stays `no-store`.
- ✅ **A2. Cloudflare cache rule** — documented in
  [`docs/features/cdn-edge-caching.md`](features/cdn-edge-caching.md) (manual dashboard
  step: cache-everything for static extensions, respect origin TTL).
- 💤 **A3. Origin→edge gzip at NPM/nginx** — low priority; Cloudflare already
  brotli/gzip-compresses to browsers at the edge.

**Verify:** `curl -I https://worldcup.weolopez.com/team-data.js` shows a `cache-control`
with `stale-while-revalidate`; a second request shows `cf-cache-status: HIT`.

---

## Part B — World Cup API: cache the hot reads

File: `worldcup/api.ts`. KV handle is opened once at module load (good); the problem is
full-table scans per request.

- ✅ **B1. In-memory TTL cache** (`_cache` + `_cached()`/`_cacheBust()` in `worldcup/api.ts`)
  applied at the hot read routes: `matches` (15s), `leaderboard` (12s), `teamf:<id>` (60s).
  Cached at the route level (not by rewrapping the low-level `_getX()`), so mutating paths
  keep their own freshly-deserialized objects — no aliasing. Writers bust: `_saveMatch` →
  `matches`; `_recalcScores`/`_createUser` → `leaderboard`; follow/unfollow → `teamf:<id>`.
  Score changes bust immediately, so the TTL only bites when nothing changed.
- ✅ **B2. `limit` on the chat iterator** — `kv.list({ prefix: ["chat", matchId] },
  { limit: 50, reverse: true })` instead of loading all then slicing.
- ✅ **B3. League-code index lookup** — direct `kv.get(["league_codes", code])` instead of
  scanning every league (also stops an invalid code from triggering a full-table scan).
- ✅ **B4. Edge micro-cache for public GETs** — `/worldcup/api/matches` and
  `/worldcup/api/leaderboard` return `public, max-age=10, stale-while-revalidate=30` (via
  the `json(data, status, cache)` helper). `/worldcup/api/teams/:id` is **excluded** —
  it reads the session cookie (per-user `isFollowing`/`accuracy`), so it stays uncached.

**Verified:** read endpoints carry the public cache header; the per-user team route does
not; data intact (216-match schedule, real leaderboard); no runtime errors on restart.

> ⚠️ **Edge caching of these API paths is not yet active.** Cloudflare returns
> `cf-cache-status: DYNAMIC` because it won't cache a no-extension API path on the origin
> `Cache-Control` alone — it needs an explicit **Cache Rule** (Cache Everything +
> Respect origin TTL) scoped to `/worldcup/api/matches` and `/worldcup/api/leaderboard`
> (GET). Until that rule is added, the headers still drive **browser** + SWR caching, and
> the **B1 in-memory cache is what protects the origin** during a spike (it doesn't depend
> on Cloudflare). Add the rule alongside the A2 static-asset rule if you want the edge to
> absorb API hits too.

---

## Part C — Write-path safety (counters & spikes)

- ✅ **C1. Atomic increments** — `likes/api.ts` `bump()` uses an `atomic().check(cur).set()`
  retry loop (optimistic concurrency). Chosen over `kv.sum`/`KvU64` to keep the value a
  plain JSON-safe number and preserve the legacy-key read path.
- ✅ **C2. Rate limiting on writes** — `likes/api.ts`: per-IP fixed window (30 / 10s, keyed
  on `cf-connecting-ip`→`x-forwarded-for`), `429` + `Retry-After`. `worldcup/api.ts`:
  generic `_tooFast()` min-interval guard on `/api/predict` (500ms/user); chat POST already
  had its own 5s/user guard.

**Verified:** 50 concurrent likes (unique IPs) → final count **exactly 50** (no lost
updates); 40 likes from one IP → **30 × 200 / 10 × 429** with `Retry-After: 10`.

---

## Rollout order

Each step is independently revertible (edit in place + restart, no PRs):

1. ✅ A1 header helper → ✅ A2 Cloudflare rule (+ docs).
2. ✅ B1 in-memory cache (biggest origin-CPU win) → ✅ B2/B3 list limits & index fix.
3. ✅ B4 API micro-cache (per-user team route excluded).
4. ✅ C1 atomic counters → ✅ C2 rate limiting.

**All quick-wins shipped** (2026-06-03). Remaining open item: apply the manual Cloudflare
cache rule (A2) in the dashboard if not already done — see the linked doc.

After each: `curl -I` header checks + a short load test (`oha -z 30s -c 50 <url>`), watch
`systemctl status http-server.service` memory and `journalctl -u http-server` for errors.

## Load-test endpoints

```bash
oha -z 30s -c 50 https://worldcup.weolopez.com/worldcup/api/matches      # full-table read
oha -z 30s -c 50 https://worldcup.weolopez.com/worldcup/api/leaderboard  # scan + sort
oha -z 20s -c 100 https://worldcup.weolopez.com/index.html               # edge-cache asset
```
Do **not** flood write endpoints (predict / like / chat POST) — validate those with a small
targeted concurrency test instead. Cloudflare may challenge a sustained flood from one IP.

## Out of scope (revisit only if the single process still saturates)

💤 Multiple Deno instances behind a load balancer with shared state (KV → Postgres/Redis,
shared SSE/session store). Dedicated CDN / R2 object storage for assets.

## Critical files

- `static-server.ts` — static header helper (A1), HTML cache policy, `sw.js` no-store.
- `worldcup/api.ts` — TTL cache (B1), list limits (B2), league index (B3), API
  micro-cache (B4), generalized rate limiter (C2).
- `likes/api.ts` — atomic increment (C1), rate limit (C2).
- [`docs/features/cdn-edge-caching.md`](features/cdn-edge-caching.md) — Cloudflare rule (A2).
