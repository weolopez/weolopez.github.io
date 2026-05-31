// VPS threshold monitor — run via cron every 5 minutes.
// Writes alerts to Deno KV and sends push notification to admin when thresholds are crossed.

const KV_PATH = new URL("./admin.db", import.meta.url).pathname;
const WC_KV_PATH = new URL("../world_cup/worldcup.db", import.meta.url).pathname;
const COOLDOWN_MS = 30 * 60 * 1000;
const ADMIN_EMAIL = "weolopez@gmail.com";

interface Alert {
    id: string;
    type: "high_load" | "low_memory";
    title: string;
    body: string;
    severity: "warn" | "critical";
    createdAt: string;
    read: boolean;
}

async function getLoadAvg(): Promise<number> {
    const cmd = new Deno.Command("cat", { args: ["/proc/loadavg"] });
    const { stdout } = await cmd.output();
    return parseFloat(new TextDecoder().decode(stdout).split(" ")[0]);
}

function getFreeRamMb(): number {
    const info = Deno.systemMemoryInfo();
    return Math.round(info.available / 1024 / 1024);
}

async function sendPush(title: string, body: string): Promise<void> {
    const vapidPublic  = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPublic || !vapidPrivate) {
        console.log("[monitor] No VAPID keys — skipping push");
        return;
    }

    const wcKv = await Deno.openKv(WC_KV_PATH);
    let adminUserId: string | null = null;
    for await (const { value } of wcKv.list<{ email: string; id: string }>({ prefix: ["users"] })) {
        if (value.email === ADMIN_EMAIL) { adminUserId = value.id; break; }
    }
    if (!adminUserId) { wcKv.close(); console.log("[monitor] Admin user not found"); return; }

    const sub = (await wcKv.get<PushSubscription>(["push", adminUserId])).value;
    wcKv.close();
    if (!sub) { console.log("[monitor] No push subscription for admin"); return; }

    const { sendNotification, setVapidDetails } = await import("npm:web-push");
    setVapidDetails(`mailto:${ADMIN_EMAIL}`, vapidPublic, vapidPrivate);
    await sendNotification(sub, JSON.stringify({ title, body, url: "https://admin.weolopez.com/" }), {
        urgency: "high", TTL: 86400,
    });
    console.log("[monitor] Push sent to admin");
}

async function maybeAlert(
    kv: Deno.Kv,
    type: Alert["type"],
    title: string,
    body: string,
    severity: Alert["severity"],
): Promise<void> {
    const cooldownKey = ["admin_cooldown", type];
    const last = (await kv.get<number>(cooldownKey)).value ?? 0;
    const now = Date.now();

    if (now - last < COOLDOWN_MS) {
        console.log(`[monitor] Skipping ${type} — cooldown (${Math.round((COOLDOWN_MS - (now - last)) / 60000)} min left)`);
        return;
    }

    const alert: Alert = {
        id: crypto.randomUUID(),
        type, title, body, severity,
        createdAt: new Date().toISOString(),
        read: false,
    };

    await kv.set(["admin_alerts", now], alert);
    await kv.set(cooldownKey, now);
    console.log(`[monitor] ALERT: [${severity}] ${title}`);

    await sendPush(`${severity === "critical" ? "🔴" : "🟡"} ${title}`, body);
}

async function main() {
    const kv = await Deno.openKv(KV_PATH);
    const loadAvg = await getLoadAvg();
    const freeRamMb = getFreeRamMb();
    const totalRamMb = Math.round(Deno.systemMemoryInfo().total / 1024 / 1024);

    console.log(`[monitor] Load: ${loadAvg.toFixed(2)} | RAM free: ${freeRamMb} MB / ${totalRamMb} MB`);

    if (loadAvg > 2.5) {
        await maybeAlert(kv, "high_load",
            "Critical CPU load",
            `Load average is ${loadAvg.toFixed(2)} (threshold: 2.5) on 2-core VPS.`,
            "critical");
    } else if (loadAvg > 1.8) {
        await maybeAlert(kv, "high_load",
            "High CPU load",
            `Load average is ${loadAvg.toFixed(2)} (threshold: 1.8) on 2-core VPS.`,
            "warn");
    }

    if (freeRamMb < 150) {
        await maybeAlert(kv, "low_memory",
            "Critical low memory",
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total. Risk of OOM.`,
            "critical");
    } else if (freeRamMb < 300) {
        await maybeAlert(kv, "low_memory",
            "Low memory",
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total.`,
            "warn");
    }

    kv.close();
}

await main();
