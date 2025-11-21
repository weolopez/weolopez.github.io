// Confirmed Host Cities & Venues
export const VENUES = {
    MEX: "Estadio Azteca, Mexico City",
    CAN: "BMO Field, Toronto",
    USA_LA: "SoFi Stadium, Los Angeles",
    USA_NJ: "MetLife Stadium, New Jersey",
    USA_DAL: "AT&T Stadium, Dallas",
    USA_MIA: "Hard Rock Stadium, Miami",
    USA_ATL: "Mercedes-Benz Stadium, Atlanta"
};

// Mock Teams (Qualified + Plausible Pot allocations)
export const TEAMS = {
    MEX: { id: 'MEX', name: 'Mexico', flag: '🇲🇽', color: 'bg-green-700' },
    CAN: { id: 'CAN', name: 'Canada', flag: '🇨🇦', color: 'bg-red-600' },
    USA: { id: 'USA', name: 'USA', flag: '🇺🇸', color: 'bg-blue-800' },
    ARG: { id: 'ARG', name: 'Argentina', flag: '🇦🇷', color: 'bg-sky-400' },
    FRA: { id: 'FRA', name: 'France', flag: '🇫🇷', color: 'bg-blue-700' },
    BRA: { id: 'BRA', name: 'Brazil', flag: '🇧🇷', color: 'bg-yellow-500' },
    ENG: { id: 'ENG', name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: 'bg-white' },
    ESP: { id: 'ESP', name: 'Spain', flag: '🇪🇸', color: 'bg-red-500' },
    GER: { id: 'GER', name: 'Germany', flag: '🇩🇪', color: 'bg-gray-800' },
    JPN: { id: 'JPN', name: 'Japan', flag: '🇯🇵', color: 'bg-blue-900' },
    KOR: { id: 'KOR', name: 'South Korea', flag: '🇰🇷', color: 'bg-red-500' },
    AUS: { id: 'AUS', name: 'Australia', flag: '🇦🇺', color: 'bg-yellow-400' },
    MAR: { id: 'MAR', name: 'Morocco', flag: '🇲🇦', color: 'bg-red-700' },
    SEN: { id: 'SEN', name: 'Senegal', flag: '🇸🇳', color: 'bg-green-600' },
    ITA: { id: 'ITA', name: 'Italy', flag: '🇮🇹', color: 'bg-blue-600' },
    NED: { id: 'NED', name: 'Netherlands', flag: '🇳🇱', color: 'bg-orange-500' },
    URU: { id: 'URU', name: 'Uruguay', flag: '🇺🇾', color: 'bg-sky-600' },
    COL: { id: 'COL', name: 'Colombia', flag: '🇨🇴', color: 'bg-yellow-500' },
    POL: { id: 'POL', name: 'Poland', flag: '🇵🇱', color: 'bg-red-600' },
    EGY: { id: 'EGY', name: 'Egypt', flag: '🇪🇬', color: 'bg-black' },
};

// Schedule based on actual confirmed 2026 opener dates
export const MATCHES = [
    // Matchday 1
    {
        id: 1,
        matchday: 1,
        date: "2026-06-11T19:00:00",
        group: "A",
        home: TEAMS.MEX,
        away: TEAMS.EGY,
        venue: VENUES.MEX,
        status: "UPCOMING",
        featured: true
    },
    {
        id: 2,
        matchday: 1,
        date: "2026-06-11T21:00:00",
        group: "A",
        home: TEAMS.POL,
        away: TEAMS.KOR,
        venue: "Estadio Akron, Guadalajara",
        status: "UPCOMING"
    },
    {
        id: 3,
        matchday: 1,
        date: "2026-06-12T15:00:00",
        group: "B",
        home: TEAMS.CAN,
        away: TEAMS.SEN,
        venue: VENUES.CAN,
        status: "UPCOMING",
        featured: true
    },
    {
        id: 4,
        matchday: 1,
        date: "2026-06-12T18:00:00",
        group: "D",
        home: TEAMS.USA,
        away: TEAMS.URU,
        venue: VENUES.USA_LA,
        status: "UPCOMING",
        featured: true
    },
    {
        id: 5,
        matchday: 1,
        date: "2026-06-13T13:00:00",
        group: "C",
        home: TEAMS.ARG,
        away: TEAMS.AUS,
        venue: VENUES.USA_NJ,
        status: "UPCOMING"
    },
    {
        id: 6,
        matchday: 1,
        date: "2026-06-13T16:00:00",
        group: "C",
        home: TEAMS.ITA,
        away: TEAMS.JPN,
        venue: "Gillette Stadium, Boston",
        status: "UPCOMING"
    },
    {
        id: 7,
        matchday: 1,
        date: "2026-06-13T19:00:00",
        group: "D",
        home: TEAMS.NED,
        away: TEAMS.COL,
        venue: "Levi's Stadium, San Francisco",
        status: "UPCOMING"
    },
    // Matchday 2 (Preview)
    {
        id: 8,
        matchday: 2,
        date: "2026-06-18T18:00:00",
        group: "A",
        home: TEAMS.MEX,
        away: TEAMS.POL,
        venue: "Estadio Akron, Guadalajara",
        status: "UPCOMING"
    },
    {
        id: 9,
        matchday: 2,
        date: "2026-06-19T20:00:00",
        group: "D",
        home: TEAMS.USA,
        away: TEAMS.NED,
        venue: "Lumen Field, Seattle",
        status: "UPCOMING"
    }
];

export const LEADERBOARD = [
    { rank: 1, name: "Raeytn", avatar: "https://i.pravatar.cc/150?u=Raeytn", points: 98, exact: 12 },
    { rank: 2, name: "Australin", avatar: "https://i.pravatar.cc/150?u=Australin", points: 93, exact: 10 },
    { rank: 3, name: "Becridy", avatar: "https://i.pravatar.cc/150?u=Becridy", points: 88, exact: 8 },
    { rank: 4, name: "Tsonada", avatar: "https://i.pravatar.cc/150?u=Tsonada", points: 85, exact: 9 },
    { rank: 5, name: "You", avatar: "", points: 12, exact: 1, isUser: true },
];

// For compatibility with existing loader logic, export a default object too
export const wc2026Schedule = {
    matches: MATCHES,
    leaderboard: LEADERBOARD
};
