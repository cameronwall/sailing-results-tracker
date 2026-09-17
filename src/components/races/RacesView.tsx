import React, { useState } from 'react';
import type { ScoredKegCupBoat, RaceMeta } from '../../types';

interface RacesViewProps {
    races: RaceMeta[];
    boats: ScoredKegCupBoat[];
}

export const RacesView: React.FC<RacesViewProps> = ({ races, boats }) => {
    const completedRaces = races.filter(r => r.isCompleted);
    const defaultRace = completedRaces.length > 0 ? completedRaces[completedRaces.length - 1].raceNumber : 1;
    const [selectedRaceNumber, setSelectedRaceNumber] = useState<number>(defaultRace);

    const activeRace = races.find(r => r.raceNumber === selectedRaceNumber) || races[0];

    // Compute rankings for this specific race
    interface RaceFinishEntry {
        boat: ScoredKegCupBoat;
        calculatedScore: number;
        scratchPlace: number | null;
        handicapPlace: number | null;
        statusCode: string;
        isPenalty: boolean;
        isDiscarded: boolean;
    }

    const raceFinishes: RaceFinishEntry[] = boats.map(b => {
        const scoreData = b.scores[activeRace.raceNumber];
        return {
            boat: b,
            calculatedScore: scoreData?.calculatedScore ?? (activeRace.seriesEntrants + 1),
            scratchPlace: scoreData?.scratchPlace ?? null,
            handicapPlace: scoreData?.handicapPlace ?? null,
            statusCode: scoreData?.statusCode ?? 'NONE',
            isPenalty: Boolean(scoreData?.isPenalty),
            isDiscarded: Boolean(b.discardedRaceNumbers.includes(activeRace.raceNumber))
        };
    });

    // Sort by calculatedScore ascending (lower score = higher finish)
    raceFinishes.sort((a, b) => {
        if (a.calculatedScore !== b.calculatedScore) {
            return a.calculatedScore - b.calculatedScore;
        }
        return a.boat.skipper.localeCompare(b.boat.skipper);
    });

    return (
        <section className="w-full space-y-4">
            {/* Horizontal Swipeable Race Pill Selector */}
            <div className="w-full overflow-x-auto pb-1 scrollbar-none">
                <div className="flex items-center gap-2 min-w-max">
                    {races.map((r) => {
                        const isSelected = r.raceNumber === selectedRaceNumber;
                        const isCompleted = r.isCompleted;

                        return (
                            <button
                                key={r.raceNumber}
                                onClick={() => setSelectedRaceNumber(r.raceNumber)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition min-h-[44px] flex items-center gap-1.5 border ${
                                    isSelected
                                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                                        : isCompleted
                                        ? 'bg-slate-850 text-slate-200 border-slate-700/80 hover:bg-slate-800'
                                        : 'bg-slate-900/50 text-slate-600 border-slate-800/60'
                                }`}
                                aria-label={`Select Race ${r.raceNumber}`}
                            >
                                <span>Race {r.raceNumber}</span>
                                {isCompleted && (
                                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Race Summary Metadata Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                            Race {activeRace.raceNumber}
                        </span>
                        {activeRace.raceDate && (
                            <span className="text-xs text-slate-400 font-medium">
                                {activeRace.raceDate}
                            </span>
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">
                        {activeRace.isCompleted ? 'Official Results' : 'Race Not Completed'}
                    </h2>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Starters</span>
                        <strong className="text-white font-mono text-sm">{activeRace.boatsAtStart}</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Series Fleet</span>
                        <strong className="text-white font-mono text-sm">{activeRace.seriesEntrants}</strong>
                    </div>
                </div>
            </div>

            {/* Competitor Finishes for this Race */}
            {!activeRace.isCompleted ? (
                <div className="text-center p-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
                    Race {activeRace.raceNumber} results will be published once the race is completed.
                </div>
            ) : (
                <div className="space-y-2.5">
                    {raceFinishes.map((finish, index) => (
                        <div
                            key={finish.boat.id}
                            className="bg-slate-850 border border-slate-700/60 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-md min-h-[64px]"
                        >
                            {/* Left: Finish Rank in this race */}
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold font-mono text-slate-300 flex-shrink-0">
                                    {index + 1}
                                </span>
                                <div className="min-w-0">
                                    <div className="font-bold text-white truncate text-sm sm:text-base">
                                        {finish.boat.skipper}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        {finish.boat.boatName && (
                                            <span className="truncate max-w-[120px] text-slate-300">
                                                {finish.boat.boatName}
                                            </span>
                                        )}
                                        <span className="font-mono text-slate-400">
                                            {finish.boat.sailNumber}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Middle / Right: Scratch & Handicap breakdown + Keg Cup Score */}
                            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                                {finish.isPenalty ? (
                                    <div className="text-right">
                                        <span className="px-2.5 py-1 rounded bg-red-950/60 text-red-400 border border-red-800/40 text-xs font-bold">
                                            {finish.statusCode}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                                            Scratch: <strong className="text-white font-mono">{finish.scratchPlace}</strong>
                                        </span>
                                        <span className="text-slate-600">+</span>
                                        <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                                            Handicap: <strong className="text-white font-mono">{finish.handicapPlace}</strong>
                                        </span>
                                    </div>
                                )}

                                {/* Score Pill */}
                                <div className="text-right w-16">
                                    <div className="text-lg sm:text-xl font-black font-mono text-amber-400 leading-none">
                                        {finish.calculatedScore.toFixed(1)}
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5">
                                        Points
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
