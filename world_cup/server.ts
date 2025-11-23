import { serveDir } from "jsr:@std/http/file-server";
import { getMatches, savePrediction, getLeaderboard } from "./db.ts";
import { verifyToken, getSession } from "./auth.ts";
import { getCookie } from "./utils.ts";
import { handleSSE, broadcastUpdate } from "./sse.ts";
import { join, dirname, fromFileUrl } from "jsr:@std/path";

const PORT = 8081;

// Get the project root (one level up from this file)
const currentDir = dirname(fromFileUrl(import.meta.url));
const projectRoot = join(currentDir, "..");

Deno.serve({ port: PORT }, async (req) => {
    const url = new URL(req.url);
    console.log(`[request] ${req.method} ${url.pathname}`);

    // World Cup API Routes
    if (url.pathname === "/world_cup/api/matches" && req.method === "GET") {
        const matches = await getMatches();
        return new Response(JSON.stringify(matches), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (url.pathname === "/world_cup/api/predict" && req.method === "POST") {
        try {
            const body = await req.json();
            // TODO: Get userId from session
            const userId = "user_123";
            await savePrediction({ ...body, userId, timestamp: Date.now() });
            broadcastUpdate("prediction", { matchId: body.matchId, userId });
            return new Response(JSON.stringify({ success: true }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response("Invalid Request", { status: 400 });
        }
    }

    if (url.pathname === "/world_cup/auth/verify" && req.method === "POST") {
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

    if (url.pathname === "/world_cup/api/me") {
        const sessionId = getCookie(req, "session");
        if (!sessionId) return new Response(null, { status: 401 });

        const user = await getSession(sessionId);
        if (!user) return new Response(null, { status: 401 });

        return new Response(JSON.stringify(user), {
            headers: { "Content-Type": "application/json" }
        });
    }

    if (url.pathname === "/world_cup/api/leaderboard" && req.method === "GET") {
        const leaderboard = await getLeaderboard();
        return new Response(JSON.stringify(leaderboard), {
            headers: { "Content-Type": "application/json" },
        });
    }

    if (url.pathname === "/world_cup/api/events") {
        return handleSSE(req);
    }

    // Static Files - Serve from Project Root
    return serveDir(req, {
        fsRoot: projectRoot,
        showDirListing: true,
    });
});

console.log(`World Cup Server running on http://localhost:${PORT}`);
console.log(`Serving files from: ${projectRoot}`);
