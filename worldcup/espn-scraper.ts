// Fetches live WC 2026 scores from ESPN's public undocumented scoreboard API.
// No auth token required. Poll at most every 60s.

const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

// ESPN abbreviation → our internal team ID (where they differ)
const ESPN_TO_OURS: Record<string, string> = {
    SKR:    "KOR",   // South Korea
    URG:    "URU",   // Uruguay
    SAF:    "RSA",   // South Africa
    CRC:    "CRC",
    USMNT:  "USA",
    GBR:    "ENG",   // GB sometimes used for England
    NGA:    "NGA",
    CMR:    "CMR",
    SRB:    "SRB",
    POL:    "POL",
    DEN:    "DEN",
    WAL:    "WAL",
    IRN:    "IRN",
    SEN:    "SEN",
    TUN:    "TUN",
    MLI:    "MLI",
    ALG:    "ALG",
    ZIM:    "ZIM",
    UGA:    "UGA",
    COD:    "COD",
};

export interface ESPNMatch {
    espnId:    string;
    homeAbbr:  string;
    awayAbbr:  string;
    homeName:  string;
    awayName:  string;
    homeScore: number;
    awayScore: number;
    status:    "scheduled" | "live" | "finished";
    clock:     string;
}

export async function fetchESPNMatches(): Promise<ESPNMatch[]> {
    const res = await fetch(ESPN_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WC2026FanHub/1.0)" },
    });
    if (!res.ok) throw new Error(`ESPN API ${res.status}`);
    const data = await res.json() as { events?: unknown[] };
    if (!data.events?.length) return [];

    const out: ESPNMatch[] = [];
    for (const ev of data.events as Record<string, unknown>[]) {
        const comp = (ev.competitions as Record<string, unknown>[])?.[0];
        if (!comp) continue;
        const competitors = comp.competitors as Record<string, unknown>[];
        if (!competitors || competitors.length < 2) continue;

        const home = competitors.find(c => c.homeAway === "home");
        const away = competitors.find(c => c.homeAway === "away");
        if (!home || !away) continue;

        const homeTeam = home.team as Record<string, string>;
        const awayTeam = away.team as Record<string, string>;
        const espnHome = (homeTeam.abbreviation ?? "").toUpperCase();
        const espnAway = (awayTeam.abbreviation ?? "").toUpperCase();

        const statusObj   = ev.status as Record<string, unknown>;
        const statusType  = statusObj?.type as Record<string, unknown>;
        const state       = String(statusType?.state ?? "pre");
        const completed   = Boolean(statusType?.completed);

        let status: ESPNMatch["status"] = "scheduled";
        if (completed || state === "post") status = "finished";
        else if (state === "in")           status = "live";

        out.push({
            espnId:    String(ev.id),
            homeAbbr:  ESPN_TO_OURS[espnHome] ?? espnHome,
            awayAbbr:  ESPN_TO_OURS[espnAway] ?? espnAway,
            homeName:  homeTeam.displayName ?? espnHome,
            awayName:  awayTeam.displayName ?? espnAway,
            homeScore: parseInt(String(home.score ?? "0")) || 0,
            awayScore: parseInt(String(away.score ?? "0")) || 0,
            status,
            clock:     String(statusObj.displayClock ?? ""),
        });
    }
    return out;
}
