import React, { useEffect } from 'react';
import type { ScoredKegCupBoat, RaceMeta } from '../../types';

interface StandingDetailSheetProps {
    boat: ScoredKegCupBoat | null;
    races: RaceMeta[];
    onClose: () => void;
}

export const StandingDetailSheet: React.FC<StandingDetailSheetProps> = ({
    boat,
    races,
    onClose
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!boat) return null;

    const completedRaces = races.filter(r => r.isCompleted);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            {/* Backdrop click */}
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

            {/* Modal / Bottom Sheet Box */}
            <div
                className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-black overflow-hidden z-10"
                role="dialog"
                aria-modal="true"
                aria-labelledby="detail-title"
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-800 bg-slate-850 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                                #{boat.rank} in Fleet
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                Sail {boat.sailNumber}
                            </span>
                        </div>
                        <h2 id="detail-title" className="text-2xl font-black text-white mt-1">
                            {boat.skipper}
                        </h2>
                        {boat.boatName && (
                            <p className="text-sm text-slate-400 font-medium">
                                {boat.boatName}
                            </p>
                        )}
                    </div>

                    {/* Dominant Nett Badge */}
                    <div className="text-right flex-shrink-0">
                        <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                            Nett Points
                        </div>
                        <div className="text-3xl font-black text-amber-400 font-mono leading-none mt-0.5">
                            {boat.nett.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                            Gross: {boat.total.toFixed(1)}
                        </div>
                    </div>
                </div>

                {/* Body: Race-by-Race Breakdown List */}
                <div className="p-5 overflow-y-auto space-y-3 flex-1">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                        <span className="font-semibold uppercase tracking-wider">
                            Races Sailed ({completedRaces.length} completed)
                        </span>
                        {boat.discardedRaceNumbers.length > 0 && (
                            <span className="text-slate-400 italic">
                                {boat.discardedRaceNumbers.length} worst score dropped
                            </span>
                        )}
                    </div>

                    {completedRaces.map((race) => {
                        const scoreData = boat.scores[race.raceNumber];
                        const isDiscarded = boat.discardedRaceNumbers.includes(race.raceNumber);
                        const isPenalty = scoreData?.isPenalty;
                        const statusCode = scoreData?.statusCode;

                        return (
                            <div
                                key={race.raceNumber}
                                className={`p-3.5 rounded-xl border transition ${
                                    isDiscarded
                                        ? 'bg-slate-900/60 border-slate-800 opacity-60'
                                        : 'bg-slate-800/50 border-slate-700/60 shadow-sm'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-sm text-cyan-400">
                                                Race {race.raceNumber}
                                            </span>
                                            {race.raceDate && (
                                                <span className="text-xs text-slate-400">
                                                    {race.raceDate}
                                                </span>
                                            )}
                                        </div>

                                        {/* Score Components */}
                                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                                            {isPenalty ? (
                                                <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800/40 font-bold">
                                                    {statusCode} Penalty
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                                        Scratch: <strong className="text-white">{scoreData?.scratchPlace}</strong>
                                                    </span>
                                                    <span className="text-slate-600">+</span>
                                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                                        Handicap: <strong className="text-white">{scoreData?.handicapPlace}</strong>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Final Combined Keg Cup Score */}
                                    <div className="text-right flex-shrink-0">
                                        <div className={`text-xl font-mono font-black ${
                                            isDiscarded ? 'text-slate-400 line-through' : 'text-white'
                                        }`}>
                                            {scoreData?.calculatedScore.toFixed(1)}
                                        </div>
                                        {isDiscarded && (
                                            <span className="text-[10px] font-bold text-amber-400/90 block mt-0.5 uppercase tracking-wide">
                                                Discarded
                                            </span>
                                        )}
                                        {isPenalty && (
                                            <span className="text-[10px] text-slate-400 block mt-0.5">
                                                {statusCode === 'DNC' ? `${race.seriesEntrants}+1` : `${race.boatsAtStart}+1`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {completedRaces.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            No races scored yet for this season.
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-4 border-t border-slate-800 bg-slate-850 flex justify-end">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition min-h-[44px]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
