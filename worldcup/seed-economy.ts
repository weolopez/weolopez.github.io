/// <reference lib="deno.unstable" />
/**
 * Economy seed v2 — three sponsor categories + WC Atlanta match sponsorships.
 * Complements seed-tokens.ts (corporate friendlies seed). Idempotent.
 *
 *   - Patches the 5 existing corporate sponsors with type/tier
 *   - Institutional partners (per token/proposals/institutional-partner-proposal.html)
 *   - Community partners (Randoms FC + randoms.html venues not already corporate)
 *   - Sponsorships on the 5 Atlanta (Mercedes-Benz Stadium) group-stage matches
 *   - Offers for the new sponsors
 *   - Demo bet + trivia txs so the economy dashboard isn't empty
 *
 * Run:   /root/.deno/bin/deno run --allow-read --allow-write --unstable-kv seed-economy.ts
 * Then:  /root/.deno/bin/deno run --allow-read --allow-write --unstable-kv migrate-economy.ts
 *        (rebuilds counters so the supply invariant includes seeded txs)
 */

const kv = await Deno.openKv("/root/weolopez.github.io/worldcup/worldcup.db");

const avatar = (name: string, bg = "0a1f44", fg = "BFA260") =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bg}&color=${fg}`;

// ── EXISTING CORPORATE SPONSORS → type/tier patch ─────────────────────────────

const CORPORATE_TIERS: Record<string, string> = {
    "sp-brewhouse-l5p": "match",
    "sp-brewhouse-sodo": "match",
    "sp-stats": "match",
    "sp-biergarten": "match",
    "sp-district": "presenting",
};

// ── INSTITUTIONAL PARTNERS ────────────────────────────────────────────────────
// Federation-, university-, and civic-style orgs from the institutional proposal

const INSTITUTIONAL = [
    { id: "inst-gsa", name: "Georgia Soccer", logo: avatar("Georgia Soccer", "1a3a6b", "ffffff"), balance: 60000, type: "institutional", tier: "presenting" },
    { id: "inst-gsu", name: "Georgia State University Athletics", logo: avatar("GSU Athletics", "0039A6", "ffffff"), balance: 10000, type: "institutional", tier: "match" },
    { id: "inst-soccerstreets", name: "Soccer in the Streets", logo: avatar("Soccer in the Streets", "00753a", "ffffff"), balance: 10000, type: "institutional", tier: "match" },
];

// ── COMMUNITY PARTNERS ────────────────────────────────────────────────────────
// Randoms FC crew + the randoms.html venues that aren't corporate sponsors yet

const COMMUNITY = [
    { id: "com-randoms", name: "Randoms FC", logo: avatar("Randoms FC", "BFA260", "0a1f44"), balance: 2500, type: "community", tier: "starter" },
    { id: "com-battery", name: "Sports & Social at The Battery", logo: avatar("Sports Social", "12203f", "BFA260"), balance: 2500, type: "community", tier: "starter" },
    { id: "com-jolene", name: "Jolene Jolene", logo: avatar("Jolene Jolene", "7C2D5E", "ffffff"), balance: 2500, type: "community", tier: "starter" },
];

// ── OFFERS for the new sponsors ───────────────────────────────────────────────

const OFFERS = [
    { id: "off-gsa-clinic", sponsorId: "inst-gsa", title: "Youth Clinic Day Pass", description: "One free entry to a Georgia Soccer youth skills clinic this summer.", tokenCost: 200, maxRedemptions: 30, currentRedemptions: 0, isActive: true },
    { id: "off-gsa-scarf", sponsorId: "inst-gsa", title: "Limited GA Soccer WC Scarf", description: "Commemorative Georgia Soccer World Cup 2026 scarf. Collect at HQ.", tokenCost: 350, maxRedemptions: 25, currentRedemptions: 0, isActive: true },
    { id: "off-gsu-tour", sponsorId: "inst-gsu", title: "Sideline & Facilities Tour", description: "Behind-the-scenes tour of GSU's athletics facilities for you + 3 friends.", tokenCost: 250, maxRedemptions: 10, currentRedemptions: 0, isActive: true },
    { id: "off-sits-ball", sponsorId: "inst-soccerstreets", title: "Donate a Match Ball", description: "We donate a match ball to a youth program in your name — you get the photo.", tokenCost: 120, maxRedemptions: 50, currentRedemptions: 0, isActive: true },
    { id: "off-randoms-pickup", sponsorId: "com-randoms", title: "Guest Spot at Tuesday Pickup", description: "Play a session with the Randoms FC crew. Rain or shine. Banned neighbor not included.", tokenCost: 150, maxRedemptions: 20, currentRedemptions: 0, isActive: true },
    { id: "off-battery-table", sponsorId: "com-battery", title: "Reserved Big-Screen Table", description: "Front-row table for 4 under the giant LED at The Battery for any group match.", tokenCost: 220, maxRedemptions: 12, currentRedemptions: 0, isActive: true },
    { id: "off-jolene-round", sponsorId: "com-jolene", title: "First Round On Jolene", description: "A round of drinks for two at Atlanta's first women's sports bar.", tokenCost: 90, maxRedemptions: 40, currentRedemptions: 0, isActive: true },
];

// ── WC MATCH SPONSORSHIPS — Atlanta (Mercedes-Benz Stadium) group stage ───────
// Verified ids in data.ts: 3 (CZE-RSA), 18 (MAR-HAI), 43 (ESP-CPV),
// 45 (ESP-KSA), 66 (COD-UZB)

const SPONSORSHIPS = [
    { matchId: 43, sponsorId: "sp-stats", prizePoolTokens: 1000, rsvpBonusTokens: 50, passCode: "ESPATL26" },
    { matchId: 3, sponsorId: "inst-gsa", prizePoolTokens: 750, rsvpBonusTokens: 30, passCode: "GASOCCER" },
    { matchId: 18, sponsorId: "inst-soccerstreets", prizePoolTokens: 500, rsvpBonusTokens: 25, passCode: "STREETS26" },
    { matchId: 45, sponsorId: "sp-district", prizePoolTokens: 1000, rsvpBonusTokens: 50, passCode: "DISTRICTH" },
    { matchId: 66, sponsorId: "com-randoms", prizePoolTokens: 300, rsvpBonusTokens: 25, passCode: "RANDOMS26" },
];

// ── DEMO ACTIVITY (bets + trivia) for existing demo users ─────────────────────

function emailUserId(email: string) {
    return "email_" + btoa(email).replace(/[^a-zA-Z0-9]/g, "");
}

const DEMO_TXS = [
    { userId: emailUserId("marco.rossi@gmail.com"), txs: [
        { amount: -50, type: "bet_stake", refId: "1003:result" },
        { amount: 130, type: "bet_win", refId: "1003:result" },
        { amount: 25, type: "earn_trivia", refId: "2026-06-09" },
    ]},
    { userId: emailUserId("ashley.kim@yahoo.com"), txs: [
        { amount: -100, type: "bet_stake", refId: "1003:goals" },
        { amount: 35, type: "earn_trivia", refId: "2026-06-09" },
    ]},
    { userId: emailUserId("dev.patel@outlook.com"), txs: [
        { amount: -20, type: "bet_stake", refId: "1002:bts" },
        { amount: 36, type: "bet_win", refId: "1002:bts" },
        { amount: 40, type: "earn_trivia", refId: "2026-06-08" },
    ]},
];

// ── WRITE ─────────────────────────────────────────────────────────────────────

console.log("🌱 Seeding economy v2 (3 sponsor categories + WC sponsorships)...\n");

// Patch existing corporate sponsors
for (const [id, tier] of Object.entries(CORPORATE_TIERS)) {
    const r = await kv.get<Record<string, unknown>>(["token_sponsor", id]);
    if (r.value) {
        await kv.set(["token_sponsor", id], { ...r.value, type: "corporate", tier });
        console.log(`  🏢 corporate: ${r.value.name} (tier: ${tier})`);
    }
}

// New sponsors (don't clobber balances on re-run)
for (const s of [...INSTITUTIONAL, ...COMMUNITY]) {
    const existing = await kv.get(["token_sponsor", s.id]);
    if (existing.value) { console.log(`  ↩️  exists: ${s.name}`); continue; }
    await kv.set(["token_sponsor", s.id], s);
    console.log(`  ${s.type === "institutional" ? "🏛️" : "🤝"} ${s.type}: ${s.name} (${s.balance} tkn, ${s.tier})`);
}

// Offers
for (const o of OFFERS) {
    const existing = await kv.get(["token_offer", o.id]);
    if (existing.value) continue;
    await kv.set(["token_offer", o.id], o);
    console.log(`  🎁 Offer: ${o.title} (${o.tokenCost} tkn) → ${o.sponsorId}`);
}

// WC sponsorships
for (const s of SPONSORSHIPS) {
    const sponsor = (await kv.get<Record<string, unknown>>(["token_sponsor", s.sponsorId])).value;
    if (!sponsor) { console.log(`  ⚠️ no sponsor ${s.sponsorId}, skipping match ${s.matchId}`); continue; }
    await kv.set(["match_sponsorship", s.matchId], {
        matchId: s.matchId, sponsorId: s.sponsorId,
        sponsorName: sponsor.name, sponsorLogo: sponsor.logo,
        prizePoolTokens: s.prizePoolTokens, rsvpBonusTokens: s.rsvpBonusTokens,
        passCode: s.passCode,
    });
    console.log(`  🏟️ Match ${s.matchId} → ${sponsor.name} (pool ${s.prizePoolTokens}, bonus ${s.rsvpBonusTokens}, code ${s.passCode})`);
}

// Demo activity: txs + matching wallet adjustments (run migrate-economy after
// this so the counters absorb the new txs and the invariant stays green)
const seededFlag = await kv.get(["seed_economy_demo_txs"]);
if (seededFlag.value) {
    console.log("\n  ↩️  Demo txs already seeded — skipping");
} else {
    for (const u of DEMO_TXS) {
        const wallet = (await kv.get<{ balance: number }>(["token_wallet", u.userId])).value;
        if (!wallet) { console.log(`  ⚠️ no wallet for ${u.userId}, skipping demo txs`); continue; }
        let delta = 0;
        for (const tx of u.txs) {
            const txId = crypto.randomUUID();
            const ts = Date.now() - Math.floor(Math.random() * 2 * 24 * 60 * 60 * 1000);
            await kv.set(["token_tx", txId], { id: txId, userId: u.userId, amount: tx.amount, type: tx.type, refId: tx.refId, ts });
            delta += tx.amount;
        }
        await kv.set(["token_wallet", u.userId], { balance: wallet.balance + delta });
        console.log(`  🎰 ${u.userId.slice(0, 18)}…: ${u.txs.length} demo txs (Δ ${delta >= 0 ? "+" : ""}${delta})`);
    }
    await kv.set(["seed_economy_demo_txs"], true);
}

console.log("\n✅ Economy seed complete. Now run migrate-economy.ts to rebuild counters.");
kv.close();
