/// <reference lib="deno.unstable" />

import { serveDir } from "@std/http/file-server";
import * as http from "@std/http";
import * as path from "@std/path";
import * as fs from "@std/fs";


// ==========================================
// DB.TS CONTENT
// ==========================================

const kv = await Deno.openKv();

export interface Team {
    id: string;
    name: string;
    flag: string;
}

export interface Match {
    id: number;
    matchday: number;
    date: string;
    group: string;
    home: Team;
    away: Team;
    venue: string;
    homeScore?: number;
    awayScore?: number;
    status: "scheduled" | "live" | "finished";
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar: string;
    points: number;
    exact: number;
}

export interface Prediction {
    userId: string;
    matchId: number;
    homeScore: number;
    awayScore: number;
    timestamp: number;
}

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
    const VENUES = {
        MEX: "Estadio Azteca, Mexico City",
        CAN: "BMO Field, Toronto",
        USA_LA: "SoFi Stadium, Los Angeles",
        USA_NJ: "MetLife Stadium, New Jersey",
        USA_DAL: "AT&T Stadium, Dallas",
        USA_MIA: "Hard Rock Stadium, Miami",
        USA_ATL: "Mercedes-Benz Stadium, Atlanta"
    };

    const TEAMS: Record<string, Team> = {
        MEX: { id: 'MEX', name: 'Mexico', flag: '🇲🇽' },
        CAN: { id: 'CAN', name: 'Canada', flag: '🇨🇦' },
        USA: { id: 'USA', name: 'USA', flag: '🇺🇸' },
        ARG: { id: 'ARG', name: 'Argentina', flag: '🇦🇷' },
        FRA: { id: 'FRA', name: 'France', flag: '🇫🇷' },
        BRA: { id: 'BRA', name: 'Brazil', flag: '🇧🇷' },
        ENG: { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
        ESP: { id: 'ESP', name: 'Spain', flag: '🇪🇸' },
        GER: { id: 'GER', name: 'Germany', flag: '🇩🇪' },
        JPN: { id: 'JPN', name: 'Japan', flag: '🇯🇵' },
        KOR: { id: 'KOR', name: 'South Korea', flag: '🇰🇷' },
        AUS: { id: 'AUS', name: 'Australia', flag: '🇦🇺' },
        MAR: { id: 'MAR', name: 'Morocco', flag: '🇲🇦' },
        SEN: { id: 'SEN', name: 'Senegal', flag: '🇸🇳' },
        ITA: { id: 'ITA', name: 'Italy', flag: '🇮🇹' },
        NED: { id: 'NED', name: 'Netherlands', flag: '🇳🇱' },
        URU: { id: 'URU', name: 'Uruguay', flag: '🇺🇾' },
        COL: { id: 'COL', name: 'Colombia', flag: '🇨🇴' },
        POL: { id: 'POL', name: 'Poland', flag: '🇵🇱' },
        EGY: { id: 'EGY', name: 'Egypt', flag: '🇪🇬' },
    };

    const MATCHES: Match[] = [
        { id: 1, matchday: 1, date: "2026-06-11T19:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.EGY, venue: VENUES.MEX, status: "scheduled" },
        { id: 2, matchday: 1, date: "2026-06-11T21:00:00", group: "A", home: TEAMS.POL, away: TEAMS.KOR, venue: "Estadio Akron, Guadalajara", status: "scheduled" },
        { id: 3, matchday: 1, date: "2026-06-12T15:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.SEN, venue: VENUES.CAN, status: "scheduled" },
        { id: 4, matchday: 1, date: "2026-06-12T18:00:00", group: "D", home: TEAMS.USA, away: TEAMS.URU, venue: VENUES.USA_LA, status: "scheduled" },
        { id: 5, matchday: 1, date: "2026-06-13T13:00:00", group: "C", home: TEAMS.ARG, away: TEAMS.AUS, venue: VENUES.USA_NJ, status: "scheduled" },
        { id: 6, matchday: 1, date: "2026-06-13T16:00:00", group: "C", home: TEAMS.ITA, away: TEAMS.JPN, venue: "Gillette Stadium, Boston", status: "scheduled" },
        { id: 7, matchday: 1, date: "2026-06-13T19:00:00", group: "D", home: TEAMS.NED, away: TEAMS.COL, venue: "Levi's Stadium, San Francisco", status: "scheduled" },
        { id: 8, matchday: 2, date: "2026-06-18T18:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.POL, venue: "Estadio Akron, Guadalajara", status: "scheduled" },
        { id: 9, matchday: 2, date: "2026-06-19T20:00:00", group: "D", home: TEAMS.USA, away: TEAMS.NED, venue: "Lumen Field, Seattle", status: "scheduled" }
    ];

    console.log("Clearing DB...");
    await clearDb();

    console.log("Seeding Matches...");
    for (const match of MATCHES) {
        await saveMatch(match);
    }

    const USERS: User[] = [
        { id: "user_1", email: "raeytn@example.com", name: "Raeytn", avatar: "https://i.pravatar.cc/150?u=raeytn", points: 98, exact: 12 },
        { id: "user_2", email: "australin@example.com", name: "Australin", avatar: "https://i.pravatar.cc/150?u=australin", points: 93, exact: 10 },
        { id: "user_3", email: "becridy@example.com", name: "Becridy", avatar: "https://i.pravatar.cc/150?u=becridy", points: 88, exact: 8 },
        { id: "user_4", email: "tsonada@example.com", name: "Tsonada", avatar: "https://i.pravatar.cc/150?u=tsonada", points: 85, exact: 9 },
        { id: "user_5", email: "you@example.com", name: "You", avatar: "", points: 12, exact: 1 },
    ];

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

Deno.serve({ port: PORT }, async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/world_cup/, "");

    // Auth Routes
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

    if (pathname === "/api/leaderboard" && req.method === "GET") {
        const users = await getLeaderboard();
        return new Response(JSON.stringify(users), {
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
