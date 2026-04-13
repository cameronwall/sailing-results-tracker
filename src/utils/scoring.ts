import { type Boat, TOTAL_RACES } from '../types';

export const calculateDiscards = (completedRaces: number): number => {
    if (completedRaces >= 15) return 3;
    if (completedRaces >= 10) return 2;
    if (completedRaces >= 5) return 1;
    return 0;
};

export const getCompletedRaceIndices = (boats: Boat[]): number[] => {
    const indices: number[] = [];
    for (let i = 0; i < TOTAL_RACES; i++) {
        const hasResult = boats.some(b => {
            const val = b.results[i];
            return val !== null && val !== undefined && val !== 0 && Number(val) > 0;
        });
        if (hasResult) indices.push(i);
    }
    return indices;
};

export const getHighestRaceNumber = (boats: Boat[]): number => {
    let maxRace = 0;
    for (let i = 0; i < TOTAL_RACES; i++) {
        const hasResult = boats.some(b => {
            const val = b.results[i];
            return val !== null && val !== undefined && val !== 0 && Number(val) > 0;
        });
        if (hasResult) {
            maxRace = i + 1; // 1-based race number
        }
    }
    return maxRace;
};

export const calculateScores = (boats: Boat[]): Boat[] => {
    const completedRaceIndices = getCompletedRaceIndices(boats);
    const highestRaceNumber = getHighestRaceNumber(boats);
    const numDiscards = calculateDiscards(highestRaceNumber);

    const scoredBoats = boats.map(boat => {
        // Calculate scores only for completed races
        // If a boat has no result in a completed race, IT IS A DNC (Boats + 1)
        const penaltyScore = boats.length + 1;

        const seriesScores = completedRaceIndices.map(raceIdx => {
            const val = boat.results[raceIdx] as any;
            const hasScore = val !== null && val !== 0 && val !== '';

            // Force number coercion just in case JSON stored strings
            const score = hasScore ? Number(val) : penaltyScore;
            return isNaN(score) ? penaltyScore : score;
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
