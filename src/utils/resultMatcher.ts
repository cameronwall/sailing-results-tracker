// Deterministic Result Matcher for Official MYC Results (V2.1)

import type { Boat, KegCupBoat, RaceMeta } from '../types';
import type {
    RawExtractedEntry,
    RawFleetExtractionResult,
    MatchedCompetitorResult,
    UnmatchedExtractedEntry,
    MetadataComparison,
    ReviewReason,
    MatchStatus
} from '../types/import';

/**
 * Normalises sail numbers for robust deterministic matching:
 * - Trims whitespace
 * - Strips country prefixes ("AUS-", "AUS ", "AUS")
 * - Strips leading zeros ("0214582" -> "214582")
 * - Removes non-alphanumeric punctuation
 */
export const normalizeSailNumber = (raw?: string | null): string => {
    if (!raw) return '';
    let cleaned = raw.trim().toUpperCase();
    // Strip AUS prefixes e.g. "AUS-214582", "AUS 214582", "AUS214582"
    cleaned = cleaned.replace(/^AUS[-\s]?/, '');
    // Remove spaces, dashes, dots
    cleaned = cleaned.replace(/[^A-Z0-9]/g, '');
    // Strip leading zeros if numeric e.g. "0214582" -> "214582"
    if (/^0+[1-9]/.test(cleaned)) {
        cleaned = cleaned.replace(/^0+/, '');
    }
    return cleaned;
};

/**
 * Normalises text strings (boat name, skipper) for case/whitespace-insensitive comparison.
 */
export const normalizeText = (text?: string | null): string => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/\s+/g, ' ');
};

/**
 * Calculate Levenshtein distance between two strings.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    return matrix[b.length][a.length];
};

/**
 * String similarity ratio (0.0 to 1.0) based on Levenshtein distance.
 */
export const stringSimilarity = (s1: string, s2: string): number => {
    const norm1 = normalizeText(s1);
    const norm2 = normalizeText(s2);
    if (norm1 === norm2) return 1.0;
    if (!norm1 || !norm2) return 0.0;
    const maxLen = Math.max(norm1.length, norm2.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshteinDistance(norm1, norm2);
    return Math.max(0, 1 - dist / maxLen);
};

/**
 * Merges extracted entries from multiple sheets (e.g. separate Scratch & Handicap sheets).
 * Groups by normalized sail number, or normalized boat name if sail is absent.
 */
export const mergeMultiSheetEntries = (
    extractionResults: RawFleetExtractionResult[]
): {
    mergedEntries: RawExtractedEntry[];
    sheetConflicts: Array<{ key: string; reason: string }>;
} => {
    const mergedList: RawExtractedEntry[] = [];
    const conflicts: Array<{ key: string; reason: string }> = [];

    // Track index in mergedList of primaryKey's first appearance, and set of sheet indices that contributed
    const primaryKeyMap = new Map<string, { entryIndex: number; sheetIndices: Set<number> }>();

    for (let sheetIdx = 0; sheetIdx < extractionResults.length; sheetIdx++) {
        const result = extractionResults[sheetIdx];
        const seenOnThisSheet = new Set<string>();

        for (const entry of result.entries) {
            const sailKey = normalizeSailNumber(entry.rawSailNumber);
            const boatKey = normalizeText(entry.rawBoatName);
            const primaryKey = sailKey || (boatKey ? `name:${boatKey}` : null);

            if (!primaryKey) {
                // Anonymous entry without sail or boat name -> always preserve independently
                mergedList.push({ ...entry });
                continue;
            }

            // Invariant Check 1: SAME-SHEET DUPLICATE
            // Two or more source rows sharing the same normalised sail number on the SAME sheet MUST NEVER be silently merged!
            if (seenOnThisSheet.has(primaryKey)) {
                conflicts.push({
                    key: primaryKey,
                    reason: `Duplicate sail number on same source sheet: ${entry.rawSailNumber || primaryKey}`
                });
                // Preserve this row independently
                mergedList.push({ ...entry });
                continue;
            }

            seenOnThisSheet.add(primaryKey);

            // Invariant Check 2: MULTI-SHEET MERGE
            // Check if seen on a PREVIOUS sheet
            const existingRecord = primaryKeyMap.get(primaryKey);
            if (!existingRecord) {
                // First appearance across all sheets
                const newIndex = mergedList.length;
                mergedList.push({ ...entry });
                primaryKeyMap.set(primaryKey, {
                    entryIndex: newIndex,
                    sheetIndices: new Set([sheetIdx])
                });
            } else {
                // Legitimate MULTI-SHEET MERGE (e.g. Scratch sheet + Handicap sheet)
                const target = mergedList[existingRecord.entryIndex];
                existingRecord.sheetIndices.add(sheetIdx);

                // Merge Scratch place
                if (entry.scratchPlace !== null && entry.scratchPlace !== undefined) {
                    if (target.scratchPlace && target.scratchPlace !== entry.scratchPlace) {
                        conflicts.push({
                            key: primaryKey,
                            reason: `Conflicting Scratch places across sheets: ${target.scratchPlace} vs ${entry.scratchPlace}`
                        });
                    }
                    target.scratchPlace = entry.scratchPlace;
                }

                // Merge Handicap place
                if (entry.handicapPlace !== null && entry.handicapPlace !== undefined) {
                    if (target.handicapPlace && target.handicapPlace !== entry.handicapPlace) {
                        conflicts.push({
                            key: primaryKey,
                            reason: `Conflicting Handicap places across sheets: ${target.handicapPlace} vs ${entry.handicapPlace}`
                        });
                    }
                    target.handicapPlace = entry.handicapPlace;
                }

                // Merge Status code
                if (entry.statusCode && entry.statusCode !== 'NONE') {
                    if (target.statusCode && target.statusCode !== 'NONE' && target.statusCode !== entry.statusCode) {
                        conflicts.push({
                            key: primaryKey,
                            reason: `Conflicting status codes across sheets: ${target.statusCode} vs ${entry.statusCode}`
                        });
                    }
                    target.statusCode = entry.statusCode;
                }

                // Fill text if missing
                if (!target.rawBoatName && entry.rawBoatName) target.rawBoatName = entry.rawBoatName;
                if (!target.rawSkipperName && entry.rawSkipperName) target.rawSkipperName = entry.rawSkipperName;
                if (!target.rawSailNumber && entry.rawSailNumber) target.rawSailNumber = entry.rawSailNumber;
            }
        }
    }

    return {
        mergedEntries: mergedList,
        sheetConflicts: conflicts
    };
};

export interface MatchFleetOptions {
    registeredBoats: Boat[];
    qualifierBoats: KegCupBoat[];
    activeRace: RaceMeta;
    extractionResults: RawFleetExtractionResult[];
}

export interface MatchFleetOutput {
    matchedQualifiers: MatchedCompetitorResult[];
    unmatchedEntries: UnmatchedExtractedEntry[];
    metadata: MetadataComparison;
    summary: {
        totalQualifiers: number;
        confirmedCount: number;
        reviewCount: number;
        missingCount: number;
        unmatchedCount: number;
    };
}

/**
 * Core Matching Algorithm (V2.1):
 * Matches extracted fleet entries against the boat registry and locked Keg Cup qualifiers.
 * Enforces:
 * 1. Missing does NOT mean DNC (Missing boats have null places and statusCode 'NONE').
 * 2. Explicit metadata comparison for Starters & Entrants.
 * 3. Dead-heat detection for shared positions.
 * 4. Fuzzy matching flagged strictly as REVIEW with suggestedBoat.
 */
export const matchExtractedFleet = (options: MatchFleetOptions): MatchFleetOutput => {
    const { registeredBoats, qualifierBoats, activeRace, extractionResults } = options;

    // 1. Merge all extraction sheets if multiple
    const { mergedEntries, sheetConflicts } = mergeMultiSheetEntries(extractionResults);

    // 2. Identify fleet-wide duplicate positions (Dead-Heats)
    const scratchCountMap = new Map<number, number>();
    const handicapCountMap = new Map<number, number>();
    for (const e of mergedEntries) {
        if (e.scratchPlace && e.scratchPlace > 0) {
            scratchCountMap.set(e.scratchPlace, (scratchCountMap.get(e.scratchPlace) || 0) + 1);
        }
        if (e.handicapPlace && e.handicapPlace > 0) {
            handicapCountMap.set(e.handicapPlace, (handicapCountMap.get(e.handicapPlace) || 0) + 1);
        }
    }

    // 3. Map extracted rows to registered boats via 4-stage cascade
    interface MatchCandidate {
        boat: Boat;
        confidence: number;
        isExact: boolean;
        isAmbiguous?: boolean;
        fuzzyScore?: number;
    }

    const matchedMap = new Map<string, Array<{ entry: RawExtractedEntry; candidate: MatchCandidate }>>();
    const unmatchedEntries: UnmatchedExtractedEntry[] = [];
    const usedBoatIds = new Set<string>();

    for (let i = 0; i < mergedEntries.length; i++) {
        const raw = mergedEntries[i];
        const normSail = normalizeSailNumber(raw.rawSailNumber);
        const normBoat = normalizeText(raw.rawBoatName);
        const normSkipper = normalizeText(raw.rawSkipperName);

        let match: MatchCandidate | null = null;

        // Stage 1: Exact Normalized Sail Number Match (Unambiguous)
        if (normSail) {
            const matches = registeredBoats.filter(b => normalizeSailNumber(b.sailNumber) === normSail);
            if (matches.length === 1) {
                match = { boat: matches[0], confidence: 1.0, isExact: true };
            } else if (matches.length > 1) {
                // Ambiguous: multiple boats registered with same sail number
                match = { boat: matches[0], confidence: 0.5, isExact: false, isAmbiguous: true };
            }
        }

        // Stage 2: Exact Unique Boat Identity Match
        if (!match && normBoat) {
            const matches = registeredBoats.filter(b => normalizeText(b.boatName) === normBoat);
            if (matches.length === 1) {
                match = { boat: matches[0], confidence: 0.95, isExact: true };
            } else if (matches.length > 1) {
                // Duplicate boat names registered
                match = { boat: matches[0], confidence: 0.5, isExact: false, isAmbiguous: true };
            }
        }

        // Stage 3: Exact Skipper + Boat combination
        if (!match && normSkipper && normBoat) {
            const matches = registeredBoats.filter(
                b => normalizeText(b.skipper) === normSkipper && normalizeText(b.boatName) === normBoat
            );
            if (matches.length === 1) {
                match = { boat: matches[0], confidence: 0.95, isExact: true };
            } else if (matches.length > 1) {
                match = { boat: matches[0], confidence: 0.5, isExact: false, isAmbiguous: true };
            }
        }

        // Stage 4: Fuzzy String Similarity (>= 0.85) on Skipper or Boat Name
        // CRITICAL RULE: A fuzzy skipper/boat match NEVER auto-confirms, even if similarity exceeds 0.85.
        // It is strictly isExact: false, requiring explicit administrator confirmation (REVIEW).
        if (!match) {
            let bestScore = 0;
            let bestBoat: Boat | null = null;
            let highSimilarityMatches = 0;

            for (const b of registeredBoats) {
                const boatScore = normBoat ? stringSimilarity(normBoat, b.boatName) : 0;
                const skipperScore = normSkipper ? stringSimilarity(normSkipper, b.skipper) : 0;
                const maxScore = Math.max(boatScore, skipperScore);

                if (maxScore >= 0.85) {
                    highSimilarityMatches++;
                }
                if (maxScore > bestScore) {
                    bestScore = maxScore;
                    bestBoat = b;
                }
            }

            if (bestScore >= 0.85 && bestBoat) {
                match = {
                    boat: bestBoat,
                    confidence: bestScore,
                    isExact: false, // STRICTLY FALSE -> NEVER AUTO-CONFIRM
                    isAmbiguous: highSimilarityMatches > 1,
                    fuzzyScore: bestScore
                };
            }
        }

        if (match) {
            usedBoatIds.add(match.boat.id);
            const currentMatches = matchedMap.get(match.boat.id) || [];
            currentMatches.push({ entry: raw, candidate: match });
            matchedMap.set(match.boat.id, currentMatches);
        } else {
            unmatchedEntries.push({
                tempId: `unmatched_${i}`,
                rawEntry: raw,
                matchStatus: 'UNMATCHED'
            });
        }
    }

    // 4. Build results for LOCKED Keg Cup Qualifiers
    const matchedQualifiers: MatchedCompetitorResult[] = [];

    for (const q of qualifierBoats) {
        const matchesForBoat = matchedMap.get(q.id) || [];

        if (matchesForBoat.length === 0) {
            // Case 7: Competitor absent from sheet -> MISSING
            // MUST REMAIN strictly "No result assigned". NEVER default DNC!
            matchedQualifiers.push({
                boatId: q.id,
                skipper: q.skipper,
                boatName: q.boatName || '',
                sailNumber: q.sailNumber,
                isKegCupQualifier: true,
                matchStatus: 'MISSING',
                reviewReasons: [],
                scratchPlace: null,
                handicapPlace: null,
                statusCode: 'NONE',
                rawEntries: [],
                confidenceScore: 0.0,
                notes: 'Not detected on uploaded sheet(s). No result assigned.'
            });
            continue;
        }

        // Multiple entries matched the same registered qualifier (e.g. same-sheet duplicate sail #s)
        if (matchesForBoat.length > 1) {
            const reviewReasons: ReviewReason[] = ['DUPLICATE_SAIL_NUMBER', 'AMBIGUOUS_MATCH'];
            matchedQualifiers.push({
                boatId: q.id,
                skipper: q.skipper,
                boatName: q.boatName || matchesForBoat[0].candidate.boat.boatName || '',
                sailNumber: q.sailNumber,
                isKegCupQualifier: true,
                matchStatus: 'REVIEW',
                reviewReasons,
                scratchPlace: null,
                handicapPlace: null,
                statusCode: 'NONE',
                rawEntries: matchesForBoat.map(m => m.entry),
                confidenceScore: 0.5,
                notes: `Duplicate source rows detected on sheet (${matchesForBoat.length} rows). Requires administrator resolution.`,
                suggestedBoat: {
                    id: q.id,
                    skipper: q.skipper,
                    boatName: q.boatName || '',
                    sailNumber: q.sailNumber
                }
            });
            continue;
        }

        const { entry, candidate } = matchesForBoat[0];
        const reviewReasons: ReviewReason[] = [];

        // Check fuzzy or ambiguous match: strictly requires administrator review
        if (!candidate.isExact) {
            if (candidate.isAmbiguous) {
                reviewReasons.push('AMBIGUOUS_MATCH');
            } else {
                reviewReasons.push('FUZZY_NAME_MATCH');
            }
        }

        // Check multi-sheet conflict for this sail/boat
        const normSail = normalizeSailNumber(entry.rawSailNumber);
        const hasConflict = sheetConflicts.some(c => c.key === normSail);
        if (hasConflict) {
            reviewReasons.push('MULTI_SHEET_CONFLICT');
        }

        // Check status vs places
        const hasPenalty = entry.statusCode && entry.statusCode !== 'NONE';
        const hasScratch = entry.scratchPlace !== null && entry.scratchPlace !== undefined && entry.scratchPlace > 0;
        const hasHandicap = entry.handicapPlace !== null && entry.handicapPlace !== undefined && entry.handicapPlace > 0;

        if (!hasPenalty) {
            if (hasScratch && !hasHandicap) {
                reviewReasons.push('MISSING_HANDICAP');
            } else if (!hasScratch && hasHandicap) {
                reviewReasons.push('MISSING_SCRATCH');
            }
        }

        // Check Dead Heat
        if (hasScratch && (scratchCountMap.get(entry.scratchPlace!) || 0) > 1) {
            reviewReasons.push('DEAD_HEAT');
        }
        if (hasHandicap && (handicapCountMap.get(entry.handicapPlace!) || 0) > 1) {
            reviewReasons.push('DEAD_HEAT');
        }

        const matchStatus: MatchStatus = reviewReasons.length > 0 ? 'REVIEW' : 'CONFIRMED';

        matchedQualifiers.push({
            boatId: q.id,
            skipper: q.skipper,
            boatName: q.boatName || candidate.boat.boatName || '',
            sailNumber: q.sailNumber,
            isKegCupQualifier: true,
            matchStatus,
            reviewReasons,
            scratchPlace: hasPenalty ? null : (entry.scratchPlace ?? null),
            handicapPlace: hasPenalty ? null : (entry.handicapPlace ?? null),
            statusCode: entry.statusCode || 'NONE',
            rawEntries: [entry],
            confidenceScore: candidate.confidence,
            suggestedBoat: candidate.isExact ? undefined : {
                id: candidate.boat.id,
                skipper: candidate.boat.skipper,
                boatName: candidate.boat.boatName,
                sailNumber: candidate.boat.sailNumber
            }
        });
    }

    // 5. Metadata Comparison: Starters & Entrants (Explicit Confirmation)
    let detectedStarters: number | null = null;
    let detectedEntrants: number | null = null;
    let detectedDate: string | null = null;

    for (const res of extractionResults) {
        if (res.totalStartersFound && res.totalStartersFound > 0) {
            detectedStarters = res.totalStartersFound;
        }
        if (res.seriesEntrantsFound && res.seriesEntrantsFound > 0) {
            detectedEntrants = res.seriesEntrantsFound;
        }
        if (res.raceDate) {
            detectedDate = res.raceDate;
        }
    }

    const metadata: MetadataComparison = {
        starters: {
            current: activeRace.boatsAtStart,
            detected: detectedStarters,
            hasDiscrepancy: detectedStarters !== null && detectedStarters !== activeRace.boatsAtStart,
            confirmedValue: activeRace.boatsAtStart // Defaults to keeping current value
        },
        seriesEntrants: {
            current: activeRace.seriesEntrants,
            detected: detectedEntrants,
            hasDiscrepancy: detectedEntrants !== null && detectedEntrants !== activeRace.seriesEntrants,
            confirmedValue: activeRace.seriesEntrants // Defaults to keeping current value
        },
        raceDate: {
            current: activeRace.raceDate || '',
            detected: detectedDate,
            hasDiscrepancy: detectedDate !== null && detectedDate !== activeRace.raceDate,
            confirmedValue: activeRace.raceDate || ''
        }
    };

    // 6. Summary Stats
    const confirmedCount = matchedQualifiers.filter(m => m.matchStatus === 'CONFIRMED').length;
    const reviewCount = matchedQualifiers.filter(m => m.matchStatus === 'REVIEW').length;
    const missingCount = matchedQualifiers.filter(m => m.matchStatus === 'MISSING').length;

    return {
        matchedQualifiers,
        unmatchedEntries,
        metadata,
        summary: {
            totalQualifiers: qualifierBoats.length,
            confirmedCount,
            reviewCount,
            missingCount,
            unmatchedCount: unmatchedEntries.length
        }
    };
};
