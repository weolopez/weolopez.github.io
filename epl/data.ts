// ==========================================
// EPL PREDICTION GAME — STATIC DATA
// ==========================================

export interface Team {
    id: string;
    name: string;
    badge: string;   // emoji
    color: string;   // primary hex
    shortName: string;
}

export interface Match {
    id: number;
    gameweek: number;
    date: string;     // ISO-8601, always with TZ suffix (UTC or BST offset)
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
    streak?: number;
    bestStreak?: number;
    badges?: string[];
    lastVisit?: number;
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

// 2025/26 Premier League clubs
// ⚠️ UPDATE BEFORE 2026/27 SEASON KICK-OFF — check promotion/relegation
export const TEAMS: Record<string, Team> = {
    ARS: { id: "ARS", name: "Arsenal",                   badge: "🔴", color: "#EF0107", shortName: "Arsenal"   },
    AVL: { id: "AVL", name: "Aston Villa",               badge: "🟣", color: "#95BFE5", shortName: "Villa"     },
    BOU: { id: "BOU", name: "Bournemouth",               badge: "🍒", color: "#DA291C", shortName: "Bmouth"    },
    BRE: { id: "BRE", name: "Brentford",                 badge: "🐝", color: "#e30613", shortName: "Brentford" },
    BHA: { id: "BHA", name: "Brighton & Hove Albion",    badge: "🦅", color: "#0057B8", shortName: "Brighton"  },
    CHE: { id: "CHE", name: "Chelsea",                   badge: "🔵", color: "#034694", shortName: "Chelsea"   },
    CRY: { id: "CRY", name: "Crystal Palace",            badge: "🦅", color: "#1B458F", shortName: "Palace"    },
    EVE: { id: "EVE", name: "Everton",                   badge: "🔵", color: "#003399", shortName: "Everton"   },
    FUL: { id: "FUL", name: "Fulham",                    badge: "⚽", color: "#CC0000", shortName: "Fulham"    },
    IPS: { id: "IPS", name: "Ipswich Town",              badge: "🔵", color: "#0044A9", shortName: "Ipswich"   },
    LEI: { id: "LEI", name: "Leicester City",            badge: "🦊", color: "#003090", shortName: "Leicester" },
    LIV: { id: "LIV", name: "Liverpool",                 badge: "🔴", color: "#C8102E", shortName: "Liverpool" },
    MCI: { id: "MCI", name: "Manchester City",           badge: "🔵", color: "#6CABDD", shortName: "Man City"  },
    MUN: { id: "MUN", name: "Manchester United",         badge: "🔴", color: "#DA291C", shortName: "Man Utd"   },
    NEW: { id: "NEW", name: "Newcastle United",          badge: "⚫", color: "#241F20", shortName: "Newcastle" },
    NFO: { id: "NFO", name: "Nottingham Forest",         badge: "🌲", color: "#DD0000", shortName: "Forest"    },
    SOU: { id: "SOU", name: "Southampton",               badge: "🔴", color: "#D71920", shortName: "Saints"    },
    TOT: { id: "TOT", name: "Tottenham Hotspur",         badge: "⚽", color: "#132257", shortName: "Spurs"     },
    WHU: { id: "WHU", name: "West Ham United",           badge: "🟣", color: "#7A263A", shortName: "West Ham"  },
    WOL: { id: "WOL", name: "Wolverhampton Wanderers",  badge: "🐺", color: "#FDB913", shortName: "Wolves"    },
};

// Matches seeded via admin panel or POST /epl/admin/seed-fixtures
export const MATCHES: Match[] = [];
