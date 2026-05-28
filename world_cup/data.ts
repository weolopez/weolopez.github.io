// ==========================================
// STATIC DATA CONTENT
// ==========================================

export interface Team {
    id: string;
    name: string;
    flag: string;
}

export interface Match {
    id: number;
    matchday: number;
    date: string;
    group: string;
    stage?: string;   // "group" (default) | "R32" | "R16" | "QF" | "SF" | "TPO" | "FIN"
    slot1?: string;   // e.g. "1A" — origin label before teams confirmed
    slot2?: string;
    home: Team;
    away: Team;
    venue: string;
    homeScore?: number;
    awayScore?: number;
    status: "scheduled" | "live" | "finished";
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar: string;
    points: number;
    exact: number;
    persona?: string;
    streak?: number;
    bestStreak?: number;
    badges?: string[];
    lastVisit?: number;
}

// FIFA strength tiers for odds fallback (1 = strongest)
// Used when TheOddsAPI data is unavailable
export const TEAM_TIER: Record<string, number> = {
    BRA:1, ARG:1, FRA:1, ENG:1, ESP:1, GER:1, POR:1,
    NED:2, BEL:2, URU:2, COL:2, USA:2, MEX:2, JPN:2, MAR:2, SEN:2,
    CRO:3, SUI:3, AUS:3, DEN:3, TUR:3, ECU:3, NOR:3, SWE:3, CIV:3, KOR:3,
    CAN:4, SCO:4, GHA:4, IRN:4, QAT:4, EGY:4, ALG:4, AUT:4, CPV:4, NZL:4,
    IRQ:4, JOR:4, UZB:4, COD:4, PAN:4,
    RSA:5, CZE:5, BIH:5, HAI:5, PAR:5, CUW:5, KSA:5, TUN:5,
};

export interface Prediction {
    userId: string;
    matchId: number;
    homeScore: number;
    awayScore: number;
    timestamp: number;
}

export interface League {
    id: string;
    name: string;
    code: string;
    ownerId: string;
    members: string[];
}

// VENUES
export const VENUES = {
    MEX_AZT: "Estadio Azteca, Mexico City",
    MEX_AKR: "Estadio Akron, Guadalajara",
    MEX_BBV: "Estadio BBVA, Monterrey",
    CAN_BMO: "BMO Field, Toronto",
    CAN_BCP: "BC Place, Vancouver",
    USA_NJ:  "MetLife Stadium, New Jersey",
    USA_LA:  "SoFi Stadium, Los Angeles",
    USA_DAL: "AT&T Stadium, Dallas",
    USA_MIA: "Hard Rock Stadium, Miami",
    USA_ATL: "Mercedes-Benz Stadium, Atlanta",
    USA_SF:  "Levi's Stadium, San Francisco",
    USA_SEA: "Lumen Field, Seattle",
    USA_KC:  "Arrowhead Stadium, Kansas City",
    USA_BOS: "Gillette Stadium, Boston",
    USA_PHI: "Lincoln Financial Field, Philadelphia",
    USA_HOU: "NRG Stadium, Houston",
};

// TEAMS — all 48 qualified nations (official FIFA WC 2026 draw)
export const TEAMS: Record<string, Team> = {
    // Hosts
    MEX: { id: 'MEX', name: 'Mexico',              flag: '🇲🇽' },
    CAN: { id: 'CAN', name: 'Canada',               flag: '🇨🇦' },
    USA: { id: 'USA', name: 'USA',                  flag: '🇺🇸' },
    // South America
    ARG: { id: 'ARG', name: 'Argentina',            flag: '🇦🇷' },
    BRA: { id: 'BRA', name: 'Brazil',               flag: '🇧🇷' },
    URU: { id: 'URU', name: 'Uruguay',              flag: '🇺🇾' },
    COL: { id: 'COL', name: 'Colombia',             flag: '🇨🇴' },
    ECU: { id: 'ECU', name: 'Ecuador',              flag: '🇪🇨' },
    PAR: { id: 'PAR', name: 'Paraguay',             flag: '🇵🇾' },
    // Europe
    FRA: { id: 'FRA', name: 'France',               flag: '🇫🇷' },
    ENG: { id: 'ENG', name: 'England',              flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    ESP: { id: 'ESP', name: 'Spain',                flag: '🇪🇸' },
    GER: { id: 'GER', name: 'Germany',              flag: '🇩🇪' },
    POR: { id: 'POR', name: 'Portugal',             flag: '🇵🇹' },
    NED: { id: 'NED', name: 'Netherlands',          flag: '🇳🇱' },
    BEL: { id: 'BEL', name: 'Belgium',              flag: '🇧🇪' },
    CRO: { id: 'CRO', name: 'Croatia',              flag: '🇭🇷' },
    SUI: { id: 'SUI', name: 'Switzerland',          flag: '🇨🇭' },
    AUT: { id: 'AUT', name: 'Austria',              flag: '🇦🇹' },
    TUR: { id: 'TUR', name: 'Turkey',               flag: '🇹🇷' },
    SCO: { id: 'SCO', name: 'Scotland',             flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    SWE: { id: 'SWE', name: 'Sweden',               flag: '🇸🇪' },
    NOR: { id: 'NOR', name: 'Norway',               flag: '🇳🇴' },
    CZE: { id: 'CZE', name: 'Czech Republic',       flag: '🇨🇿' },
    BIH: { id: 'BIH', name: 'Bosnia-Herzegovina',   flag: '🇧🇦' },
    // Africa
    MAR: { id: 'MAR', name: 'Morocco',              flag: '🇲🇦' },
    SEN: { id: 'SEN', name: 'Senegal',              flag: '🇸🇳' },
    EGY: { id: 'EGY', name: 'Egypt',                flag: '🇪🇬' },
    CIV: { id: 'CIV', name: 'Ivory Coast',          flag: '🇨🇮' },
    GHA: { id: 'GHA', name: 'Ghana',                flag: '🇬🇭' },
    TUN: { id: 'TUN', name: 'Tunisia',              flag: '🇹🇳' },
    RSA: { id: 'RSA', name: 'South Africa',         flag: '🇿🇦' },
    ALG: { id: 'ALG', name: 'Algeria',              flag: '🇩🇿' },
    COD: { id: 'COD', name: 'DR Congo',             flag: '🇨🇩' },
    // Asia
    JPN: { id: 'JPN', name: 'Japan',                flag: '🇯🇵' },
    KOR: { id: 'KOR', name: 'South Korea',          flag: '🇰🇷' },
    AUS: { id: 'AUS', name: 'Australia',            flag: '🇦🇺' },
    IRN: { id: 'IRN', name: 'Iran',                 flag: '🇮🇷' },
    KSA: { id: 'KSA', name: 'Saudi Arabia',         flag: '🇸🇦' },
    IRQ: { id: 'IRQ', name: 'Iraq',                 flag: '🇮🇶' },
    QAT: { id: 'QAT', name: 'Qatar',                flag: '🇶🇦' },
    UZB: { id: 'UZB', name: 'Uzbekistan',           flag: '🇺🇿' },
    JOR: { id: 'JOR', name: 'Jordan',               flag: '🇯🇴' },
    // CONCACAF (non-hosts)
    PAN: { id: 'PAN', name: 'Panama',               flag: '🇵🇦' },
    HAI: { id: 'HAI', name: 'Haiti',                flag: '🇭🇹' },
    // Caribbean / Other
    CUW: { id: 'CUW', name: 'Curaçao',             flag: '🇨🇼' },
    CPV: { id: 'CPV', name: 'Cape Verde',           flag: '🇨🇻' },
    NZL: { id: 'NZL', name: 'New Zealand',          flag: '🇳🇿' },
    // Friendly-only teams (not in WC 48)
    FIN: { id: 'FIN', name: 'Finland',              flag: '🇫🇮' },
    ISL: { id: 'ISL', name: 'Iceland',              flag: '🇮🇸' },
    IRL: { id: 'IRL', name: 'Ireland',              flag: '🇮🇪' },
};

// MATCHES — full group stage (12 groups × 6 matches = 72 total)
// Official groups from FIFA WC 2026 draw (December 5, 2025)
// Times stored as ET (Eastern Time, UTC-4 during tournament)
// MD3 matches within each group kick off simultaneously
export const MATCHES: Match[] = [
    // ── GROUP A: Mexico, South Africa, South Korea, Czech Republic ──
    { id:  1, matchday: 1, date: "2026-06-11T15:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.RSA, venue: VENUES.MEX_AZT, status: "scheduled" },
    { id:  2, matchday: 1, date: "2026-06-11T22:00:00", group: "A", home: TEAMS.KOR, away: TEAMS.CZE, venue: VENUES.MEX_AKR, status: "scheduled" },
    { id:  3, matchday: 2, date: "2026-06-18T12:00:00", group: "A", home: TEAMS.CZE, away: TEAMS.RSA, venue: VENUES.USA_ATL, status: "scheduled" },
    { id:  4, matchday: 2, date: "2026-06-18T23:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.KOR, venue: VENUES.MEX_AKR, status: "scheduled" },
    { id:  5, matchday: 3, date: "2026-06-24T21:00:00", group: "A", home: TEAMS.CZE, away: TEAMS.MEX, venue: VENUES.MEX_AZT, status: "scheduled" },
    { id:  6, matchday: 3, date: "2026-06-24T21:00:00", group: "A", home: TEAMS.RSA, away: TEAMS.KOR, venue: VENUES.MEX_BBV, status: "scheduled" },
    // ── GROUP B: Canada, Bosnia-Herzegovina, Qatar, Switzerland ──
    { id:  7, matchday: 1, date: "2026-06-12T15:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.BIH, venue: VENUES.CAN_BMO, status: "scheduled" },
    { id:  8, matchday: 1, date: "2026-06-13T15:00:00", group: "B", home: TEAMS.QAT, away: TEAMS.SUI, venue: VENUES.USA_SF,  status: "scheduled" },
    { id:  9, matchday: 2, date: "2026-06-18T15:00:00", group: "B", home: TEAMS.SUI, away: TEAMS.BIH, venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 10, matchday: 2, date: "2026-06-18T18:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.QAT, venue: VENUES.CAN_BCP, status: "scheduled" },
    { id: 11, matchday: 3, date: "2026-06-24T15:00:00", group: "B", home: TEAMS.SUI, away: TEAMS.CAN, venue: VENUES.CAN_BCP, status: "scheduled" },
    { id: 12, matchday: 3, date: "2026-06-24T15:00:00", group: "B", home: TEAMS.BIH, away: TEAMS.QAT, venue: VENUES.USA_SEA, status: "scheduled" },
    // ── GROUP C: Brazil, Morocco, Haiti, Scotland ──
    { id: 13, matchday: 1, date: "2026-06-13T18:00:00", group: "C", home: TEAMS.BRA, away: TEAMS.MAR, venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 14, matchday: 1, date: "2026-06-13T21:00:00", group: "C", home: TEAMS.HAI, away: TEAMS.SCO, venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 15, matchday: 2, date: "2026-06-19T18:00:00", group: "C", home: TEAMS.SCO, away: TEAMS.MAR, venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 16, matchday: 2, date: "2026-06-19T21:00:00", group: "C", home: TEAMS.BRA, away: TEAMS.HAI, venue: VENUES.USA_PHI, status: "scheduled" },
    { id: 17, matchday: 3, date: "2026-06-24T18:00:00", group: "C", home: TEAMS.SCO, away: TEAMS.BRA, venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 18, matchday: 3, date: "2026-06-24T18:00:00", group: "C", home: TEAMS.MAR, away: TEAMS.HAI, venue: VENUES.USA_ATL, status: "scheduled" },
    // ── GROUP D: USA, Paraguay, Australia, Turkey ──
    { id: 19, matchday: 1, date: "2026-06-12T21:00:00", group: "D", home: TEAMS.USA, away: TEAMS.PAR, venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 20, matchday: 1, date: "2026-06-14T00:00:00", group: "D", home: TEAMS.AUS, away: TEAMS.TUR, venue: VENUES.CAN_BCP, status: "scheduled" },
    { id: 21, matchday: 2, date: "2026-06-19T15:00:00", group: "D", home: TEAMS.USA, away: TEAMS.AUS, venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 22, matchday: 2, date: "2026-06-20T00:00:00", group: "D", home: TEAMS.TUR, away: TEAMS.PAR, venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 23, matchday: 3, date: "2026-06-25T22:00:00", group: "D", home: TEAMS.TUR, away: TEAMS.USA, venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 24, matchday: 3, date: "2026-06-25T22:00:00", group: "D", home: TEAMS.PAR, away: TEAMS.AUS, venue: VENUES.USA_SF,  status: "scheduled" },
    // ── GROUP E: Germany, Curaçao, Ivory Coast, Ecuador ──
    { id: 25, matchday: 1, date: "2026-06-14T13:00:00", group: "E", home: TEAMS.GER, away: TEAMS.CUW, venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 26, matchday: 1, date: "2026-06-14T19:00:00", group: "E", home: TEAMS.CIV, away: TEAMS.ECU, venue: VENUES.USA_PHI, status: "scheduled" },
    { id: 27, matchday: 2, date: "2026-06-20T16:00:00", group: "E", home: TEAMS.GER, away: TEAMS.CIV, venue: VENUES.CAN_BMO, status: "scheduled" },
    { id: 28, matchday: 2, date: "2026-06-20T20:00:00", group: "E", home: TEAMS.ECU, away: TEAMS.CUW, venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 29, matchday: 3, date: "2026-06-25T16:00:00", group: "E", home: TEAMS.ECU, away: TEAMS.GER, venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 30, matchday: 3, date: "2026-06-25T16:00:00", group: "E", home: TEAMS.CUW, away: TEAMS.CIV, venue: VENUES.USA_PHI, status: "scheduled" },
    // ── GROUP F: Netherlands, Japan, Sweden, Tunisia ──
    { id: 31, matchday: 1, date: "2026-06-14T16:00:00", group: "F", home: TEAMS.NED, away: TEAMS.JPN, venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 32, matchday: 1, date: "2026-06-14T22:00:00", group: "F", home: TEAMS.SWE, away: TEAMS.TUN, venue: VENUES.MEX_BBV, status: "scheduled" },
    { id: 33, matchday: 2, date: "2026-06-20T13:00:00", group: "F", home: TEAMS.NED, away: TEAMS.SWE, venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 34, matchday: 2, date: "2026-06-21T00:00:00", group: "F", home: TEAMS.TUN, away: TEAMS.JPN, venue: VENUES.MEX_AKR, status: "scheduled" },
    { id: 35, matchday: 3, date: "2026-06-25T19:00:00", group: "F", home: TEAMS.JPN, away: TEAMS.SWE, venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 36, matchday: 3, date: "2026-06-25T19:00:00", group: "F", home: TEAMS.TUN, away: TEAMS.NED, venue: VENUES.USA_KC,  status: "scheduled" },
    // ── GROUP G: Belgium, Egypt, Iran, New Zealand ──
    { id: 37, matchday: 1, date: "2026-06-15T18:00:00", group: "G", home: TEAMS.BEL, away: TEAMS.EGY, venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 38, matchday: 1, date: "2026-06-16T00:00:00", group: "G", home: TEAMS.IRN, away: TEAMS.NZL, venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 39, matchday: 2, date: "2026-06-21T15:00:00", group: "G", home: TEAMS.BEL, away: TEAMS.IRN, venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 40, matchday: 2, date: "2026-06-21T21:00:00", group: "G", home: TEAMS.NZL, away: TEAMS.EGY, venue: VENUES.CAN_BCP, status: "scheduled" },
    { id: 41, matchday: 3, date: "2026-06-26T23:00:00", group: "G", home: TEAMS.EGY, away: TEAMS.IRN, venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 42, matchday: 3, date: "2026-06-26T23:00:00", group: "G", home: TEAMS.NZL, away: TEAMS.BEL, venue: VENUES.CAN_BCP, status: "scheduled" },
    // ── GROUP H: Spain, Cape Verde, Saudi Arabia, Uruguay ──
    { id: 43, matchday: 1, date: "2026-06-15T13:00:00", group: "H", home: TEAMS.ESP, away: TEAMS.CPV, venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 44, matchday: 1, date: "2026-06-15T18:00:00", group: "H", home: TEAMS.KSA, away: TEAMS.URU, venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 45, matchday: 2, date: "2026-06-21T12:00:00", group: "H", home: TEAMS.ESP, away: TEAMS.KSA, venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 46, matchday: 2, date: "2026-06-21T18:00:00", group: "H", home: TEAMS.URU, away: TEAMS.CPV, venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 47, matchday: 3, date: "2026-06-26T20:00:00", group: "H", home: TEAMS.CPV, away: TEAMS.KSA, venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 48, matchday: 3, date: "2026-06-26T20:00:00", group: "H", home: TEAMS.URU, away: TEAMS.ESP, venue: VENUES.MEX_AKR, status: "scheduled" },
    // ── GROUP I: France, Senegal, Iraq, Norway ──
    { id: 49, matchday: 1, date: "2026-06-16T15:00:00", group: "I", home: TEAMS.FRA, away: TEAMS.SEN, venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 50, matchday: 1, date: "2026-06-16T18:00:00", group: "I", home: TEAMS.IRQ, away: TEAMS.NOR, venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 51, matchday: 2, date: "2026-06-22T17:00:00", group: "I", home: TEAMS.FRA, away: TEAMS.IRQ, venue: VENUES.USA_PHI, status: "scheduled" },
    { id: 52, matchday: 2, date: "2026-06-22T20:00:00", group: "I", home: TEAMS.NOR, away: TEAMS.SEN, venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 53, matchday: 3, date: "2026-06-26T15:00:00", group: "I", home: TEAMS.NOR, away: TEAMS.FRA, venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 54, matchday: 3, date: "2026-06-26T15:00:00", group: "I", home: TEAMS.SEN, away: TEAMS.IRQ, venue: VENUES.CAN_BMO, status: "scheduled" },
    // ── GROUP J: Argentina, Algeria, Austria, Jordan ──
    { id: 55, matchday: 1, date: "2026-06-16T21:00:00", group: "J", home: TEAMS.ARG, away: TEAMS.ALG, venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 56, matchday: 1, date: "2026-06-17T00:00:00", group: "J", home: TEAMS.AUT, away: TEAMS.JOR, venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 57, matchday: 2, date: "2026-06-22T13:00:00", group: "J", home: TEAMS.ARG, away: TEAMS.AUT, venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 58, matchday: 2, date: "2026-06-22T23:00:00", group: "J", home: TEAMS.JOR, away: TEAMS.ALG, venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 59, matchday: 3, date: "2026-06-27T22:00:00", group: "J", home: TEAMS.ALG, away: TEAMS.AUT, venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 60, matchday: 3, date: "2026-06-27T22:00:00", group: "J", home: TEAMS.JOR, away: TEAMS.ARG, venue: VENUES.USA_DAL, status: "scheduled" },
    // ── GROUP K: Portugal, DR Congo, Uzbekistan, Colombia ──
    { id: 61, matchday: 1, date: "2026-06-17T13:00:00", group: "K", home: TEAMS.POR, away: TEAMS.COD, venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 62, matchday: 1, date: "2026-06-17T22:00:00", group: "K", home: TEAMS.UZB, away: TEAMS.COL, venue: VENUES.MEX_AZT, status: "scheduled" },
    { id: 63, matchday: 2, date: "2026-06-23T13:00:00", group: "K", home: TEAMS.POR, away: TEAMS.UZB, venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 64, matchday: 2, date: "2026-06-23T22:00:00", group: "K", home: TEAMS.COL, away: TEAMS.COD, venue: VENUES.MEX_AKR, status: "scheduled" },
    { id: 65, matchday: 3, date: "2026-06-27T19:30:00", group: "K", home: TEAMS.COL, away: TEAMS.POR, venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 66, matchday: 3, date: "2026-06-27T19:30:00", group: "K", home: TEAMS.COD, away: TEAMS.UZB, venue: VENUES.USA_ATL, status: "scheduled" },
    // ── GROUP L: England, Croatia, Ghana, Panama ──
    { id: 67, matchday: 1, date: "2026-06-17T16:00:00", group: "L", home: TEAMS.ENG, away: TEAMS.CRO, venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 68, matchday: 1, date: "2026-06-17T19:00:00", group: "L", home: TEAMS.GHA, away: TEAMS.PAN, venue: VENUES.CAN_BMO, status: "scheduled" },
    { id: 69, matchday: 2, date: "2026-06-23T16:00:00", group: "L", home: TEAMS.ENG, away: TEAMS.GHA, venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 70, matchday: 2, date: "2026-06-23T19:00:00", group: "L", home: TEAMS.PAN, away: TEAMS.CRO, venue: VENUES.CAN_BMO, status: "scheduled" },
    { id: 71, matchday: 3, date: "2026-06-27T17:00:00", group: "L", home: TEAMS.PAN, away: TEAMS.ENG, venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 72, matchday: 3, date: "2026-06-27T17:00:00", group: "L", home: TEAMS.CRO, away: TEAMS.GHA, venue: VENUES.USA_PHI, status: "scheduled" },
];

// USERS — populated at runtime via seed; not hardcoded here
export const USERS: User[] = [];

// PRE-WC FRIENDLY MATCHES — used as a full end-to-end test harness
// IDs 1001+ to avoid any collision with WC matches (1-72)
// All times in UTC (friendlies are in multiple timezones)
export const FRIENDLIES: Match[] = [
    { id: 1001, matchday: 1, date: "2026-05-31T19:30:00Z", group: "", stage: "friendly", home: TEAMS.USA, away: TEAMS.SEN, venue: "Bank of America Stadium, Charlotte NC", status: "scheduled" },
    { id: 1002, matchday: 1, date: "2026-05-31T18:45:00Z", group: "", stage: "friendly", home: TEAMS.GER, away: TEAMS.FIN, venue: "Volksparkstadion, Hamburg", status: "scheduled" },
    { id: 1003, matchday: 1, date: "2026-06-02T01:00:00Z", group: "", stage: "friendly", home: TEAMS.CAN, away: TEAMS.UZB, venue: "Commonwealth Stadium, Edmonton", status: "scheduled" },
    { id: 1004, matchday: 2, date: "2026-06-05T23:30:00Z", group: "", stage: "friendly", home: TEAMS.IRL, away: TEAMS.CAN, venue: "Saputo Stadium, Montreal", status: "scheduled" },
    { id: 1005, matchday: 2, date: "2026-06-06T18:30:00Z", group: "", stage: "friendly", home: TEAMS.USA, away: TEAMS.GER, venue: "Soldier Field, Chicago", status: "scheduled" },
    { id: 1006, matchday: 3, date: "2026-06-10T00:30:00Z", group: "", stage: "friendly", home: TEAMS.ARG, away: TEAMS.ISL, venue: "Jordan-Hare Stadium, Auburn AL", status: "scheduled" },
];
