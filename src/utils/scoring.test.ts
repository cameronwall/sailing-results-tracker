import { describe, it, expect } from 'vitest';
import { calculateScores, calculateDiscards } from './scoring';
import { type Boat, TOTAL_RACES } from '../types';

const createBoat = (id: string, results: (number | null)[]): Boat => ({
    id,
    skipper: id,
    boatName: id,
    sailNumber: id,
    results: [...results, ...Array(TOTAL_RACES - results.length).fill(null)],
    nett: 0,
    total: 0,
    rank: 0,
});

describe('Scoring Logic', () => {
    it('should calculate correct number of discards', () => {
        expect(calculateDiscards(4)).toBe(0);
        expect(calculateDiscards(5)).toBe(1);
        expect(calculateDiscards(9)).toBe(1);
        expect(calculateDiscards(10)).toBe(2);
        expect(calculateDiscards(14)).toBe(2);
        expect(calculateDiscards(15)).toBe(3);
        expect(calculateDiscards(16)).toBe(3);
    });

    it('should apply 0 discards for < 5 races', () => {
        const boats = [
            createBoat('A', [1, 2, 3, 4]),
            createBoat('B', [2, 3, 1, 1]),
        ];
        // Series has 4 races completed (max index with data)
        // Discards: 0

        const scored = calculateScores(boats);

        // Boat A: 1+2+3+4 = 10. Nett = 10.
        const boatA = scored.find(b => b.id === 'A');
        const boatB = scored.find(b => b.id === 'B');

        expect(boatA?.nett).toBe(10);
        expect(boatA?.total).toBe(10);

        // Boat B: 2+3+1+1 = 7. Nett = 7.
        expect(boatB?.nett).toBe(7);
        expect(boatB?.rank).toBe(1); // Lowest score wins
        expect(boatA?.rank).toBe(2);
    });

    it('should apply 1 discard for 5 races', () => {
        // Boat A: 1, 1, 1, 1, 5 (Total 9). Drops 5. Nett 4.
        // Boat B: 2, 2, 2, 2, 1 (Total 9). Drops 2. Nett 7.

        const boats = [
            createBoat('A', [1, 1, 1, 1, 5]),
            createBoat('B', [2, 2, 2, 2, 1]),
        ];

        const scored = calculateScores(boats);

        expect(scored.find(b => b.id === 'A')?.nett).toBe(4);
        expect(scored.find(b => b.id === 'B')?.nett).toBe(7);
    });

    it('should apply 3 discards for 16 races', () => {
        // 16 races
        // Boat A: 13x 1st, 3x 10th. (Total = 13 + 30 = 43). Drops 3x 10. Nett 13.

        const results = Array(13).fill(1).concat([10, 10, 10]);
        const boats = [createBoat('A', results)];

        const scored = calculateScores(boats);
        expect(scored[0].nett).toBe(13);
    });

    it('should calculate correct Nett for Ian Saunders case (Total 72, Discards 15, 9, 8)', () => {
        // User provided case: Total 72, Worst 3: 15, 9, 8.
        // Sum of discards = 32. Nett should be 72 - 32 = 40.
        // We create a mock result set that fits this profile.
        const ianResults = [15, 9, 8, 5, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2];
        const boats = [createBoat('Ian', ianResults)];

        const scored = calculateScores(boats);
        expect(scored[0].total).toBe(72);
        expect(scored[0].nett).toBe(40);
    });
});
