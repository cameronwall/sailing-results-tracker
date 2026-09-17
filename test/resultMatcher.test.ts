import { describe, it, expect } from 'vitest';
import {
    normalizeSailNumber,
    normalizeText,
    stringSimilarity,
    mergeMultiSheetEntries,
    matchExtractedFleet
} from '../src/utils/resultMatcher';
import type { Boat, KegCupBoat, RaceMeta } from '../src/types';
import type { RawFleetExtractionResult } from '../src/types/import';

// Standard test fleet
const MOCK_REGISTERED_BOATS: Boat[] = [
    { id: 'b1', skipper: 'Cameron Wall', boatName: 'Zippy', sailNumber: '214582', results: [], nett: 0, total: 0, rank: 1 },
    { id: 'b2', skipper: 'John Hopkins', boatName: 'Wave Dancer', sailNumber: '198231', results: [], nett: 0, total: 0, rank: 2 },
    { id: 'b3', skipper: 'Ian Saunders', boatName: 'Blue Streak', sailNumber: '205411', results: [], nett: 0, total: 0, rank: 3 },
    { id: 'b4', skipper: 'Peter Conde', boatName: 'Flying Fish', sailNumber: '211904', results: [], nett: 0, total: 0, rank: 4 },
    { id: 'b5', skipper: 'Phil Brock', boatName: 'Slipstream', sailNumber: '203118', results: [], nett: 0, total: 0, rank: 5 },
    { id: 'b6', skipper: 'Garth Davies', boatName: 'White Squall', sailNumber: '194720', results: [], nett: 0, total: 0, rank: 6 },
    { id: 'b7', skipper: 'Mark Thornburrow', boatName: 'North Star', sailNumber: '217643', results: [], nett: 0, total: 0, rank: 7 },
    { id: 'b8', skipper: 'David Adams', boatName: 'Laser Beam', sailNumber: '189422', results: [], nett: 0, total: 0, rank: 8 },
    { id: 'b9', skipper: 'Phil Eadie', boatName: 'Falcon', sailNumber: '215600', results: [], nett: 0, total: 0, rank: 9 },
    { id: 'b10', skipper: 'Dutchy', boatName: 'Dutch Courage', sailNumber: '179211', results: [], nett: 0, total: 0, rank: 10 },
];

const MOCK_QUALIFIERS: KegCupBoat[] = [
    { id: 'b1', skipper: 'Cameron Wall', boatName: 'Zippy', sailNumber: '214582', raceResults: {} },
    { id: 'b2', skipper: 'John Hopkins', boatName: 'Wave Dancer', sailNumber: '198231', raceResults: {} },
    { id: 'b3', skipper: 'Ian Saunders', boatName: 'Blue Streak', sailNumber: '205411', raceResults: {} },
    { id: 'b4', skipper: 'Peter Conde', boatName: 'Flying Fish', sailNumber: '211904', raceResults: {} },
    { id: 'b5', skipper: 'Phil Brock', boatName: 'Slipstream', sailNumber: '203118', raceResults: {} },
    { id: 'b6', skipper: 'Garth Davies', boatName: 'White Squall', sailNumber: '194720', raceResults: {} },
    { id: 'b7', skipper: 'Mark Thornburrow', boatName: 'North Star', sailNumber: '217643', raceResults: {} },
    { id: 'b8', skipper: 'David Adams', boatName: 'Laser Beam', sailNumber: '189422', raceResults: {} },
];

const BASE_RACE: RaceMeta = {
    raceNumber: 6,
    raceDate: '2027-02-14',
    seriesEntrants: 21,
    boatsAtStart: 12,
    isCompleted: false
};

describe('V2.1 Official Results Matcher & 20-Case Test Matrix', () => {

    // Helper to run single sheet
    const runMatch = (entries: any[], metaOverrides: Partial<RawFleetExtractionResult> = {}) => {
        const sheet: RawFleetExtractionResult = {
            raceNumber: 6,
            sourceSheetType: 'COMBINED',
            entries,
            confidenceRating: 'HIGH',
            ...metaOverrides
        };
        return matchExtractedFleet({
            registeredBoats: MOCK_REGISTERED_BOATS,
            qualifierBoats: MOCK_QUALIFIERS,
            activeRace: BASE_RACE,
            extractionResults: [sheet]
        });
    };

    // -------------------------------------------------------------
    // Case 1: Standard Exact Match
    // -------------------------------------------------------------
    it('Case 1: Standard Exact Match (Sail #, Scratch & Handicap present -> CONFIRMED)', () => {
        const res = runMatch([
            { rawSailNumber: '214582', rawBoatName: 'Zippy', rawSkipperName: 'Cameron Wall', scratchPlace: 4, handicapPlace: 2 }
        ]);
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        expect(zippy.matchStatus).toBe('CONFIRMED');
        expect(zippy.scratchPlace).toBe(4);
        expect(zippy.handicapPlace).toBe(2);
        expect(zippy.statusCode).toBe('NONE');
    });

    // -------------------------------------------------------------
    // Case 2: Exact Sail Match, Minor Boat Name Typo
    // -------------------------------------------------------------
    it('Case 2: Exact Sail Match with Minor Boat Name Discrepancy (anchored by sail # -> CONFIRMED)', () => {
        const res = runMatch([
            { rawSailNumber: '214582', rawBoatName: 'Zippy II', rawSkipperName: 'Cameron Wall', scratchPlace: 5, handicapPlace: 3 }
        ]);
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        expect(zippy.matchStatus).toBe('CONFIRMED');
        expect(zippy.boatId).toBe('b1');
        expect(zippy.scratchPlace).toBe(5);
    });

    // -------------------------------------------------------------
    // Case 3: Exact Boat Name Match with Missing Sail Number
    // -------------------------------------------------------------
    it('Case 3: Exact Boat Name Match with Missing Sail Number (-> CONFIRMED)', () => {
        const res = runMatch([
            { rawSailNumber: '', rawBoatName: 'Wave Dancer', rawSkipperName: 'John Hopkins', scratchPlace: 3, handicapPlace: 5 }
        ]);
        const john = res.matchedQualifiers.find(b => b.boatId === 'b2')!;
        expect(john.matchStatus).toBe('CONFIRMED');
        expect(john.scratchPlace).toBe(3);
        expect(john.handicapPlace).toBe(5);
    });

    // -------------------------------------------------------------
    // Case 4: Skipper + Boat Match without Sail Number
    // -------------------------------------------------------------
    it('Case 4: Skipper + Boat Match without Sail Number (-> CONFIRMED)', () => {
        const res = runMatch([
            { rawSailNumber: undefined, rawBoatName: 'blue streak', rawSkipperName: 'ian saunders', scratchPlace: 2, handicapPlace: 4 }
        ]);
        const ian = res.matchedQualifiers.find(b => b.boatId === 'b3')!;
        expect(ian.matchStatus).toBe('CONFIRMED');
        expect(ian.scratchPlace).toBe(2);
    });

    // -------------------------------------------------------------
    // Case 5: Fuzzy Skipper/Boat Match (Similarity >= 0.85)
    // -------------------------------------------------------------
    it('Case 5: Fuzzy Skipper/Boat Match (Similarity >= 0.85 -> Flagged strictly as REVIEW)', () => {
        // "White Squal" instead of "White Squall", sail number missing or unrecognized
        const res = runMatch([
            { rawSailNumber: '999999', rawBoatName: 'White Squal', rawSkipperName: 'Garth Davis', scratchPlace: 6, handicapPlace: 7 }
        ]);
        const garth = res.matchedQualifiers.find(b => b.boatId === 'b6')!;
        expect(garth.matchStatus).toBe('REVIEW');
        expect(garth.reviewReasons).toContain('FUZZY_NAME_MATCH');
        expect(garth.suggestedBoat?.boatName).toBe('White Squall');
    });

    // -------------------------------------------------------------
    // Case 6: Unmatched Non-Keg-Cup Fleet Boat
    // -------------------------------------------------------------
    it('Case 6: Unmatched Non-Keg-Cup Fleet Boat (classified as UNMATCHED / ignored for Keg Cup)', () => {
        const res = runMatch([
            { rawSailNumber: '111222', rawBoatName: 'Guest Boat', rawSkipperName: 'Unknown Visitor', scratchPlace: 1, handicapPlace: 1 }
        ]);
        expect(res.unmatchedEntries.length).toBe(1);
        expect(res.unmatchedEntries[0].rawEntry.rawSailNumber).toBe('111222');
        // Keg Cup qualifiers should not have this guest boat
        expect(res.matchedQualifiers.every(q => q.sailNumber !== '111222')).toBe(true);
    });

    // -------------------------------------------------------------
    // Case 7: Missing Keg Cup Competitor (CRITICAL AMENDMENT 1)
    // -------------------------------------------------------------
    it('Case 7: Missing Keg Cup Competitor (MUST REMAIN strictly MISSING with NO result assigned - NEVER DNC)', () => {
        // Only boat b1 is in the sheet. Boats b2..b8 are absent
        const res = runMatch([
            { rawSailNumber: '214582', rawBoatName: 'Zippy', rawSkipperName: 'Cameron Wall', scratchPlace: 1, handicapPlace: 1 }
        ]);
        const john = res.matchedQualifiers.find(b => b.boatId === 'b2')!;
        expect(john.matchStatus).toBe('MISSING');
        expect(john.scratchPlace).toBeNull();
        expect(john.handicapPlace).toBeNull();
        expect(john.statusCode).toBe('NONE'); // MUST NOT BE DNC!
    });

    // -------------------------------------------------------------
    // Case 8: Scratch Present, Handicap Missing
    // -------------------------------------------------------------
    it('Case 8: Scratch Present, Handicap Missing (-> REVIEW with MISSING_HANDICAP)', () => {
        const res = runMatch([
            { rawSailNumber: '211904', rawBoatName: 'Flying Fish', scratchPlace: 3, handicapPlace: null }
        ]);
        const peter = res.matchedQualifiers.find(b => b.boatId === 'b4')!;
        expect(peter.matchStatus).toBe('REVIEW');
        expect(peter.reviewReasons).toContain('MISSING_HANDICAP');
        expect(peter.scratchPlace).toBe(3);
        expect(peter.handicapPlace).toBeNull();
    });

    // -------------------------------------------------------------
    // Case 9: Handicap Present, Scratch Missing
    // -------------------------------------------------------------
    it('Case 9: Handicap Present, Scratch Missing (-> REVIEW with MISSING_SCRATCH)', () => {
        const res = runMatch([
            { rawSailNumber: '203118', rawBoatName: 'Slipstream', scratchPlace: null, handicapPlace: 4 }
        ]);
        const phil = res.matchedQualifiers.find(b => b.boatId === 'b5')!;
        expect(phil.matchStatus).toBe('REVIEW');
        expect(phil.reviewReasons).toContain('MISSING_SCRATCH');
        expect(phil.handicapPlace).toBe(4);
    });

    // -------------------------------------------------------------
    // Case 10: Multi-Sheet Merge (Scratch Sheet + Handicap Sheet)
    // -------------------------------------------------------------
    it('Case 10: Multi-Sheet Merge (combines separate Scratch and Handicap sheets -> CONFIRMED)', () => {
        const sheet1: RawFleetExtractionResult = {
            sourceSheetType: 'SCRATCH',
            confidenceRating: 'HIGH',
            entries: [
                { rawSailNumber: '214582', scratchPlace: 3 }
            ]
        };
        const sheet2: RawFleetExtractionResult = {
            sourceSheetType: 'HANDICAP',
            confidenceRating: 'HIGH',
            entries: [
                { rawSailNumber: '214582', handicapPlace: 5 }
            ]
        };
        const res = matchExtractedFleet({
            registeredBoats: MOCK_REGISTERED_BOATS,
            qualifierBoats: MOCK_QUALIFIERS,
            activeRace: BASE_RACE,
            extractionResults: [sheet1, sheet2]
        });
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        expect(zippy.matchStatus).toBe('CONFIRMED');
        expect(zippy.scratchPlace).toBe(3);
        expect(zippy.handicapPlace).toBe(5);
    });

    // -------------------------------------------------------------
    // Case 11: Multi-Sheet Data Conflict
    // -------------------------------------------------------------
    it('Case 11: Multi-Sheet Data Conflict (conflicting placings across sheets -> REVIEW)', () => {
        const sheet1: RawFleetExtractionResult = {
            sourceSheetType: 'SCRATCH',
            confidenceRating: 'HIGH',
            entries: [
                { rawSailNumber: '214582', scratchPlace: 2 }
            ]
        };
        const sheet2: RawFleetExtractionResult = {
            sourceSheetType: 'COMBINED',
            confidenceRating: 'HIGH',
            entries: [
                { rawSailNumber: '214582', scratchPlace: 7, handicapPlace: 4 }
            ]
        };
        const res = matchExtractedFleet({
            registeredBoats: MOCK_REGISTERED_BOATS,
            qualifierBoats: MOCK_QUALIFIERS,
            activeRace: BASE_RACE,
            extractionResults: [sheet1, sheet2]
        });
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        expect(zippy.matchStatus).toBe('REVIEW');
        expect(zippy.reviewReasons).toContain('MULTI_SHEET_CONFLICT');
    });

    // -------------------------------------------------------------
    // Case 12: Official DNC on Sheet
    // -------------------------------------------------------------
    it('Case 12: Official DNC on Sheet (explicit DNC status on official sheet -> CONFIRMED DNC)', () => {
        const res = runMatch([
            { rawSailNumber: '198231', rawBoatName: 'Wave Dancer', statusCode: 'DNC' }
        ]);
        const john = res.matchedQualifiers.find(b => b.boatId === 'b2')!;
        expect(john.matchStatus).toBe('CONFIRMED');
        expect(john.statusCode).toBe('DNC');
        expect(john.scratchPlace).toBeNull();
        expect(john.handicapPlace).toBeNull();
    });

    // -------------------------------------------------------------
    // Case 13: Official Penalty (DNS / DNF / DSQ) on Sheet
    // -------------------------------------------------------------
    it('Case 13: Official Penalty (DNS/DNF/DSQ) on Sheet (-> CONFIRMED penalty)', () => {
        const res = runMatch([
            { rawSailNumber: '205411', rawBoatName: 'Blue Streak', statusCode: 'DNF' }
        ]);
        const ian = res.matchedQualifiers.find(b => b.boatId === 'b3')!;
        expect(ian.matchStatus).toBe('CONFIRMED');
        expect(ian.statusCode).toBe('DNF');
        expect(ian.scratchPlace).toBeNull();
        expect(ian.handicapPlace).toBeNull();
    });

    // -------------------------------------------------------------
    // Case 14: Dead Heat on Scratch
    // -------------------------------------------------------------
    it('Case 14: Dead Heat on Scratch (two boats share same scratch place -> REVIEW)', () => {
        const res = runMatch([
            { rawSailNumber: '214582', scratchPlace: 3, handicapPlace: 2 },
            { rawSailNumber: '198231', scratchPlace: 3, handicapPlace: 4 } // Shared 3rd place!
        ]);
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        const wave = res.matchedQualifiers.find(b => b.boatId === 'b2')!;
        expect(zippy.matchStatus).toBe('REVIEW');
        expect(zippy.reviewReasons).toContain('DEAD_HEAT');
        expect(wave.matchStatus).toBe('REVIEW');
        expect(wave.reviewReasons).toContain('DEAD_HEAT');
    });

    // -------------------------------------------------------------
    // Case 15: Dead Heat on Handicap
    // -------------------------------------------------------------
    it('Case 15: Dead Heat on Handicap (two boats share same handicap place -> REVIEW)', () => {
        const res = runMatch([
            { rawSailNumber: '214582', scratchPlace: 1, handicapPlace: 4 },
            { rawSailNumber: '211904', scratchPlace: 2, handicapPlace: 4 } // Shared 4th handicap
        ]);
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        const peter = res.matchedQualifiers.find(b => b.boatId === 'b4')!;
        expect(zippy.reviewReasons).toContain('DEAD_HEAT');
        expect(peter.reviewReasons).toContain('DEAD_HEAT');
    });

    // -------------------------------------------------------------
    // Case 16: Starters Count Discrepancy (CRITICAL AMENDMENT 2)
    // -------------------------------------------------------------
    it('Case 16: Starters Count Discrepancy (detected starters differs -> flagged for explicit confirmation)', () => {
        const res = runMatch([], { totalStartersFound: 14 }); // Base race has 12
        expect(res.metadata.starters.current).toBe(12);
        expect(res.metadata.starters.detected).toBe(14);
        expect(res.metadata.starters.hasDiscrepancy).toBe(true);
        // Confirmed value MUST default to current to prevent silent overwrite!
        expect(res.metadata.starters.confirmedValue).toBe(12);
    });

    // -------------------------------------------------------------
    // Case 17: Series Entrants Count Discrepancy (CRITICAL AMENDMENT 2)
    // -------------------------------------------------------------
    it('Case 17: Series Entrants Count Discrepancy (detected entrants differs -> flagged for explicit confirmation)', () => {
        const res = runMatch([], { seriesEntrantsFound: 22 }); // Base race has 21
        expect(res.metadata.seriesEntrants.current).toBe(21);
        expect(res.metadata.seriesEntrants.detected).toBe(22);
        expect(res.metadata.seriesEntrants.hasDiscrepancy).toBe(true);
        expect(res.metadata.seriesEntrants.confirmedValue).toBe(21);
    });

    // -------------------------------------------------------------
    // Case 18: Leading Zeros & Punctuation in Sail Number
    // -------------------------------------------------------------
    it('Case 18: Leading Zeros & Punctuation in Sail Number (AUS-0214582 normalizes to 214582 -> CONFIRMED)', () => {
        expect(normalizeSailNumber('AUS-0214582')).toBe('214582');
        expect(normalizeSailNumber(' AUS 214582 ')).toBe('214582');
        expect(normalizeSailNumber('00198231')).toBe('198231');

        const res = runMatch([
            { rawSailNumber: 'AUS-0214582', scratchPlace: 1, handicapPlace: 1 }
        ]);
        const zippy = res.matchedQualifiers.find(b => b.boatId === 'b1')!;
        expect(zippy.matchStatus).toBe('CONFIRMED');
        expect(zippy.sailNumber).toBe('214582');
    });

    // -------------------------------------------------------------
    // Case 19: Unreadable / Low-Confidence Sheet
    // -------------------------------------------------------------
    it('Case 19: Unreadable / Low-Confidence Sheet (handled gracefully, missing boats remain MISSING)', () => {
        const res = runMatch([], { confidenceRating: 'LOW' });
        expect(res.summary.missingCount).toBe(MOCK_QUALIFIERS.length);
        expect(res.matchedQualifiers.every(q => q.matchStatus === 'MISSING')).toBe(true);
        // Verify no penalties were assigned
        expect(res.matchedQualifiers.every(q => q.statusCode === 'NONE')).toBe(true);
    });

    // -------------------------------------------------------------
    // Case 20: Evidence / Draft Apply Data Transformation (CRITICAL AMENDMENT 3)
    // -------------------------------------------------------------
    it('Case 20: Evidence & Draft Apply Data Transformation (leaves MISSING empty, confirmed values ready for resultsState)', () => {
        const res = runMatch([
            { rawSailNumber: '214582', scratchPlace: 2, handicapPlace: 3 },
            { rawSailNumber: '198231', statusCode: 'DNF' }
            // All other boats missing
        ]);

        // Simulating the "Apply to Race Draft" projection into AdminRaceEntry.resultsState
        const draftResultsState: Record<string, any> = {};
        for (const q of res.matchedQualifiers) {
            if (q.matchStatus === 'CONFIRMED') {
                draftResultsState[q.boatId] = {
                    scratchPlace: q.scratchPlace,
                    handicapPlace: q.handicapPlace,
                    statusCode: q.statusCode
                };
            }
            // If MISSING, leave empty or statusCode 'NONE' with no places
        }

        expect(draftResultsState['b1']).toEqual({ scratchPlace: 2, handicapPlace: 3, statusCode: 'NONE' });
        expect(draftResultsState['b2']).toEqual({ scratchPlace: null, handicapPlace: null, statusCode: 'DNF' });
        // MISSING boat (b3) must NOT be in draftResultsState or have any DNC score!
        expect(draftResultsState['b3']).toBeUndefined();
    });
});
