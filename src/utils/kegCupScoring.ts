import {
    type KegCupBoat,
    type RaceMeta,
    type RaceResultSource,
    type CalculatedRaceResult,
    type ScoredKegCupBoat,
    type DiscardRule,
    type TieBreakMethod,
    DEFAULT_DISCARD_RULES
} from '../types';

/**
 * Validates race result source data to prevent logically invalid combinations.
 * e.g., DNF with a scratch or handicap placing.
 */
export const validateRaceResult = (
    source: RaceResultSource | undefined
): { valid: boolean; error?: string } => {
    if (!source) return { valid: true };

    const hasStatusCode = source.statusCode && source.statusCode !== 'NONE';
    const hasScratch = source.scratchPlace !== null && source.scratchPlace !== undefined && source.scratchPlace !== 0;
    const hasHandicap = source.handicapPlace !== null && source.handicapPlace !== undefined && source.handicapPlace !== 0;

    if (hasStatusCode && (hasScratch || hasHandicap)) {
        return {
            valid: false,
            error: `Invalid result: cannot specify scratch (${source.scratchPlace}) or handicap (${source.handicapPlace}) when penalty status (${source.statusCode}) is selected.`
        };
    }

    if (!hasStatusCode && (hasScratch !== hasHandicap)) {
        return {
            valid: false,
            error: 'Invalid result: both Scratch and Handicap places must be provided for a valid finish.'
        };
    }

    if (hasScratch && Number(source.scratchPlace) < 1) {
        return { valid: false, error: 'Scratch place must be greater than or equal to 1.' };
    }

    if (hasHandicap && Number(source.handicapPlace) < 1) {
        return { valid: false, error: 'Handicap place must be greater than or equal to 1.' };
    }

    return { valid: true };
};

export interface RacePublishValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Validates complete race payload before allowing Complete & Publish.
 * Enforces date, fleet counts, finish places, status codes, and flags duplicate places.
 */
export const validateRacePublish = (
    raceMeta: RaceMeta,
    results: Record<string, RaceResultSource>,
    qualifierBoats: { id: string; skipper: string }[]
): RacePublishValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Race Date exists
    if (!raceMeta.raceDate || !raceMeta.raceDate.trim()) {
        errors.push('Race date is required before publishing.');
    }

    // 2. Series entrants > 0
    if (!raceMeta.seriesEntrants || raceMeta.seriesEntrants <= 0) {
        errors.push('Total Series Entrants must be greater than 0.');
    }

    // 3. Boats at start > 0
    if (!raceMeta.boatsAtStart || raceMeta.boatsAtStart <= 0) {
        errors.push('Boats at Start must be greater than 0.');
    }

    // 4. Boats at start <= series entrants
    if (raceMeta.boatsAtStart && raceMeta.seriesEntrants && raceMeta.boatsAtStart > raceMeta.seriesEntrants) {
        errors.push(`Boats at Start (${raceMeta.boatsAtStart}) cannot exceed Total Series Entrants (${raceMeta.seriesEntrants}).`);
    }

    // 5. Validate every qualifier boat's result
    const scratchPlaces: { place: number; skipper: string }[] = [];
    const handicapPlaces: { place: number; skipper: string }[] = [];

    for (const boat of qualifierBoats) {
        const res = results[boat.id];
        if (!res) {
            errors.push(`Missing result entry for ${boat.skipper}.`);
            continue;
        }

        const isPenalty = res.statusCode && res.statusCode !== 'NONE';
        const hasScratch = res.scratchPlace !== null && res.scratchPlace !== undefined && res.scratchPlace !== 0;
        const hasHandicap = res.handicapPlace !== null && res.handicapPlace !== undefined && res.handicapPlace !== 0;

        // Penalty cannot have Scratch or Handicap
        if (isPenalty && (hasScratch || hasHandicap)) {
            errors.push(`${boat.skipper}: Cannot combine penalty status (${res.statusCode}) with Scratch or Handicap positions.`);
        }

        // Normal finish requires both Scratch and Handicap
        if (!isPenalty) {
            if (!hasScratch || !hasHandicap) {
                errors.push(`${boat.skipper}: Normal finish requires both Scratch and Handicap positions, or an official penalty code.`);
            } else {
                const s = Number(res.scratchPlace);
                const h = Number(res.handicapPlace);

                if (s < 1) {
                    errors.push(`${boat.skipper}: Scratch position must be >= 1.`);
                }
                if (h < 1) {
                    errors.push(`${boat.skipper}: Handicap position must be >= 1.`);
                }

                // Scratch <= boatsAtStart (finishers cannot finish behind fleet starters)
                if (raceMeta.boatsAtStart && s > raceMeta.boatsAtStart) {
                    errors.push(`${boat.skipper}: Scratch position (${s}) cannot exceed Boats at Start (${raceMeta.boatsAtStart}).`);
                }

                // Handicap <= max fleet
                const maxFleet = Math.max(raceMeta.seriesEntrants || 0, raceMeta.boatsAtStart || 0);
                if (maxFleet > 0 && h > maxFleet) {
                    errors.push(`${boat.skipper}: Handicap position (${h}) cannot exceed fleet maximum (${maxFleet}).`);
                }

                scratchPlaces.push({ place: s, skipper: boat.skipper });
                handicapPlaces.push({ place: h, skipper: boat.skipper });
            }
        }
    }

    // 6. Duplicate placings check (dead heats / ties)
    const scratchGroups = new Map<number, string[]>();
    scratchPlaces.forEach(p => {
        const list = scratchGroups.get(p.place) || [];
        list.push(p.skipper);
        scratchGroups.set(p.place, list);
    });

    scratchGroups.forEach((skippers, place) => {
        if (skippers.length > 1) {
            warnings.push(`Duplicate Scratch position #${place} detected for: ${skippers.join(', ')}. If this is a legitimate dead heat tie under RRS A7, confirm tie approval.`);
        }
    });

    const handicapGroups = new Map<number, string[]>();
    handicapPlaces.forEach(p => {
        const list = handicapGroups.get(p.place) || [];
        list.push(p.skipper);
        handicapGroups.set(p.place, list);
    });

    handicapGroups.forEach((skippers, place) => {
        if (skippers.length > 1) {
            warnings.push(`Duplicate Handicap position #${place} detected for: ${skippers.join(', ')}. If this is an official tied handicap rating, confirm tie approval.`);
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Calculates a single race score for a boat based on official MYC fleet results or penalties.
 * 
 * Rules:
 * 1. Valid finish: (Scratch Place + Handicap Place) / 2
 * 2. DNC penalty: seriesEntrants + 1
 * 3. DNS / DNF / DSQ penalty: boatsAtStart + 1
 * 4. Missing score on completed race: treated as DNC = seriesEntrants + 1
 */
export const calculateKegCupRaceScore = (
    source: RaceResultSource | undefined,
    race: RaceMeta
): CalculatedRaceResult => {
    const raceNumber = race.raceNumber;

    // Check for explicit penalty status
    if (source?.statusCode && source.statusCode !== 'NONE') {
        const statusCode = source.statusCode;
        let score: number;

        if (statusCode === 'DNC') {
            score = race.seriesEntrants + 1;
        } else {
            // DNS, DNF, DSQ use boats that came to the starting area for that race + 1
            score = race.boatsAtStart + 1;
        }

        return {
            raceNumber,
            scratchPlace: null,
            handicapPlace: null,
            statusCode,
            calculatedScore: score,
            isPenalty: true,
            isMissing: false
        };
    }

    const scratch = source?.scratchPlace;
    const handicap = source?.handicapPlace;
    const hasValidFinish = scratch !== null && scratch !== undefined && scratch > 0 &&
                           handicap !== null && handicap !== undefined && handicap > 0;

    if (hasValidFinish) {
        const calculatedScore = (Number(scratch) + Number(handicap)) / 2.0;
        return {
            raceNumber,
            scratchPlace: Number(scratch),
            handicapPlace: Number(handicap),
            statusCode: 'NONE',
            calculatedScore,
            isPenalty: false,
            isMissing: false
        };
    }

    // No valid finish and no explicit penalty
    if (race.isCompleted) {
        // Missing result in a completed race is scored as DNC
        const score = race.seriesEntrants + 1;
        return {
            raceNumber,
            scratchPlace: null,
            handicapPlace: null,
            statusCode: 'DNC',
            calculatedScore: score,
            isPenalty: true,
            isMissing: true
        };
    }

    // Race not completed yet
    return {
        raceNumber,
        scratchPlace: null,
        handicapPlace: null,
        statusCode: 'NONE',
        calculatedScore: 0,
        isPenalty: false,
        isMissing: true
    };
};

/**
 * Calculates number of discards based on actual completed races (not highest race number).
 * Cancelled or skipped races do not trigger discards.
 */
export const calculateDiscards = (
    completedRacesCount: number,
    rules: DiscardRule[] = DEFAULT_DISCARD_RULES
): number => {
    const sortedRules = [...rules].sort((a, b) => b.completedRaces - a.completedRaces);
    for (const rule of sortedRules) {
        if (completedRacesCount >= rule.completedRaces) {
            return rule.discards;
        }
    }
    return 0;
};

export interface SeriesScoreOptions {
    discardRules?: DiscardRule[];
    tieBreakMethod?: TieBreakMethod;
}

/**
 * Calculates the complete Keg Cup series standings.
 */
export const calculateKegCupSeries = (
    boats: KegCupBoat[],
    races: RaceMeta[],
    options?: SeriesScoreOptions
): ScoredKegCupBoat[] => {
    const discardRules = options?.discardRules || DEFAULT_DISCARD_RULES;
    const tieBreakMethod = options?.tieBreakMethod || 'NETT_THEN_TOTAL';

    // Count actual completed races
    const completedRaces = races.filter(r => r.isCompleted);
    const completedRacesCount = completedRaces.length;
    const numDiscards = calculateDiscards(completedRacesCount, discardRules);

    const scoredBoats: ScoredKegCupBoat[] = boats.map(boat => {
        const scoresMap: Record<number, CalculatedRaceResult> = {};
        const completedResults: CalculatedRaceResult[] = [];

        for (const race of races) {
            const source = boat.raceResults[race.raceNumber];
            const calculated = calculateKegCupRaceScore(source, race);
            scoresMap[race.raceNumber] = calculated;

            if (race.isCompleted) {
                completedResults.push(calculated);
            }
        }

        // Sum gross total of all completed races
        const total = completedResults.reduce((sum, res) => sum + res.calculatedScore, 0);

        // Determine discards: drop the worst (highest) scores
        // Stable sort descending by calculatedScore
        const sortedScores = [...completedResults].sort((a, b) => b.calculatedScore - a.calculatedScore);

        const discardedRaceNumbers: number[] = [];
        const discardCountToApply = Math.min(numDiscards, sortedScores.length);

        for (let i = 0; i < discardCountToApply; i++) {
            const discardedResult = sortedScores[i];
            discardedRaceNumbers.push(discardedResult.raceNumber);
            if (scoresMap[discardedResult.raceNumber]) {
                scoresMap[discardedResult.raceNumber].isDiscarded = true;
            }
        }

        const keptScores = sortedScores.slice(discardCountToApply);
        const nett = keptScores.reduce((sum, res) => sum + res.calculatedScore, 0);

        return {
            id: boat.id,
            skipper: boat.skipper,
            boatName: boat.boatName,
            sailNumber: boat.sailNumber,
            rank: 0,
            total,
            nett,
            discardedRaceNumbers,
            scores: scoresMap
        };
    });

    // Rank competitors
    scoredBoats.sort((a, b) => {
        // Primary: lowest Nett score
        if (a.nett !== b.nett) {
            return a.nett - b.nett;
        }

        // Secondary: lowest Total score
        if (a.total !== b.total) {
            return a.total - b.total;
        }

        // Configurable tie break method (preserved as Nett -> Total initially per MYC rules)
        if (tieBreakMethod === 'RRS_APPENDIX_A8') {
            // TODO/BUSINESS-RULE: Enable RRS Appendix A8 countback once Sailing Instructions confirm
            // return breakTiesRRSAppendixA8(a, b);
        }

        // Fallback: alphabetical
        return a.skipper.localeCompare(b.skipper);
    });

    // Assign ranks (handle ties cleanly: competitors with identical nett & total share rank)
    for (let i = 0; i < scoredBoats.length; i++) {
        if (i > 0) {
            const prev = scoredBoats[i - 1];
            const curr = scoredBoats[i];
            if (curr.nett === prev.nett && curr.total === prev.total) {
                curr.rank = prev.rank; // Tied rank
            } else {
                curr.rank = i + 1;
            }
        } else {
            scoredBoats[0].rank = 1;
        }
    }

    return scoredBoats;
};
