import React, { useState } from 'react';
import type { ScoredKegCupBoat, RaceMeta, Season } from '../../types';
import { StandingCard } from './StandingCard';
import { StandingDetailSheet } from './StandingDetailSheet';
import { DesktopStandingsTable } from './DesktopStandingsTable';

interface StandingsViewProps {
    season: Season;
    boats: ScoredKegCupBoat[];
    races: RaceMeta[];
}

export const StandingsView: React.FC<StandingsViewProps> = ({
    season,
    boats,
    races
}) => {
    const [selectedBoat, setSelectedBoat] = useState<ScoredKegCupBoat | null>(null);

    const completedRaces = races.filter(r => r.isCompleted);
    const completedCount = completedRaces.length;
    const totalRaces = races.length;

    // Discard text logic
    const discardsApplied = completedCount >= 15 ? 3 : completedCount >= 10 ? 2 : completedCount >= 5 ? 1 : 0;
    const nextDiscardThreshold = completedCount < 5 ? 5 : completedCount < 10 ? 10 : completedCount < 15 ? 15 : null;

    return (
        <section className="w-full max-w-full min-w-0 space-y-4 overflow-hidden">
            {/* Series Summary Banner */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-lg backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                            {season.name} Series Standings
                        </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-0.5">
                        After {completedCount} of {totalRaces} completed races
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs w-full sm:w-auto">
                    <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium border border-slate-700/60 text-[11px] sm:text-xs">
                        🎯 {discardsApplied} {discardsApplied === 1 ? 'Discard' : 'Discards'} Applied
                    </span>
                    {nextDiscardThreshold && (
                        <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-amber-500/10 text-amber-300 font-medium border border-amber-500/20 text-[11px] sm:text-xs">
                            Next discard at Race {nextDiscardThreshold}
                        </span>
                    )}
                </div>
            </div>

            {/* Mobile / Tablet View: Vertical Card Stack */}
            <div className="lg:hidden space-y-2.5 w-full max-w-full min-w-0">
                {boats.map((boat) => (
                    <StandingCard
                        key={boat.id}
                        boat={boat}
                        onSelect={(b) => setSelectedBoat(b)}
                    />
                ))}

                {boats.length === 0 && (
                    <div className="text-center p-12 bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
                        No competitors registered yet for this season.
                    </div>
                )}
            </div>

            {/* Desktop View (>= 1024px): Full Series Matrix */}
            <div className="hidden lg:block w-full max-w-full min-w-0 overflow-hidden">
                <DesktopStandingsTable
                    boats={boats}
                    races={races}
                    onSelectBoat={(b) => setSelectedBoat(b)}
                />
            </div>

            {/* Slide-over / Modal Detail Sheet */}
            <StandingDetailSheet
                boat={selectedBoat}
                races={races}
                onClose={() => setSelectedBoat(null)}
            />
        </section>
    );
};
