export interface Boat {
    id: string;
    skipper: string;
    boatName: string;
    sailNumber: string;
    results: (number | null)[]; // 1-based position. null/0 means no result entered yet.
    nett: number; // Total after discards
    total: number; // Total without discards
    rank: number; // Current rank in fleet
}

export const TOTAL_RACES = 18;
