// Admin API — serves alerts from the KV store written by monitor.ts

const KV_PATH = new URL("./admin.db", import.meta.url).pathname;
let _kv: Deno.Kv | null = null;

async function kv(): Promise<Deno.Kv> {
    if (!_kv) _kv = await Deno.openKv(KV_PATH);
    return _kv;
}

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...CORS },
    });
}

export async function handleAdminApiRequest(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

    // GET /admin/api/alerts
    if (req.method === "GET" && path === "/admin/api/alerts") {
        const db = await kv();
        const alerts: unknown[] = [];
        for await (const entry of db.list({ prefix: ["admin_alerts"] })) {
            alerts.push({ _key: entry.key[1], ...entry.value as object });
        }
        // Newest first
        alerts.sort((a: unknown, b: unknown) => {
            const ak = (a as { _key: number })._key;
            const bk = (b as { _key: number })._key;
            return bk - ak;
        });
        return json(alerts);
    }

    // POST /admin/api/alerts/read-all
    if (req.method === "POST" && path === "/admin/api/alerts/read-all") {
        const db = await kv();
        const ops: Promise<unknown>[] = [];
        for await (const entry of db.list({ prefix: ["admin_alerts"] })) {
            const val = entry.value as Record<string, unknown>;
            ops.push(db.set(entry.key, { ...val, read: true }));
        }
        await Promise.all(ops);
        return json({ ok: true });
    }

    // POST /admin/api/alerts/:key/read
    const readMatch = path.match(/^\/admin\/api\/alerts\/(\d+)\/read$/);
    if (req.method === "POST" && readMatch) {
        const key = parseInt(readMatch[1]);
        const db = await kv();
        const entry = await db.get<Record<string, unknown>>(["admin_alerts", key]);
        if (!entry.value) return json({ error: "Not found" }, 404);
        await db.set(["admin_alerts", key], { ...entry.value, read: true });
        return json({ ok: true });
    }

    // DELETE /admin/api/alerts/:key
    const delMatch = path.match(/^\/admin\/api\/alerts\/(\d+)$/);
    if (req.method === "DELETE" && delMatch) {
        const key = parseInt(delMatch[1]);
        const db = await kv();
        await db.delete(["admin_alerts", key]);
        return json({ ok: true });
    }

    // GET /admin/api/stats
    if (req.method === "GET" && path === "/admin/api/stats") {
        const cmd = new Deno.Command("cat", { args: ["/proc/loadavg"] });
        const { stdout } = await cmd.output();
        const loadAvg = parseFloat(new TextDecoder().decode(stdout).split(" ")[0]);
        const mem = Deno.systemMemoryInfo();
        const uptimeCmd = new Deno.Command("cat", { args: ["/proc/uptime"] });
        const { stdout: upOut } = await uptimeCmd.output();
        const uptimeSecs = parseFloat(new TextDecoder().decode(upOut).split(" ")[0]);

        // Count worldcup users from their KV store
        const wcKvPath = new URL("../worldcup/worldcup.db", import.meta.url).pathname;
        const wcKv = await Deno.openKv(wcKvPath);
        let userCount = 0;
        for await (const _ of wcKv.list({ prefix: ["users"] })) userCount++;
        wcKv.close();

        return json({
            loadAvg: loadAvg.toFixed(2),
            freeRamMb: Math.round(mem.available / 1024 / 1024),
            totalRamMb: Math.round(mem.total / 1024 / 1024),
            uptimeDays: Math.floor(uptimeSecs / 86400),
            uptimeHours: Math.floor((uptimeSecs % 86400) / 3600),
            wcUsers: userCount,
        });
    }

    // GET /admin/api/unread-count
    if (req.method === "GET" && path === "/admin/api/unread-count") {
        const db = await kv();
        let count = 0;
        for await (const entry of db.list({ prefix: ["admin_alerts"] })) {
            if (!(entry.value as Record<string, unknown>).read) count++;
        }
        return json({ count });
    }

    return null;
}
