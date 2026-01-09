import { type Boat, TOTAL_RACES } from '../types';

export const calculateDiscards = (completedRaces: number): number => {
    if (completedRaces >= 15) return 3;
    if (completedRaces >= 10) return 2;
    if (completedRaces >= 5) return 1;
    return 0;
};

export const calculateScores = (boats: Boat[]): Boat[] => {
    // 1. Determine which races have been "sailed" (at least one result entered)
    const completedRaceIndices: number[] = [];
    for (let i = 0; i < TOTAL_RACES; i++) {
        const hasResult = boats.some(b => b.results[i] !== null && b.results[i] !== 0);
        if (hasResult) completedRaceIndices.push(i);
    }

    const numDiscards = calculateDiscards(completedRaceIndices.length);

    const scoredBoats = boats.map(boat => {
        // Calculate scores only for completed races
        // If a boat has no result in a completed race, IT IS A DNC (Boats + 1)
        const penaltyScore = boats.length + 1;

        const seriesScores = completedRaceIndices.map(raceIdx => {
            const res = boat.results[raceIdx];
            return (res === null || res === 0) ? penaltyScore : res;
        });

        // Calculate Total (Sum of all completed races)
        const total = seriesScores.reduce((a, b) => a + b, 0);

        // Calculate Nett
        // Sort descending to find worst scores
        const sortedScores = [...seriesScores].sort((a, b) => b - a);

        // Remove discards
        const keptScores = sortedScores.slice(numDiscards);
        const nett = keptScores.reduce((a, b) => a + b, 0);

        return { ...boat, total, nett };
    });

    // Rank boats by Nett, then Total (tie-breaker)
    scoredBoats.sort((a, b) => {
        if (a.nett !== b.nett) return a.nett - b.nett;
        return a.total - b.total; // Simple tie-breaker
    });

    // Assign ranks
    scoredBoats.forEach((boat, index) => {
        boat.rank = index + 1;
    });

    return scoredBoats;
};
