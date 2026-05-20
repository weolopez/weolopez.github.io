/// <reference lib="deno.unstable" />
import { MATCHES, USERS, Match, User, Prediction, League } from "./data.ts";

// ── KV DATABASE ──────────────────────────────────────────────────────────────

const kv = await Deno.openKv("/root/weolopez.github.io/world_cup/worldcup.db");

// Auto-seed on first run
if ((await _getMatches()).length === 0) {
    await _runSeed();
}

async function _getMatches(): Promise<Match[]> {
    const iter = kv.list<Match>({ prefix: ["matches"] });
    const out: Match[] = [];
    for await (const r of iter) out.push(r.value);
    return out.sort((a, b) => a.id - b.id);
}

async function _getMatch(id: number): Promise<Match | null> {
    const r = await kv.get<Match>(["matches", id]);
    return r.value;
}

async function _saveMatch(m: Match) {
    await kv.set(["matches", m.id], m);
}

async function _getUser(id: string): Promise<User | null> {
    const r = await kv.get<User>(["users", id]);
    return r.value;
}

async function _createUser(u: User) {
    await kv.set(["users", u.id], u);
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

async function _getLeaderboard(): Promise<User[]> {
    const iter = kv.list<User>({ prefix: ["users"] });
    const out: User[] = [];
    for await (const r of iter) out.push(r.value);
    return out.sort((a, b) => b.points - a.points);
}

async function _clearDb() {
    const iter = kv.list({ prefix: [] });
    for await (const r of iter) await kv.delete(r.key);
}

async function _runSeed() {
    console.log("[wc-api] Seeding database...");
    await _clearDb();
    for (const m of MATCHES) await _saveMatch(m);
    for (const u of USERS) await _createUser(u);
    console.log("[wc-api] Seed complete.");
}

async function _createLeague(name: string, ownerId: string): Promise<League> {
    const id = crypto.randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const league: League = { id, name, code, ownerId, members: [ownerId] };
    await kv.set(["leagues", id], league);
    await kv.set(["league_codes", code], id);
    return league;
}

async function _joinLeague(code: string, userId: string): Promise<League> {
    const codeRes = await kv.get<string>(["league_codes", code]);
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
    for await (const r of iter) {
        if (r.value.members.includes(userId)) out.push(r.value);
    }
    return out;
}

async function _getLeague(id: string): Promise<League | null> {
    const r = await kv.get<League>(["leagues", id]);
    return r.value;
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

async function _verifyToken(token: string): Promise<string> {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) throw new Error("Invalid token");
    const payload = await res.json();
    let user = await _getUser(payload.sub);
    if (!user) {
        user = { id: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture, points: 0, exact: 0 };
        await _createUser(user);
    }
    return _createSession(user);
}

async function _createSession(user: User): Promise<string> {
    const id = crypto.randomUUID();
    await kv.set(["sessions", id], user, { expireIn: 60 * 60 * 24 * 7 * 1000 }); // 7 days
    return id;
}

async function _getSession(id: string): Promise<User | null> {
    const r = await kv.get<User>(["sessions", id]);
    return r.value;
}

// Simple email login — no OAuth, creates user on first sign-in
async function _emailLogin(email: string, name: string): Promise<string> {
    email = email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Invalid email");
    const userId = "email_" + btoa(email).replace(/[^a-zA-Z0-9]/g, "");
    let user = await _getUser(userId);
    if (!user) {
        const initial = (name || email)[0].toUpperCase();
        user = {
            id: userId,
            email,
            name: name?.trim() || email.split("@")[0],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || email)}&background=0a1f44&color=BFA260`,
            points: 0,
            exact: 0,
        };
        await _createUser(user);
    } else if (name?.trim() && user.name !== name.trim()) {
        user.name = name.trim();
        await kv.set(["users", userId], user);
    }
    return _createSession(user);
}

// ── ADMIN AUTH ────────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "admin123";

async function _createAdminSession(): Promise<string> {
    const id = crypto.randomUUID();
    await kv.set(["admin_sessions", id], { isAdmin: true }, { expireIn: 60 * 60 * 24 * 1000 });
    return id;
}

async function _getAdminSession(id: string) {
    const r = await kv.get<{ isAdmin: boolean }>(["admin_sessions", id]);
    return r.value;
}

// ── SSE BROADCAST ─────────────────────────────────────────────────────────────

const _channel = new BroadcastChannel("wc_updates");

export function wcBroadcast(type: string, payload: unknown) {
    _channel.postMessage({ type, payload });
}

function _handleSSE(): Response {
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
        start(c) { controller = c; },
    });

    const enc = new TextEncoder();
    const send = (data: unknown) => {
        try { controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch (_) {}
    };

    const listener = (e: MessageEvent) => send(e.data);
    _channel.addEventListener("message", listener);

    const keepAlive = setInterval(() => {
        try { controller.enqueue(enc.encode(": ping\n\n")); } catch (_) { clearInterval(keepAlive); }
    }, 20000);

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    });
}

// ── SCORING RECALCULATION ─────────────────────────────────────────────────────

async function _recalcScores() {
    const users = await _getLeaderboard();
    const matches = await _getMatches();
    for (const user of users) {
        let pts = 0, exact = 0;
        const preds = await _getPredictionsForUser(user.id);
        for (const p of preds) {
            const m = matches.find(x => x.id === p.matchId);
            if (!m || m.homeScore == null || m.awayScore == null || m.status !== "finished") continue;
            const aw = m.homeScore > m.awayScore ? "h" : m.awayScore > m.homeScore ? "a" : "d";
            const pw = p.homeScore > p.awayScore ? "h" : p.awayScore > p.homeScore ? "a" : "d";
            if (p.homeScore === m.homeScore && p.awayScore === m.awayScore) { pts += 3; exact++; }
            else if (aw === pw) { pts += 1; }
        }
        user.points = pts;
        user.exact = exact;
        await kv.set(["users", user.id], user);
    }
    return users.length;
}

// ── COOKIE HELPER ─────────────────────────────────────────────────────────────

function _getCookie(req: Request, name: string): string | null {
    const h = req.headers.get("Cookie");
    if (!h) return null;
    for (const c of h.split(";")) {
        const [k, v] = c.trim().split("=");
        if (k === name) return v;
    }
    return null;
}

// ── MAIN REQUEST HANDLER ──────────────────────────────────────────────────────

export async function handleWorldCupApi(req: Request): Promise<Response> {
    const url = new URL(req.url);
    // Strip /world_cup prefix
    const path = url.pathname.replace(/^\/world_cup/, "");

    const json = (data: unknown, status = 200) =>
        new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

    // ── Config (exposes non-secret settings to frontend) ──

    if (path === "/api/config") {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
        return json({ googleClientId: clientId, emailLoginEnabled: true });
    }

    // ── Auth routes ──

    if (path === "/auth/email-login" && req.method === "POST") {
        try {
            const { email, name } = await req.json();
            const sessionId = await _emailLogin(email, name);
            const user = await _getSession(sessionId);
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
            return new Response(JSON.stringify({ success: true, user }), { headers });
        } catch (e) {
            return json({ error: (e as Error).message }, 400);
        }
    }

    if (path === "/auth/verify" && req.method === "POST") {
        try {
            const { token } = await req.json();
            const sessionId = await _verifyToken(token);
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
            return new Response(JSON.stringify({ success: true }), { headers });
        } catch (e) {
            return json({ error: (e as Error).message }, 401);
        }
    }

    if (path === "/auth/dev-login" && req.method === "POST") {
        try {
            const { userId } = await req.json();
            const user = await _getUser(userId);
            if (!user) return json({ error: "User not found" }, 404);
            const sessionId = await _createSession(user);
            const headers = new Headers({ "Content-Type": "application/json" });
            headers.append("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
            return new Response(JSON.stringify({ success: true, user }), { headers });
        } catch (e) {
            return json({ error: (e as Error).message }, 500);
        }
    }

    // ── Me ──

    if (path === "/api/me") {
        const sid = _getCookie(req, "session");
        if (!sid) return json(null, 401);
        const user = await _getSession(sid);
        if (!user) return json(null, 401);
        return json(user);
    }

    // ── Matches ──

    if (path === "/api/matches" && req.method === "GET") {
        const matches = await _getMatches();
        return json(matches);
    }

    // ── SSE ──

    if (path === "/api/events") {
        return _handleSSE();
    }

    // ── Predictions ──

    if (path === "/api/predict" && req.method === "POST") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);

        const { matchId, homeScore, awayScore } = await req.json();
        if (typeof homeScore !== "number" || typeof awayScore !== "number") return json({ error: "Invalid score" }, 400);

        const match = await _getMatch(matchId);
        if (!match) return json({ error: "Match not found" }, 404);
        if (Date.now() >= new Date(match.date).getTime()) return json({ error: "Match has started" }, 403);

        await _savePrediction({ userId: user.id, matchId, homeScore, awayScore, timestamp: Date.now() });
        wcBroadcast("prediction", { matchId, userId: user.id });
        return json({ success: true });
    }

    if (path === "/api/predictions" && req.method === "GET") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        return json(await _getPredictionsForUser(user.id));
    }

    // ── Leaderboard ──

    if (path === "/api/leaderboard" && req.method === "GET") {
        return json(await _getLeaderboard());
    }

    // ── Leagues ──

    if (path === "/api/leagues" && req.method === "GET") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        return json(await _getLeaguesForUser(user.id));
    }

    if (path === "/api/leagues" && req.method === "POST") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        const { name } = await req.json();
        return json(await _createLeague(name, user.id));
    }

    if (path === "/api/leagues/join" && req.method === "POST") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        try {
            const { code } = await req.json();
            return json(await _joinLeague(code, user.id));
        } catch (e) {
            return new Response((e as Error).message, { status: 400 });
        }
    }

    if (path.startsWith("/api/leagues/") && req.method === "GET") {
        const id = path.split("/").pop()!;
        const league = await _getLeague(id);
        if (!league) return json({ error: "Not found" }, 404);
        const members: User[] = [];
        for (const mid of league.members) {
            const u = await _getUser(mid);
            if (u) members.push(u);
        }
        members.sort((a, b) => b.points - a.points);
        return json({ ...league, leaderboard: members });
    }

    // ── Meetups ──

    const meetupMatch = path.match(/^\/api\/matches\/(\d+)\/meetups$/);
    if (meetupMatch) {
        const matchId = parseInt(meetupMatch[1]);
        if (req.method === "GET") {
            const iter = kv.list<Record<string,unknown>>({ prefix: ["meetups", matchId] });
            const out: unknown[] = [];
            for await (const r of iter) out.push(r.value);
            out.sort((a: any, b: any) => b.timestamp - a.timestamp);
            return json(out);
        }
        if (req.method === "POST") {
            const sid = _getCookie(req, "session");
            if (!sid) return json({ error: "Unauthorized" }, 401);
            const user = await _getSession(sid);
            if (!user) return json({ error: "Unauthorized" }, 401);
            const { message, location, locationName, locationUrl } = await req.json();
            if (!message?.trim()) return json({ error: "Message required" }, 400);
            const id = crypto.randomUUID();
            const meetup = { id, matchId, userId: user.id, userName: user.name, userAvatar: user.avatar, message: message.trim(), location: location?.trim() || '', locationName: locationName?.trim() || '', locationUrl: locationUrl?.trim() || '', timestamp: Date.now(), interested: [] };
            await kv.set(["meetups", matchId, id], meetup);
            return json(meetup);
        }
    }

    const interestedMatch = path.match(/^\/api\/matches\/(\d+)\/meetups\/([^/]+)\/interested$/);
    if (interestedMatch && req.method === "POST") {
        const matchId = parseInt(interestedMatch[1]);
        const meetupId = interestedMatch[2];
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        const r = await kv.get<any>(["meetups", matchId, meetupId]);
        if (!r.value) return json({ error: "Not found" }, 404);
        const meetup = r.value;
        const idx = meetup.interested.indexOf(user.id);
        if (idx === -1) meetup.interested.push(user.id);
        else meetup.interested.splice(idx, 1);
        await kv.set(["meetups", matchId, meetupId], meetup);
        return json(meetup);
    }

    // ── Admin ──

    if (path === "/admin/login" && req.method === "POST") {
        const { password } = await req.json();
        if (password !== ADMIN_PASSWORD) return json({ error: "Invalid password" }, 401);
        const sid = await _createAdminSession();
        const headers = new Headers({ "Content-Type": "application/json" });
        headers.append("Set-Cookie", `admin_session=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        return new Response(JSON.stringify({ success: true }), { headers });
    }

    if (path === "/admin/me") {
        const sid = _getCookie(req, "admin_session");
        if (!sid) return json({ authenticated: false });
        const s = await _getAdminSession(sid);
        return json({ authenticated: !!s, user: s ? { name: "Admin" } : null });
    }

    if (path === "/api/seed" && req.method === "POST") {
        await _runSeed();
        return json({ success: true, matches: MATCHES.length });
    }

    if (path === "/admin/matches" && req.method === "PUT") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const updates = await req.json();
        const results: Match[] = [];
        for (const u of updates) {
            const m = await _getMatch(u.id);
            if (!m) continue;
            if (u.homeScore !== undefined) m.homeScore = u.homeScore;
            if (u.awayScore !== undefined) m.awayScore = u.awayScore;
            if (u.status) m.status = u.status;
            await _saveMatch(m);
            results.push(m);
            wcBroadcast("match_update", { match: m });
        }
        return json(results);
    }

    if (path === "/admin/scoring/recalculate" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const count = await _recalcScores();
        return json({ recalculated: count });
    }

    if (path === "/admin/data/reset" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        await _runSeed();
        return json({ success: true });
    }

    return json({ error: "Not found" }, 404);
}
