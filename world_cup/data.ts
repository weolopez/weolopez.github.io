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
}

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

// TEAMS — all 48 qualified nations
export const TEAMS: Record<string, Team> = {
    // Hosts
    MEX: { id: 'MEX', name: 'Mexico',        flag: '🇲🇽' },
    CAN: { id: 'CAN', name: 'Canada',         flag: '🇨🇦' },
    USA: { id: 'USA', name: 'USA',            flag: '🇺🇸' },
    // South America
    ARG: { id: 'ARG', name: 'Argentina',      flag: '🇦🇷' },
    BRA: { id: 'BRA', name: 'Brazil',         flag: '🇧🇷' },
    URU: { id: 'URU', name: 'Uruguay',        flag: '🇺🇾' },
    COL: { id: 'COL', name: 'Colombia',       flag: '🇨🇴' },
    ECU: { id: 'ECU', name: 'Ecuador',        flag: '🇪🇨' },
    VEN: { id: 'VEN', name: 'Venezuela',      flag: '🇻🇪' },
    BOL: { id: 'BOL', name: 'Bolivia',        flag: '🇧🇴' },
    // Europe
    FRA: { id: 'FRA', name: 'France',         flag: '🇫🇷' },
    ENG: { id: 'ENG', name: 'England',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    ESP: { id: 'ESP', name: 'Spain',          flag: '🇪🇸' },
    GER: { id: 'GER', name: 'Germany',        flag: '🇩🇪' },
    POR: { id: 'POR', name: 'Portugal',       flag: '🇵🇹' },
    NED: { id: 'NED', name: 'Netherlands',    flag: '🇳🇱' },
    ITA: { id: 'ITA', name: 'Italy',          flag: '🇮🇹' },
    BEL: { id: 'BEL', name: 'Belgium',        flag: '🇧🇪' },
    CRO: { id: 'CRO', name: 'Croatia',        flag: '🇭🇷' },
    SUI: { id: 'SUI', name: 'Switzerland',    flag: '🇨🇭' },
    DEN: { id: 'DEN', name: 'Denmark',        flag: '🇩🇰' },
    AUT: { id: 'AUT', name: 'Austria',        flag: '🇦🇹' },
    SRB: { id: 'SRB', name: 'Serbia',         flag: '🇷🇸' },
    POL: { id: 'POL', name: 'Poland',         flag: '🇵🇱' },
    TUR: { id: 'TUR', name: 'Turkey',         flag: '🇹🇷' },
    SCO: { id: 'SCO', name: 'Scotland',       flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    // Africa
    MAR: { id: 'MAR', name: 'Morocco',        flag: '🇲🇦' },
    SEN: { id: 'SEN', name: 'Senegal',        flag: '🇸🇳' },
    NGA: { id: 'NGA', name: 'Nigeria',        flag: '🇳🇬' },
    EGY: { id: 'EGY', name: 'Egypt',          flag: '🇪🇬' },
    CIV: { id: 'CIV', name: 'Ivory Coast',    flag: '🇨🇮' },
    CMR: { id: 'CMR', name: 'Cameroon',       flag: '🇨🇲' },
    GHA: { id: 'GHA', name: 'Ghana',          flag: '🇬🇭' },
    TUN: { id: 'TUN', name: 'Tunisia',        flag: '🇹🇳' },
    RSA: { id: 'RSA', name: 'South Africa',   flag: '🇿🇦' },
    // Asia
    JPN: { id: 'JPN', name: 'Japan',          flag: '🇯🇵' },
    KOR: { id: 'KOR', name: 'South Korea',    flag: '🇰🇷' },
    AUS: { id: 'AUS', name: 'Australia',      flag: '🇦🇺' },
    IRN: { id: 'IRN', name: 'Iran',           flag: '🇮🇷' },
    KSA: { id: 'KSA', name: 'Saudi Arabia',   flag: '🇸🇦' },
    IRQ: { id: 'IRQ', name: 'Iraq',           flag: '🇮🇶' },
    QAT: { id: 'QAT', name: 'Qatar',          flag: '🇶🇦' },
    // CONCACAF (non-hosts)
    CRC: { id: 'CRC', name: 'Costa Rica',     flag: '🇨🇷' },
    PAN: { id: 'PAN', name: 'Panama',         flag: '🇵🇦' },
    HON: { id: 'HON', name: 'Honduras',       flag: '🇭🇳' },
    SLV: { id: 'SLV', name: 'El Salvador',    flag: '🇸🇻' },
    JAM: { id: 'JAM', name: 'Jamaica',        flag: '🇯🇲' },
    // Oceania
    NZL: { id: 'NZL', name: 'New Zealand',    flag: '🇳🇿' },
};

// MATCHES — full group stage (12 groups × 6 matches = 72 total)
// Format per group: MD1: T1vsT2, T3vsT4 | MD2: T1vsT3, T2vsT4 | MD3: T1vsT4, T2vsT3
export const MATCHES: Match[] = [
    // ── GROUP A: Mexico, Egypt, Poland, South Korea ──
    { id:  1, matchday: 1, date: "2026-06-11T19:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.EGY,  venue: VENUES.MEX_AZT, status: "scheduled" },
    { id:  2, matchday: 1, date: "2026-06-11T22:00:00", group: "A", home: TEAMS.POL, away: TEAMS.KOR,  venue: VENUES.MEX_AKR, status: "scheduled" },
    { id:  3, matchday: 2, date: "2026-06-22T18:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.POL,  venue: VENUES.MEX_BBV, status: "scheduled" },
    { id:  4, matchday: 2, date: "2026-06-22T21:00:00", group: "A", home: TEAMS.EGY, away: TEAMS.KOR,  venue: VENUES.MEX_AZT, status: "scheduled" },
    { id:  5, matchday: 3, date: "2026-06-26T20:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.KOR,  venue: VENUES.MEX_AZT, status: "scheduled" },
    { id:  6, matchday: 3, date: "2026-06-26T20:00:00", group: "A", home: TEAMS.EGY, away: TEAMS.POL,  venue: VENUES.MEX_AKR, status: "scheduled" },
    // ── GROUP B: Canada, Senegal, Croatia, Morocco ──
    { id:  7, matchday: 1, date: "2026-06-12T15:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.SEN,  venue: VENUES.CAN_BMO, status: "scheduled" },
    { id:  8, matchday: 1, date: "2026-06-12T18:00:00", group: "B", home: TEAMS.CRO, away: TEAMS.MAR,  venue: VENUES.USA_PHI, status: "scheduled" },
    { id:  9, matchday: 2, date: "2026-06-23T15:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.CRO,  venue: VENUES.CAN_BCP, status: "scheduled" },
    { id: 10, matchday: 2, date: "2026-06-23T18:00:00", group: "B", home: TEAMS.SEN, away: TEAMS.MAR,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 11, matchday: 3, date: "2026-06-27T20:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.MAR,  venue: VENUES.CAN_BMO, status: "scheduled" },
    { id: 12, matchday: 3, date: "2026-06-27T20:00:00", group: "B", home: TEAMS.SEN, away: TEAMS.CRO,  venue: VENUES.USA_PHI, status: "scheduled" },
    // ── GROUP C: Argentina, Italy, Japan, Australia ──
    { id: 13, matchday: 1, date: "2026-06-13T13:00:00", group: "C", home: TEAMS.ARG, away: TEAMS.ITA,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 14, matchday: 1, date: "2026-06-13T16:00:00", group: "C", home: TEAMS.JPN, away: TEAMS.AUS,  venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 15, matchday: 2, date: "2026-06-24T15:00:00", group: "C", home: TEAMS.ARG, away: TEAMS.JPN,  venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 16, matchday: 2, date: "2026-06-24T18:00:00", group: "C", home: TEAMS.ITA, away: TEAMS.AUS,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 17, matchday: 3, date: "2026-06-28T20:00:00", group: "C", home: TEAMS.ARG, away: TEAMS.AUS,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 18, matchday: 3, date: "2026-06-28T20:00:00", group: "C", home: TEAMS.ITA, away: TEAMS.JPN,  venue: VENUES.USA_BOS, status: "scheduled" },
    // ── GROUP D: USA, Netherlands, Colombia, Uruguay ──
    { id: 19, matchday: 1, date: "2026-06-14T17:00:00", group: "D", home: TEAMS.USA, away: TEAMS.NED,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 20, matchday: 1, date: "2026-06-14T20:00:00", group: "D", home: TEAMS.COL, away: TEAMS.URU,  venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 21, matchday: 2, date: "2026-06-25T17:00:00", group: "D", home: TEAMS.USA, away: TEAMS.COL,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 22, matchday: 2, date: "2026-06-25T20:00:00", group: "D", home: TEAMS.NED, away: TEAMS.URU,  venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 23, matchday: 3, date: "2026-06-29T20:00:00", group: "D", home: TEAMS.USA, away: TEAMS.URU,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 24, matchday: 3, date: "2026-06-29T20:00:00", group: "D", home: TEAMS.NED, away: TEAMS.COL,  venue: VENUES.USA_SF,  status: "scheduled" },
    // ── GROUP E: France, Brazil, Switzerland, Nigeria ──
    { id: 25, matchday: 1, date: "2026-06-15T15:00:00", group: "E", home: TEAMS.FRA, away: TEAMS.BRA,  venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 26, matchday: 1, date: "2026-06-15T18:00:00", group: "E", home: TEAMS.SUI, away: TEAMS.NGA,  venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 27, matchday: 2, date: "2026-06-23T21:00:00", group: "E", home: TEAMS.FRA, away: TEAMS.SUI,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 28, matchday: 2, date: "2026-06-24T00:00:00", group: "E", home: TEAMS.BRA, away: TEAMS.NGA,  venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 29, matchday: 3, date: "2026-06-30T20:00:00", group: "E", home: TEAMS.FRA, away: TEAMS.NGA,  venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 30, matchday: 3, date: "2026-06-30T20:00:00", group: "E", home: TEAMS.BRA, away: TEAMS.SUI,  venue: VENUES.USA_HOU, status: "scheduled" },
    // ── GROUP F: England, Spain, Costa Rica, Panama ──
    { id: 31, matchday: 1, date: "2026-06-16T15:00:00", group: "F", home: TEAMS.ENG, away: TEAMS.ESP,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 32, matchday: 1, date: "2026-06-16T18:00:00", group: "F", home: TEAMS.CRC, away: TEAMS.PAN,  venue: VENUES.USA_PHI, status: "scheduled" },
    { id: 33, matchday: 2, date: "2026-06-24T21:00:00", group: "F", home: TEAMS.ENG, away: TEAMS.CRC,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 34, matchday: 2, date: "2026-06-25T00:00:00", group: "F", home: TEAMS.ESP, away: TEAMS.PAN,  venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 35, matchday: 3, date: "2026-07-01T20:00:00", group: "F", home: TEAMS.ENG, away: TEAMS.PAN,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 36, matchday: 3, date: "2026-07-01T20:00:00", group: "F", home: TEAMS.ESP, away: TEAMS.CRC,  venue: VENUES.USA_PHI, status: "scheduled" },
    // ── GROUP G: Germany, Portugal, Ghana, Ecuador ──
    { id: 37, matchday: 1, date: "2026-06-17T15:00:00", group: "G", home: TEAMS.GER, away: TEAMS.POR,  venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 38, matchday: 1, date: "2026-06-17T18:00:00", group: "G", home: TEAMS.GHA, away: TEAMS.ECU,  venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 39, matchday: 2, date: "2026-06-25T21:00:00", group: "G", home: TEAMS.GER, away: TEAMS.GHA,  venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 40, matchday: 2, date: "2026-06-26T00:00:00", group: "G", home: TEAMS.POR, away: TEAMS.ECU,  venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 41, matchday: 3, date: "2026-07-02T20:00:00", group: "G", home: TEAMS.GER, away: TEAMS.ECU,  venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 42, matchday: 3, date: "2026-07-02T20:00:00", group: "G", home: TEAMS.POR, away: TEAMS.GHA,  venue: VENUES.USA_DAL, status: "scheduled" },
    // ── GROUP H: Belgium, Turkey, Serbia, Iran ──
    { id: 43, matchday: 1, date: "2026-06-18T15:00:00", group: "H", home: TEAMS.BEL, away: TEAMS.TUR,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 44, matchday: 1, date: "2026-06-18T18:00:00", group: "H", home: TEAMS.SRB, away: TEAMS.IRN,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 45, matchday: 2, date: "2026-06-26T18:00:00", group: "H", home: TEAMS.BEL, away: TEAMS.SRB,  venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 46, matchday: 2, date: "2026-06-26T21:00:00", group: "H", home: TEAMS.TUR, away: TEAMS.IRN,  venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 47, matchday: 3, date: "2026-07-03T20:00:00", group: "H", home: TEAMS.BEL, away: TEAMS.IRN,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 48, matchday: 3, date: "2026-07-03T20:00:00", group: "H", home: TEAMS.TUR, away: TEAMS.SRB,  venue: VENUES.USA_ATL, status: "scheduled" },
    // ── GROUP I: South Africa, Saudi Arabia, Honduras, El Salvador ──
    { id: 49, matchday: 1, date: "2026-06-19T15:00:00", group: "I", home: TEAMS.RSA, away: TEAMS.KSA,  venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 50, matchday: 1, date: "2026-06-19T18:00:00", group: "I", home: TEAMS.HON, away: TEAMS.SLV,  venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 51, matchday: 2, date: "2026-06-27T15:00:00", group: "I", home: TEAMS.RSA, away: TEAMS.HON,  venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 52, matchday: 2, date: "2026-06-27T18:00:00", group: "I", home: TEAMS.KSA, away: TEAMS.SLV,  venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 53, matchday: 3, date: "2026-07-04T20:00:00", group: "I", home: TEAMS.RSA, away: TEAMS.SLV,  venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 54, matchday: 3, date: "2026-07-04T20:00:00", group: "I", home: TEAMS.KSA, away: TEAMS.HON,  venue: VENUES.USA_DAL, status: "scheduled" },
    // ── GROUP J: Ivory Coast, New Zealand, Jamaica, Venezuela ──
    { id: 55, matchday: 1, date: "2026-06-20T15:00:00", group: "J", home: TEAMS.CIV, away: TEAMS.NZL,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 56, matchday: 1, date: "2026-06-20T18:00:00", group: "J", home: TEAMS.JAM, away: TEAMS.VEN,  venue: VENUES.USA_MIA, status: "scheduled" },
    { id: 57, matchday: 2, date: "2026-06-28T15:00:00", group: "J", home: TEAMS.CIV, away: TEAMS.JAM,  venue: VENUES.USA_BOS, status: "scheduled" },
    { id: 58, matchday: 2, date: "2026-06-28T18:00:00", group: "J", home: TEAMS.NZL, away: TEAMS.VEN,  venue: VENUES.USA_PHI, status: "scheduled" },
    { id: 59, matchday: 3, date: "2026-07-05T20:00:00", group: "J", home: TEAMS.CIV, away: TEAMS.VEN,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 60, matchday: 3, date: "2026-07-05T20:00:00", group: "J", home: TEAMS.NZL, away: TEAMS.JAM,  venue: VENUES.USA_MIA, status: "scheduled" },
    // ── GROUP K: Denmark, Austria, Iraq, Tunisia ──
    { id: 61, matchday: 1, date: "2026-06-21T15:00:00", group: "K", home: TEAMS.DEN, away: TEAMS.AUT,  venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 62, matchday: 1, date: "2026-06-21T18:00:00", group: "K", home: TEAMS.IRQ, away: TEAMS.TUN,  venue: VENUES.USA_HOU, status: "scheduled" },
    { id: 63, matchday: 2, date: "2026-06-29T15:00:00", group: "K", home: TEAMS.DEN, away: TEAMS.IRQ,  venue: VENUES.USA_KC,  status: "scheduled" },
    { id: 64, matchday: 2, date: "2026-06-29T18:00:00", group: "K", home: TEAMS.AUT, away: TEAMS.TUN,  venue: VENUES.USA_LA,  status: "scheduled" },
    { id: 65, matchday: 3, date: "2026-07-06T20:00:00", group: "K", home: TEAMS.DEN, away: TEAMS.TUN,  venue: VENUES.USA_SEA, status: "scheduled" },
    { id: 66, matchday: 3, date: "2026-07-06T20:00:00", group: "K", home: TEAMS.AUT, away: TEAMS.IRQ,  venue: VENUES.USA_HOU, status: "scheduled" },
    // ── GROUP L: Scotland, Qatar, Cameroon, Bolivia ──
    { id: 67, matchday: 1, date: "2026-06-22T15:00:00", group: "L", home: TEAMS.SCO, away: TEAMS.QAT,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 68, matchday: 1, date: "2026-06-22T18:00:00", group: "L", home: TEAMS.CMR, away: TEAMS.BOL,  venue: VENUES.USA_SF,  status: "scheduled" },
    { id: 69, matchday: 2, date: "2026-06-30T15:00:00", group: "L", home: TEAMS.SCO, away: TEAMS.CMR,  venue: VENUES.USA_ATL, status: "scheduled" },
    { id: 70, matchday: 2, date: "2026-06-30T18:00:00", group: "L", home: TEAMS.QAT, away: TEAMS.BOL,  venue: VENUES.USA_DAL, status: "scheduled" },
    { id: 71, matchday: 3, date: "2026-07-07T20:00:00", group: "L", home: TEAMS.SCO, away: TEAMS.BOL,  venue: VENUES.USA_NJ,  status: "scheduled" },
    { id: 72, matchday: 3, date: "2026-07-07T20:00:00", group: "L", home: TEAMS.QAT, away: TEAMS.CMR,  venue: VENUES.USA_SF,  status: "scheduled" },
];

// USERS — seeded leaderboard entries
export const USERS: User[] = [
    { id: "user_1", email: "raeytn@example.com",    name: "Raeytn",   avatar: "https://i.pravatar.cc/150?u=raeytn",    points: 98, exact: 12 },
    { id: "user_2", email: "australin@example.com", name: "Australin", avatar: "https://i.pravatar.cc/150?u=australin", points: 93, exact: 10 },
    { id: "user_3", email: "becridy@example.com",   name: "Becridy",  avatar: "https://i.pravatar.cc/150?u=becridy",   points: 88, exact: 8  },
    { id: "user_4", email: "tsonada@example.com",   name: "Tsonada",  avatar: "https://i.pravatar.cc/150?u=tsonada",   points: 85, exact: 9  },
    { id: "user_5", email: "you@example.com",       name: "You",      avatar: "",                                       points: 12, exact: 1  },
];
