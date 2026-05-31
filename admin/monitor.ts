// VPS threshold monitor — run via cron every 5 minutes.
// Writes alerts to Deno KV when CPU load or free RAM crosses thresholds.
// Deduplicates via 30-min cooldown per alert type.

const KV_PATH = new URL("./admin.db", import.meta.url).pathname;
const COOLDOWN_MS = 30 * 60 * 1000;

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
        console.log(`[monitor] Skipping ${type} alert — cooldown active (${Math.round((COOLDOWN_MS - (now - last)) / 60000)} min remaining)`);
        return;
    }

    const alert: Alert = {
        id: crypto.randomUUID(),
        type,
        title,
        body,
        severity,
        createdAt: new Date().toISOString(),
        read: false,
    };

    await kv.set(["admin_alerts", now], alert);
    await kv.set(cooldownKey, now);
    console.log(`[monitor] ALERT created: [${severity}] ${title}`);
}

async function main() {
    const kv = await Deno.openKv(KV_PATH);

    const loadAvg = await getLoadAvg();
    const freeRamMb = getFreeRamMb();
    const mem = Deno.systemMemoryInfo();
    const totalRamMb = Math.round(mem.total / 1024 / 1024);

    console.log(`[monitor] Load avg: ${loadAvg.toFixed(2)} | Free RAM: ${freeRamMb} MB / ${totalRamMb} MB`);

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
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total (threshold: 150 MB). Risk of OOM.`,
            "critical");
    } else if (freeRamMb < 300) {
        await maybeAlert(kv, "low_memory",
            "Low memory",
            `Only ${freeRamMb} MB free of ${totalRamMb} MB total (threshold: 300 MB).`,
            "warn");
    }

    kv.close();
}

await main();
