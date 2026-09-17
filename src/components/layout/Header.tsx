import React from 'react';

interface HeaderProps {
    currentSeason: string;
    onSeasonChange: (slug: string) => void;
    isAdmin: boolean;
    onOpenAuthModal: () => void;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    currentSeason,
    onSeasonChange,
    isAdmin,
    onOpenAuthModal,
    onSignOut
}) => {
    return (
        <header className="w-full bg-slate-900/95 border-b border-slate-800/80 sticky top-0 z-30 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
                {/* Brand & Regatta Identity */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-lg sm:text-xl shadow-lg shadow-amber-950/40 select-none flex-shrink-0">
                        🏆
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white leading-none truncate">
                                KEG CUP
                            </h1>
                            <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex-shrink-0">
                                2026/27
                            </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide truncate mt-0.5">
                            MYC Laser Fleet
                        </p>
                    </div>
                </div>

                {/* Season Switcher & Admin Trigger */}
                <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    {/* Season Selector */}
                    <select
                        value={currentSeason}
                        onChange={(e) => onSeasonChange(e.target.value)}
                        className="bg-slate-800/90 text-slate-200 text-xs font-medium px-2 sm:px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500/60 transition cursor-pointer max-w-[120px] sm:max-w-none"
                        aria-label="Select season"
                    >
                        <option value="keg-cup-2026-27">2026/27 Keg Cup</option>
                        <option value="keg-cup-2025-26">2025/26 Keg Cup</option>
                    </select>

                    {/* Admin Status / Trigger */}
                    {isAdmin ? (
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-700/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Admin
                            </span>
                            <button
                                onClick={onSignOut}
                                className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 hover:bg-slate-800 rounded transition"
                                title="Sign out admin"
                            >
                                Exit
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onOpenAuthModal}
                            className="text-slate-500 hover:text-slate-300 p-2 rounded-lg hover:bg-slate-800/80 transition"
                            title="Admin Login"
                            aria-label="Admin Login"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
