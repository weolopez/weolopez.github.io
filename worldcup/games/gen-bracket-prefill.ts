#!/usr/bin/env -S deno run -A
/**
 * gen-bracket-prefill.ts — generate games/bracket-prefill.json
 *
 * Computes the Round-of-32 field from the ACTUAL group table (results so far),
 * then simulates the whole knockout bracket using the FIFA strength tiers
 * (TEAM_TIER in data.ts — the same source the odds engine uses) to pick winners
 * and plausible scorelines. The output seeds bracket.html as editable defaults.
 *
 * Repeatable: re-run any time. Before Jun 27 it projects from partial standings;
 * after the group stage finishes it produces the real field. Deterministic — the
 * same standings always yield the same bracket.
 *
 *   WC_API=http://localhost:8081/worldcup/api deno run -A gen-bracket-prefill.ts
 */
import { TEAM_TIER } from "../data.ts";

const API = Deno.env.get("WC_API") || "http://localhost:8081/worldcup/api";
const tier = (id: string) => TEAM_TIER[id] ?? 5;          // lower = stronger

type Team = { id: string; name: string; flag: string };
interface Match { id: number; group?: string; home: Team; away: Team; homeScore?: number | null; awayScore?: number | null; status: string }
interface Row { team: Team; pts: number; gf: number; ga: number; played: number }

const matches: Match[] = await (await fetch(`${API}/matches`)).json();

// ── 1. Group standings from finished results ────────────────────────────────
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
// pts → goal diff → goals for → stronger tier → id (tier breaks ties so a 0-0 table seeds by strength)
const rank = (rows: Row[]) => [...rows].sort((x, y) =>
  y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || tier(x.team.id) - tier(y.team.id) || x.team.id.localeCompare(y.team.id));

const standings: Record<string, Row[]> = {};
for (const [g, map] of Object.entries(groups)) standings[g] = rank([...map.values()]);
const gkeys = Object.keys(standings).sort();

// ── 2. Qualifiers: top 2 of each group + 8 best third-place teams ────────────
const winners = gkeys.map(g => standings[g][0]);
const runners = gkeys.map(g => standings[g][1]);
const thirds  = rank(gkeys.map(g => standings[g][2]).filter(Boolean)).slice(0, 8);

// ── 3. Seed the 32 by strength (band: winners < runners < thirds, then tier) ─
const band = (r: Row, b: number) => b * 100 + tier(r.team.id) * 10 - r.pts;
const seeds: Team[] = [
  ...winners.map(r => ({ r, s: band(r, 0) })),
  ...runners.map(r => ({ r, s: band(r, 1) })),
  ...thirds.map(r  => ({ r, s: band(r, 2) })),
].sort((a, b) => a.s - b.s || a.r.team.id.localeCompare(b.r.team.id)).map(x => x.r.team);

// ── 4. Deterministic odds-based scoreline (mirrors _oddsFromTiers intent) ────
const hash = (n: number) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = (h * 2246822519) >>> 0; return (h ^ (h >>> 13)) >>> 0; };
function predScore(a: Team, b: Team, id: number): { a: number; b: number; adv: string | null } {
  const gap = tier(b.id) - tier(a.id);                   // >0 → a is stronger
  const r = hash(id);
  if (gap === 0) return { a: 1, b: 1, adv: (r & 1) ? "a" : "b" };  // even → draw, pens to a side
  const fav: "a" | "b" = gap > 0 ? "a" : "b";
  const ag = Math.abs(gap);
  const favG = 1 + (ag >= 2 ? 1 : 0) + (r % 3 === 0 ? 1 : 0);      // 1..3
  let undG = ag >= 3 ? 0 : (r % 4 === 0 ? 1 : 0);                  // mostly 0
  if (undG >= favG) undG = favG - 1;
  return fav === "a" ? { a: favG, b: undG, adv: null } : { a: undG, b: favG, adv: null };
}
const winSide = (p: { a: number; b: number; adv: string | null }) => p.a > p.b ? "a" : p.b > p.a ? "b" : p.adv!;

// ── 5. Simulate, assigning bracket.html match ids ────────────────────────────
//    R32 73-88 · R16 89-96 · QF 97-100 · SF 101-102 · Final 104 · 3rd 999
const pred: Record<number, { a: number; b: number; adv: string | null }> = {};
const r32: Record<number, { a: Team; b: Team }> = {};

const r32Winners: Team[] = [];
for (let i = 0; i < 16; i++) {
  const a = seeds[i], b = seeds[31 - i], id = 73 + i;    // 1v32, 2v31 … strength seeding
  r32[id] = { a, b };
  const p = predScore(a, b, id); pred[id] = p;
  r32Winners.push(winSide(p) === "a" ? a : b);
}
function playRound(teams: Team[], startId: number) {
  const W: Team[] = [], L: Team[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    const a = teams[i], b = teams[i + 1], id = startId + i / 2;
    const p = predScore(a, b, id); pred[id] = p;
    const w = winSide(p) === "a" ? a : b;
    W.push(w); L.push(w === a ? b : a);
  }
  return { W, L };
}
const r16 = playRound(r32Winners, 89);
const qf  = playRound(r16.W, 97);
const sf  = playRound(qf.W, 101);
pred[104] = predScore(sf.W[0], sf.W[1], 104);            // Final
pred[999] = predScore(sf.L[0], sf.L[1], 999);            // 3rd place
const champ = winSide(pred[104]) === "a" ? sf.W[0] : sf.W[1];

// ── 6. Write ─────────────────────────────────────────────────────────────────
const out = {
  generatedAt: new Date().toISOString(),
  basis: `${matches.filter(m => m.status === "finished").length}/72 group matches finished`,
  champion: champ.name,
  r32,
  pred,
};
await Deno.writeTextFile(new URL("./bracket-prefill.json", import.meta.url), JSON.stringify(out, null, 2));
console.log(`✅ wrote bracket-prefill.json — basis: ${out.basis}`);
console.log(`   model champion: ${champ.flag} ${champ.name}`);
