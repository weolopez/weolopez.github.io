// ==========================================
// STATIC DATA CONTENT
// ==========================================

// Define types here for now, will move to server.ts later
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
    MEX: "Estadio Azteca, Mexico City",
    CAN: "BMO Field, Toronto",
    USA_LA: "SoFi Stadium, Los Angeles",
    USA_NJ: "MetLife Stadium, New Jersey",
    USA_DAL: "AT&T Stadium, Dallas",
    USA_MIA: "Hard Rock Stadium, Miami",
    USA_ATL: "Mercedes-Benz Stadium, Atlanta"
};

// TEAMS
export const TEAMS: Record<string, Team> = {
    MEX: { id: 'MEX', name: 'Mexico', flag: '🇲🇽' },
    CAN: { id: 'CAN', name: 'Canada', flag: '🇨🇦' },
    USA: { id: 'USA', name: 'USA', flag: '🇺🇸' },
    ARG: { id: 'ARG', name: 'Argentina', flag: '🇦🇷' },
    FRA: { id: 'FRA', name: 'France', flag: '🇫🇷' },
    BRA: { id: 'BRA', name: 'Brazil', flag: '🇧🇷' },
    ENG: { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    ESP: { id: 'ESP', name: 'Spain', flag: '🇪🇸' },
    GER: { id: 'GER', name: 'Germany', flag: '🇩🇪' },
    JPN: { id: 'JPN', name: 'Japan', flag: '🇯🇵' },
    KOR: { id: 'KOR', name: 'South Korea', flag: '🇰🇷' },
    AUS: { id: 'AUS', name: 'Australia', flag: '🇦🇺' },
    MAR: { id: 'MAR', name: 'Morocco', flag: '🇲🇦' },
    SEN: { id: 'SEN', name: 'Senegal', flag: '🇸🇳' },
    ITA: { id: 'ITA', name: 'Italy', flag: '🇮🇹' },
    NED: { id: 'NED', name: 'Netherlands', flag: '🇳🇱' },
    URU: { id: 'URU', name: 'Uruguay', flag: '🇺🇾' },
    COL: { id: 'COL', name: 'Colombia', flag: '🇨🇴' },
    POL: { id: 'POL', name: 'Poland', flag: '🇵🇱' },
    EGY: { id: 'EGY', name: 'Egypt', flag: '🇪🇬' },
};

// MATCHES
export const MATCHES: Match[] = [
    { id: 1, matchday: 1, date: "2026-06-11T19:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.EGY, venue: VENUES.MEX, status: "scheduled" },
    { id: 2, matchday: 1, date: "2026-06-11T21:00:00", group: "A", home: TEAMS.POL, away: TEAMS.KOR, venue: "Estadio Akron, Guadalajara", status: "scheduled" },
    { id: 3, matchday: 1, date: "2026-06-12T15:00:00", group: "B", home: TEAMS.CAN, away: TEAMS.SEN, venue: VENUES.CAN, status: "scheduled" },
    { id: 4, matchday: 1, date: "2026-06-12T18:00:00", group: "D", home: TEAMS.USA, away: TEAMS.URU, venue: VENUES.USA_LA, status: "scheduled" },
    { id: 5, matchday: 1, date: "2026-06-13T13:00:00", group: "C", home: TEAMS.ARG, away: TEAMS.AUS, venue: VENUES.USA_NJ, status: "scheduled" },
    { id: 6, matchday: 1, date: "2026-06-13T16:00:00", group: "C", home: TEAMS.ITA, away: TEAMS.JPN, venue: "Gillette Stadium, Boston", status: "scheduled" },
    { id: 7, matchday: 1, date: "2026-06-13T19:00:00", group: "D", home: TEAMS.NED, away: TEAMS.COL, venue: "Levi's Stadium, San Francisco", status: "scheduled" },
    { id: 8, matchday: 2, date: "2026-06-18T18:00:00", group: "A", home: TEAMS.MEX, away: TEAMS.POL, venue: "Estadio Akron, Guadalajara", status: "scheduled" },
    { id: 9, matchday: 2, date: "2026-06-19T20:00:00", group: "D", home: TEAMS.USA, away: TEAMS.NED, venue: "Lumen Field, Seattle", status: "scheduled" }
];

// USERS
export const USERS: User[] = [
    { id: "user_1", email: "raeytn@example.com", name: "Raeytn", avatar: "https://i.pravatar.cc/150?u=raeytn", points: 98, exact: 12 },
    { id: "user_2", email: "australin@example.com", name: "Australin", avatar: "https://i.pravatar.cc/150?u=australin", points: 93, exact: 10 },
    { id: "user_3", email: "becridy@example.com", name: "Becridy", avatar: "https://i.pravatar.cc/150?u=becridy", points: 88, exact: 8 },
    { id: "user_4", email: "tsonada@example.com", name: "Tsonada", avatar: "https://i.pravatar.cc/150?u=tsonada", points: 85, exact: 9 },
    { id: "user_5", email: "you@example.com", name: "You", avatar: "", points: 12, exact: 1 },
];