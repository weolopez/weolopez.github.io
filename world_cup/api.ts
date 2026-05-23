/// <reference lib="deno.unstable" />
import { MATCHES, USERS, Match, User, Prediction, League, TEAM_TIER } from "./data.ts";
import { fetchAllWCMatches, fetchLiveWCMatches, mapStatus, ourId, hasToken, FDMatch } from "./scores-sync.ts";

const SERVER_START = Date.now();
const chatRateLimit = new Map<string, number>();

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

function _lcg(seed: number): number {
    // Simple deterministic pseudo-random [0,1)
    return ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
}

function _pick(userId: string, matchId: number, side: number, max: number): number {
    const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 31 + matchId * 17 + side * 7;
    return Math.floor(_lcg(seed) * (max + 1));
}

async function _runSeed() {
    console.log("[wc-api] Seeding database...");
    await _clearDb();

    // Seed matches
    for (const m of MATCHES) await _saveMatch(m);

    // Demo users — each has a distinct prediction style + pre-seeded points
    const demoUsers: User[] = [
        { id: 'demo_carlos', name: 'Carlos M.',  email: 'carlos@demo.wc26',  avatar: 'https://i.pravatar.cc/150?u=wc26_carlos', points: 0, exact: 0 },
        { id: 'demo_priya',  name: 'Priya S.',   email: 'priya@demo.wc26',   avatar: 'https://i.pravatar.cc/150?u=wc26_priya',  points: 0, exact: 0 },
        { id: 'demo_jake',   name: 'Jake T.',    email: 'jake@demo.wc26',    avatar: 'https://i.pravatar.cc/150?u=wc26_jake',   points: 0, exact: 0 },
        { id: 'demo_amara',  name: 'Amara D.',   email: 'amara@demo.wc26',   avatar: 'https://i.pravatar.cc/150?u=wc26_amara',  points: 0, exact: 0 },
        { id: 'demo_lena',   name: 'Lena K.',    email: 'lena@demo.wc26',    avatar: 'https://i.pravatar.cc/150?u=wc26_lena',   points: 0, exact: 0 },
        { id: 'demo_marco',  name: 'Marco V.',   email: 'marco@demo.wc26',   avatar: 'https://i.pravatar.cc/150?u=wc26_marco',  points: 0, exact: 0 },
    ];

    for (const u of demoUsers) await _createUser(u);

    // Styles: [homeMax, awayMax, drawBias] — drawBias: if >0 sometimes force equal scores
    const styles: Record<string, [number, number, number]> = {
        'demo_carlos': [3, 2, 0],   // attacking — tends to predict high home wins
        'demo_priya':  [2, 1, 0],   // defensive — lots of 1-0s
        'demo_jake':   [4, 3, 0],   // chaotic — wide score swings
        'demo_amara':  [2, 2, 3],   // draw merchant — often predicts equal scores
        'demo_lena':   [2, 2, 1],   // balanced — slight draw tendency
        'demo_marco':  [3, 1, 0],   // home bias — always backs the home side
    };

    const now = Date.now();
    for (const user of demoUsers) {
        const [hMax, aMax, drawBias] = styles[user.id];
        for (const m of MATCHES) {
            let homeScore = _pick(user.id, m.id, 1, hMax);
            let awayScore = _pick(user.id, m.id, 2, aMax);
            // Apply draw bias: if drawBias seed fires, equalise scores
            if (drawBias > 0 && _pick(user.id, m.id, 9, 9) < drawBias) {
                awayScore = homeScore;
            }
            const pred: Prediction = {
                userId: user.id,
                matchId: m.id,
                homeScore,
                awayScore,
                timestamp: now - _pick(user.id, m.id, 5, 7) * 86400000,
            };
            await _savePrediction(pred);
        }
    }

    // Create 3 demo leagues with different member mixes
    const demoLeagues: Array<{ id: string; name: string; code: string; ownerId: string; members: string[] }> = [
        {
            id: 'demo-league-friends',
            name: '⚽ WC Predictor Friends',
            code: 'WC2026',
            ownerId: 'demo_carlos',
            members: ['demo_carlos', 'demo_priya', 'demo_jake', 'demo_amara', 'demo_lena', 'demo_marco'],
        },
        {
            id: 'demo-league-elite',
            name: '🏆 Elite Predictors',
            code: 'WCVIP',
            ownerId: 'demo_priya',
            members: ['demo_priya', 'demo_carlos', 'demo_lena'],
        },
        {
            id: 'demo-league-community',
            name: '🌍 Community Fans',
            code: 'WCFAN',
            ownerId: 'demo_jake',
            members: ['demo_jake', 'demo_amara', 'demo_marco', 'demo_lena'],
        },
    ];

    for (const l of demoLeagues) {
        await kv.set(["leagues", l.id], l);
        await kv.set(["league_codes", l.code], l.id);
    }

    console.log(`[wc-api] Seed complete — ${MATCHES.length} matches, ${demoUsers.length} demo users, ${demoLeagues.length} leagues.`);
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
    if (!r.value) return null;
    // Always return fresh user data so persona/points updates are reflected immediately
    const fresh = await _getUser(r.value.id);
    return fresh ?? r.value;
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

// ── SCORING ENGINE ───────────────────────────────────────────────────────────
// Group stage: 5pts exact · 3pts correct result + correct goal diff · 1pt correct result
// Knockout:    stagePts correct winner · stagePts+5 exact score

function _calcMatchPoints(
    pred: { homeScore: number; awayScore: number },
    match: Match,
): { pts: number; isExact: boolean; isCorrect: boolean; isCorrectGD: boolean } {
    if (match.homeScore == null || match.awayScore == null) {
        return { pts: 0, isExact: false, isCorrect: false, isCorrectGD: false };
    }
    const stagePts    = STAGE_PTS[match.stage ?? ""] ?? 0;
    const isKnockout  = stagePts > 0;
    const actualWin   = match.homeScore > match.awayScore ? "h" : match.awayScore > match.homeScore ? "a" : "d";
    const predWin     = pred.homeScore  > pred.awayScore  ? "h" : pred.awayScore  > pred.homeScore  ? "a" : "d";
    const isExact     = pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;
    const isCorrect   = actualWin === predWin;
    const isCorrectGD = Math.abs(pred.homeScore - pred.awayScore) === Math.abs(match.homeScore - match.awayScore);

    let pts = 0;
    if (isKnockout) {
        if (isExact)        pts = stagePts + 5;
        else if (isCorrect) pts = stagePts;
    } else {
        if (isExact)                   pts = 5;
        else if (isCorrect && isCorrectGD) pts = 3;
        else if (isCorrect)            pts = 1;
    }
    return { pts, isExact, isCorrect, isCorrectGD };
}

// ── BADGES ───────────────────────────────────────────────────────────────────

const STAGE_PTS: Record<string, number> = { R32: 2, R16: 3, QF: 5, SF: 8, TPO: 3, FIN: 10 };

const BADGE_THRESHOLDS: Array<{ id: string; check: (correct: number, exact: number, streak: number, bestStreak: number) => boolean }> = [
    { id: "first_correct",  check: (c)          => c >= 1 },
    { id: "first_exact",    check: (_, e)        => e >= 1 },
    { id: "hat_trick",      check: (_, __, ___, b) => b >= 3 },
    { id: "hot_streak",     check: (_, __, ___, b) => b >= 5 },
    { id: "sharp",          check: (_, e)        => e >= 10 },
    { id: "oracle",         check: (c)          => c >= 20 },
];

// ── SCORING RECALCULATION ─────────────────────────────────────────────────────

async function _recalcScores() {
    const users = await _getLeaderboard();
    const matches = await _getMatches();
    const matchById = new Map(matches.map(m => [m.id, m]));

    for (const user of users) {
        let pts = 0, exact = 0, totalCorrect = 0;
        const preds = await _getPredictionsForUser(user.id);

        // Sort predictions by match date for streak calculation
        const scored = preds
            .map(p => ({ p, m: matchById.get(p.matchId) }))
            .filter(({ m }) => m && m.homeScore != null && m.awayScore != null && m.status === "finished")
            .sort((a, b) => new Date(a.m!.date).getTime() - new Date(b.m!.date).getTime());

        let streak = 0, bestStreak = 0, runStreak = 0;
        for (const { p, m } of scored) {
            const { pts: earnedPts, isExact, isCorrect } = _calcMatchPoints(p, m!);
            pts += earnedPts;
            if (isExact) { exact++; totalCorrect++; }
            else if (isCorrect) { totalCorrect++; }
            if (isCorrect) { runStreak++; if (runStreak > bestStreak) bestStreak = runStreak; }
            else { runStreak = 0; }
        }
        streak = runStreak; // streak at end = current streak

        // Compute earned badges (idempotent — union with existing)
        const existing = new Set(user.badges ?? []);
        for (const { id, check } of BADGE_THRESHOLDS) {
            if (check(totalCorrect, exact, streak, bestStreak)) existing.add(id);
        }

        user.points = pts;
        user.exact = exact;
        user.streak = streak;
        user.bestStreak = bestStreak;
        user.badges = [...existing];
        await kv.set(["users", user.id], user);
    }
    return users.length;
}

// ── FOOTBALL-DATA.ORG SCORE SYNC ──────────────────────────────────────────────

interface SyncResult {
    checked: number;
    updated: number;
    usersRecalculated: number;
    errors: string[];
}

async function _syncFromFD(fdMatches: FDMatch[]): Promise<SyncResult> {
    const ourMatches = await _getMatches();
    const result: SyncResult = { checked: fdMatches.length, updated: 0, usersRecalculated: 0, errors: [] };

    for (const fd of fdMatches) {
        // Skip knockout stage matches where teams are not yet determined
        if (!fd.homeTeam.tla || !fd.awayTeam.tla) continue;

        const fdHome = ourId(fd.homeTeam.tla);
        const fdAway = ourId(fd.awayTeam.tla);

        // Match by team TLAs (primary) with matchday as confirmation
        const ours = ourMatches.find(m =>
            m.home.id === fdHome && m.away.id === fdAway && m.matchday === fd.matchday
        ) ?? ourMatches.find(m =>
            // Fallback: name substring match in case TLA differs
            fd.homeTeam.shortName && fd.awayTeam.shortName &&
            m.home.name.toLowerCase().includes(fd.homeTeam.shortName.toLowerCase()) &&
            m.away.name.toLowerCase().includes(fd.awayTeam.shortName.toLowerCase())
        );

        if (!ours) {
            result.errors.push(`No match for ${fd.homeTeam.tla} vs ${fd.awayTeam.tla} MD${fd.matchday}`);
            continue;
        }

        const newStatus = mapStatus(fd.status);
        const newHome   = fd.score.fullTime.home;
        const newAway   = fd.score.fullTime.away;

        const changed =
            ours.status !== newStatus ||
            (newHome !== null && ours.homeScore !== newHome) ||
            (newAway !== null && ours.awayScore !== newAway);

        if (!changed) continue;

        if (newHome !== null) ours.homeScore = newHome;
        if (newAway !== null) ours.awayScore = newAway;
        ours.status = newStatus;

        const wasFinished = ours.status === "finished";
        await _saveMatch(ours);
        wcBroadcast("match_update", { match: ours });
        if (!wasFinished && newStatus === "finished") {
            _sendMatchResultPushNotifications(ours).catch(() => {});
        }
        result.updated++;
    }

    if (result.updated > 0) {
        result.usersRecalculated = await _recalcScores();
    }

    return result;
}

// Background polling — runs every 2 min, hits only the "LIVE" endpoint to stay within rate limits
async function _startScorePolling() {
    if (!hasToken()) {
        console.log("[scores-sync] FOOTBALL_DATA_TOKEN not set — live score sync disabled.");
        return;
    }
    console.log("[scores-sync] Live score polling active (every 2 min).");
    setInterval(async () => {
        try {
            // Outside tournament window → skip (saves rate-limit quota)
            const now = Date.now();
            const start = new Date("2026-06-11").getTime();
            const end   = new Date("2026-07-20").getTime();
            if (now < start || now > end) return;

            const live = await fetchLiveWCMatches();
            if (live.length === 0) return;
            const r = await _syncFromFD(live);
            if (r.updated > 0) console.log(`[scores-sync] Updated ${r.updated} matches, recalced ${r.usersRecalculated} users.`);
        } catch (e) {
            console.error("[scores-sync] Poll error:", e);
        }
    }, 2 * 60 * 1000);
}

_startScorePolling();

// ── PERSONA ENGINE ────────────────────────────────────────────────────────────

export const PERSONAS: Record<string, { emoji: string; name: string; desc: string }> = {
    safe_bet:     { emoji: "🧱", name: "Safe Bet",     desc: "Always backs the favourite. Low-scoring, clinical results like 1-0 and 2-0." },
    high_roller:  { emoji: "🎰", name: "High Roller",  desc: "Backs the favourite but expects drama. High-scoring: 3-2, 4-1 type results." },
    upset_artist: { emoji: "🎲", name: "Upset Artist", desc: "Fancies the underdog when odds are close. Medium scores, loves a surprise." },
    wild_card:    { emoji: "🌍", name: "Wild Card",    desc: "Anything goes. Seeded random picks unique to your account." },
};

interface MatchOdds {
    favorite: "home" | "away" | "draw";
    homeWinPct: number;
    drawPct: number;
    awayWinPct: number;
    oddsGap: number; // absolute difference between home and away win %
}

async function _getOdds(matchId: number): Promise<MatchOdds> {
    const cached = await kv.get<MatchOdds>(["odds", matchId]);
    if (cached.value) return cached.value;

    // Fallback: use FIFA strength tiers from data.ts
    return null as unknown as MatchOdds; // signals "use fallback" to caller
}

function _oddsFromTiers(home: string, away: string): MatchOdds {
    const ht = TEAM_TIER[home] ?? 5;
    const at = TEAM_TIER[away] ?? 5;
    // Lower tier = stronger. Convert to pseudo-probabilities.
    const hStrength = 1 / ht;
    const aStrength = 1 / at;
    const total = hStrength + aStrength + (hStrength + aStrength) * 0.3; // ~30% draw
    const homeWinPct = hStrength / total;
    const awayWinPct = aStrength / total;
    const drawPct    = 1 - homeWinPct - awayWinPct;
    const oddsGap    = Math.abs(homeWinPct - awayWinPct);
    const favorite   = homeWinPct > awayWinPct ? "home" : awayWinPct > homeWinPct ? "away" : "draw";
    return { favorite, homeWinPct, drawPct, awayWinPct, oddsGap };
}

// Generate a persona prediction for one match.
// personaSeed: a stable string unique to the "actor" (userId or ghost persona id).
function _personaPrediction(
    persona: string,
    match: Match,
    odds: MatchOdds,
    personaSeed: string,
): { homeScore: number; awayScore: number } {
    const mid = match.id;

    if (persona === "wild_card") {
        return {
            homeScore: _pick(personaSeed, mid, 1, 3),
            awayScore: _pick(personaSeed, mid, 2, 3),
        };
    }

    // Determine winner side
    let winnerSide: "home" | "away" | "draw";
    if (persona === "upset_artist" && odds.oddsGap < 0.25) {
        winnerSide = odds.favorite === "home" ? "away" : "home"; // pick underdog
    } else {
        // safe_bet and high_roller always back the favourite
        // upset_artist backs favourite when gap is large
        winnerSide = odds.oddsGap < 0.05 ? "draw" : odds.favorite;
    }

    let home: number, away: number;

    if (persona === "safe_bet") {
        home = _pick(personaSeed, mid, 1, 2);
        away = _pick(personaSeed, mid, 2, 1);
    } else if (persona === "high_roller") {
        home = _pick(personaSeed, mid, 1, 3) + 1; // 1-4
        away = _pick(personaSeed, mid, 2, 3);      // 0-3
    } else {
        // upset_artist
        home = _pick(personaSeed, mid, 1, 2);
        away = _pick(personaSeed, mid, 2, 2);
    }

    // Enforce the chosen winner by adjusting scores
    if (winnerSide === "home" && home <= away) {
        home = away + 1;
    } else if (winnerSide === "away" && away <= home) {
        away = home + 1;
    } else if (winnerSide === "draw") {
        away = home;
    }

    return { homeScore: home, awayScore: away };
}

async function _applyPersona(
    userId: string,
    persona: string,
    replaceExisting = false,
): Promise<{ applied: number; skipped: number }> {
    const matches  = await _getMatches();
    const now      = Date.now();
    let applied = 0, skipped = 0;

    for (const m of matches) {
        if (!m.group) continue; // only group stage
        const locked = now >= new Date(m.date).getTime();
        if (locked) { skipped++; continue; }

        const existing = await kv.get<Prediction>(["predictions", userId, m.id]);
        if (existing.value && !replaceExisting) { skipped++; continue; }

        const oddsRaw = await _getOdds(m.id);
        const odds    = oddsRaw ?? _oddsFromTiers(m.home.id, m.away.id);
        const pred    = _personaPrediction(persona, m, odds, userId);

        await _savePrediction({
            userId, matchId: m.id,
            homeScore: pred.homeScore, awayScore: pred.awayScore,
            timestamp: Date.now(),
        });
        applied++;
    }

    // Persist chosen persona on the user record
    const u = await _getUser(userId);
    if (u) { u.persona = persona; await kv.set(["users", userId], u); }

    return { applied, skipped };
}

// Ghost persona leaderboard — calculates points each persona would score
// against actual finished match results.
async function _ghostPersonaScores(): Promise<unknown[]> {
    const matches  = await _getMatches();
    const finished = matches.filter(m => m.status === "finished" && m.homeScore != null && m.awayScore != null);

    return Promise.all(Object.keys(PERSONAS).map(async (persona) => {
        let pts = 0, exact = 0;
        for (const m of finished) {
            const oddsRaw = await _getOdds(m.id);
            const odds    = oddsRaw ?? _oddsFromTiers(m.home.id, m.away.id);
            const pred    = _personaPrediction(persona, m, odds, `__ghost_${persona}`);
            const { pts: earnedPts, isExact } = _calcMatchPoints(pred, m);
            pts += earnedPts;
            if (isExact) exact++;
        }
        return { ...PERSONAS[persona], id: persona, points: pts, exact, matchesScored: finished.length };
    }));
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

// ── PUSH NOTIFICATION HELPERS ────────────────────────────────────────────────

async function _sendPush(userId: string, title: string, body: string, url: string) {
    const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) return;

    const sub = (await kv.get<PushSubscription>(["push", userId])).value;
    if (!sub) return;

    try {
        const { sendNotification, setVapidDetails } = await import("npm:web-push");
        setVapidDetails(`mailto:lopezweolopezweo@gmail.com`, vapidPublic, vapidPrivate);
        await sendNotification(sub, JSON.stringify({ title, body, url }));
    } catch (_) { /* subscription expired or invalid — ignore */ }
}

async function _sendPushToAll(title: string, body: string, url: string) {
    const iter = kv.list<PushSubscription>({ prefix: ["push"] });
    for await (const { key } of iter) {
        const userId = String(key[1]);
        _sendPush(userId, title, body, url).catch(() => {});
    }
}

async function _sendChatPushNotifications(matchId: number, sender: User, text: string) {
    // Notify everyone who has chatted in this match (except the sender)
    const iter = kv.list({ prefix: ["chat_sub", matchId] });
    for await (const { key } of iter) {
        const uid = String(key[2]);
        if (uid === sender.id) continue;
        const preview = text.length > 60 ? text.slice(0, 57) + "…" : text;
        _sendPush(uid, `💬 ${sender.name}`, preview, `/worldcup/match.html?id=${matchId}`).catch(() => {});
    }
}

async function _sendMatchResultPushNotifications(match: Match) {
    if (match.homeScore == null || match.awayScore == null) return;
    const preds = await kv.list<Prediction>({ prefix: ["predictions"] });
    for await (const { key, value: pred } of preds) {
        if (pred.matchId !== match.id) continue;
        const userId = String(key[1]);
        const aw = match.homeScore > match.awayScore ? "h" : match.awayScore > match.homeScore ? "a" : "d";
        const pw = pred.homeScore > pred.awayScore ? "h" : pred.awayScore > pred.homeScore ? "a" : "d";
        let pts = 0;
        if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) pts = 3;
        else if (aw === pw) pts = 1;
        const result = `${match.home.name} ${match.homeScore}–${match.awayScore} ${match.away.name}`;
        const msg = pts === 3 ? `⭐ Exact! +3pts` : pts === 1 ? `✅ Correct winner +1pt` : `❌ Unlucky, 0pts`;
        _sendPush(userId, `🏁 Full time: ${result}`, msg, `/worldcup/match.html?id=${match.id}`).catch(() => {});
    }
}

// Match-start reminder scheduler — runs every 5 min, fires 60min before kickoff
let _reminderInterval: ReturnType<typeof setInterval> | null = null;
function _startMatchReminders() {
    if (_reminderInterval) return;
    _reminderInterval = setInterval(async () => {
        const now = Date.now();
        const matches = await _getMatches();
        for (const m of matches) {
            if (m.status !== "scheduled") continue;
            const kickoff = new Date(m.date).getTime();
            const diff = kickoff - now;
            if (diff > 55 * 60 * 1000 && diff < 65 * 60 * 1000) {
                // 55–65 min window — send once per match
                const already = await kv.get(["push_sent_reminder", m.id]);
                if (already.value) continue;
                await kv.set(["push_sent_reminder", m.id], true, { expireIn: 2 * 60 * 60 * 1000 });
                const title = `⚽ Kicks off in 1 hour`;
                const body = `${m.home.name} vs ${m.away.name} — lock in your prediction!`;
                await _sendPushToAll(title, body, `/worldcup/match.html?id=${m.id}`);
            }
        }
    }, 5 * 60 * 1000);
}
_startMatchReminders();

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

    if (path === "/api/version" && req.method === "GET") {
        return json({ version: SERVER_START });
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

    if (path === "/api/leaderboard/personas" && req.method === "GET") {
        return json(await _ghostPersonaScores());
    }

    // ── Personas ──

    if (path === "/api/personas" && req.method === "GET") {
        const sid  = _getCookie(req, "session");
        const user = sid ? await _getSession(sid) : null;
        const defs = Object.entries(PERSONAS).map(([id, p]) => ({ id, ...p }));
        return json({ personas: defs, current: user?.persona ?? null });
    }

    if (path === "/api/personas/apply" && req.method === "POST") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        const { persona, replace = true } = await req.json();
        if (!PERSONAS[persona]) return json({ error: "Unknown persona" }, 400);
        const result = await _applyPersona(user.id, persona, replace);
        return json({ ...result, persona });
    }

    // ── Chat ──

    const chatMatch = path.match(/^\/api\/chat\/(\d+)$/);
    if (chatMatch) {
        const matchId = parseInt(chatMatch[1]);
        if (req.method === "GET") {
            const msgs: unknown[] = [];
            const iter = kv.list({ prefix: ["chat", matchId] });
            for await (const r of iter) msgs.push(r.value);
            return json(msgs.sort((a: any, b: any) => a.ts - b.ts).slice(-50));
        }
        if (req.method === "POST") {
            const sid = _getCookie(req, "session");
            if (!sid) return json({ error: "Unauthorized" }, 401);
            const user = await _getSession(sid);
            if (!user) return json({ error: "Unauthorized" }, 401);

            const now = Date.now();
            const lastPost = chatRateLimit.get(user.id) ?? 0;
            if (now - lastPost < 5000) return json({ error: "Too fast — wait 5 seconds" }, 429);
            chatRateLimit.set(user.id, now);

            const body = await req.json();
            const text = String(body.text ?? "").slice(0, 200).trim();
            if (!text) return json({ error: "Empty message" }, 400);

            const msg = { userId: user.id, name: user.name, avatar: user.avatar, text, ts: now };
            await kv.set(["chat", matchId, now], msg, { expireIn: 30 * 24 * 60 * 60 * 1000 });

            // Track chatters for push notifications
            await kv.set(["chat_sub", matchId, user.id], true);

            wcBroadcast("chat_message", { matchId, msg });
            await _sendChatPushNotifications(matchId, user, text);
            return json(msg);
        }
    }

    // ── Push Notifications ──

    if (path === "/api/push/vapid-key" && req.method === "GET") {
        const pub = Deno.env.get("VAPID_PUBLIC_KEY");
        if (!pub) return json({ error: "Push not configured" }, 503);
        return json({ publicKey: pub });
    }

    if (path === "/api/push/subscribe" && req.method === "POST") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        const sub = await req.json();
        await kv.set(["push", user.id], sub);
        return json({ ok: true });
    }

    if (path === "/api/push/subscribe" && req.method === "DELETE") {
        const sid = _getCookie(req, "session");
        if (!sid) return json({ error: "Unauthorized" }, 401);
        const user = await _getSession(sid);
        if (!user) return json({ error: "Unauthorized" }, 401);
        await kv.delete(["push", user.id]);
        return json({ ok: true });
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

    if (path === "/api/leagues/public" && req.method === "GET") {
        const iter = kv.list<League>({ prefix: ["leagues"] });
        const out: { id: string; name: string; code: string; memberCount: number }[] = [];
        for await (const entry of iter) {
            const l = entry.value;
            if (l.ownerId?.startsWith("demo_")) {
                out.push({ id: l.id, name: l.name, code: l.code, memberCount: l.members.length });
            }
        }
        out.sort((a, b) => b.memberCount - a.memberCount);
        return json(out);
    }

    if (path.match(/^\/api\/leagues\/code\/([A-Z0-9]+)$/) && req.method === "GET") {
        const code = path.split("/").pop()!.toUpperCase();
        const iter = kv.list<League>({ prefix: ["leagues"] });
        let found: League | null = null;
        for await (const entry of iter) {
            if (entry.value.code === code) { found = entry.value; break; }
        }
        if (!found) return json({ error: "Not found" }, 404);
        return json({ id: found.id, name: found.name, code: found.code, members: found.members });
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
        await _recalcScores();
        return json(results);
    }

    if (path === "/admin/scoring/recalculate" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const count = await _recalcScores();
        return json({ recalculated: count });
    }

    if (path === "/admin/scores/sync" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        if (!hasToken()) return json({ error: "FOOTBALL_DATA_TOKEN env var not set" }, 503);
        try {
            const fdMatches = await fetchAllWCMatches();
            const result = await _syncFromFD(fdMatches);
            return json(result);
        } catch (e) {
            return json({ error: String(e) }, 502);
        }
    }

    if (path === "/admin/data/reset" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        await _runSeed();
        return json({ success: true });
    }

    // ── TOURNAMENT SIMULATION ──

    if (path === "/admin/simulate" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);

        // Deterministic score generator — seeded on match id, consistent every run
        function simGoals(matchId: number, side: number): number {
            const raw = _lcg(matchId * 7919 + side * 104729);
            // Weighted distribution: 0→30%, 1→32%, 2→22%, 3→11%, 4→5%
            if (raw < 0.30) return 0;
            if (raw < 0.62) return 1;
            if (raw < 0.84) return 2;
            if (raw < 0.95) return 3;
            return 4;
        }

        const matches = await _getMatches();
        const groupMatches = matches.filter(m => m.group); // only group stage
        let homeWins = 0, draws = 0, awayWins = 0;

        for (const m of groupMatches) {
            m.homeScore = simGoals(m.id, 1);
            m.awayScore = simGoals(m.id, 2);
            m.status = "finished";
            if (m.homeScore > m.awayScore) homeWins++;
            else if (m.homeScore === m.awayScore) draws++;
            else awayWins++;
            await _saveMatch(m);
            wcBroadcast("match_update", { match: m });
        }

        const usersRecalculated = await _recalcScores();

        // Build leaderboard
        const leaderboard = (await _getLeaderboard()).map((u, i) => ({
            rank: i + 1, id: u.id, name: u.name, avatar: u.avatar,
            points: u.points, exact: u.exact,
        }));

        // Build per-league standings
        const leagueIter = kv.list<League>({ prefix: ["leagues"] });
        const leagueResults: unknown[] = [];
        for await (const entry of leagueIter) {
            const l = entry.value;
            const members = [];
            for (const mid of l.members) {
                const u = await _getUser(mid);
                if (u) members.push({ id: u.id, name: u.name, avatar: u.avatar, points: u.points, exact: u.exact });
            }
            members.sort((a, b) => b.points - a.points);
            leagueResults.push({ id: l.id, name: l.name, code: l.code, standings: members });
        }

        return json({
            matchesSimulated: groupMatches.length,
            results: { homeWins, draws, awayWins },
            usersRecalculated,
            leaderboard,
            leagues: leagueResults,
        });
    }

    if (path === "/admin/simulate/reset" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);

        const matches = await _getMatches();
        for (const m of matches) {
            delete m.homeScore;
            delete m.awayScore;
            m.status = "scheduled";
            await _saveMatch(m);
            wcBroadcast("match_update", { match: m });
        }
        await _recalcScores(); // sets everyone back to 0
        return json({ reset: matches.length });
    }

    if (path === "/admin/odds/fetch" && req.method === "POST") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const oddsToken = Deno.env.get("ODDS_API_TOKEN");
        if (!oddsToken) return json({ error: "ODDS_API_TOKEN env var not set" }, 503);
        try {
            const res = await fetch(
                `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds?apiKey=${oddsToken}&regions=us&markets=h2h&oddsFormat=decimal`,
            );
            if (!res.ok) return json({ error: `TheOddsAPI ${res.status}` }, 502);
            const events = await res.json() as Array<{
                id: string; commence_time: string;
                home_team: string; away_team: string;
                bookmakers: Array<{ markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }> }>;
            }>;

            const matches = await _getMatches();
            let stored = 0;
            const errors: string[] = [];

            // Normalize team names: lowercase, strip punctuation, collapse spaces
            const norm = (s: string) => s.toLowerCase().replace(/[&\-']/g, " ").replace(/\s+/g, " ").trim();
            // Build index of our matches by normalized home+away key
            const matchIndex = new Map<string, typeof matches[0]>();
            for (const m of matches) {
                matchIndex.set(`${norm(m.home.name)}|${norm(m.away.name)}`, m);
            }

            for (const ev of events) {
                const key = `${norm(ev.home_team)}|${norm(ev.away_team)}`;
                const match = matchIndex.get(key);
                if (!match) { errors.push(`No match for ${ev.home_team} vs ${ev.away_team}`); continue; }

                // Average odds across bookmakers
                const totals: Record<string, number[]> = {};
                for (const bk of ev.bookmakers) {
                    for (const mkt of bk.markets) {
                        if (mkt.key !== "h2h") continue;
                        for (const o of mkt.outcomes) {
                            if (!totals[o.name]) totals[o.name] = [];
                            totals[o.name].push(1 / o.price); // convert decimal odds to implied prob
                        }
                    }
                }
                const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
                const homeProb = avg(totals[ev.home_team] ?? [0.33]);
                const awayProb = avg(totals[ev.away_team] ?? [0.33]);
                const drawProb = avg(totals["Draw"] ?? [0.28]);
                const total    = homeProb + awayProb + drawProb;
                const hWin = homeProb / total, aWin = awayProb / total, dWin = drawProb / total;
                const odds: MatchOdds = {
                    homeWinPct: hWin, awayWinPct: aWin, drawPct: dWin,
                    favorite: hWin > aWin && hWin > dWin ? "home" : aWin > hWin && aWin > dWin ? "away" : "draw",
                    oddsGap: Math.abs(hWin - aWin),
                };
                await kv.set(["odds", match.id], odds, { expireIn: 7 * 24 * 60 * 60 * 1000 });
                stored++;
            }
            return json({ stored, total: events.length, errors });
        } catch (e) {
            return json({ error: String(e) }, 502);
        }
    }

    // ── ADMIN DASHBOARD DATA ──

    if (path === "/admin/users" && req.method === "GET") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const users: User[] = [];
        const iter = kv.list<User>({ prefix: ["users"] });
        for await (const entry of iter) users.push(entry.value);
        // Attach prediction counts
        const counts: Record<string, number> = {};
        const pIter = kv.list<Record<string,unknown>>({ prefix: ["predictions"] });
        for await (const entry of pIter) {
            const userId = String(entry.key[1]);
            counts[userId] = (counts[userId] || 0) + 1;
        }
        const result = users.map(u => ({ ...u, predictionCount: counts[u.id] || 0 }));
        result.sort((a, b) => b.points - a.points);
        return json(result);
    }

    if (path === "/admin/predictions" && req.method === "GET") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const preds: Prediction[] = [];
        const iter = kv.list<Prediction>({ prefix: ["predictions"] });
        for await (const entry of iter) preds.push(entry.value);
        // Attach user and match info
        const userMap: Record<string, User> = {};
        const uIter = kv.list<User>({ prefix: ["users"] });
        for await (const entry of uIter) userMap[entry.value.id] = entry.value;
        const matchMap: Record<number, Match> = {};
        const mIter = kv.list<Match>({ prefix: ["matches"] });
        for await (const entry of mIter) matchMap[entry.value.id] = entry.value;
        const result = preds.map(p => ({
            ...p,
            userName: userMap[p.userId]?.name || p.userId,
            userEmail: userMap[p.userId]?.email || '',
            userAvatar: userMap[p.userId]?.avatar || '',
            matchLabel: matchMap[p.matchId]
                ? `${matchMap[p.matchId].home.name} vs ${matchMap[p.matchId].away.name}`
                : `Match ${p.matchId}`,
            matchGroup: matchMap[p.matchId]?.group || '',
            matchDate: matchMap[p.matchId]?.date || '',
        }));
        result.sort((a, b) => b.timestamp - a.timestamp);
        return json(result);
    }

    if (path === "/admin/meetups" && req.method === "GET") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const meetups: Record<string,unknown>[] = [];
        const iter = kv.list<Record<string,unknown>>({ prefix: ["meetups"] });
        for await (const entry of iter) meetups.push(entry.value);
        const matchMap: Record<number, Match> = {};
        const mIter = kv.list<Match>({ prefix: ["matches"] });
        for await (const entry of mIter) matchMap[entry.value.id] = entry.value;
        const result = meetups.map(mu => ({
            ...mu,
            matchLabel: matchMap[Number(mu.matchId)]
                ? `${matchMap[Number(mu.matchId)].home.name} vs ${matchMap[Number(mu.matchId)].away.name}`
                : `Match ${mu.matchId}`,
        }));
        result.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        return json(result);
    }

    if (path === "/admin/activity" && req.method === "GET") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const events: Record<string,unknown>[] = [];
        // Predictions
        const userMap: Record<string, User> = {};
        const uIter = kv.list<User>({ prefix: ["users"] });
        for await (const entry of uIter) userMap[entry.value.id] = entry.value;
        const matchMap: Record<number, Match> = {};
        const mIter = kv.list<Match>({ prefix: ["matches"] });
        for await (const entry of mIter) matchMap[entry.value.id] = entry.value;
        const pIter = kv.list<Prediction>({ prefix: ["predictions"] });
        for await (const entry of pIter) {
            const p = entry.value;
            const u = userMap[p.userId];
            const m = matchMap[p.matchId];
            events.push({
                type: "prediction",
                timestamp: p.timestamp,
                userId: p.userId,
                userName: u?.name || p.userId,
                userAvatar: u?.avatar || '',
                detail: `predicted ${m ? m.home.name + ' vs ' + m.away.name : 'Match ' + p.matchId}: ${p.homeScore}–${p.awayScore}`,
                matchLabel: m ? `${m.home.flag} ${m.home.name} vs ${m.away.flag} ${m.away.name}` : '',
                score: `${p.homeScore}–${p.awayScore}`,
            });
        }
        // Meetups
        const muIter = kv.list<Record<string,unknown>>({ prefix: ["meetups"] });
        for await (const entry of muIter) {
            const mu = entry.value;
            const m = matchMap[Number(mu.matchId)];
            events.push({
                type: "meetup",
                timestamp: mu.timestamp,
                userId: mu.userId,
                userName: mu.userName,
                userAvatar: mu.userAvatar,
                detail: `posted a watch party for ${m ? m.home.name + ' vs ' + m.away.name : 'Match ' + mu.matchId}`,
                matchLabel: m ? `${m.home.flag} ${m.home.name} vs ${m.away.flag} ${m.away.name}` : '',
                message: mu.message,
                location: mu.locationName || mu.location || '',
                interestedCount: Array.isArray(mu.interested) ? mu.interested.length : 0,
            });
        }
        events.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        return json(events);
    }

    if (path === "/admin/leagues" && req.method === "GET") {
        const sid = _getCookie(req, "admin_session");
        if (!sid || !await _getAdminSession(sid)) return json({ error: "Unauthorized" }, 401);
        const userMap: Record<string, User> = {};
        const uIter = kv.list<User>({ prefix: ["users"] });
        for await (const entry of uIter) userMap[entry.value.id] = entry.value;
        const iter = kv.list<League>({ prefix: ["leagues"] });
        const out: unknown[] = [];
        for await (const entry of iter) {
            const l = entry.value;
            const owner = userMap[l.ownerId];
            const members = l.members.map(id => {
                const u = userMap[id];
                return { id, name: u?.name || id, avatar: u?.avatar || '', points: u?.points || 0, exact: u?.exact || 0 };
            }).sort((a, b) => b.points - a.points);
            const totalPredictions = await (async () => {
                let count = 0;
                for (const mid of l.members) {
                    const preds = await _getPredictionsForUser(mid);
                    count += preds.length;
                }
                return count;
            })();
            out.push({
                id: l.id,
                name: l.name,
                code: l.code,
                ownerId: l.ownerId,
                ownerName: owner?.name || l.ownerId,
                memberCount: l.members.length,
                members,
                totalPredictions,
                isDemo: l.ownerId.startsWith("demo_"),
            });
        }
        out.sort((a: any, b: any) => b.memberCount - a.memberCount);
        return json(out);
    }

    return json({ error: "Not found" }, 404);
}
