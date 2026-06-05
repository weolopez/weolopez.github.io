/// <reference lib="deno.unstable" />
/**
 * Seed fan token test data for friendlies:
 *   - 5 real Atlanta sponsors
 *   - 2–3 offers each
 *   - Sponsorships on all 6 friendlies
 *   - 3 demo users with realistic wallet activity
 *   - Some RSVPs and check-ins
 *   - A couple of unredeemed vouchers for demo
 *
 * Run once: deno run --allow-read --allow-write --unstable-kv seed-tokens.ts
 */

const kv = await Deno.openKv("/root/weolopez.github.io/worldcup/worldcup.db");

function uuid() { return crypto.randomUUID(); }

// ── SPONSORS ─────────────────────────────────────────────────────────────────

const SPONSORS = [
  {
    id: "sp-brewhouse-l5p",
    name: "Brewhouse Cafe L5P",
    logo: "https://www.brewhousecafe.com/wp-content/uploads/2019/01/brewhouse-logo.png",
    balance: 10000,
  },
  {
    id: "sp-brewhouse-sodo",
    name: "Brewhouse Cafe SoDo",
    logo: "https://www.brewhousecafe.com/wp-content/uploads/2019/01/brewhouse-logo.png",
    balance: 8000,
  },
  {
    id: "sp-stats",
    name: "STATS Brewpub",
    logo: "https://www.statsatl.com/wp-content/uploads/2019/05/stats-logo-white.png",
    balance: 12000,
  },
  {
    id: "sp-biergarten",
    name: "Der Biergarten Atlanta",
    logo: "https://derbiergarten.com/wp-content/uploads/2018/04/der-biergarten-logo.png",
    balance: 9000,
  },
  {
    id: "sp-district",
    name: "District Atlanta",
    logo: "https://districtatlanta.com/wp-content/themes/district/img/district-logo-white.png",
    balance: 15000,
  },
];

// ── OFFERS ───────────────────────────────────────────────────────────────────

const OFFERS = [
  // Brewhouse L5P
  { id: "off-bh-pint",     sponsorId: "sp-brewhouse-l5p",  title: "First Pint on Us",            description: "One free pint of draft beer at Brewhouse L5P. Any tap, any size.",     tokenCost: 80,  maxRedemptions: 50,  currentRedemptions: 12, isActive: true },
  { id: "off-bh-tab",      sponsorId: "sp-brewhouse-l5p",  title: "$10 Off Your Tab",             description: "$10 credit applied at checkout. Valid during any World Cup watch party.", tokenCost: 120, maxRedemptions: 30,  currentRedemptions: 7,  isActive: true },
  { id: "off-bh-vip",      sponsorId: "sp-brewhouse-l5p",  title: "VIP Booth Reservation",        description: "Reserved booth for up to 4 fans for any single match. Must book 24h ahead.", tokenCost: 300, maxRedemptions: 10,  currentRedemptions: 2,  isActive: true },
  // Brewhouse SoDo
  { id: "off-sodo-pretzel", sponsorId: "sp-brewhouse-sodo", title: "Brewhouse Pretzel + Beer",    description: "Giant soft pretzel + one draft beer at our brand-new South Downtown location.", tokenCost: 60,  maxRedemptions: 40,  currentRedemptions: 5,  isActive: true },
  { id: "off-sodo-shirt",   sponsorId: "sp-brewhouse-sodo", title: "Brewhouse WC2026 T-Shirt",    description: "Limited edition World Cup 2026 tee — pick up at the bar, sizes S–XXL.",       tokenCost: 200, maxRedemptions: 20,  currentRedemptions: 3,  isActive: true },
  // STATS
  { id: "off-stats-app",   sponsorId: "sp-stats",          title: "Free Appetizer",               description: "One appetizer up to $14 value. Choose from wings, nachos, or loaded fries.", tokenCost: 90,  maxRedemptions: 60,  currentRedemptions: 22, isActive: true },
  { id: "off-stats-suite", sponsorId: "sp-stats",          title: "Premium Viewing Access",       description: "Access to STATS premium upper-deck section — best screens in the house.",     tokenCost: 150, maxRedemptions: 25,  currentRedemptions: 8,  isActive: true },
  { id: "off-stats-happy", sponsorId: "sp-stats",          title: "2-for-1 Happy Hour Upgrade",   description: "Extends happy hour pricing on all drafts for your party for 2 full hours.",    tokenCost: 70,  maxRedemptions: 0,   currentRedemptions: 17, isActive: true },
  // Der Biergarten
  { id: "off-bg-liter",    sponsorId: "sp-biergarten",     title: "Liter Beer Upgrade",           description: "Upgrade any half-liter to a full liter for free. Prost! 🍺",                 tokenCost: 50,  maxRedemptions: 100, currentRedemptions: 31, isActive: true },
  { id: "off-bg-board",    sponsorId: "sp-biergarten",     title: "German Snack Board",           description: "Charcuterie board with imported meats, pretzels, mustard, and cheese.",       tokenCost: 110, maxRedemptions: 40,  currentRedemptions: 9,  isActive: true },
  // District Atlanta
  { id: "off-dist-vip",    sponsorId: "sp-district",       title: "VIP Event Access",             description: "Skip general admission. Access to the elevated VIP lounge with table service.", tokenCost: 250, maxRedemptions: 15,  currentRedemptions: 4,  isActive: true },
  { id: "off-dist-suite",  sponsorId: "sp-district",       title: "Private Suite Tour",           description: "Behind-the-scenes tour of District Atlanta's premium suites before kickoff.",  tokenCost: 400, maxRedemptions: 5,   currentRedemptions: 1,  isActive: true },
];

// ── MATCH SPONSORSHIPS ────────────────────────────────────────────────────────
// matchId → real friendly match IDs from the DB

const SPONSORSHIPS = [
  { matchId: 1001, sponsorId: "sp-brewhouse-l5p",  sponsorName: "Brewhouse Cafe L5P",     sponsorLogo: "https://www.brewhousecafe.com/wp-content/uploads/2019/01/brewhouse-logo.png", prizePoolTokens: 500, rsvpBonusTokens: 25, passCode: "USAWIN" },
  { matchId: 1002, sponsorId: "sp-biergarten",     sponsorName: "Der Biergarten Atlanta", sponsorLogo: "https://derbiergarten.com/wp-content/uploads/2018/04/der-biergarten-logo.png", prizePoolTokens: 400, rsvpBonusTokens: 25, passCode: "PROST26" },
  { matchId: 1003, sponsorId: "sp-stats",          sponsorName: "STATS Brewpub",          sponsorLogo: "https://www.statsatl.com/wp-content/themes/stats/img/stats-logo.png", prizePoolTokens: 300, rsvpBonusTokens: 20, passCode: "STATS26" },
  { matchId: 1004, sponsorId: "sp-brewhouse-sodo", sponsorName: "Brewhouse Cafe SoDo",   sponsorLogo: "https://www.brewhousecafe.com/wp-content/uploads/2019/01/brewhouse-logo.png", prizePoolTokens: 350, rsvpBonusTokens: 25, passCode: "SODO26" },
  { matchId: 1005, sponsorId: "sp-stats",          sponsorName: "STATS Brewpub",          sponsorLogo: "https://www.statsatl.com/wp-content/themes/stats/img/stats-logo.png", prizePoolTokens: 750, rsvpBonusTokens: 30, passCode: "USAGER" },
  { matchId: 1006, sponsorId: "sp-district",       sponsorName: "District Atlanta",       sponsorLogo: "https://districtatlanta.com/wp-content/themes/district/img/district-logo-white.png", prizePoolTokens: 1000, rsvpBonusTokens: 50, passCode: "DISTRICT26" },
];

// ── DEMO USERS (realistic wallet histories) ───────────────────────────────────
// These use the email-based userId format so they appear on the leaderboard

function emailUserId(email: string) {
  return "email_" + btoa(email).replace(/[^a-zA-Z0-9]/g, "");
}

const DEMO_USERS = [
  {
    id: emailUserId("marco.rossi@gmail.com"),
    email: "marco.rossi@gmail.com",
    name: "Marco Rossi",
    avatar: "https://ui-avatars.com/api/?name=Marco+Rossi&background=0a1f44&color=BFA260",
    points: 9, exact: 2,
    // wallet history
    txs: [
      { amount: 50, type: "earn_exact",        refId: "1001", label: "USA vs Senegal — exact!" },
      { amount: 30, type: "earn_margin",       refId: "1002", label: "Germany vs Finland — margin" },
      { amount: 25, type: "earn_rsvp_checkin", refId: "1001", label: "Brewhouse L5P check-in" },
      { amount: 25, type: "earn_rsvp_checkin", refId: "1002", label: "Der Biergarten check-in" },
      { amount: 10, type: "earn_result",       refId: "1003", label: "Canada vs Uzbekistan" },
      { amount: -90, type: "coupon_burn",      refId: "off-stats-app", label: "STATS Free Appetizer redeemed" },
    ],
    checkins: [
      { matchId: 1001, sponsorId: "sp-brewhouse-l5p", status: "checked_in" },
      { matchId: 1002, sponsorId: "sp-biergarten",    status: "checked_in" },
    ],
    coupons: [
      { offerId: "off-stats-app", offerTitle: "Free Appetizer", status: "unredeemed" as const },
    ],
  },
  {
    id: emailUserId("ashley.kim@yahoo.com"),
    email: "ashley.kim@yahoo.com",
    name: "Ashley Kim",
    avatar: "https://ui-avatars.com/api/?name=Ashley+Kim&background=BFA260&color=0a1f44",
    points: 6, exact: 1,
    txs: [
      { amount: 50, type: "earn_exact",        refId: "1002", label: "Germany vs Finland — exact!" },
      { amount: 10, type: "earn_result",       refId: "1001", label: "USA vs Senegal" },
      { amount: 25, type: "earn_rsvp_checkin", refId: "1002", label: "Der Biergarten check-in" },
      { amount: 500, type: "prize_payout",     refId: "1002", label: "Germany vs Finland — prize pool winner 🏆" },
      { amount: -80, type: "coupon_burn",      refId: "off-bh-pint", label: "Brewhouse First Pint redeemed" },
      { amount: -200, type: "coupon_burn",     refId: "off-sodo-shirt", label: "Brewhouse WC2026 T-Shirt redeemed" },
    ],
    checkins: [
      { matchId: 1002, sponsorId: "sp-biergarten", status: "checked_in" },
      { matchId: 1005, sponsorId: "sp-stats",      status: "rsvp" },
    ],
    coupons: [
      { offerId: "off-bg-liter", offerTitle: "Liter Beer Upgrade", status: "unredeemed" as const },
    ],
  },
  {
    id: emailUserId("dev.patel@outlook.com"),
    email: "dev.patel@outlook.com",
    name: "Dev Patel",
    avatar: "https://ui-avatars.com/api/?name=Dev+Patel&background=1a3a6b&color=ffffff",
    points: 4, exact: 0,
    txs: [
      { amount: 10, type: "earn_result",       refId: "1001", label: "USA vs Senegal" },
      { amount: 10, type: "earn_result",       refId: "1002", label: "Germany vs Finland" },
      { amount: 25, type: "earn_rsvp_checkin", refId: "1001", label: "Brewhouse L5P check-in" },
      { amount: 30, type: "earn_margin",       refId: "1003", label: "Canada vs Uzbekistan — margin" },
    ],
    checkins: [
      { matchId: 1001, sponsorId: "sp-brewhouse-l5p", status: "checked_in" },
      { matchId: 1004, sponsorId: "sp-brewhouse-sodo", status: "rsvp" },
    ],
    coupons: [],
  },
];

// ── FINISHED MATCH SCORES (to make results meaningful) ───────────────────────

const SCORES = [
  { id: 1001, homeScore: 2, awayScore: 0, status: "finished" }, // USA 2-0 Senegal
  { id: 1002, homeScore: 1, awayScore: 1, status: "finished" }, // Germany 1-1 Finland
  { id: 1003, homeScore: 3, awayScore: 1, status: "finished" }, // Canada 3-1 Uzbekistan
];

// Demo user predictions aligned with scores above
const PREDICTIONS = [
  // Marco: exact USA (2-0), margin Germany (2-2 vs 1-1), result Canada (2-0)
  { userId: emailUserId("marco.rossi@gmail.com"), matchId: 1001, homeScore: 2, awayScore: 0 },
  { userId: emailUserId("marco.rossi@gmail.com"), matchId: 1002, homeScore: 2, awayScore: 2 },
  { userId: emailUserId("marco.rossi@gmail.com"), matchId: 1003, homeScore: 2, awayScore: 0 },
  // Ashley: exact Germany (1-1), result USA (1-0), margin Canada (2-0 vs 3-1? no, different diff)
  // Let's give Ashley: USA 1-0 (result only), Germany 1-1 (exact), Canada 4-2 (margin 2 vs 2)
  { userId: emailUserId("ashley.kim@yahoo.com"), matchId: 1001, homeScore: 1, awayScore: 0 },
  { userId: emailUserId("ashley.kim@yahoo.com"), matchId: 1002, homeScore: 1, awayScore: 1 },
  // Dev: USA 2-1 (result), Germany 0-0 (result — draw is draw), Canada 2-0 (result)
  { userId: emailUserId("dev.patel@outlook.com"), matchId: 1001, homeScore: 2, awayScore: 1 },
  { userId: emailUserId("dev.patel@outlook.com"), matchId: 1002, homeScore: 0, awayScore: 0 },
  { userId: emailUserId("dev.patel@outlook.com"), matchId: 1003, homeScore: 3, awayScore: 1 },
];

// ── WRITE TO KV ───────────────────────────────────────────────────────────────

console.log("🌱 Seeding fan token data...\n");

// Sponsors
for (const s of SPONSORS) {
  await kv.set(["token_sponsor", s.id], s);
  console.log(`  ✅ Sponsor: ${s.name}`);
}

// Offers
for (const o of OFFERS) {
  await kv.set(["token_offer", o.id], o);
  console.log(`  ✅ Offer: ${o.title} (${o.tokenCost} tkn) → ${o.sponsorId}`);
}

// Sponsorships
for (const s of SPONSORSHIPS) {
  await kv.set(["match_sponsorship", s.matchId], s);
  console.log(`  ✅ Sponsorship: Match ${s.matchId} → ${s.sponsorName} (prize pool: ${s.prizePoolTokens})`);
}

// Match scores
for (const sc of SCORES) {
  const r = await kv.get<Record<string, unknown>>(["friendlies", sc.id]);
  if (r.value) {
    const updated = { ...r.value, homeScore: sc.homeScore, awayScore: sc.awayScore, status: sc.status };
    await kv.set(["friendlies", sc.id], updated);
    // Mark as token-settled so live settlement doesn't double-credit
    await kv.set(["token_settled_friendly", sc.id], true);
    console.log(`  ✅ Score set: Match ${sc.id} → ${sc.homeScore}-${sc.awayScore} (${sc.status})`);
  }
}

// Users, predictions, wallets, txs, checkins, coupons
for (const u of DEMO_USERS) {
  // User record
  await kv.set(["users", u.id], {
    id: u.id, email: u.email, name: u.name, avatar: u.avatar,
    points: u.points, exact: u.exact,
  });
  console.log(`\n  👤 User: ${u.name} (${u.email})`);

  // Wallet
  const balance = u.txs.reduce((sum, t) => sum + t.amount, 0);
  await kv.set(["token_wallet", u.id], { balance });
  console.log(`     💰 Wallet: ${balance} tokens`);

  // Transactions
  for (const tx of u.txs) {
    const txId = uuid();
    const ts = Date.now() - Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000);
    await kv.set(["token_tx", txId], { id: txId, userId: u.id, amount: tx.amount, type: tx.type, refId: tx.refId, ts });
  }
  console.log(`     📋 ${u.txs.length} transactions`);

  // Check-ins
  for (const cin of u.checkins) {
    await kv.set(["match_checkin", u.id, cin.matchId], {
      userId: u.id, matchId: cin.matchId, sponsorId: cin.sponsorId,
      status: cin.status, updatedAt: Date.now(),
    });
    console.log(`     📍 Check-in: Match ${cin.matchId} — ${cin.status}`);
  }

  // Coupons + voucher codes
  for (const c of u.coupons) {
    const couponId = uuid();
    const voucherCode = `FT-${c.offerId.slice(-4).toUpperCase()}-${u.id.slice(-4).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const coupon = {
      id: couponId, userId: u.id, offerId: c.offerId, offerTitle: c.offerTitle,
      voucherCode, status: c.status, createdAt: Date.now(),
    };
    await kv.set(["token_coupon_user", u.id, couponId], coupon);
    await kv.set(["token_coupon_code", voucherCode], coupon);
    console.log(`     🎟️  Voucher: ${c.offerTitle} → ${voucherCode}`);
  }
}

// Predictions (stored as friendly_preds so they appear on the leaderboard)
console.log("\n  🔮 Predictions:");
for (const p of PREDICTIONS) {
  await kv.set(["friendly_preds", p.userId, p.matchId], {
    userId: p.userId, matchId: p.matchId,
    homeScore: p.homeScore, awayScore: p.awayScore,
    timestamp: Date.now(),
  });
  const u = DEMO_USERS.find(u => u.id === p.userId);
  console.log(`     ${u?.name}: Match ${p.matchId} → ${p.homeScore}-${p.awayScore}`);
}

console.log("\n✅ Seed complete!\n");
console.log("Sponsors:      ", SPONSORS.length);
console.log("Offers:        ", OFFERS.length);
console.log("Sponsorships:  ", SPONSORSHIPS.length);
console.log("Demo users:    ", DEMO_USERS.length);
console.log("Matches scored:", SCORES.length);
console.log("Predictions:   ", PREDICTIONS.length);
console.log("\nPasscodes for check-in QR:");
for (const s of SPONSORSHIPS) {
  console.log(`  Match ${s.matchId}: ${s.passCode}`);
}

await kv.close();
