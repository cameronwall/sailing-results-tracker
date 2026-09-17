import { describe, it, expect } from 'vitest';
import {
    calculateKegCupRaceScore,
    calculateDiscards,
    calculateKegCupSeries,
    validateRaceResult,
    validateRacePublish
} from './kegCupScoring';
import type { KegCupBoat, RaceMeta } from '../types';

describe('Keg Cup Race Scoring Engine', () => {
    const standardRace: RaceMeta = {
        raceNumber: 1,
        raceDate: '2027-01-17',
        seriesEntrants: 21,
        boatsAtStart: 12,
        isCompleted: true
    };

    // Test 1: Scratch 3 + Handicap 5 = 4.0
    it('1. should calculate Scratch 3 + Handicap 5 = 4.0', () => {
        const result = calculateKegCupRaceScore(
            { scratchPlace: 3, handicapPlace: 5, statusCode: 'NONE' },
            standardRace
        );
        expect(result.calculatedScore).toBe(4.0);
        expect(result.isPenalty).toBe(false);
        expect(result.isMissing).toBe(false);
    });

    // Test 2: Scratch 2 + Handicap 3 = 2.5
    it('2. should calculate Scratch 2 + Handicap 3 = 2.5', () => {
        const result = calculateKegCupRaceScore(
            { scratchPlace: 2, handicapPlace: 3, statusCode: 'NONE' },
            standardRace
        );
        expect(result.calculatedScore).toBe(2.5);
        expect(result.isPenalty).toBe(false);
    });

    // Test 3: Scratch 8 + Handicap 2 = 5.0
    it('3. should calculate Scratch 8 + Handicap 2 = 5.0', () => {
        const result = calculateKegCupRaceScore(
            { scratchPlace: 8, handicapPlace: 2, statusCode: 'NONE' },
            standardRace
        );
        expect(result.calculatedScore).toBe(5.0);
        expect(result.isPenalty).toBe(false);
    });

    // Test 4: DNC for 21 series entrants = 22
    it('4. should calculate DNC for 21 series entrants = 22', () => {
        const result = calculateKegCupRaceScore(
            { statusCode: 'DNC' },
            standardRace
        );
        expect(result.calculatedScore).toBe(22); // 21 + 1
        expect(result.isPenalty).toBe(true);
        expect(result.statusCode).toBe('DNC');
    });

    // Test 5: DNS with 12 boats at starting area = 13
    it('5. should calculate DNS with 12 boats at starting area = 13', () => {
        const result = calculateKegCupRaceScore(
            { statusCode: 'DNS' },
            standardRace
        );
        expect(result.calculatedScore).toBe(13); // 12 + 1
        expect(result.isPenalty).toBe(true);
        expect(result.statusCode).toBe('DNS');
    });

    // Test 6: DNF with 12 boats at starting area = 13
    it('6. should calculate DNF with 12 boats at starting area = 13', () => {
        const result = calculateKegCupRaceScore(
            { statusCode: 'DNF' },
            standardRace
        );
        expect(result.calculatedScore).toBe(13); // 12 + 1
        expect(result.isPenalty).toBe(true);
        expect(result.statusCode).toBe('DNF');
    });

    // Test 7: DSQ with 12 boats at starting area = 13
    it('7. should calculate DSQ with 12 boats at starting area = 13', () => {
        const result = calculateKegCupRaceScore(
            { statusCode: 'DSQ' },
            standardRace
        );
        expect(result.calculatedScore).toBe(13); // 12 + 1
        expect(result.isPenalty).toBe(true);
        expect(result.statusCode).toBe('DSQ');
    });

    // Test 8: Missing result behaviour
    it('8. should treat missing result in completed race as DNC penalty (seriesEntrants + 1)', () => {
        const result = calculateKegCupRaceScore(undefined, standardRace);
        expect(result.calculatedScore).toBe(22);
        expect(result.statusCode).toBe('DNC');
        expect(result.isMissing).toBe(true);
        expect(result.isPenalty).toBe(true);
    });

    it('8b. should return score 0 and no penalty for missing result in uncompleted race', () => {
        const uncompletedRace: RaceMeta = { ...standardRace, isCompleted: false };
        const result = calculateKegCupRaceScore(undefined, uncompletedRace);
        expect(result.calculatedScore).toBe(0);
        expect(result.isPenalty).toBe(false);
        expect(result.isMissing).toBe(true);
    });

    // Test 12: Existing discard thresholds still work with decimal scores
    it('12. should calculate correct discards and nett with decimal scores', () => {
        expect(calculateDiscards(4)).toBe(0);
        expect(calculateDiscards(5)).toBe(1);
        expect(calculateDiscards(9)).toBe(1);
        expect(calculateDiscards(10)).toBe(2);
        expect(calculateDiscards(14)).toBe(2);
        expect(calculateDiscards(15)).toBe(3);
        expect(calculateDiscards(18)).toBe(3);

        // Test with 5 completed races, dropping the worst decimal score
        const races: RaceMeta[] = Array.from({ length: 5 }, (_, i) => ({
            raceNumber: i + 1,
            seriesEntrants: 21,
            boatsAtStart: 12,
            isCompleted: true
        }));

        // Boat A: scores 2.5, 3.0, 4.0, 2.5, 10.5 -> drops 10.5. Nett = 12.0. Total = 22.5
        const boatA: KegCupBoat = {
            id: 'boat-a',
            skipper: 'Cameron Wall',
            sailNumber: '214582',
            raceResults: {
                1: { scratchPlace: 2, handicapPlace: 3 }, // 2.5
                2: { scratchPlace: 3, handicapPlace: 3 }, // 3.0
                3: { scratchPlace: 4, handicapPlace: 4 }, // 4.0
                4: { scratchPlace: 2, handicapPlace: 3 }, // 2.5
                5: { scratchPlace: 10, handicapPlace: 11 } // 10.5
            }
        };

        const scored = calculateKegCupSeries([boatA], races);
        expect(scored[0].total).toBe(22.5);
        expect(scored[0].nett).toBe(12.0);
        expect(scored[0].discardedRaceNumbers).toEqual([5]);
        expect(scored[0].scores[5].isDiscarded).toBe(true);
    });

    // Test 13: Discard count is based on actual completed races, not highest race number
    it('13. should base discards on actual completed races, not highest race number', () => {
        // 4 completed races even though highest race number is 6 (race 3 and 5 abandoned)
        const races: RaceMeta[] = [
            { raceNumber: 1, seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            { raceNumber: 2, seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            { raceNumber: 3, seriesEntrants: 21, boatsAtStart: 12, isCompleted: false }, // Abandoned
            { raceNumber: 4, seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            { raceNumber: 5, seriesEntrants: 21, boatsAtStart: 12, isCompleted: false }, // Abandoned
            { raceNumber: 6, seriesEntrants: 21, boatsAtStart: 12, isCompleted: true }
        ];

        // Total completed races = 4 -> should have 0 discards (NOT 1 discard even though max race is 6)
        const completedCount = races.filter(r => r.isCompleted).length;
        expect(completedCount).toBe(4);
        expect(calculateDiscards(completedCount)).toBe(0);

        const boat: KegCupBoat = {
            id: 'boat-1',
            skipper: 'Skipper 1',
            sailNumber: '111',
            raceResults: {
                1: { scratchPlace: 1, handicapPlace: 1 },
                2: { scratchPlace: 2, handicapPlace: 2 },
                4: { scratchPlace: 3, handicapPlace: 3 },
                6: { scratchPlace: 4, handicapPlace: 4 }
            }
        };

        const scored = calculateKegCupSeries([boat], races);
        expect(scored[0].discardedRaceNumbers.length).toBe(0);
        expect(scored[0].nett).toBe(scored[0].total);
    });

    // Test 14: Invalid combinations
    it('14. should reject invalid result combinations', () => {
        // DNF + scratch position
        const invalidDNF = validateRaceResult({
            statusCode: 'DNF',
            scratchPlace: 3
        });
        expect(invalidDNF.valid).toBe(false);
        expect(invalidDNF.error).toContain('cannot specify scratch');

        // DNS + handicap position
        const invalidDNS = validateRaceResult({
            statusCode: 'DNS',
            handicapPlace: 4
        });
        expect(invalidDNS.valid).toBe(false);
        expect(invalidDNS.error).toContain('cannot specify');

        // Scratch without Handicap
        const missingHandicap = validateRaceResult({
            scratchPlace: 3,
            handicapPlace: null
        });
        expect(missingHandicap.valid).toBe(false);
        expect(missingHandicap.error).toContain('both Scratch and Handicap');

        // Handicap without Scratch
        const missingScratch = validateRaceResult({
            scratchPlace: null,
            handicapPlace: 4
        });
        expect(missingScratch.valid).toBe(false);

        // Valid Finish
        const validFinish = validateRaceResult({
            scratchPlace: 3,
            handicapPlace: 5,
            statusCode: 'NONE'
        });
        expect(validFinish.valid).toBe(true);

        // Valid Penalty
        const validPenalty = validateRaceResult({
            statusCode: 'DSQ'
        });
        expect(validPenalty.valid).toBe(true);
    });

    // Test 15: Draft vs Completed/Published race behavior (Rule 4)
    it('15. should NOT assign DNC penalties to unentered boats in draft races, but assign DNC once published', () => {
        const boatA: KegCupBoat = {
            id: 'boat-a',
            skipper: 'Skipper A',
            sailNumber: '100',
            raceResults: {} // No result entered yet
        };

        const draftRace: RaceMeta = {
            raceNumber: 1,
            seriesEntrants: 21,
            boatsAtStart: 12,
            isCompleted: false // Draft race!
        };

        // In draft race: unentered boat receives score 0, not a penalty
        const draftScore = calculateKegCupRaceScore(undefined, draftRace);
        expect(draftScore.calculatedScore).toBe(0);
        expect(draftScore.isPenalty).toBe(false);
        expect(draftScore.isMissing).toBe(true);

        // In draft race: series scoring does not count uncompleted race
        const draftSeries = calculateKegCupSeries([boatA], [draftRace]);
        expect(draftSeries[0].total).toBe(0);
        expect(draftSeries[0].nett).toBe(0);

        // In published/completed race: unentered boat receives DNC = seriesEntrants + 1
        const publishedRace: RaceMeta = { ...draftRace, isCompleted: true };
        const publishedScore = calculateKegCupRaceScore(undefined, publishedRace);
        expect(publishedScore.calculatedScore).toBe(22); // 21 + 1
        expect(publishedScore.statusCode).toBe('DNC');
        expect(publishedScore.isPenalty).toBe(true);

        const publishedSeries = calculateKegCupSeries([boatA], [publishedRace]);
        expect(publishedSeries[0].total).toBe(22);
        expect(publishedSeries[0].nett).toBe(22);
    });

    // Test 16: Complete fleet placing validation (Rule 3)
    it('16. should accept placings in the complete fleet (e.g. Scratch 14, Handicap 11) regardless of Keg Cup fleet size', () => {
        const race: RaceMeta = {
            raceNumber: 1,
            seriesEntrants: 21,
            boatsAtStart: 15,
            isCompleted: true
        };

        // Competitor placed 14th across line and 11th on handicap in the full 21-boat fleet
        const result = calculateKegCupRaceScore(
            { scratchPlace: 14, handicapPlace: 11, statusCode: 'NONE' },
            race
        );

        expect(result.calculatedScore).toBe((14 + 11) / 2); // 12.5
        expect(result.isPenalty).toBe(false);
        expect(validateRaceResult({ scratchPlace: 14, handicapPlace: 11 }).valid).toBe(true);
    });

    // Test 17: Phase 6C publish validation - Metadata rules
    it('17. should enforce Phase 6C race metadata rules (date, entrants > 0, starters > 0, starters <= entrants)', () => {
        const qualifiers = [{ id: 'b1', skipper: 'Skipper A' }];
        const results = { b1: { scratchPlace: 1, handicapPlace: 1, statusCode: 'NONE' as const } };

        // Missing date
        const noDate = validateRacePublish(
            { raceNumber: 1, raceDate: '', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            results,
            qualifiers
        );
        expect(noDate.valid).toBe(false);
        expect(noDate.errors[0]).toContain('Race date');

        // Starters > Entrants
        const invalidFleet = validateRacePublish(
            { raceNumber: 1, raceDate: '2026-10-15', seriesEntrants: 15, boatsAtStart: 18, isCompleted: true },
            results,
            qualifiers
        );
        expect(invalidFleet.valid).toBe(false);
        expect(invalidFleet.errors[0]).toContain('cannot exceed Total Series Entrants');
    });

    // Test 18: Phase 6C publish validation - Finish and penalty constraints
    it('18. should enforce Scratch/Handicap constraints and forbid mixing penalties with placings', () => {
        const qualifiers = [
            { id: 'b1', skipper: 'Skipper A' },
            { id: 'b2', skipper: 'Skipper B' }
        ];

        // Mixing DNF with Scratch
        const mixedPenalty = validateRacePublish(
            { raceNumber: 1, raceDate: '2026-10-15', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            {
                b1: { scratchPlace: 3, handicapPlace: null, statusCode: 'DNF' as const },
                b2: { scratchPlace: 2, handicapPlace: 2, statusCode: 'NONE' as const }
            },
            qualifiers
        );
        expect(mixedPenalty.valid).toBe(false);
        expect(mixedPenalty.errors[0]).toContain('Cannot combine penalty status');

        // Finisher exceeding starters
        const outOfBounds = validateRacePublish(
            { raceNumber: 1, raceDate: '2026-10-15', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            {
                b1: { scratchPlace: 14, handicapPlace: 5, statusCode: 'NONE' as const }, // 14 > 12 starters!
                b2: { scratchPlace: 2, handicapPlace: 2, statusCode: 'NONE' as const }
            },
            qualifiers
        );
        expect(outOfBounds.valid).toBe(false);
        expect(outOfBounds.errors[0]).toContain('cannot exceed Boats at Start');
    });

    // Test 19: Phase 6C publish validation - Duplicate placings flagging
    it('19. should flag duplicate Scratch or Handicap positions to prevent accidental duplicate placings', () => {
        const qualifiers = [
            { id: 'b1', skipper: 'Skipper A' },
            { id: 'b2', skipper: 'Skipper B' },
            { id: 'b3', skipper: 'Skipper C' }
        ];

        // b1 and b2 both have Scratch place 3 (accidental duplicate)
        const duplicateScratch = validateRacePublish(
            { raceNumber: 1, raceDate: '2026-10-15', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
            {
                b1: { scratchPlace: 3, handicapPlace: 2, statusCode: 'NONE' as const },
                b2: { scratchPlace: 3, handicapPlace: 4, statusCode: 'NONE' as const },
                b3: { scratchPlace: 5, handicapPlace: 5, statusCode: 'NONE' as const }
            },
            qualifiers
        );

        expect(duplicateScratch.valid).toBe(true); // valid without hard error, but has warnings
        expect(duplicateScratch.warnings.length).toBe(1);
        expect(duplicateScratch.warnings[0]).toContain('Duplicate Scratch position #3');
        expect(duplicateScratch.warnings[0]).toContain('Skipper A, Skipper B');
    });
});

