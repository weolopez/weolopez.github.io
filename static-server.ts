/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.177.0/http/file_server.ts";
import { handleCorsProxyRequest } from "./cors-proxy.ts";
import { handleWorldCupApi } from "./worldcup/api.ts";
import { handleEplApi } from "./epl/api.ts";
import { handleVacationApi } from "./vacation/api.ts";
import { handleRandomsApi } from "./randoms/api.ts";
import { handleLucasApi } from "./lucas/api.ts";
import { handleAdminApiRequest } from "./admin/api.ts";
import { handleGeneratedSiteApi } from "./site-routes.generated.ts";

// --- Configuration ---
const PORT = 8081;
const CLAWDBOT_URL = "http://127.0.0.1:18789/tools/invoke";
const CLAWDBOT_CHAT_URL = "http://127.0.0.1:18789/v1/chat/completions";
const CLAWDBOT_TOKEN = Deno.env.get("CLAWDBOT_TOKEN") || "b888b285b8e6f2781e39fce4397bb6b5b25c00f389b28edc";
const VARGO_TOKEN = Deno.env.get("VARGO_TELEGRAM_TOKEN");
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "818213215011-3jb441bllviapgv220aurs1240f08jp7.apps.googleusercontent.com";
const GROUP_CHAT_ID = "-1003897324317";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Clawd-Token",
};

// --- State ---
const clients = new Map<string, (msg: string) => void>();

// --- Helpers ---

/**
 * Validates Google Access Token by calling userinfo endpoint
 */
async function verifyGoogleAccessToken(token: string) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (user.email.toLowerCase() !== "weolopez@gmail.com") return null;
    return user;
  } catch (error) {
    console.error("[Bridge Auth] Token verification failed:", error);
    return null;
  }
}

const checkAuth = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  let token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    token = new URL(req.url).searchParams.get("token");
  }
  if (!token) return null;
  return await verifyGoogleAccessToken(token);
};

// --- Request Handlers ---

/**
 * Handle Server-Sent Events (SSE) for real-time updates
 */
async function handleEventsRequest(request: Request): Promise<Response> {
  const user = await checkAuth(request);
  if (!user) {
    return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
  }

  const clientId = crypto.randomUUID();
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (msg: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${msg}\n\n`));
        } catch (e) {
          console.error("[Bridge] SSE send error", e);
        }
      };
      clients.set(clientId, send);
      console.log(`[Bridge] ${user.email} connected (Total: ${clients.size})`);
      
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15000);
    },
    cancel() {
      clients.delete(clientId);
      console.log(`[Bridge] Client disconnected`);
    },
  });

  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

/**
 * Unified Bridge messaging handler
 */
async function handleClawdBridgeRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const user = await checkAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { message, useCompletions, systemPrompt } = body;

    // 1. Direct Chat Completion Proxy
    if (useCompletions) {
      console.log(`[Bridge] Proxying Chat Completion for ${user.email}`);
      const response = await fetch(CLAWDBOT_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${CLAWDBOT_TOKEN}`
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          model: "default"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Bridge] Gemini Proxy error: ${errorText}`);
        return new Response(JSON.stringify({ error: "Gemini Proxy error" }), { status: 500, headers: CORS_HEADERS });
      }

      const result = await response.json();
      return new Response(JSON.stringify({
        status: "success",
        reply: result.choices[0].message.content
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    // 2. Default: Forward to the agent turn
    console.log(`[Bridge] Forwarding message from ${user.email}: ${message}`);
    const response = await fetch(CLAWDBOT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLAWDBOT_TOKEN}`
      },
      body: JSON.stringify({ 
        tool: "sessions_send",
        args: {
          sessionKey: "agent:main:main",
          message: message
        }
      })
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Archie is busy" }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: CORS_HEADERS });
  }
}

/**
 * Vargo Telegram Relay
 */
async function handleVargoRelay(request: Request): Promise<Response> {
  if (!VARGO_TOKEN) {
    return new Response(JSON.stringify({ error: "Vargo identity not configured" }), { status: 500, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return new Response(JSON.stringify({ error: "No message provided" }), { status: 400, headers: CORS_HEADERS });
    }

    console.log(`[Relay] Vargo speaking: ${message}`);

    const telegramUrl = `https://api.telegram.org/bot${VARGO_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: GROUP_CHAT_ID,
        text: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Relay] Telegram error: ${errorText}`);
      return new Response(JSON.stringify({ error: "Telegram delivery failed" }), { status: 500, headers: CORS_HEADERS });
    }

    return new Response(JSON.stringify({ status: "success" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid relay request" }), { status: 400, headers: CORS_HEADERS });
  }
}

/**
 * Internal Push (Broadcast to SSE clients)
 */
async function handlePushRequest(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const { message } = body;
    const payload = JSON.stringify({ message, timestamp: new Date().toISOString() });
    for (const send of clients.values()) {
      send(payload);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: CORS_HEADERS });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Push failed" }), { status: 400, headers: CORS_HEADERS });
  }
}

// --- Main Router ---

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const reqHost = request.headers.get("host") || "";
  const isVacationSubdomain  = reqHost === "vacation.weolopez.com"  || reqHost.startsWith("vacation.weolopez.com:");
  const isRandomsSubdomain   = reqHost === "randoms.weolopez.com"   || reqHost.startsWith("randoms.weolopez.com:");
  const isLucasSubdomain     = reqHost === "lucas.weolopez.com"     || reqHost.startsWith("lucas.weolopez.com:");
  const isLikesSubdomain     = reqHost === "likes.weolopez.com"     || reqHost.startsWith("likes.weolopez.com:");
  const isMeetupSubdomain    = reqHost === "meetup.weolopez.com"    || reqHost.startsWith("meetup.weolopez.com:");
  const isTierSubdomain      = reqHost === "tier.weolopez.com"      || reqHost.startsWith("tier.weolopez.com:");
  const isSocialSubdomain    = reqHost === "social.weolopez.com"    || reqHost.startsWith("social.weolopez.com:");
  const isTokenSubdomain     = reqHost === "token.weolopez.com"     || reqHost.startsWith("token.weolopez.com:");
  const isAdminSubdomain     = reqHost === "admin.weolopez.com"     || reqHost.startsWith("admin.weolopez.com:");
  const isEplSubdomain       = reqHost === "epl.weolopez.com"       || reqHost.startsWith("epl.weolopez.com:");
  const isAaronSubdomain     = reqHost === "aaron.weolopez.com"     || reqHost.startsWith("aaron.weolopez.com:");
  const isWorldCupSubdomain  = reqHost === "worldcup.weolopez.com"  || reqHost.startsWith("worldcup.weolopez.com:")
                            || reqHost === "predict.atlantasoccer.news"
                            || reqHost === "predict.atlantasoccernews.com";
  console.log(`[server] ${request.method} ${url.pathname}`);

  // Never serve databases, DB sidecars, backups, or env files — these contain
  // session IDs, user emails, and secrets.
  if (/\.db(-wal|-shm)?$|\.sqlite3?$|\/backups\/|\.env/i.test(url.pathname)) {
    return new Response("Forbidden", { status: 403 });
  }

  // 0a. Randoms API
  if (
    url.pathname.startsWith('/randoms/api') ||
    url.pathname.startsWith('/randoms/auth') ||
    url.pathname.startsWith('/randoms/admin')
  ) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    return await handleRandomsApi(request);
  }

  // CalDAV proxy → Radicale on localhost:5232
  // Strip /caldav prefix; pass X-Script-Name so Radicale generates correct hrefs
  if (url.pathname.startsWith('/caldav')) {
    const radicaleUrl = `http://127.0.0.1:5232${url.pathname.slice('/caldav'.length) || '/'}${url.search}`;
    try {
      const fwdHeaders = new Headers(request.headers);
      fwdHeaders.set('X-Script-Name', '/caldav');
      fwdHeaders.delete('host');
      const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
      const resp = await fetch(radicaleUrl, {
        method: request.method,
        headers: fwdHeaders,
        body: hasBody ? request.body : null,
        // @ts-ignore duplex required for streaming request body
        duplex: 'half',
        redirect: 'manual',
      });
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      });
    } catch (e) {
      console.error('[CalDAV proxy]', e);
      return new Response('CalDAV service unavailable', { status: 502 });
    }
  }

  // 0b. Lucas Booking API
  if (url.pathname.startsWith('/lucas/api')) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    return await handleLucasApi(request);
  }

  // 0c. Vacation API
  if (
    url.pathname.startsWith('/vacation/api') ||
    url.pathname.startsWith('/vacation/auth')
  ) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    return await handleVacationApi(request);
  }

  // Admin API
  if (url.pathname.startsWith('/admin/api/')) {
    const res = await handleAdminApiRequest(request);
    if (res) return res;
  }

  // 0b. World Cup API — handled in-process (no separate server needed).
  // Trailing slash is required so static pages like /worldcup/admin.html are NOT
  // swallowed by the API router (every API route has a sub-path, e.g. /admin/login).
  if (
    url.pathname.startsWith('/worldcup/api/') ||
    url.pathname.startsWith('/worldcup/auth/') ||
    url.pathname.startsWith('/worldcup/admin/')
  ) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    return await handleWorldCupApi(request);
  }

  // 0c. EPL Predictor API — same pattern as World Cup
  if (
    url.pathname.startsWith('/epl/api/') ||
    url.pathname.startsWith('/epl/auth/') ||
    url.pathname.startsWith('/epl/admin/')
  ) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    return await handleEplApi(request);
  }

  // Generated sub-site APIs — <site>/api.ts mounted via `claude-rc-ctl wire <site>`.
  {
    const genResp = await handleGeneratedSiteApi(request);
    if (genResp) return genResp;
  }

  // 1. API Endpoints (Bridge & Relay)
  if (url.pathname === "/clawd-bridge" || url.pathname === "/message" || url.pathname === "/clawd-bridge/message") {
    return await handleClawdBridgeRequest(request);
  }
  if (url.pathname === "/events" || url.pathname === "/clawd-bridge/events") {
    return await handleEventsRequest(request);
  }
  if (url.pathname === "/relay/vargo") {
    const user = await checkAuth(request);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS_HEADERS });
    }
    return await handleVargoRelay(request);
  }
  if (url.pathname === "/push") {
    return await handlePushRequest(request);
  }

  // 2. Utilities
  if (url.pathname.startsWith('/cors-proxy')) {
    return await handleCorsProxyRequest(request);
  }

  // RSS proxy — fetches atlantasoccer.news feed server-side to avoid CORS
  if (url.pathname === '/worldcup/rss-feed') {
    try {
      const feedRes = await fetch('https://atlantasoccer.news/feed/', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WC2026Hub/1.0)' }
      });
      const xml = await feedRes.text();
      return new Response(xml, {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
      });
    } catch (err) {
      return new Response('Feed unavailable', { status: 502, headers: CORS_HEADERS });
    }
  }

  // Admin service worker — serve at /sw.js so default scope is / with no header tricks
  if (isAdminSubdomain && url.pathname === '/sw.js') {
    const sw = await Deno.readFile('./admin/sw.js');
    return new Response(sw, {
      headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' },
    });
  }

  // Worldcup/predict service worker
  if (isWorldCupSubdomain && url.pathname === '/sw.js') {
    const sw = await Deno.readFile('./worldcup/sw.js');
    return new Response(sw, {
      headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' },
    });
  }

  // 3. Static File Server
  const hasExtension = /\.[a-z0-9]+$/i.test(url.pathname);

  // Long-lived, content-stable asset types. Filenames are NOT content-hashed, so we use
  // a 1-hour cache + stale-while-revalidate rather than year-long `immutable`: Cloudflare
  // and browsers serve from edge during a spike but pick up changes within ~1h. Bump a
  // `?v=` on asset refs (or purge Cloudflare) for an immediate refresh.
  const ASSET_CACHE = "public, max-age=3600, stale-while-revalidate=86400";
  const ASSET_EXTS = new Set([
    "js", "bjs", "css", "png", "jpg", "jpeg", "gif", "webp", "svg",
    "ico", "woff", "woff2", "ttf", "otf", "mp3", "wav", "mp4", "webm",
  ]);

  // Auto-versioning: stamp local <script>/<link> refs to .js/.mjs/.css with the asset's
  // modified time (?v=<mtime>). HTML always revalidates, so editing an asset auto-busts
  // its cache on the next page load — no manual ?v= bumps. Refs that already have a query
  // are left alone; assets that don't resolve from repo root fall back to the 1h cache.
  const _verCache = new Map<string, { v: string | null; exp: number }>();
  async function assetVersion(urlPath: string): Promise<string | null> {
    const hit = _verCache.get(urlPath);
    if (hit && hit.exp > Date.now()) return hit.v;
    let v: string | null = null;
    try { const st = await Deno.stat("." + urlPath); v = st.mtime ? st.mtime.getTime().toString(36) : null; } catch { v = null; }
    _verCache.set(urlPath, { v, exp: Date.now() + 5000 });
    return v;
  }
  async function stampAssets(html: string): Promise<string> {
    const re = /\b(src|href)="(\/[^"?#>]+\.(?:js|mjs|css))"/g;
    const urls = new Set<string>();
    for (const m of html.matchAll(re)) urls.add(m[2]);
    if (!urls.size) return html;
    const ver = new Map<string, string | null>();
    await Promise.all([...urls].map(async (u) => ver.set(u, await assetVersion(u))));
    return html.replace(re, (full, attr, u) => { const v = ver.get(u); return v ? `${attr}="${u}?v=${v}"` : full; });
  }
  const quickHash = (s: string) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  };

  // HTML is the SPA shell: allow Cloudflare/browser to revalidate cheaply via ETag
  // instead of forcing a full re-download on every navigation. (sw.js stays no-store,
  // handled separately above.)
  async function serveHtml(req: Request, filePath: string): Promise<Response> {
    let html: string;
    try { html = await Deno.readTextFile(filePath); }
    catch { return await serveFile(req, filePath); }   // 404 / non-file → original behavior
    html = await stampAssets(html);
    const etag = `"${quickHash(html)}"`;
    const headers = new Headers({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "ETag": etag,
    });
    if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
    return new Response(html, { status: 200, headers });
  }

  // Serve a static asset via serveFile (keeps ETag/range/conditional support) and apply
  // the long-lived cache policy so Cloudflare can serve it cross-user from the edge.
  async function serveAsset(req: Request, filePath: string): Promise<Response> {
    const resp = await serveFile(req, filePath);
    const headers = new Headers(resp.headers);
    headers.set("Cache-Control", ASSET_CACHE);
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers });
  }

  if (hasExtension) {
    try {
      // For *.weolopez.com subdomains, resolve static files relative to the subdomain directory first.
      // e.g. lucas.weolopez.com/script.js → ./lucas/script.js (falls back to ./script.js if not found)
      const subdomainMatch = reqHost.replace(/:\d+$/, '').match(/^([a-z0-9-]+)\.weolopez\.com$/);
      const subdomainDir = subdomainMatch ? subdomainMatch[1] : null;

      let filePath = "." + url.pathname;
      if (subdomainDir) {
        const subPath = `./${subdomainDir}${url.pathname}`;
        try {
          await Deno.stat(subPath);
          filePath = subPath;
        } catch {
          // Not found in subdomain dir — fall back to root path
        }
      }

      const fileExtension = url.pathname.split('.').pop()?.toLowerCase();

      if (fileExtension === 'bjs' || fileExtension === 'js') {
        // serveFile may not set the right type for `.bjs`, so set it explicitly while
        // still applying the long-lived asset cache policy.
        const fileContent = await Deno.readFile(filePath);
        return new Response(fileContent, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": ASSET_CACHE,
          },
        });
      }

      if (fileExtension === 'html') {
        return await serveHtml(request, filePath);
      }

      if (fileExtension && ASSET_EXTS.has(fileExtension)) {
        return await serveAsset(request, filePath);
      }

      return await serveFile(request, filePath);
    } catch {
      return new Response("File not found", { status: 404 });
    }
  }

  // Subdomain → SPA routing: non-extension paths serve the matching SPA
  if (isEplSubdomain       && !hasExtension) return await serveHtml(request, "./epl/index.html");
  if (isRandomsSubdomain   && !hasExtension) return await serveHtml(request, "./randoms/index.html");
  if (isVacationSubdomain  && !hasExtension) return await serveHtml(request, "./vacation/index.html");
  if (isWorldCupSubdomain  && !hasExtension) {
    // Bare site root → simplified fan landing page. Any query string keeps the
    // full hub: index.html processes ?magic / ?join / ?email / ?qr / ?a2hs links.
    const isBareRoot = (url.pathname === "/" || url.pathname === "/worldcup" || url.pathname === "/worldcup/") && url.search === "";
    return await serveHtml(request, isBareRoot ? "./worldcup/for_soccer_players.html" : "./worldcup/index.html");
  }
  if (isLucasSubdomain     && !hasExtension) return await serveHtml(request, "./lucas/index.html");
  if (isLikesSubdomain     && !hasExtension) return await serveHtml(request, "./likes/index.html");
  if (isMeetupSubdomain    && !hasExtension) return await serveHtml(request, "./meetup/index.html");
  if (isTierSubdomain      && !hasExtension) return await serveHtml(request, "./tier/index.html");
  if (isSocialSubdomain    && !hasExtension) return await serveHtml(request, "./social/index.html");
  if (isAdminSubdomain     && !hasExtension) return await serveHtml(request, "./admin/index.html");
  if (isTokenSubdomain     && !hasExtension) return await serveHtml(request, "./token/index.html");
  if (isAaronSubdomain     && !hasExtension) return await serveHtml(request, "./aaron/index.html");

  // SPA routing: check for a directory index.html first, then fall back to root
  const basePath = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  const dirIndex = '.' + basePath + 'index.html';
  try {
    await Deno.stat(dirIndex);
    // Redirect to add trailing slash so relative ES module imports resolve correctly
    if (!url.pathname.endsWith('/')) {
      return new Response(null, { status: 301, headers: { Location: url.pathname + '/' + url.search } });
    }
    return await serveHtml(request, dirIndex);
  } catch {
    // No directory index — fall back to root SPA
    try {
      return await serveHtml(request, "./index.html");
    } catch {
      return new Response("Index not found", { status: 404 });
    }
  }
}

console.log(`Unified Static & Bridge Server running on http://localhost:${PORT}`);
serve(handleRequest, { port: PORT });
