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

// 2026/27 Premier League clubs (per football-data.org — matches live fixture sync)
export const TEAMS: Record<string, Team> = {
    ARS: { id: "ARS", name: "Arsenal",                   badge: "🔴", color: "#EF0107", shortName: "Arsenal"   },
    AVL: { id: "AVL", name: "Aston Villa",               badge: "🟣", color: "#95BFE5", shortName: "Villa"     },
    BOU: { id: "BOU", name: "Bournemouth",               badge: "🍒", color: "#DA291C", shortName: "Bmouth"    },
    BRE: { id: "BRE", name: "Brentford",                 badge: "🐝", color: "#e30613", shortName: "Brentford" },
    BHA: { id: "BHA", name: "Brighton & Hove Albion",    badge: "🦅", color: "#0057B8", shortName: "Brighton"  },
    CHE: { id: "CHE", name: "Chelsea",                   badge: "🔵", color: "#034694", shortName: "Chelsea"   },
    COV: { id: "COV", name: "Coventry City",             badge: "💙", color: "#78D0F2", shortName: "Coventry"  },
    CRY: { id: "CRY", name: "Crystal Palace",            badge: "🦅", color: "#1B458F", shortName: "Palace"    },
    EVE: { id: "EVE", name: "Everton",                   badge: "🔵", color: "#003399", shortName: "Everton"   },
    FUL: { id: "FUL", name: "Fulham",                    badge: "⚽", color: "#CC0000", shortName: "Fulham"    },
    HUL: { id: "HUL", name: "Hull City",                 badge: "🐯", color: "#F18A01", shortName: "Hull"      },
    IPS: { id: "IPS", name: "Ipswich Town",              badge: "🔵", color: "#0044A9", shortName: "Ipswich"   },
    LEE: { id: "LEE", name: "Leeds United",              badge: "🦚", color: "#1D428A", shortName: "Leeds"     },
    LIV: { id: "LIV", name: "Liverpool",                 badge: "🔴", color: "#C8102E", shortName: "Liverpool" },
    MCI: { id: "MCI", name: "Manchester City",           badge: "🔵", color: "#6CABDD", shortName: "Man City"  },
    MUN: { id: "MUN", name: "Manchester United",         badge: "🔴", color: "#DA291C", shortName: "Man Utd"   },
    NEW: { id: "NEW", name: "Newcastle United",          badge: "⚫", color: "#241F20", shortName: "Newcastle" },
    NOT: { id: "NOT", name: "Nottingham Forest",         badge: "🌲", color: "#DD0000", shortName: "Forest"    },
    SUN: { id: "SUN", name: "Sunderland",                badge: "🐈‍⬛", color: "#EB172B", shortName: "Sunderland" },
    TOT: { id: "TOT", name: "Tottenham Hotspur",         badge: "⚽", color: "#132257", shortName: "Spurs"     },
};

// Matches seeded via admin panel or POST /epl/admin/seed-fixtures
export const MATCHES: Match[] = [];
