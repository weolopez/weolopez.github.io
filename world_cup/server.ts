/// <reference lib="deno.unstable" />

import { serveDir } from "@std/http/file-server";
import * as http from "@std/http";
import * as path from "@std/path";
import * as fs from "@std/fs";
import { VENUES, TEAMS, MATCHES, USERS, Team, Match, User, Prediction, League } from "./data.ts";

const kv = await Deno.openKv();

// ==========================================
// DB.TS CONTENT
// ==========================================

export async function getMatches() {
    const iter = kv.list<Match>({ prefix: ["matches"] });
    const matches = [];
    for await (const res of iter) {
        matches.push(res.value);
    }
    return matches.sort((a, b) => a.id - b.id);
}

export async function getMatch(id: number) {
    const res = await kv.get<Match>(["matches", id]);
    return res.value;
}

export async function saveMatch(match: Match) {
    await kv.set(["matches", match.id], match);
}

export async function getUser(id: string) {
    const res = await kv.get<User>(["users", id]);
    return res.value;
}

export async function createUser(user: User) {
    await kv.set(["users", user.id], user);
}

export async function savePrediction(prediction: Prediction) {
    await kv.set(["predictions", prediction.userId, prediction.matchId], prediction);
}

export async function getPredictionsForUser(userId: string) {
    const iter = kv.list<Prediction>({ prefix: ["predictions", userId] });
    const predictions = [];
    for await (const res of iter) {
        predictions.push(res.value);
    }
    return predictions;
}

export async function getAllPredictionsForMatch(matchId: number) {
    // This is inefficient for large datasets, but fine for this demo.
    // A better schema would be ["match_predictions", matchId, userId]
    const iter = kv.list<Prediction>({ prefix: ["predictions"] });
    const predictions = [];
    for await (const res of iter) {
        if (res.value.matchId === matchId) {
            predictions.push(res.value);
        }
    }
    return predictions;
}

export async function getLeaderboard() {
    const iter = kv.list<User>({ prefix: ["users"] });
    const users = [];
    for await (const res of iter) {
        users.push(res.value);
    }
    return users.sort((a, b) => b.points - a.points);
}

// Helper to clear DB (for dev)
export async function clearDb() {
    const iter = kv.list({ prefix: [] });
    for await (const res of iter) {
        await kv.delete(res.key);
    }
}

export async function createLeague(name: string, ownerId: string) {
    const id = crypto.randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const league: League = {
        id,
        name,
        code,
        ownerId,
        members: [ownerId]
    };
    await kv.set(["leagues", id], league);
    await kv.set(["league_codes", code], id);
    return league;
}

export async function joinLeague(code: string, userId: string) {
    const codeRes = await kv.get<string>(["league_codes", code]);
    if (!codeRes.value) throw new Error("Invalid code");

    const leagueId = codeRes.value;
    const leagueRes = await kv.get<League>(["leagues", leagueId]);
    if (!leagueRes.value) throw new Error("League not found");

    const league = leagueRes.value;
    if (!league.members.includes(userId)) {
        league.members.push(userId);
        await kv.set(["leagues", leagueId], league);
    }
    return league;
}

export async function getLeaguesForUser(userId: string) {
    const iter = kv.list<League>({ prefix: ["leagues"] });
    const leagues = [];
    for await (const res of iter) {
        if (res.value.members.includes(userId)) {
            leagues.push(res.value);
        }
    }
    return leagues;
}

export async function getLeague(id: string) {
    const res = await kv.get<League>(["leagues", id]);
    return res.value;
}

// ==========================================
// AUTH.TS CONTENT
// ==========================================

export async function verifyToken(token: string) {
    // Verify the token with Google's tokeninfo endpoint
    // This avoids needing a heavy JWT library or complex crypto for this demo
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);

    if (!res.ok) {
        throw new Error("Invalid token");
    }

    const payload = await res.json();

    // In a real app, verify aud (client ID) matches
    // const CLIENT_ID = "YOUR_CLIENT_ID";
    // if (payload.aud !== CLIENT_ID) throw new Error("Invalid client ID");

    let user = await getUser(payload.sub);
    if (!user) {
        user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            avatar: payload.picture,
            points: 0,
            exact: 0,
        };
        await createUser(user);
    }

    return createSession(user);
}

async function createSession(user: User) {
    const sessionId = crypto.randomUUID();
    await kv.set(["sessions", sessionId], user, { expireIn: 60 * 60 * 24 * 7 }); // 1 week
    return sessionId;
}

export async function getSession(sessionId: string) {
    const res = await kv.get<User>(["sessions", sessionId]);
    return res.value;
}

// ==========================================
// UTILS.TS CONTENT
// ==========================================

export function getCookie(req: Request, name: string): string | null {
    const cookieHeader = req.headers.get("Cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map(c => c.trim());
    for (const cookie of cookies) {
        const [key, value] = cookie.split("=");
        if (key === name) return value;
    }
    return null;
}

// ==========================================
// SSE.TS CONTENT
// ==========================================

export function createSSEStream() {
    let controller: ReadableStreamDefaultController;
    const stream = new ReadableStream({
        start(c) {
            controller = c;
        },
        cancel() {
            // Cleanup if needed
        },
    });

    const send = (data: unknown) => {
        try {
            const msg = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(msg));
        } catch (e) {
            // Stream closed
        }
    };

    // Watch for changes in matches
    // In a real app, we'd manage multiple listeners or use a BroadcastChannel
    // For this demo, we'll just watch the matches prefix
    (async () => {
        const iter = kv.watch([["matches"]]);
        for await (const entries of iter) {
            // When any match changes, we could send the update
            // But watch returns the whole list of entries watched if we watch a prefix?
            // Actually kv.watch takes an array of keys.
            // To watch all matches, we might need to know their IDs or just poll/broadcast manually.

            // Better approach for this demo:
            // We will use a BroadcastChannel to notify all streams when a write happens in the API
        }
    })();

    return { stream, send };
}

// Simple BroadcastChannel for inter-request communication
const channel = new BroadcastChannel("updates");

export function broadcastUpdate(type: string, payload: unknown) {
    channel.postMessage({ type, payload });
}

export function handleSSE(req: Request) {
    const { stream, send } = createSSEStream();

    const listener = (event: MessageEvent) => {
        send(event.data);
    };

    channel.addEventListener("message", listener);

    // Clean up listener when stream closes (this is tricky with standard Response)
    // We rely on the client closing the connection to eventually stop,
    // but strictly we should remove the listener.
    // For this demo, we'll accept the slight leak or implement a keep-alive.

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}

// ==========================================
// SEED.TS CONTENT
// ==========================================

async function runSeed() {
    console.log("Clearing DB...");
    await clearDb();

    console.log("Seeding Matches...");
    for (const match of MATCHES) {
        await saveMatch(match);
    }

    console.log("Seeding Users...");
    for (const user of USERS) {
        await createUser(user);
    }

    console.log("Seeding Complete!");
}

// ==========================================
// MAIN.TS CONTENT
// ==========================================

const PORT = 8000;

// Check for seed flag
if (Deno.args.includes("--seed")) {
    await runSeed();
    Deno.exit(0);
}

// Get the project root (one level up from this file)
const currentDir = path.dirname(path.fromFileUrl(import.meta.url));
const projectRoot = path.join(currentDir, "..");

Deno.serve({ port: PORT }, async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/world_cup/, "");

    // Auth Routes
    // Dev Login Route
    if (pathname === "/auth/dev-login" && req.method === "POST") {
        try {
            const { userId } = await req.json();
            const user = await getUser(userId);
            if (!user) {
                return new Response("User not found", { status: 404 });
            }
            const sessionId = await createSession(user);
            const headers = new Headers();
            headers.set("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
            return new Response(JSON.stringify({ success: true, user }), {
                headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" }
            });
        } catch (e) {
            console.error(e);
            return new Response("Dev Login Failed", { status: 500 });
        }
    }

    if (pathname === "/auth/verify" && req.method === "POST") {
        try {
            const { token } = await req.json();
            const sessionId = await verifyToken(token);
            const headers = new Headers();
            headers.set("Set-Cookie", `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`);
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" }
            });
        } catch (e) {
            console.error(e);
            return new Response("Auth Failed", { status: 401 });
        }
    }

    if (pathname === "/api/me") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response(null, { status: 401 });

        const user = await getSession(sessionId);
        if (!user) return new Response(null, { status: 401 });

        return new Response(JSON.stringify(user), {
            headers: { "Content-Type": "application/json" }
        });
    }

    if (pathname === "/api/events") {
        return handleSSE(req);
    }

    // API Routes
    if (pathname === "/api/matches" && req.method === "GET") {
        const matches = await getMatches();
        return new Response(JSON.stringify(matches), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (pathname === "/api/predict" && req.method === "POST") {
        try {
            const sessionId = getCookie(req, "session");
            if (!sessionId) return new Response("Unauthorized", { status: 401 });

            const user = await getSession(sessionId);
            if (!user) return new Response("Unauthorized", { status: 401 });

            const body = await req.json();
            const { matchId, homeScore, awayScore } = body;

            if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
                return new Response("Invalid score", { status: 400 });
            }

            const match = await getMatch(matchId);
            if (!match) return new Response("Match not found", { status: 404 });

            // Validation: Check if match has started
            const matchDate = new Date(match.date);
            if (Date.now() >= matchDate.getTime()) {
                return new Response("Match has already started", { status: 403 });
            }

            await savePrediction({
                userId: user.id,
                matchId,
                homeScore,
                awayScore,
                timestamp: Date.now()
            });

            // Broadcast update
            broadcastUpdate("prediction", { matchId, userId: user.id });

            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error(e);
            return new Response("Invalid Request", { status: 400 });
        }
    }

    if (pathname === "/api/predictions" && req.method === "GET") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response("Unauthorized", { status: 401 });
        const user = await getSession(sessionId);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const predictions = await getPredictionsForUser(user.id);
        return new Response(JSON.stringify(predictions), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (pathname === "/api/leaderboard" && req.method === "GET") {
        const users = await getLeaderboard();
        return new Response(JSON.stringify(users), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // League Routes
    if (pathname === "/api/leagues" && req.method === "GET") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response("Unauthorized", { status: 401 });
        const user = await getSession(sessionId);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const leagues = await getLeaguesForUser(user.id);
        return new Response(JSON.stringify(leagues), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (pathname === "/api/leagues" && req.method === "POST") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response("Unauthorized", { status: 401 });
        const user = await getSession(sessionId);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const { name } = await req.json();
        const league = await createLeague(name, user.id);
        return new Response(JSON.stringify(league), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (pathname === "/api/leagues/join" && req.method === "POST") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response("Unauthorized", { status: 401 });
        const user = await getSession(sessionId);
        if (!user) return new Response("Unauthorized", { status: 401 });

        try {
            const { code } = await req.json();
            const league = await joinLeague(code, user.id);
            return new Response(JSON.stringify(league), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            return new Response(msg, { status: 400 });
        }
    }

    if (pathname.startsWith("/api/leagues/") && req.method === "GET") {
        const id = pathname.split("/").pop();
        if (!id) return new Response("Invalid ID", { status: 400 });

        const league = await getLeague(id);
        if (!league) return new Response("Not found", { status: 404 });

        // Get leaderboard for this league
        const members = [];
        for (const memberId of league.members) {
            const u = await getUser(memberId);
            if (u) members.push(u);
        }
        members.sort((a, b) => b.points - a.points);

        return new Response(JSON.stringify({ ...league, leaderboard: members }), {
            headers: { "Content-Type": "application/json" },
        });
    }

    // Serve Static Files
    // We will serve the current directory for now to keep index.html accessible
    return serveDir(req, {
        fsRoot: path.dirname(path.fromFileUrl(import.meta.url)),
        urlRoot: "world_cup",
        showDirListing: true,
    });
});

console.log(`Server running on http://localhost:${PORT}`);
