// Types for Official MYC Results Import (V2.1)

import type { ResultStatusCode } from '../types';

export type MatchStatus = 'CONFIRMED' | 'REVIEW' | 'MISSING' | 'UNMATCHED';

export type ReviewReason =
    | 'FUZZY_NAME_MATCH'
    | 'AMBIGUOUS_MATCH'
    | 'MISSING_HANDICAP'
    | 'MISSING_SCRATCH'
    | 'MULTI_SHEET_CONFLICT'
    | 'DEAD_HEAT'
    | 'STARTERS_DISCREPANCY'
    | 'SERIES_ENTRANTS_DISCREPANCY'
    | 'UNRECOGNIZED_BOAT'
    | 'CONFIRMATION_REQUIRED';

export interface RawExtractedEntry {
    rawSailNumber?: string;
    rawBoatName?: string;
    rawSkipperName?: string;
    scratchPlace?: number | null;
    handicapPlace?: number | null;
    statusCode?: ResultStatusCode;
    finishTime?: string;
    elapsedTime?: string;
    correctedTime?: string;
    confidence?: {
        sailNumber?: number;
        boatName?: number;
        placing?: number;
    };
    notes?: string;
}

export interface RawFleetExtractionResult {
    raceNumber?: number;
    raceDate?: string;
    sourceSheetType: 'SCRATCH' | 'HANDICAP' | 'COMBINED';
    totalStartersFound?: number;
    seriesEntrantsFound?: number;
    entries: RawExtractedEntry[];
    confidenceRating: 'HIGH' | 'MEDIUM' | 'LOW';
    parsingNotes?: string[];
}

export interface MatchedCompetitorResult {
    boatId: string;
    skipper: string;
    boatName: string;
    sailNumber: string;
    isKegCupQualifier: boolean;
    matchStatus: MatchStatus;
    reviewReasons: ReviewReason[];
    scratchPlace: number | null;
    handicapPlace: number | null;
    statusCode: ResultStatusCode;
    notes?: string;
    // Audit tracing
    rawEntries: RawExtractedEntry[];
    confidenceScore: number; // 0.0 - 1.0
    suggestedBoat?: {
        id: string;
        skipper: string;
        boatName: string;
        sailNumber: string;
    };
}

export interface UnmatchedExtractedEntry {
    tempId: string;
    rawEntry: RawExtractedEntry;
    matchStatus: 'UNMATCHED';
    suggestedBoatId?: string;
    suggestedBoatName?: string;
    suggestedSailNumber?: string;
}

export interface MetadataComparison {
    starters: {
        current: number;
        detected: number | null;
        hasDiscrepancy: boolean;
        confirmedValue: number;
    };
    seriesEntrants: {
        current: number;
        detected: number | null;
        hasDiscrepancy: boolean;
        confirmedValue: number;
    };
    raceDate: {
        current: string;
        detected: string | null;
        hasDiscrepancy: boolean;
        confirmedValue: string;
    };
}

export interface ImportReviewState {
    raceNumber: number;
    sheetCount: number;
    providerName: string;
    metadata: MetadataComparison;
    matchedQualifiers: MatchedCompetitorResult[];
    unmatchedEntries: UnmatchedExtractedEntry[];
    summary: {
        totalQualifiers: number;
        confirmedCount: number;
        reviewCount: number;
        missingCount: number;
        unmatchedCount: number;
    };
    adminCorrections: AdminCorrectionRecord[];
}

export interface AdminCorrectionRecord {
    boatId?: string;
    field: 'scratchPlace' | 'handicapPlace' | 'statusCode' | 'boatId' | 'starters' | 'seriesEntrants';
    originalValue: any;
    correctedValue: any;
    timestamp: string;
}

export interface OfficialResultSourceRecord {
    id: string;
    raceId: string;
    sourceType: 'SCRATCH_SHEET' | 'HANDICAP_SHEET' | 'COMBINED_SHEET' | 'OTHER';
    originalFilename: string;
    storagePath: string;
    fileSizeBytes?: number;
    mimeType?: string;
    providerName: string;
    rawExtraction: RawFleetExtractionResult | RawFleetExtractionResult[];
    matchedExtraction: MatchedCompetitorResult[];
    adminCorrections: AdminCorrectionRecord[];
    confirmedBy: string;
    confirmedAt: string;
    createdAt: string;
}
