/// <reference lib="deno.unstable" />
/**
 * One-time economy migration (idempotent — safe to re-run):
 *   1. Backfills aggregate mint/burn counters from token_tx history
 *      (sets absolute KvU64 values computed from the full scan).
 *   2. Verifies the supply invariant: Σ wallets = minted − burned.
 *   3. Patches existing sponsors with type: "corporate" when missing.
 *   4. Writes the treasury config if absent.
 *
 * Run: /root/.deno/bin/deno run --allow-read --allow-write --unstable-kv migrate-economy.ts
 */

const kv = await Deno.openKv("./worldcup/worldcup.db");

interface TokenTx { id: string; userId: string; amount: number; type: string; refId: string; ts: number; }
interface TokenSponsor { id: string; name: string; logo: string; balance: number; type?: string; tier?: string; }

function etDay(ts: number): string {
    return new Date(ts).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

console.log("🔧 Economy migration starting...\n");

// ── 1. Backfill counters from tx history ─────────────────────────────────────

let mintedTotal = 0, burnedTotal = 0, txCount = 0;
let betStakedTotal = 0, betPaidTotal = 0;
const mintedByType = new Map<string, number>();
const burnedByType = new Map<string, number>();
const dayMinted = new Map<string, number>();
const dayBurned = new Map<string, number>();
const dayStaked = new Map<string, number>();
const dayPaid = new Map<string, number>();

// Stale per-type/per-day counters from deleted txs would survive a rebuild —
// clear the whole namespace first so set() below is authoritative.
for await (const e of kv.list({ prefix: ["token_counter"] })) await kv.delete(e.key);
for await (const e of kv.list({ prefix: ["token_counter_day"] })) await kv.delete(e.key);

for await (const { value: tx } of kv.list<TokenTx>({ prefix: ["token_tx"] })) {
    txCount++;
    const day = etDay(tx.ts);
    if (tx.amount >= 0) {
        mintedTotal += tx.amount;
        mintedByType.set(tx.type, (mintedByType.get(tx.type) ?? 0) + tx.amount);
        dayMinted.set(day, (dayMinted.get(day) ?? 0) + tx.amount);
        if (tx.type === "bet_win") { betPaidTotal += tx.amount; dayPaid.set(day, (dayPaid.get(day) ?? 0) + tx.amount); }
    } else {
        burnedTotal += -tx.amount;
        burnedByType.set(tx.type, (burnedByType.get(tx.type) ?? 0) + -tx.amount);
        dayBurned.set(day, (dayBurned.get(day) ?? 0) + -tx.amount);
        if (tx.type === "bet_stake") { betStakedTotal += -tx.amount; dayStaked.set(day, (dayStaked.get(day) ?? 0) + -tx.amount); }
    }
}

await kv.set(["token_counter", "minted_total"], new Deno.KvU64(BigInt(mintedTotal)));
await kv.set(["token_counter", "burned_total"], new Deno.KvU64(BigInt(burnedTotal)));
await kv.set(["token_counter", "bet_staked_total"], new Deno.KvU64(BigInt(betStakedTotal)));
await kv.set(["token_counter", "bet_paid_total"], new Deno.KvU64(BigInt(betPaidTotal)));
for (const [type, n] of mintedByType) await kv.set(["token_counter", "minted", type], new Deno.KvU64(BigInt(n)));
for (const [type, n] of burnedByType) await kv.set(["token_counter", "burned", type], new Deno.KvU64(BigInt(n)));
for (const [day, n] of dayMinted) await kv.set(["token_counter_day", day, "minted"], new Deno.KvU64(BigInt(n)));
for (const [day, n] of dayBurned) await kv.set(["token_counter_day", day, "burned"], new Deno.KvU64(BigInt(n)));
for (const [day, n] of dayStaked) await kv.set(["token_counter_day", day, "bet_staked"], new Deno.KvU64(BigInt(n)));
for (const [day, n] of dayPaid) await kv.set(["token_counter_day", day, "bet_paid"], new Deno.KvU64(BigInt(n)));

console.log(`  📋 ${txCount} transactions scanned`);
console.log(`  🪙 minted_total = ${mintedTotal}`);
console.log(`  🔥 burned_total = ${burnedTotal}`);
for (const [type, n] of mintedByType) console.log(`     minted/${type}: ${n}`);
for (const [type, n] of burnedByType) console.log(`     burned/${type}: ${n}`);

// ── 2. Verify supply invariant ────────────────────────────────────────────────

let walletSum = 0, walletCount = 0;
for await (const { value } of kv.list<{ balance: number }>({ prefix: ["token_wallet"] })) {
    walletSum += value.balance;
    walletCount++;
}
const circulating = mintedTotal - burnedTotal;
console.log(`\n  💰 Σ ${walletCount} wallets = ${walletSum}`);
console.log(`  📐 minted − burned = ${circulating}`);
if (walletSum === circulating) {
    console.log("  ✅ Supply invariant holds.");
} else {
    console.log(`  ⚠️  MISMATCH of ${walletSum - circulating} — wallets were written without txs (or vice versa).`);
}

// ── 3. Patch sponsors with default type ───────────────────────────────────────

let patched = 0;
for await (const { key, value } of kv.list<TokenSponsor>({ prefix: ["token_sponsor"] })) {
    if (!value.type) {
        await kv.set(key, { ...value, type: "corporate" });
        patched++;
        console.log(`  🏷️  ${value.name} → type: corporate`);
    }
}
console.log(`\n  🏢 ${patched} sponsors patched with type`);

// ── 4. Treasury config (only if absent, so re-runs don't clobber tweaks) ─────

const existing = await kv.get(["token_treasury_config"]);
if (!existing.value) {
    await kv.set(["token_treasury_config"], { emissionBudget: 500_000, dailyEarnCap: 400, betMinStake: 10, betMaxStake: 200 });
    console.log("  ⚙️  Treasury config written: budget 500000, daily cap 400, stakes 10–200");
} else {
    console.log("  ⚙️  Treasury config already present — left untouched");
}

console.log("\n✅ Migration complete.");
kv.close();
