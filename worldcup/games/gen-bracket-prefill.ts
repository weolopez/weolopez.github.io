#!/usr/bin/env -S deno run -A
/**
 * gen-bracket-prefill.ts — generate games/bracket-prefill.json
 *
 * PRIMARY PATH (knockouts published): pulls the REAL Round-of-32 draw and live
 * betting odds from TheOddsAPI:
 *   - soccer_fifa_world_cup        (h2h)       → the 16 actual R32 matchups + market prices
 *   - soccer_fifa_world_cup_winner (outrights) → title odds used as team "power" for R16→Final
 * Each predicted scoreline is derived from the implied win probabilities, so the
 * defaults track the bookmakers rather than a static strength table.
 *
 * FALLBACK PATH (no token / odds unavailable, e.g. pre-knockout projection):
 * computes the R32 field from the group table and simulates with FIFA strength
 * tiers (TEAM_TIER in data.ts). Deterministic.
 *
 * Output seeds bracket.html as EDITABLE defaults — a user's own saved picks win;
 * only blank matches are filled. Repeatable; re-run any time.
 *
 *   ODDS_API_TOKEN=xxx WC_API=http://localhost:8081/worldcup/api deno run -A gen-bracket-prefill.ts
 */
import { TEAM_TIER } from "../data.ts";

const API = Deno.env.get("WC_API") || "http://localhost:8081/worldcup/api";
const ODDS_TOKEN = Deno.env.get("ODDS_API_TOKEN") || "";
const tier = (id: string) => TEAM_TIER[id] ?? 5;          // lower = stronger

type Team = { id: string; name: string; flag: string };
interface Match { id: number; group?: string; stage?: string; home: Team; away: Team; homeScore?: number | null; awayScore?: number | null; status: string }
interface Row { team: Team; pts: number; gf: number; ga: number; played: number }

const matches: Match[] = await (await fetch(`${API}/matches`)).json();

// Index every team we know about, by a normalized name (matches TheOddsAPI naming).
const norm = (s: string) => s.toLowerCase().replace(/[&.'`-]/g, " ").replace(/\s+/g, " ").trim();
const teamByName = new Map<string, Team>();
for (const m of matches) for (const t of [m.home, m.away]) teamByName.set(norm(t.name), t);
// A few aliases where the bookmaker spelling differs from ours.
const ALIAS: Record<string, string> = {
  "bosnia and herzegovina": "bosnia herzegovina",
  "korea republic": "south korea",
  "ir iran": "iran",
  "usmnt": "usa",
};
const lookupTeam = (name: string): Team | undefined =>
  teamByName.get(norm(name)) ?? teamByName.get(ALIAS[norm(name)] ?? "");

const hash = (n: number) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = (h * 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; };
type Pred = { a: number; b: number; adv: string | null };

// Map a favorite's two-way win probability (0.5..1) to a plausible knockout scoreline.
function scoreFromProb(pFav: number, favSide: "a" | "b", id: number): Pred {
  const r = hash(id);
  let favG: number, undG: number;
  if (pFav >= 0.80)      { favG = 3; undG = (r % 4 === 0) ? 1 : 0; }
  else if (pFav >= 0.68) { favG = (r % 2) ? 3 : 2; undG = (r % 3 === 0) ? 1 : 0; }
  else if (pFav >= 0.58) { favG = 2; undG = 1; }
  else                   { favG = 1; undG = (r % 2) ? 1 : 0; }   // tight → 1-0, or 1-1 to pens
  if (undG > favG) undG = favG;
  if (undG === favG) return favSide === "a" ? { a: favG, b: undG, adv: "a" } : { a: undG, b: favG, adv: "b" };
  return favSide === "a" ? { a: favG, b: undG, adv: null } : { a: undG, b: favG, adv: null };
}
const winSide = (p: Pred) => p.a > p.b ? "a" : p.b > p.a ? "b" : p.adv!;

// Official FIFA 2026 R32 match NUMBERS by matchup (from the printable bracket) — bracket
// position is set by match number, NOT kickoff order, so we must assign these explicitly.
const R32_NUM: Record<string, number> = {
  "south africa|canada": 73, "germany|paraguay": 74, "netherlands|morocco": 75, "brazil|japan": 76,
  "france|sweden": 77, "ivory coast|norway": 78, "mexico|ecuador": 79, "england|dr congo": 80,
  "usa|bosnia herzegovina": 81, "belgium|senegal": 82, "portugal|croatia": 83, "spain|austria": 84,
  "switzerland|algeria": 85, "argentina|cape verde": 86, "colombia|ghana": 87, "australia|egypt": 88,
};
const r32Num = (a: Team, b: Team): number =>
  R32_NUM[`${norm(a.name)}|${norm(b.name)}`] ?? R32_NUM[`${norm(b.name)}|${norm(a.name)}`] ?? 0;

// Official FIFA 2026 knockout adjacency by match number — slot → [feeder a, feeder b].
// NOT consecutive (M89 = W74 v W77, M90 = W73 v W75, …); verified vs the printable bracket.
const KO_FEEDS: Record<number, [number, number]> = {
  89: [74, 77], 90: [73, 75], 91: [76, 78], 92: [79, 80],
  93: [83, 84], 94: [81, 82], 95: [86, 88], 96: [85, 87],   // R16
  97: [89, 90], 98: [93, 94], 99: [91, 92], 100: [95, 96],  // QF
  101: [97, 98], 102: [99, 100],                            // SF
  104: [101, 102],                                          // Final
};

// ─────────────────────────────────────────────────────────────────────────────
// PRIMARY PATH — real draw + live odds
// ─────────────────────────────────────────────────────────────────────────────
async function buildFromOdds(): Promise<{ r32: Record<number, { a: Team; b: Team }>; pred: Record<number, Pred>; champ: Team; basis: string } | null> {
  if (!ODDS_TOKEN) return null;
  const base = "https://api.the-odds-api.com/v4/sports";
  let h2h: Array<{ commence_time: string; home_team: string; away_team: string; bookmakers: Array<{ markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }> }> }>;
  let outrights: Array<{ bookmakers: Array<{ markets: Array<{ outcomes: Array<{ name: string; price: number }> }> }> }>;
  try {
    const r1 = await fetch(`${base}/soccer_fifa_world_cup/odds?apiKey=${ODDS_TOKEN}&regions=us&markets=h2h&oddsFormat=decimal`);
    if (!r1.ok) { console.error(`h2h fetch ${r1.status}`); return null; }
    h2h = await r1.json();
    const r2 = await fetch(`${base}/soccer_fifa_world_cup_winner/odds?apiKey=${ODDS_TOKEN}&regions=us&markets=outrights&oddsFormat=decimal`);
    outrights = r2.ok ? await r2.json() : [];
  } catch (e) { console.error("odds fetch failed:", e); return null; }

  if (!Array.isArray(h2h)) h2h = [];

  // Team "power" = market-implied title probability (lower decimal = stronger).
  // Teams absent from the outright board sit below the weakest listed team, tier-ordered.
  const power = new Map<string, number>();
  let minListed = 1;
  for (const ev of outrights) for (const bk of ev.bookmakers) for (const mkt of bk.markets) for (const o of mkt.outcomes) {
    const t = lookupTeam(o.name); if (!t) continue;
    const p = 1 / o.price;
    power.set(t.id, Math.max(power.get(t.id) ?? 0, p));
    minListed = Math.min(minListed, p);
  }
  const powerOf = (t: Team) => power.get(t.id) ?? (minListed * 0.6) / tier(t.id);  // unlisted → weak, tier-scaled

  // h2h two-way favorite prob keyed by normalized matchup, for whichever R32 are still quoted.
  const probByMatch = new Map<string, { fav: "a" | "b"; pFav: number }>();
  for (const ev of h2h) {
    const tot: Record<string, number[]> = {};
    for (const bk of ev.bookmakers) for (const mkt of bk.markets) {
      if (mkt.key !== "h2h") continue;
      for (const o of mkt.outcomes) (tot[o.name] ||= []).push(1 / o.price);
    }
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const hp = avg(tot[ev.home_team] ?? [0.34]), ap = avg(tot[ev.away_team] ?? [0.34]);
    const fav: "a" | "b" = hp >= ap ? "a" : "b";
    const pFav = Math.max(hp, ap) / (hp + ap);
    probByMatch.set(`${norm(ev.home_team)}|${norm(ev.away_team)}`, { fav, pFav });
    probByMatch.set(`${norm(ev.away_team)}|${norm(ev.home_team)}`, { fav: fav === "a" ? "b" : "a", pFav });
  }

  // R32 field = the seeded match records (authoritative; robust once matches start finishing
  // and drop out of the live feed). Falls back to the tier projection only pre-seeding.
  const r32matches = matches.filter(m => m.stage === "R32").sort((a, b) => a.id - b.id);
  if (r32matches.length < 16) return null;

  const r32: Record<number, { a: Team; b: Team }> = {};
  const pred: Record<number, Pred> = {};
  const winnerBySlot: Record<number, Team> = {};
  const loserBySlot: Record<number, Team> = {};
  for (const m of r32matches) {
    const a = m.home, b = m.away;
    const id = r32Num(a, b) || m.id;                  // official bracket position
    r32[id] = { a, b };
    const ph = probByMatch.get(`${norm(a.name)}|${norm(b.name)}`);
    let favSide: "a" | "b", pFav: number;
    if (ph) { favSide = ph.fav; pFav = ph.pFav; }
    else { const pa = powerOf(a), pb = powerOf(b); favSide = pa >= pb ? "a" : "b"; pFav = Math.max(pa, pb) / (pa + pb); }
    const p = scoreFromProb(pFav, favSide, id);
    pred[id] = p;
    winnerBySlot[id] = winSide(p) === "a" ? a : b;
    loserBySlot[id]  = winSide(p) === "a" ? b : a;
  }

  // Downstream rounds follow the real bracket adjacency (KO_FEEDS); no h2h yet → two-way prob
  // from market title power.
  const powerProb = (a: Team, b: Team, id: number): Pred => {
    const favSide: "a" | "b" = powerOf(a) >= powerOf(b) ? "a" : "b";
    return scoreFromProb(Math.max(powerOf(a), powerOf(b)) / (powerOf(a) + powerOf(b)), favSide, id);
  };
  for (const slot of Object.keys(KO_FEEDS).map(Number).sort((x, y) => x - y)) {
    const [fa, fb] = KO_FEEDS[slot];
    const a = winnerBySlot[fa], b = winnerBySlot[fb];
    const p = powerProb(a, b, slot);
    pred[slot] = p;
    winnerBySlot[slot] = winSide(p) === "a" ? a : b;
    loserBySlot[slot]  = winSide(p) === "a" ? b : a;
  }
  pred[999] = powerProb(loserBySlot[101], loserBySlot[102], 999);   // 3rd place = SF losers
  const champ = winnerBySlot[104];
  return { r32, pred, champ, basis: `records + live odds — ${r32matches.length} R32 from DB, ${probByMatch.size / 2} quoted, ${power.size} teams priced` };
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK PATH — group table + strength tiers (deterministic, offline)
// ─────────────────────────────────────────────────────────────────────────────
function buildFromTiers(): { r32: Record<number, { a: Team; b: Team }>; pred: Record<number, Pred>; champ: Team; basis: string } {
  const groups: Record<string, Map<string, Row>> = {};
  for (const m of matches) {
    if (!m.group) continue;
    const g = (groups[m.group] ||= new Map());
    for (const t of [m.home, m.away]) if (!g.has(t.id)) g.set(t.id, { team: t, pts: 0, gf: 0, ga: 0, played: 0 });
    if (m.status === "finished" && m.homeScore != null && m.awayScore != null) {
      const h = g.get(m.home.id)!, a = g.get(m.away.id)!;
      h.gf += m.homeScore; h.ga += m.awayScore; h.played++;
      a.gf += m.awayScore; a.ga += m.homeScore; a.played++;
      if (m.homeScore > m.awayScore) h.pts += 3;
      else if (m.homeScore < m.awayScore) a.pts += 3;
      else { h.pts++; a.pts++; }
    }
  }
  const rank = (rows: Row[]) => [...rows].sort((x, y) =>
    y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || tier(x.team.id) - tier(y.team.id) || x.team.id.localeCompare(y.team.id));
  const standings: Record<string, Row[]> = {};
  for (const [g, map] of Object.entries(groups)) standings[g] = rank([...map.values()]);
  const gkeys = Object.keys(standings).sort();
  const winners = gkeys.map(g => standings[g][0]);
  const runners = gkeys.map(g => standings[g][1]);
  const thirds = rank(gkeys.map(g => standings[g][2]).filter(Boolean)).slice(0, 8);
  const band = (r: Row, b: number) => b * 100 + tier(r.team.id) * 10 - r.pts;
  const seeds: Team[] = [
    ...winners.map(r => ({ r, s: band(r, 0) })),
    ...runners.map(r => ({ r, s: band(r, 1) })),
    ...thirds.map(r => ({ r, s: band(r, 2) })),
  ].sort((a, b) => a.s - b.s || a.r.team.id.localeCompare(b.r.team.id)).map(x => x.r.team);

  const predScore = (a: Team, b: Team, id: number): Pred => {
    const gap = tier(b.id) - tier(a.id), r = hash(id);
    if (gap === 0) return { a: 1, b: 1, adv: (r & 1) ? "a" : "b" };
    const fav: "a" | "b" = gap > 0 ? "a" : "b", ag = Math.abs(gap);
    const favG = 1 + (ag >= 2 ? 1 : 0) + (r % 3 === 0 ? 1 : 0);
    let undG = ag >= 3 ? 0 : (r % 4 === 0 ? 1 : 0);
    if (undG >= favG) undG = favG - 1;
    return fav === "a" ? { a: favG, b: undG, adv: null } : { a: undG, b: favG, adv: null };
  };
  const pred: Record<number, Pred> = {};
  const r32: Record<number, { a: Team; b: Team }> = {};
  const winnerBySlot: Record<number, Team> = {};
  const loserBySlot: Record<number, Team> = {};
  // Once the R32 is seeded as records, use that real field even on the tier path, so a
  // token-less run can never clobber the real draw with a group-seeded projection.
  const r32recs = matches.filter(m => m.stage === "R32").sort((a, b) => a.id - b.id);
  const haveR32 = r32recs.length === 16;
  for (let i = 0; i < 16; i++) {
    const a = haveR32 ? r32recs[i].home : seeds[i];
    const b = haveR32 ? r32recs[i].away : seeds[31 - i];
    const id = haveR32 ? (r32Num(a, b) || (73 + i)) : (73 + i);
    r32[id] = { a, b };
    const p = predScore(a, b, id); pred[id] = p;
    winnerBySlot[id] = winSide(p) === "a" ? a : b;
    loserBySlot[id]  = winSide(p) === "a" ? b : a;
  }
  for (const slot of Object.keys(KO_FEEDS).map(Number).sort((x, y) => x - y)) {
    const [fa, fb] = KO_FEEDS[slot];
    const a = winnerBySlot[fa], b = winnerBySlot[fb];
    const p = predScore(a, b, slot); pred[slot] = p;
    winnerBySlot[slot] = winSide(p) === "a" ? a : b;
    loserBySlot[slot]  = winSide(p) === "a" ? b : a;
  }
  pred[999] = predScore(loserBySlot[101], loserBySlot[102], 999);   // 3rd place = SF losers
  const champ = winnerBySlot[104];
  const done = matches.filter(m => m.status === "finished").length;
  return { r32, pred, champ, basis: `tier model — ${done}/72 group matches finished` };
}

// ─────────────────────────────────────────────────────────────────────────────
const built = (await buildFromOdds()) ?? buildFromTiers();
const out = {
  generatedAt: new Date().toISOString(),
  basis: built.basis,
  champion: built.champ.name,
  r32: built.r32,
  pred: built.pred,
};
await Deno.writeTextFile(new URL("./bracket-prefill.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`✅ wrote bracket-prefill.json — basis: ${out.basis}`);
console.log(`   model champion: ${built.champ.flag} ${built.champ.name}`);
