/// <reference lib="deno.unstable" />
import { TEAMS, MATCHES, Match, User, Prediction, League } from "./data.ts";
import { getSharedSession, createSharedSession } from "../shared_auth.ts";

// ── IN-PROCESS CACHE ─────────────────────────────────────────────────────────

const _cache = new Map<string, { v: unknown; exp: number }>();
async function _cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const e = _cache.get(key);
    if (e && e.exp > Date.now()) return e.v as T;
    const v = await fn();
    _cache.set(key, { v, exp: Date.now() + ttlMs });
    return v;
}
function _cacheBust(...keys: string[]) {
    for (const k of keys) _cache.delete(k);
}

// ── KV DATABASE ──────────────────────────────────────────────────────────────

const kv = await Deno.openKv("./epl/epl.db");

// Auto-seed if matches exist in data.ts but DB is empty
if ((await _getMatches()).length === 0 && MATCHES.length > 0) {
    for (const m of MATCHES) await _saveMatch(m);
    console.log(`[epl-api] Seeded ${MATCHES.length} matches from data.ts`);
}

async function _getMatches(): Promise<Match[]> {
    return _cached("matches", 30_000, async () => {
        const iter = kv.list<Match>({ prefix: ["matches"] });
        const out: Match[] = [];
        for await (const r of iter) out.push(r.value);
        return out.sort((a, b) => a.id - b.id);
    });
}

async function _getMatch(id: number): Promise<Match | null> {
    const r = await kv.get<Match>(["matches", id]);
    return r.value;
}

async function _saveMatch(m: Match) {
    await kv.set(["matches", m.id], m);
    _cacheBust("matches");
}

async function _getUser(id: string): Promise<User | null> {
    const r = await kv.get<User>(["users", id]);
    return r.value;
}

async function _createUser(u: User) {
    await kv.set(["users", u.id], u);
    _cacheBust("leaderboard");
}

async function _getLeaderboard(): Promise<User[]> {
    return _cached("leaderboard", 20_000, async () => {
        const iter = kv.list<User>({ prefix: ["users"] });
        const out: User[] = [];
        for await (const r of iter) out.push(r.value);
        return out.sort((a, b) => b.points - a.points || b.exact - a.exact);
    });
}

async function _savePrediction(p: Prediction) {
    await kv.set(["predictions", p.userId, p.matchId], p);
}

async function _getPredictionsForUser(userId: string): Promise<Prediction[]> {
    const iter = kv.list<Prediction>({ prefix: ["predictions", userId] });
    const out: Prediction[] = [];
    for await (const r of iter) out.push(r.value);
    return out;
}

// ── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────

async function _sendPush(userId: string, title: string, body: string, url: string): Promise<void> {
    try {
        const sub = (await kv.get<unknown>(["push", userId])).value;
        if (!sub) return;
        const { sendPush } = await import("../worldcup/api.ts") as { sendPush?: Function };
        if (typeof sendPush === "function") await sendPush(sub, { title, body, url });
    } catch (_) {}
}

async function _notifyAdmin(title: string, body: string, url: string): Promise<void> {
    const iter = kv.list<User>({ prefix: ["users"] });
    for await (const { value } of iter) {
        if (value.email === "weolopez@gmail.com") {
            _sendPush(value.id, title, body, url).catch(() => {});
            return;
        }
    }
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

async function _createEplSession(user: User): Promise<string> {
    const id = crypto.randomUUID();
    user.lastVisit = Date.now();
    await kv.set(["users", user.id], user);
    await kv.set(["sessions", id], user, { expireIn: 365 * 24 * 60 * 60 * 1000 });
    return id;
}

async function _getEplSession(id: string): Promise<User | null> {
    const r = await kv.get<User>(["sessions", id]);
    if (!r.value) return null;
    const fresh = await _getUser(r.value.id);
    return fresh ?? r.value;
}

async function _emailLogin(email: string, name: string): Promise<string> {
    email = email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Invalid email");
    const userId = "email_" + btoa(email).replace(/[^a-zA-Z0-9]/g, "");
    let user = await _getUser(userId);
    if (!user) {
        user = {
            id: userId, email,
            name: name?.trim() || email.split("@")[0],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=37003c&color=ffffff`,
            points: 0, exact: 0,
        };
        await _createUser(user);
        await _recalcUserScore(userId);
        _notifyAdmin(`👤 New EPL user: ${user.name}`, user.email, "https://epl.weolopez.com/").catch(() => {});
    } else if (name?.trim() && user.name !== name.trim()) {
        user.name = name.trim();
        await kv.set(["users", userId], user);
        _cacheBust("leaderboard");
    }
    return _createEplSession(user);
}

async function _requestMagicLink(email: string, name: string): Promise<void> {
    email = email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Invalid email");
    const token = crypto.randomUUID();
    await kv.set(["magic_token", token], { email, name: name || "" }, { expireIn: 30 * 60 * 1000 });
    const siteUrl = "https://epl.weolopez.com";
    const link = `${siteUrl}/?magic=${token}`;
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Email service not configured");
    const html = `
<div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#37003c;border-radius:12px;color:#fff;text-align:center">
  <div style="font-size:32px;margin-bottom:8px">⚽</div>
  <h2 style="margin:0 0 8px;color:#00ff85;font-size:22px">Sign in to EPL Predictor</h2>
  <p style="color:#ccc;margin:0 0 24px;font-size:14px">Click below to sign in — link expires in 30 minutes.</p>
  <a href="${link}" style="display:inline-block;background:#00ff85;color:#37003c;text-decoration:none;font-weight:800;font-size:1rem;padding:14px 32px;border-radius:8px;margin:0 0 24px">Sign In Now →</a>
  <p style="color:#aaa;font-size:12px;margin:0">If you didn't request this, ignore this email.</p>
</div>`;
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from: "EPL Predictor <noreply@predict.atlantasoccer.news>",
            to: [email],
            subject: "Your EPL Predictor sign-in link",
            html,
        }),
    });
    if (!res.ok) throw new Error(`Email send failed (${res.status})`);
}

async function _verifyMagicToken(token: string): Promise<string> {
    const r = await kv.get<{ email: string; name: string }>(["magic_token", token]);
    if (!r.value) throw new Error("Link expired or already used — request a new one");
    await kv.delete(["magic_token", token]);
    return _emailLogin(r.value.email, r.value.name);
}

async function _verifyGoogleToken(idToken: string): Promise<string> {
    const res = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    if (!res.ok) throw new Error("Invalid Google token");
    const payload = await res.json();
    let user = await _getUser(payload.sub);
    if (!user) {
        user = { id: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture, points: 0, exact: 0 };
        await _createUser(user);
        await _recalcUserScore(user.id);
        _notifyAdmin(`👤 New EPL user: ${user.name}`, user.email, "https://epl.weolopez.com/").catch(() => {});
    }
    return _createEplSession(user);
}

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "admin123";

async function _createAdminSession(): Promise<string> {
    const id = crypto.randomUUID();
    await kv.set(["admin_sessions", id], { isAdmin: true }, { expireIn: 7 * 24 * 60 * 60 * 1000 });
    return id;
}

async function _getAdminSession(id: string): Promise<boolean> {
    const r = await kv.get<{ isAdmin: boolean }>(["admin_sessions", id]);
    return r.value?.isAdmin === true;
}

// ── SSE BROADCAST ─────────────────────────────────────────────────────────────

const _channel = new BroadcastChannel("epl_updates");
let _sseClients = 0;

export function eplBroadcast(type: string, payload: unknown) {
    _channel.postMessage({ type, payload });
}

function _handleSSE(): Response {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
        start(c) { controller = c; _sseClients++; },
        cancel() {
            _sseClients = Math.max(0, _sseClients - 1);
            _channel.removeEventListener("message", listener);
            clearInterval(keepAlive);
        },
    });
    const enc = new TextEncoder();
    const send = (data: unknown) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch (_) {}
    };
    const listener = (e: MessageEvent) => send(e.data);
    _channel.addEventListener("message", listener);
    const keepAlive = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); } catch (_) { clearInterval(keepAlive); }
    }, 20_000);
    return new Response(stream, {
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "Access-Control-Allow-Origin": "*" },
    });
}

// ── SCORING ENGINE ────────────────────────────────────────────────────────────
// 5pts exact · 3pts correct result + correct goal diff · 1pt correct result

function _calcMatchPoints(pred: { homeScore: number; awayScore: number }, match: Match): { pts: number; isExact: boolean; isCorrect: boolean } {
    if (match.homeScore == null || match.awayScore == null) return { pts: 0, isExact: false, isCorrect: false };
    const actualWin = match.homeScore > match.awayScore ? "h" : match.awayScore > match.homeScore ? "a" : "d";
    const predWin   = pred.homeScore  > pred.awayScore  ? "h" : pred.awayScore  > pred.homeScore  ? "a" : "d";
    const isExact   = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
    const isCorrect = actualWin === predWin;
    const sameGD    = Math.abs(pred.homeScore - pred.awayScore) === Math.abs(match.homeScore - match.awayScore);
    let pts = 0;
    if (isExact)             pts = 5;
    else if (isCorrect && sameGD) pts = 3;
    else if (isCorrect)      pts = 1;
    return { pts, isExact, isCorrect };
}

async function _recalcOneUser(user: User, matchById: Map<number, Match>) {
    let pts = 0, exact = 0, correct = 0;
    const preds = await _getPredictionsForUser(user.id);
    const sorted = preds
        .map(p => ({ p, m: matchById.get(p.matchId) }))
        .filter(({ m }) => m && m.homeScore != null && m.status === "finished")
        .sort((a, b) => new Date(a.m!.date).getTime() - new Date(b.m!.date).getTime());
    let runStreak = 0, bestStreak = 0;
    for (const { p, m } of sorted) {
        const { pts: ep, isExact, isCorrect } = _calcMatchPoints(p, m!);
        pts += ep;
        if (isExact) { exact++; correct++; } else if (isCorrect) correct++;
        if (isCorrect) { runStreak++; if (runStreak > bestStreak) bestStreak = runStreak; } else runStreak = 0;
    }
    user.points = pts; user.exact = exact; user.streak = runStreak; user.bestStreak = bestStreak;
    await kv.set(["users", user.id], user);
}

async function _recalcScores() {
    const users = await _getLeaderboard();
    const matches = await _getMatches();
    const matchById = new Map(matches.map(m => [m.id, m]));
    for (const u of users) await _recalcOneUser(u, matchById);
    _cacheBust("leaderboard");
    return users.length;
}

async function _recalcUserScore(userId: string) {
    const user = await _getUser(userId);
    if (!user) return;
    const matches = await _getMatches();
    await _recalcOneUser(user, new Map(matches.map(m => [m.id, m])));
    _cacheBust("leaderboard");
}

// ── LEAGUE HELPERS ────────────────────────────────────────────────────────────

async function _createLeague(name: string, ownerId: string): Promise<League> {
    const id   = crypto.randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const league: League = { id, name, code, ownerId, members: [ownerId] };
    await kv.set(["leagues", id], league);
    await kv.set(["league_codes", code], id);
    return league;
}

async function _joinLeague(code: string, userId: string): Promise<League> {
    const codeRes = await kv.get<string>(["league_codes", code.toUpperCase()]);
    if (!codeRes.value) throw new Error("Invalid code");
    const leagueRes = await kv.get<League>(["leagues", codeRes.value]);
    if (!leagueRes.value) throw new Error("League not found");
    const league = leagueRes.value;
    if (!league.members.includes(userId)) {
        league.members.push(userId);
        await kv.set(["leagues", league.id], league);
    }
    return league;
}

async function _getLeaguesForUser(userId: string): Promise<League[]> {
    const iter = kv.list<League>({ prefix: ["leagues"] });
    const out: League[] = [];
    for await (const r of iter) { if (r.value.members.includes(userId)) out.push(r.value); }
    return out;
}

// ── CHAT ─────────────────────────────────────────────────────────────────────

const chatRateLimit = new Map<string, number>();
const CHAT_COOLDOWN = 30_000;

async function _getChatMessages(matchId: number): Promise<unknown[]> {
    const iter = kv.list({ prefix: ["chat", matchId] });
    const out: unknown[] = [];
    for await (const r of iter) out.push(r.value);
    return (out as { ts: number }[]).sort((a, b) => a.ts - b.ts).slice(-50);
}

// ── UTIL ──────────────────────────────────────────────────────────────────────

function _getCookie(req: Request, name: string): string | null {
    const h = req.headers.get("cookie") || "";
    const m = h.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
    return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

async function _getSessionUser(req: Request): Promise<User | null> {
    // Check EPL-local session cookie first
    const eplSid = _getCookie(req, "epl_session");
    if (eplSid) return _getEplSession(eplSid);
    // Fall back to shared weo_session (site-wide SSO)
    try {
        return await getSharedSession(req);
    } catch (_) {
        return null;
    }
}

// ── MAIN REQUEST HANDLER ──────────────────────────────────────────────────────

export async function handleEplApi(req: Request): Promise<Response> {
    const url  = new URL(req.url);
    const path = url.pathname.replace(/^\/epl/, "");

    const json = (data: unknown, status = 200, cache?: string) =>
        new Response(JSON.stringify(data), {
            status,
            headers: { "Content-Type": "application/json", ...(cache ? { "Cache-Control": cache } : {}) },
        });
    const PUBLIC_CACHE = "public, max-age=10, stale-while-revalidate=30";

    // ── Config ──
    if (path === "/api/config") {
        return json({
            googleClientId: Deno.env.get("GOOGLE_CLIENT_ID") || "818213215011-3jb441bllviapgv220aurs1240f08jp7.apps.googleusercontent.com",
            emailLoginEnabled: true,
        }, 200, PUBLIC_CACHE);
    }

    // ── Site copy (done-screen) — cron-updated ──
    if (path === "/api/site-copy/done-screen") {
        if (req.method === "POST") {
            const token = Deno.env.get("CRON_TOKEN");
            if (!token || req.headers.get("x-cron-token") !== token) return json({ error: "Unauthorized" }, 401);
            const { trophy, title, subtitle } = await req.json();
            if (!title || !subtitle) return json({ error: "title and subtitle required" }, 400);
            const copy = { trophy: trophy || "🏴󠁧󠁢󠁥󠁮󠁧󠁿", title: String(title), subtitle: String(subtitle) };
            await kv.set(["site_copy", "done_screen"], copy);
            return json({ success: true, copy });
        }
        const r = await kv.get<{ trophy: string; title: string; subtitle: string }>(["site_copy", "done_screen"]);
        return json(r.value ?? {
            trophy: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
            title: "You're locked in!",
            subtitle: "Picks saved. Check back on match day.",
        }, 200, PUBLIC_CACHE);
    }

    // ── Teams ──
    if (path === "/api/teams" && req.method === "GET") {
        return json(Object.values(TEAMS), 200, PUBLIC_CACHE);
    }

    // ── Matches ──
    if (path === "/api/matches" && req.method === "GET") {
        const matches = await _getMatches();
        return json(matches, 200, PUBLIC_CACHE);
    }

    if (path.startsWith("/api/matches/gameweek/")) {
        const gw = parseInt(path.split("/").pop() ?? "", 10);
        if (isNaN(gw)) return json({ error: "Invalid gameweek" }, 400);
        const matches = await _getMatches();
        return json(matches.filter(m => m.gameweek === gw), 200, PUBLIC_CACHE);
    }

    // ── Leaderboard ──
    if (path === "/api/leaderboard" && req.method === "GET") {
        const board = await _getLeaderboard();
        const page  = Math.max(0, parseInt(url.searchParams.get("page") ?? "0", 10));
        const limit = 50;
        return json({ users: board.slice(page * limit, (page + 1) * limit), total: board.length }, 200, PUBLIC_CACHE);
    }

    // ── SSE events ──
    if (path === "/api/events" && req.method === "GET") return _handleSSE();

    // ── Me ──
    if (path === "/api/me" && req.method === "GET") {
        const user = await _getSessionUser(req);
        if (!user) return json({ user: null });
        return json({ user });
    }

    // ── Presence ──
    if (path === "/api/presence" && req.method === "GET") {
        return json({ online: _sseClients + 1 }, 200, PUBLIC_CACHE);
    }

    // ── Predictions ──
    if (path === "/api/predictions" && req.method === "GET") {
        const user = await _getSessionUser(req);
        if (!user) return json({ error: "Not signed in" }, 401);
        const preds = await _getPredictionsForUser(user.id);
        return json(preds);
    }

    if (path === "/api/predict" && req.method === "POST") {
        const user = await _getSessionUser(req);
        if (!user) return json({ error: "Not signed in" }, 401);
        const { matchId, homeScore, awayScore } = await req.json();
        const match = await _getMatch(Number(matchId));
        if (!match) return json({ error: "Match not found" }, 404);
        if (Date.now() >= new Date(match.date).getTime()) return json({ error: "Match has started — predictions locked" }, 400);
        if (typeof homeScore !== "number" || typeof awayScore !== "number" || homeScore < 0 || awayScore < 0) {
            return json({ error: "Invalid scores" }, 400);
        }
        const pred: Prediction = { userId: user.id, matchId: Number(matchId), homeScore, awayScore, timestamp: Date.now() };
        await _savePrediction(pred);
        eplBroadcast("prediction", { userId: user.id });
        return json({ ok: true, pred });
    }

    // ── Chat ──
    if (path.startsWith("/api/chat/")) {
        const matchId = parseInt(path.split("/").pop() ?? "", 10);
        if (isNaN(matchId)) return json({ error: "Invalid match" }, 400);
        if (req.method === "GET") {
            return json(await _getChatMessages(matchId), 200, "public, max-age=5");
        }
        if (req.method === "POST") {
            const user = await _getSessionUser(req);
            if (!user) return json({ error: "Not signed in" }, 401);
            const last = chatRateLimit.get(user.id) ?? 0;
            if (Date.now() - last < CHAT_COOLDOWN) return json({ error: "Slow down — one message per 30s" }, 429);
            chatRateLimit.set(user.id, Date.now());
            const { text } = await req.json();
            if (!text?.trim() || text.trim().length > 280) return json({ error: "Message must be 1–280 chars" }, 400);
            const msg = { matchId, userId: user.id, name: user.name, avatar: user.avatar, text: text.trim(), ts: Date.now() };
            await kv.set(["chat", matchId, msg.ts], msg, { expireIn: 30 * 24 * 60 * 60 * 1000 });
            eplBroadcast("chat", { matchId, msg });
            return json({ ok: true, msg });
        }
    }

    // ── Leagues ──
    if (path === "/api/leagues" && req.method === "GET") {
        const user = await _getSessionUser(req);
        if (!user) return json({ error: "Not signed in" }, 401);
        return json(await _getLeaguesForUser(user.id));
    }

    if (path === "/api/leagues" && req.method === "POST") {
        const user = await _getSessionUser(req);
        if (!user) return json({ error: "Not signed in" }, 401);
        const { name } = await req.json();
        if (!name?.trim()) return json({ error: "League name required" }, 400);
        const league = await _createLeague(name.trim(), user.id);
        return json({ ok: true, league });
    }

    if (path === "/api/leagues/join" && req.method === "POST") {
        const user = await _getSessionUser(req);
        if (!user) return json({ error: "Not signed in" }, 401);
        const { code } = await req.json();
        try { return json({ ok: true, league: await _joinLeague(code, user.id) }); }
        catch (e) { return json({ error: String(e) }, 400); }
    }

    if (path.startsWith("/api/leagues/")) {
        const leagueId = path.split("/").pop() ?? "";
        const r = await kv.get<League>(["leagues", leagueId]);
        if (!r.value) return json({ error: "League not found" }, 404);
        const league = r.value;
        const members = await Promise.all(league.members.map(id => _getUser(id)));
        const board   = members.filter(Boolean).sort((a, b) => (b!.points - a!.points));
        return json({ league, leaderboard: board });
    }

    // ── Auth routes ──

    if (path === "/auth/email-login" && req.method === "POST") {
        try {
            const { email, name } = await req.json();
            await _requestMagicLink(email || "", name || "");
            return json({ ok: true, message: "Magic link sent — check your email" });
        } catch (e) { return json({ error: String(e) }, 400); }
    }

    if (path === "/auth/magic" && req.method === "POST") {
        try {
            const { token } = await req.json();
            const sessionId = await _verifyMagicToken(token);
            const user = await _getEplSession(sessionId);
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Set-Cookie", `epl_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
            return new Response(JSON.stringify({ ok: true, user }), { headers });
        } catch (e) { return json({ error: String(e) }, 400); }
    }

    if (path === "/auth/verify" && req.method === "POST") {
        try {
            const { credential } = await req.json();
            const sessionId = await _verifyGoogleToken(credential);
            const user = await _getEplSession(sessionId);
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Set-Cookie", `epl_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
            return new Response(JSON.stringify({ ok: true, user }), { headers });
        } catch (e) { return json({ error: String(e) }, 400); }
    }

    if (path === "/auth/logout" && req.method === "POST") {
        const sid = _getCookie(req, "epl_session");
        if (sid) await kv.delete(["sessions", sid]);
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", "epl_session=; Path=/; HttpOnly; Max-Age=0");
        return new Response(JSON.stringify({ ok: true }), { headers });
    }

    // ── Admin routes ──

    if (path === "/admin/login" && req.method === "POST") {
        const { password } = await req.json();
        if (password !== ADMIN_PASSWORD) return json({ error: "Wrong password" }, 401);
        const sid = await _createAdminSession();
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", `epl_admin=${sid}; Path=/epl/admin; HttpOnly; SameSite=Lax; Max-Age=604800`);
        return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (path === "/admin/logout" && req.method === "POST") {
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", "epl_admin=; Path=/epl/admin; HttpOnly; Max-Age=0");
        return new Response(JSON.stringify({ ok: true }), { headers });
    }

    if (path.startsWith("/admin/")) {
        const adminSid = _getCookie(req, "epl_admin");
        if (!adminSid || !await _getAdminSession(adminSid)) return json({ error: "Unauthorized" }, 401);

        // GET /admin/matches — full match list
        if (path === "/admin/matches" && req.method === "GET") {
            return json(await _getMatches());
        }

        // POST /admin/matches — create or update a match
        if (path === "/admin/matches" && req.method === "POST") {
            const body = await req.json();
            const m = body as Match;
            if (!m.id || !m.home || !m.away || !m.date) return json({ error: "id, home, away, date required" }, 400);
            await _saveMatch(m);
            eplBroadcast("match_update", { match: m });
            return json({ ok: true, match: m });
        }

        // PATCH /admin/matches/:id — update score/status
        const matchAdminMatch = path.match(/^\/admin\/matches\/(\d+)$/);
        if (matchAdminMatch && req.method === "PATCH") {
            const id = parseInt(matchAdminMatch[1], 10);
            const match = await _getMatch(id);
            if (!match) return json({ error: "Match not found" }, 404);
            const { homeScore, awayScore, status } = await req.json();
            if (homeScore !== undefined) match.homeScore = Number(homeScore);
            if (awayScore !== undefined) match.awayScore = Number(awayScore);
            if (status)  match.status = status;
            await _saveMatch(match);
            eplBroadcast("match_update", { match });
            if (match.status === "finished") {
                await _recalcScores();
                _cacheBust("leaderboard");
            }
            return json({ ok: true, match });
        }

        // GET /admin/users
        if (path === "/admin/users" && req.method === "GET") {
            const users = await _getLeaderboard();
            return json(users);
        }

        // POST /admin/recalc
        if (path === "/admin/recalc" && req.method === "POST") {
            const count = await _recalcScores();
            return json({ ok: true, usersRecalculated: count });
        }

        // POST /admin/seed-fixtures — bulk-seed match fixtures
        if (path === "/admin/seed-fixtures" && req.method === "POST") {
            const { matches } = await req.json() as { matches: Match[] };
            if (!Array.isArray(matches)) return json({ error: "matches array required" }, 400);
            let created = 0;
            for (const m of matches) {
                if (!m.id || !m.home || !m.away || !m.date) continue;
                await _saveMatch(m);
                created++;
            }
            _cacheBust("matches");
            return json({ ok: true, created });
        }

        // POST /admin/clear-db — wipe all match + user data (DANGEROUS)
        if (path === "/admin/clear-db" && req.method === "POST") {
            const { confirm } = await req.json();
            if (confirm !== "CLEAR") return json({ error: 'Pass { "confirm": "CLEAR" }' }, 400);
            const iter = kv.list({ prefix: [] });
            let deleted = 0;
            for await (const r of iter) { await kv.delete(r.key); deleted++; }
            _cacheBust("matches", "leaderboard");
            return json({ ok: true, deleted });
        }
    }

    return json({ error: "Not found" }, 404);
}
