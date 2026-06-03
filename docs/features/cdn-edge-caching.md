# CDN / Edge Caching (Cloudflare)

How `*.weolopez.com` static assets are served from the Cloudflare edge so they never hit
the single Deno origin (`static-server.ts`, port 8081) during a traffic spike.

## Architecture

```
Browser → Cloudflare edge (cache) → Nginx Proxy Manager → Deno origin (:8081)
```

All subdomains are proxied through Cloudflare (orange cloud, wildcard `*.weolopez.com`).
The origin's job is to emit correct `Cache-Control` so Cloudflare can cache cross-user.

## Origin headers (already wired in `static-server.ts`)

The static-file block applies, by file type:

| Type | Header | Why |
|------|--------|-----|
| Assets (`js, bjs, css, png, jpg, jpeg, gif, webp, svg, ico, woff, woff2, ttf, otf, mp3, wav, mp4, webm`) | `public, max-age=3600, stale-while-revalidate=86400` | Edge serves cross-user; picks up changes within ~1h |
| HTML (SPA shells) | `public, max-age=0, must-revalidate` | Cheap ETag revalidation, no full re-download |
| `sw.js` (service workers) | `no-store` | Service workers must never be edge-cached |

**Asset filenames are NOT content-hashed.** A changed `foo.js` won't refresh from edge
until the 1h TTL lapses. For an immediate refresh after deploy, either bump a `?v=` query
string on the asset reference, or purge the Cloudflare cache (Caching → Configuration →
Purge Everything, or purge by URL).

## Cloudflare Cache Rule (manual — set once in the dashboard)

Cloudflare's Free plan already caches common static extensions by default, but add an
explicit rule so behavior is deterministic across every subdomain (incl.
`predict.atlantasoccernews.com`):

1. Dashboard → the `weolopez.com` zone → **Caching → Cache Rules → Create rule**.
2. **Name:** `Static assets — cache everything`.
3. **When incoming requests match** — Custom filter expression:
   - Field `URI Path`, operator `ends with`, value — add one row per extension:
     `.js .css .png .jpg .jpeg .gif .webp .svg .ico .woff .woff2 .ttf .otf .mp3 .wav .mp4 .webm`
     (OR them together), **or** use the convenience field
     `(http.request.uri.path.extension in {"js" "css" "png" "jpg" "jpeg" "gif" "webp" "svg" "ico" "woff" "woff2" "ttf" "otf" "mp3" "wav" "mp4" "webm"})`.
4. **Then:**
   - Cache eligibility: **Eligible for cache**.
   - Edge TTL: **Respect origin TTL** (honors the `max-age` above).
   - Browser TTL: **Respect origin TTL**.
5. Deploy. Repeat for `atlantasoccernews.com` / `atlantasoccer.news` zones if they are
   separate zones in this Cloudflare account.

## Verify

```bash
# First hit warms the edge; second should be HIT
curl -sI https://worldcup.weolopez.com/app.js | grep -i 'cache-control\|cf-cache-status'
curl -sI https://worldcup.weolopez.com/app.js | grep -i 'cf-cache-status'   # → HIT

# HTML should revalidate, not no-store
curl -sI https://worldcup.weolopez.com/ | grep -i cache-control
```

Expected: asset shows `cache-control: public, max-age=3600, stale-while-revalidate=86400`
and `cf-cache-status: HIT` on the second request; HTML shows
`cache-control: public, max-age=0, must-revalidate`.
