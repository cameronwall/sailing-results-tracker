import { describe, it, expect } from 'vitest';
import { calculateQualification } from './qualification';
import type { RawQualificationInput } from '../types';

describe('Pre-Christmas Qualification Engine', () => {
    // Helper to generate mock qualification inputs
    const makeBoat = (
        id: string,
        springRank: number,
        clubChampRank: number,
        racesSailed: number,
        racesAvailable: number = 10
    ): RawQualificationInput => ({
        boatId: id,
        skipper: `Skipper ${id}`,
        sailNumber: `AUS-${id}`,
        springRank,
        clubChampRank,
        racesSailed,
        racesAvailable
    });

    // Test 9: 40% participation qualification boundary
    it('9. should strictly enforce the 40% participation qualification boundary', () => {
        const boats: RawQualificationInput[] = [
            makeBoat('Boat_Below', 10, 10, 3, 8),   // 3 / 8 = 37.5% -> Ineligible (<40%)
            makeBoat('Boat_Above', 11, 11, 4, 8),   // 4 / 8 = 50.0% -> Eligible
            makeBoat('Boat_Exact', 12, 12, 2, 5),   // 2 / 5 = 40.0% -> Eligible (Exact boundary)
            makeBoat('Boat_Zero', 15, 15, 0, 10),   // 0 / 10 = 0% -> Ineligible
        ];

        const summary = calculateQualification(boats, 0.40);
        const boatBelow = summary.boats.find(b => b.boatId === 'Boat_Below');
        const boatAbove = summary.boats.find(b => b.boatId === 'Boat_Above');
        const boatExact = summary.boats.find(b => b.boatId === 'Boat_Exact');
        const boatZero = summary.boats.find(b => b.boatId === 'Boat_Zero');

        expect(boatBelow?.isEligible).toBe(false);
        expect(boatBelow?.isQualified).toBe(false);
        expect(boatBelow?.qualificationReason).toContain('Ineligible');

        expect(boatAbove?.isEligible).toBe(true);
        expect(boatExact?.isEligible).toBe(true);
        expect(boatZero?.isEligible).toBe(false);
    });

    // Test 10a: Bottom-half qualifier selection for ODD eligible fleet sizes (CEIL rule)
    it('10a. should use CEIL for odd eligible fleet size (15 eligible -> bottom 8 qualify)', () => {
        // Create 15 eligible boats with distinct qualification scores
        const inputs: RawQualificationInput[] = Array.from({ length: 15 }, (_, i) => {
            const rank = i + 1; // 1 to 15
            return makeBoat(`B${rank}`, rank, rank, 8, 10); // 80% participation
        });

        const summary = calculateQualification(inputs, 0.40);

        expect(summary.totalBoats).toBe(15);
        expect(summary.eligibleBoatsCount).toBe(15);
        expect(summary.qualifyingFleetTarget).toBe(8); // Math.ceil(15 / 2) = 8
        expect(summary.actualQualifiersCount).toBe(8);

        // Ranks 1 to 7 should be Championship Fleet (isQualified = false)
        for (let r = 1; r <= 7; r++) {
            const b = summary.boats.find(boat => boat.boatId === `B${r}`);
            expect(b?.isQualified).toBe(false);
        }

        // Ranks 8 to 15 should qualify for Keg Cup (isQualified = true)
        for (let r = 8; r <= 15; r++) {
            const b = summary.boats.find(boat => boat.boatId === `B${r}`);
            expect(b?.isQualified).toBe(true);
        }
    });

    // Test 10b: Bottom-half qualifier selection for EVEN eligible fleet sizes
    it('10b. should split evenly for even eligible fleet size (14 eligible -> bottom 7 qualify)', () => {
        const inputs: RawQualificationInput[] = Array.from({ length: 14 }, (_, i) => {
            const rank = i + 1; // 1 to 14
            return makeBoat(`B${rank}`, rank, rank, 6, 10);
        });

        const summary = calculateQualification(inputs, 0.40);

        expect(summary.eligibleBoatsCount).toBe(14);
        expect(summary.qualifyingFleetTarget).toBe(7); // 14 / 2 = 7
        expect(summary.actualQualifiersCount).toBe(7);

        // Top 7: not qualified
        for (let r = 1; r <= 7; r++) {
            expect(summary.boats.find(b => b.boatId === `B${r}`)?.isQualified).toBe(false);
        }

        // Bottom 7: qualified
        for (let r = 8; r <= 14; r++) {
            expect(summary.boats.find(b => b.boatId === `B${r}`)?.isQualified).toBe(true);
        }
    });

    // Test 11: Qualification Boundary Ties: both qualify
    it('11. should qualify BOTH boats when tied at the qualification boundary score', () => {
        // 10 eligible boats: target is bottom 5 (ranks 6, 7, 8, 9, 10)
        // Suppose rank 5 and rank 6 both have a Qualification Score of 6.0:
        // Ranks 1..4 have scores 1.0, 2.0, 3.0, 4.0
        // Ranks 5, 6 both have score 6.0
        // Ranks 7, 8, 9, 10 have scores 7.0, 8.0, 9.0, 10.0
        const inputs: RawQualificationInput[] = [
            makeBoat('B1', 1, 1, 5, 10), // Qual Score: 1.0
            makeBoat('B2', 2, 2, 5, 10), // Qual Score: 2.0
            makeBoat('B3', 3, 3, 5, 10), // Qual Score: 3.0
            makeBoat('B4', 4, 4, 5, 10), // Qual Score: 4.0
            makeBoat('B5', 5, 7, 5, 10), // Qual Score: 6.0 (Spring 5, Champ 7)
            makeBoat('B6', 6, 6, 5, 10), // Qual Score: 6.0 (Spring 6, Champ 6) - Boundary boat!
            makeBoat('B7', 7, 7, 5, 10), // Qual Score: 7.0
            makeBoat('B8', 8, 8, 5, 10), // Qual Score: 8.0
            makeBoat('B9', 9, 9, 5, 10), // Qual Score: 9.0
            makeBoat('B10', 10, 10, 5, 10) // Qual Score: 10.0
        ];

        const summary = calculateQualification(inputs, 0.40);

        expect(summary.eligibleBoatsCount).toBe(10);
        expect(summary.qualifyingFleetTarget).toBe(5);
        expect(summary.boundaryScore).toBe(6.0);

        // Because B5 and B6 are tied at 6.0, BOTH qualify!
        // Total qualifiers should be 6 (B5, B6, B7, B8, B9, B10)
        expect(summary.actualQualifiersCount).toBe(6);

        const b5 = summary.boats.find(b => b.boatId === 'B5');
        const b6 = summary.boats.find(b => b.boatId === 'B6');
        expect(b5?.isQualified).toBe(true);
        expect(b6?.isQualified).toBe(true);
        expect(b5?.qualificationReason).toContain('Tied at boundary score 6.0');
    });

    // Test 11b: Exclusion of inactive boats regardless of DNC inflated ranks
    it('11b. should not qualify inactive boats with high ranks due to DNC if they fail participation', () => {
        const inputs: RawQualificationInput[] = [
            makeBoat('Active_Top', 1, 1, 10, 10),      // Score: 1.0, 100% participation
            makeBoat('Active_Mid', 5, 5, 10, 10),      // Score: 5.0, 100% participation
            makeBoat('Active_Lower', 9, 9, 6, 10),     // Score: 9.0, 60% participation
            makeBoat('Ghost_Boat', 20, 20, 1, 10)      // Score: 20.0, 10% participation (<40%)
        ];

        const summary = calculateQualification(inputs, 0.40);
        const ghost = summary.boats.find(b => b.boatId === 'Ghost_Boat');

        // Ghost boat is ineligible despite bottom standings
        expect(ghost?.isEligible).toBe(false);
        expect(ghost?.isQualified).toBe(false);

        // Only Active_Top, Active_Mid, Active_Lower are eligible (3 boats)
        expect(summary.eligibleBoatsCount).toBe(3);
        // Math.ceil(3/2) = 2 qualify (Active_Mid and Active_Lower)
        expect(summary.actualQualifiersCount).toBe(2);
        expect(summary.boats.find(b => b.boatId === 'Active_Lower')?.isQualified).toBe(true);
        expect(summary.boats.find(b => b.boatId === 'Active_Mid')?.isQualified).toBe(true);
        expect(summary.boats.find(b => b.boatId === 'Active_Top')?.isQualified).toBe(false);
    });

    // Test 11c: Locked qualifiers immutability concept
    it('11c. demonstrates that a locked qualification snapshot preserves the fleet even if inputs later change', () => {
        const initialInputs: RawQualificationInput[] = [
            makeBoat('A', 1, 1, 8, 10),
            makeBoat('B', 2, 2, 8, 10),
            makeBoat('C', 7, 7, 8, 10),
            makeBoat('D', 8, 8, 8, 10)
        ];

        // 1. Initial snapshot locked before Christmas
        const initialSummary = calculateQualification(initialInputs, 0.40);
        const lockedQualifiers = initialSummary.boats
            .filter(b => b.isQualified)
            .map(b => ({ boatId: b.boatId, skipper: b.skipper }));

        expect(lockedQualifiers.map(q => q.boatId)).toEqual(['C', 'D']);

        // 2. Later in January, boat C dramatically improves in subsequent non-Keg-Cup MYC races
        const mutatedInputs: RawQualificationInput[] = [
            makeBoat('A', 2, 2, 12, 14),
            makeBoat('C', 1, 1, 12, 14), // Now #1 in MYC!
            makeBoat('B', 3, 3, 12, 14),
            makeBoat('D', 8, 8, 12, 14)
        ];

        // Recalculating live would exclude C:
        const liveSummary = calculateQualification(mutatedInputs, 0.40);
        const liveQualifiers = liveSummary.boats.filter(b => b.isQualified).map(b => b.boatId);
        expect(liveQualifiers).toEqual(['B', 'D']); // Live would drop C (now in top half) and qualify B and D

        // BUT the locked fleet retains Boat C:
        const preservedFleet = lockedQualifiers.map(q => q.boatId);
        expect(preservedFleet).toContain('C');
        expect(preservedFleet).toEqual(['C', 'D']);
    });
});
