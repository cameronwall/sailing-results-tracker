// Core Types for Sailing Results Tracker (Legacy & Keg Cup 2026/27)

// ==========================================
// Legacy Types (Preserved for backward compatibility)
// ==========================================
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

// ==========================================
// Keg Cup 2026/27 Types
// ==========================================

export type ResultStatusCode = 'NONE' | 'DNC' | 'DNS' | 'DNF' | 'DSQ';

export interface RaceMeta {
    raceNumber: number;
    raceDate?: string;
    seriesEntrants: number; // Total series fleet size (used for DNC = seriesEntrants + 1)
    boatsAtStart: number;   // Boats at starting area for this race (used for DNS/DNF/DSQ = boatsAtStart + 1)
    isCompleted: boolean;
}

export interface RaceResultSource {
    scratchPlace?: number | null;
    handicapPlace?: number | null;
    statusCode?: ResultStatusCode;
    notes?: string;
}

export interface CalculatedRaceResult {
    raceNumber: number;
    scratchPlace: number | null;
    handicapPlace: number | null;
    statusCode: ResultStatusCode;
    calculatedScore: number;
    isPenalty: boolean;
    isMissing: boolean;
    isDiscarded?: boolean;
}

export interface KegCupBoat {
    id: string;
    skipper: string;
    boatName?: string;
    sailNumber: string;
    raceResults: Record<number, RaceResultSource>; // keyed by 1-based raceNumber
}

export interface ScoredKegCupBoat {
    id: string;
    skipper: string;
    boatName?: string;
    sailNumber: string;
    rank: number;
    nett: number;
    total: number;
    discardedRaceNumbers: number[];
    scores: Record<number, CalculatedRaceResult>;
}

// Discard threshold rules
export interface DiscardRule {
    completedRaces: number;
    discards: number;
}

export const DEFAULT_DISCARD_RULES: DiscardRule[] = [
    { completedRaces: 5, discards: 1 },
    { completedRaces: 10, discards: 2 },
    { completedRaces: 15, discards: 3 },
];

export type TieBreakMethod = 'NETT_THEN_TOTAL' | 'RRS_APPENDIX_A8';

// ==========================================
// Pre-Christmas Qualification Types
// ==========================================

export interface RawQualificationInput {
    boatId: string;
    skipper: string;
    boatName?: string;
    sailNumber: string;
    springRank: number;
    clubChampRank: number;
    racesSailed: number;
    racesAvailable: number;
}

export interface BoatQualificationStatus {
    boatId: string;
    skipper: string;
    boatName?: string;
    sailNumber: string;
    springRank: number;
    clubChampRank: number;
    racesSailed: number;
    racesAvailable: number;
    participationRate: number; // e.g. 0.50
    isEligible: boolean;       // participationRate >= threshold
    qualificationScore: number; // (springRank + clubChampRank) / 2
    rankAmongEligible?: number; // 1-based rank among eligible boats (1 = best first-half performance)
    isQualified: boolean;      // In proposed/locked Keg Cup fleet
    qualificationReason: string;
}

export interface QualificationSummary {
    threshold: number;              // e.g. 0.40
    totalBoats: number;
    eligibleBoatsCount: number;
    qualifyingFleetTarget: number;  // Math.ceil(eligibleBoatsCount / 2)
    actualQualifiersCount: number;  // May exceed target if boundary ties occur
    boundaryScore?: number;
    boats: BoatQualificationStatus[];
}

export interface SeasonQualifierSnapshot {
    seasonId: string;
    lockedAt: string;
    lockedBy: string;
    threshold: number;
    qualifiers: BoatQualificationStatus[];
}

// ==========================================
// Season Configuration
// ==========================================

export interface Season {
    id: string;
    slug: string; // e.g. 'keg-cup-2026-27', 'legacy-2025-26'
    name: string; // e.g. '2026/27 Keg Cup', '2025/26 Keg Cup'
    qualificationCutoffDate?: string;
    kegCupStartDate?: string;
    participationThreshold: number; // default 0.40
    seriesFleetSize: number;        // default 21
    discardRules: DiscardRule[];
    qualifiersLocked: boolean;
    qualifiersLockedAt?: string;
    qualifiersLockedBy?: string;
    isActive: boolean;
}
