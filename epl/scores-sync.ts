/// <reference lib="deno.unstable" />
// Fetches EPL fixtures/scores from football-data.org into our Deno KV store.
// Requires env var FOOTBALL_DATA_TOKEN (free registration at football-data.org).
// Same token/tier is already used by ../worldcup/scores-sync.ts.

const TOKEN = Deno.env.get("FOOTBALL_DATA_TOKEN") ?? "";
const BASE  = "https://api.football-data.org/v4";
const COMP  = "PL";

// Where football-data.org TLAs differ from our internal team IDs (data.ts)
const FD_TO_OURS: Record<string, string> = {};

export interface FDMatch {
    id: number;
    utcDate: string;
    status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | SUSPENDED | CANCELLED | AWARDED
    matchday: number;
    venue?: string;
    homeTeam: { name: string; shortName: string; tla: string };
    awayTeam: { name: string; shortName: string; tla: string };
    score: {
        fullTime: { home: number | null; away: number | null };
        halfTime: { home: number | null; away: number | null };
    };
}

export function mapStatus(fdStatus: string): "scheduled" | "live" | "finished" {
    switch (fdStatus) {
        case "IN_PLAY":
        case "PAUSED":
            return "live";
        case "FINISHED":
        case "AWARDED":
            return "finished";
        default:
            return "scheduled";
    }
}

// Translate football-data TLA → our internal team ID
export function ourId(fdTla: string): string {
    return FD_TO_OURS[fdTla] ?? fdTla;
}

async function fdFetch(path: string): Promise<unknown> {
    if (!TOKEN) throw new Error("FOOTBALL_DATA_TOKEN not set");
    const res = await fetch(`${BASE}${path}`, {
        headers: { "X-Auth-Token": TOKEN },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`football-data.org ${res.status}: ${body}`);
    }
    return res.json();
}

// Fetch the full season's fixtures (scheduled, live, finished)
export async function fetchAllPLMatches(): Promise<FDMatch[]> {
    const data = await fdFetch(`/competitions/${COMP}/matches`) as { matches?: FDMatch[] };
    return data.matches ?? [];
}

// Fetch only currently live matches (fast, cheap on rate-limit)
export async function fetchLivePLMatches(): Promise<FDMatch[]> {
    const data = await fdFetch(`/competitions/${COMP}/matches?status=LIVE`) as { matches?: FDMatch[] };
    return data.matches ?? [];
}

export function hasToken(): boolean {
    return TOKEN.length > 0;
}

// football-data.org match objects carry no venue field on our plan — pull real
// stadium names from the teams endpoint instead. Cached for the process lifetime
// (grounds essentially never change mid-season).
let _venueCache: Record<string, string> | null = null;

export async function fetchTeamVenues(): Promise<Record<string, string>> {
    if (_venueCache) return _venueCache;
    const data = await fdFetch(`/competitions/${COMP}/teams`) as { teams?: { tla: string; venue?: string }[] };
    const map: Record<string, string> = {};
    for (const t of data.teams ?? []) if (t.venue) map[ourId(t.tla)] = t.venue;
    _venueCache = map;
    return map;
}
