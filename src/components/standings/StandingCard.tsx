import React from 'react';
import type { ScoredKegCupBoat } from '../../types';

interface StandingCardProps {
    boat: ScoredKegCupBoat;
    onSelect: (boat: ScoredKegCupBoat) => void;
}

export const StandingCard: React.FC<StandingCardProps> = ({ boat, onSelect }) => {
    // Rank medal rendering
    const renderRank = (rank: number) => {
        if (rank === 1) return <span className="text-2xl" title="1st Place">🥇</span>;
        if (rank === 2) return <span className="text-2xl" title="2nd Place">🥈</span>;
        if (rank === 3) return <span className="text-2xl" title="3rd Place">🥉</span>;
        return (
            <span className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 font-mono">
                #{rank}
            </span>
        );
    };

    return (
        <article
            onClick={() => onSelect(boat)}
            className="w-full bg-slate-850 hover:bg-slate-800/90 active:scale-[0.99] border border-slate-700/60 rounded-xl p-3 sm:p-4 transition duration-150 flex items-center justify-between gap-2 sm:gap-3 shadow-md shadow-slate-950/20 cursor-pointer min-h-[68px]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(boat);
                }
            }}
            aria-label={`View race breakdown for ${boat.skipper}, Rank ${boat.rank}, Nett score ${boat.nett.toFixed(1)}`}
        >
            {/* Left: Rank & Competitor Info */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="flex-shrink-0 w-7 sm:w-8 flex items-center justify-center select-none">
                    {renderRank(boat.rank)}
                </div>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate leading-tight">
                        {boat.skipper}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 truncate">
                        {boat.boatName && (
                            <span className="truncate max-w-[80px] sm:max-w-[120px] text-slate-300 font-medium">
                                {boat.boatName}
                            </span>
                        )}
                        {boat.boatName && <span className="text-slate-600">·</span>}
                        <span className="font-mono text-slate-400">
                            {boat.sailNumber}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Dominant Nett Score & Total */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                    <div className="text-2xl font-black text-amber-400 font-mono tracking-tight leading-none">
                        {boat.nett.toFixed(1)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        <span className="text-slate-500 uppercase tracking-wider text-[9px] font-semibold mr-1">Gross</span>
                        <span className="font-mono">{boat.total.toFixed(1)}</span>
                    </div>
                </div>
                {/* Chevron */}
                <svg
                    className="w-5 h-5 text-slate-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </article>
    );
};
