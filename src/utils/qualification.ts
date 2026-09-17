import {
    type RawQualificationInput,
    type BoatQualificationStatus,
    type QualificationSummary
} from '../types';

export const DEFAULT_PARTICIPATION_THRESHOLD = 0.40;

/**
 * Calculates Pre-Christmas qualification standings and proposed Keg Cup fleet.
 * 
 * Rules:
 * 1. Participation Requirement:
 *    racesSailed / racesAvailable must be >= participationThreshold (default 40%).
 *    Ineligible boats are excluded prior to bottom-half determination.
 * 
 * 2. Qualification Score:
 *    (springRank + clubChampRank) / 2.0
 *    Lower score indicates superior first-half performance.
 * 
 * 3. Bottom-Half Selection (Ceil for odd counts):
 *    Target qualifying fleet = Math.ceil(eligibleBoats.length / 2).
 * 
 * 4. Boundary Ties:
 *    If boats have the exact same Qualification Score at the qualification boundary,
 *    BOTH qualify (qualifying fleet may exceed target count).
 */
export const calculateQualification = (
    inputs: RawQualificationInput[],
    threshold: number = DEFAULT_PARTICIPATION_THRESHOLD
): QualificationSummary => {
    // 1. Calculate participation rate and initial eligibility
    const processedBoats: BoatQualificationStatus[] = inputs.map(input => {
        const available = input.racesAvailable > 0 ? input.racesAvailable : 0;
        const sailed = input.racesSailed > 0 ? input.racesSailed : 0;
        const participationRate = available > 0 ? sailed / available : 0;
        const isEligible = participationRate >= threshold;
        const qualificationScore = (input.springRank + input.clubChampRank) / 2.0;

        return {
            boatId: input.boatId,
            skipper: input.skipper,
            boatName: input.boatName,
            sailNumber: input.sailNumber,
            springRank: input.springRank,
            clubChampRank: input.clubChampRank,
            racesSailed: sailed,
            racesAvailable: available,
            participationRate,
            isEligible,
            qualificationScore,
            isQualified: false,
            qualificationReason: ''
        };
    });

    // 2. Separate eligible vs ineligible
    const eligibleBoats = processedBoats.filter(b => b.isEligible);
    const ineligibleBoats = processedBoats.filter(b => !b.isEligible);

    // Annotate ineligible boats
    ineligibleBoats.forEach(b => {
        const pct = (b.participationRate * 100).toFixed(1);
        const reqPct = (threshold * 100).toFixed(0);
        b.isQualified = false;
        b.qualificationReason = `Ineligible: Participated in ${b.racesSailed}/${b.racesAvailable} races (${pct}% < ${reqPct}% threshold).`;
    });

    // 3. Rank eligible boats by Qualification Score (ascending: lower score = better performance)
    eligibleBoats.sort((a, b) => {
        if (a.qualificationScore !== b.qualificationScore) {
            return a.qualificationScore - b.qualificationScore;
        }
        // Secondary deterministic sort for stable ranking
        if (a.clubChampRank !== b.clubChampRank) {
            return a.clubChampRank - b.clubChampRank;
        }
        return a.skipper.localeCompare(b.skipper);
    });

    // Assign rank among eligible boats (1-based)
    eligibleBoats.forEach((boat, index) => {
        boat.rankAmongEligible = index + 1;
    });

    const eligibleCount = eligibleBoats.length;
    const qualifyingTarget = eligibleCount > 0 ? Math.ceil(eligibleCount / 2) : 0;

    let boundaryScore: number | undefined;

    if (eligibleCount > 0 && qualifyingTarget > 0) {
        // The bottom-half cut index
        // e.g. 15 eligible -> target 8 -> cutIndex = 15 - 8 = 7 (indices 7..14 qualify)
        const cutIndex = eligibleCount - qualifyingTarget;
        boundaryScore = eligibleBoats[cutIndex].qualificationScore;

        // Check if multiple boats share the boundary score
        const boundaryBoatsCount = eligibleBoats.filter(b => b.qualificationScore === boundaryScore).length;
        const hasBoundaryTie = boundaryBoatsCount > 1;

        // Any eligible boat with score >= boundaryScore qualifies!
        // This naturally includes boundary ties that might push the count above target.
        eligibleBoats.forEach(b => {
            const pct = (b.participationRate * 100).toFixed(1);
            if (b.qualificationScore >= boundaryScore!) {
                b.isQualified = true;
                if (hasBoundaryTie && b.qualificationScore === boundaryScore) {
                    b.qualificationReason = `Eligible (${pct}%). Tied at boundary score ${b.qualificationScore.toFixed(1)}. Qualifies for Keg Cup.`;
                } else {
                    b.qualificationReason = `Eligible (${pct}%). Rank ${b.rankAmongEligible} of ${eligibleCount} eligible (Qual Score ${b.qualificationScore.toFixed(1)}). Qualifies for Keg Cup.`;
                }
            } else {
                b.isQualified = false;
                b.qualificationReason = `Eligible (${pct}%). Rank ${b.rankAmongEligible} of ${eligibleCount} eligible (Qual Score ${b.qualificationScore.toFixed(1)}). Upper half (Championship Fleet).`;
            }
        });
    }

    const actualQualifiersCount = eligibleBoats.filter(b => b.isQualified).length;

    // Combine all boats for complete summary
    const allBoats = [...eligibleBoats, ...ineligibleBoats];

    return {
        threshold,
        totalBoats: inputs.length,
        eligibleBoatsCount: eligibleCount,
        qualifyingFleetTarget: qualifyingTarget,
        actualQualifiersCount,
        boundaryScore,
        boats: allBoats
    };
};
