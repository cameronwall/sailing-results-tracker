// Types for Official MYC Results Import (V2.1)

import type { ResultStatusCode } from '../types';

export type MatchStatus = 'CONFIRMED' | 'REVIEW' | 'MISSING' | 'UNMATCHED';

export type ReviewReason =
    | 'FUZZY_NAME_MATCH'
    | 'AMBIGUOUS_MATCH'
    | 'DUPLICATE_SAIL_NUMBER'
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

export const VALID_OFFICIAL_RESULT_SOURCE_TYPES = [
    'SCRATCH_SHEET',
    'HANDICAP_SHEET',
    'COMBINED_SHEET',
    'OTHER'
] as const;

export type OfficialResultSourceType = typeof VALID_OFFICIAL_RESULT_SOURCE_TYPES[number];

export interface OfficialResultSourceInsertPayload {
    race_id: string;
    source_type: OfficialResultSourceType;
    original_filename: string;
    storage_path: string;
    file_size_bytes?: number | null;
    mime_type?: string | null;
    provider_name: string;
    raw_extraction: any;
    matched_extraction: any;
    admin_corrections: AdminCorrectionRecord[];
    confirmed_by: string;
}

/**
 * Migration 002 Contract Builder:
 * Strictly produces an insert payload adhering to public.official_result_sources in Migration 002.
 * Validates NOT NULL fields, enforces CHECK constraint on source_type, sets confirmed_by, and forbids uploaded_by.
 */
export const buildOfficialResultSourceInsert = (params: {
    raceId: string;
    sourceType?: string;
    filename: string;
    storagePath: string;
    fileSizeBytes?: number | null;
    mimeType?: string | null;
    providerName: string;
    rawExtraction: any;
    matchedExtraction: any;
    adminCorrections?: AdminCorrectionRecord[];
    confirmedBy: string;
}): OfficialResultSourceInsertPayload => {
    if (!params.raceId) {
        throw new Error('Database contract error: race_id is required and cannot be null.');
    }

    if (!params.confirmedBy) {
        throw new Error('Database contract error: confirmed_by is required and must be the authenticated admin UUID.');
    }

    let safeSourceType: OfficialResultSourceType = 'COMBINED_SHEET';
    if (params.sourceType) {
        if (!VALID_OFFICIAL_RESULT_SOURCE_TYPES.includes(params.sourceType as any)) {
            throw new Error(`Database contract error: Invalid source_type "${params.sourceType}". Allowed: ${VALID_OFFICIAL_RESULT_SOURCE_TYPES.join(', ')}`);
        }
        safeSourceType = params.sourceType as OfficialResultSourceType;
    }

    return {
        race_id: params.raceId,
        source_type: safeSourceType,
        original_filename: params.filename,
        storage_path: params.storagePath,
        file_size_bytes: params.fileSizeBytes || null,
        mime_type: params.mimeType || null,
        provider_name: params.providerName,
        raw_extraction: params.rawExtraction,
        matched_extraction: params.matchedExtraction,
        admin_corrections: params.adminCorrections || [],
        confirmed_by: params.confirmedBy
    };
};

export interface OfficialResultSourceRecord {
    id: string;
    raceId: string;
    sourceType: OfficialResultSourceType;
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
