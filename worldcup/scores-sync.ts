/// <reference lib="deno.unstable" />
// Syncs live and final match scores from football-data.org into our Deno KV store.
// Requires env var FOOTBALL_DATA_TOKEN (free registration at football-data.org).

const TOKEN = Deno.env.get("FOOTBALL_DATA_TOKEN") ?? "";
const BASE  = "https://api.football-data.org/v4";
const COMP  = "WC";

// Where football-data.org TLAs differ from our internal team IDs
const FD_TO_OURS: Record<string, string> = {
    URY: "URU",  // Uruguay
};

export interface FDMatch {
    id: number;
    utcDate: string;
    status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | CANCELLED | AWARDED
    matchday: number;
    homeTeam: { name: string; shortName: string; tla: string };
    awayTeam: { name: string; shortName: string; tla: string };
    score: {
        fullTime: { home: number | null; away: number | null };
        halfTime: { home: number | null; away: number | null };
    };
}

export function mapStatus(fdStatus: string): string {
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

// Fetch all WC matches (scheduled, live, finished)
export async function fetchAllWCMatches(): Promise<FDMatch[]> {
    const data = await fdFetch(`/competitions/${COMP}/matches`) as { matches?: FDMatch[] };
    return data.matches ?? [];
}

// Fetch only currently live matches (fast, cheap on rate-limit)
export async function fetchLiveWCMatches(): Promise<FDMatch[]> {
    const data = await fdFetch(`/competitions/${COMP}/matches?status=LIVE`) as { matches?: FDMatch[] };
    return data.matches ?? [];
}

// Fetch matches finished on or after a given date (yyyy-MM-dd)
export async function fetchFinishedSince(dateFrom: string): Promise<FDMatch[]> {
    const data = await fdFetch(`/competitions/${COMP}/matches?status=FINISHED&dateFrom=${dateFrom}`) as { matches?: FDMatch[] };
    return data.matches ?? [];
}

export function hasToken(): boolean {
    return TOKEN.length > 0;
}
