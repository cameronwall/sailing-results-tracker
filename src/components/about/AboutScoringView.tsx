import React from 'react';

export const AboutScoringView: React.FC = () => {
    return (
        <section className="w-full max-w-3xl mx-auto space-y-6">
            {/* Visual Formula Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-850 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="text-center space-y-3">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                        Keg Cup Race Scoring Formula
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        How Scores Are Calculated
                    </h2>
                    <p className="text-sm text-slate-300 max-w-lg mx-auto">
                        Each race result combines your line-honours finish and corrected-time handicap finish across the complete MYC Laser fleet.
                    </p>

                    {/* The Visual Calculation Block */}
                    <div className="my-6 p-4 sm:p-6 bg-slate-950/70 border border-slate-700/80 rounded-xl inline-block text-left font-mono">
                        <div className="flex items-center justify-between gap-8 text-sm sm:text-base text-slate-300">
                            <span>Scratch Finish:</span>
                            <span className="font-bold text-white">3rd Place</span>
                        </div>
                        <div className="flex items-center justify-between gap-8 text-sm sm:text-base text-slate-300 mt-1">
                            <span>Handicap Finish:</span>
                            <span className="font-bold text-white">+ 5th Place</span>
                        </div>
                        <div className="w-full border-b border-slate-700 my-2" />
                        <div className="flex items-center justify-between gap-8 text-base sm:text-lg">
                            <span className="text-amber-400 font-bold">Keg Cup Score:</span>
                            <span className="font-black text-amber-400 text-xl">4.0 pts</span>
                        </div>
                    </div>

                    <p className="text-xs text-slate-400 font-medium italic">
                        ⭐ Lower score wins. Half-point scores (2.5, 3.5, 4.0) are fully supported.
                    </p>
                </div>
            </div>

            {/* Plain English Rule Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
                {/* 1. Purpose */}
                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                        <span>🏆</span>
                        <h3>What is the Keg Cup?</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        The Keg Cup is designed to give boats from the lower-performing half of the active Manly Yacht Club Laser fleet a meaningful, highly competitive championship during the second half of the sailing season.
                    </p>
                </div>

                {/* 2. Qualification */}
                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                        <span>🎯</span>
                        <h3>Qualification Rules</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        Determined just before Christmas from first-half MYC racing (Spring Pointscore & Club Championship). Competitors must sail in at least <strong className="text-white">40%</strong> of available races. The bottom half of active eligible boats qualifies and is permanently locked.
                    </p>
                </div>

                {/* 3. Penalties */}
                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                        <span>🚩</span>
                        <h3>RRS Penalties</h3>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                        <div>
                            <strong className="text-white">DNC</strong> = Series Entrants + 1 (<span className="font-mono text-slate-300">21 + 1 = 22 pts</span>).
                        </div>
                        <div>
                            <strong className="text-white">DNS / DNF / DSQ</strong> = Boats at Start + 1 (<span className="font-mono text-slate-300">e.g. 12 + 1 = 13 pts</span>).
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Penalties apply directly to the combined race score rather than averaging.
                        </p>
                    </div>
                </div>

                {/* 4. Discards */}
                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-md">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                        <span>📉</span>
                        <h3>Series Discards</h3>
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 font-mono">
                        <li>• &lt; 5 completed races: 0 discards</li>
                        <li>• 5–9 completed races: 1 discard</li>
                        <li>• 10–14 completed races: 2 discards</li>
                        <li>• 15+ completed races: 3 discards</li>
                    </ul>
                    <p className="text-[11px] text-slate-400 mt-1">
                        Discards are based strictly on actual completed races; cancelled races do not trigger discards.
                    </p>
                </div>

                {/* 5. Series Tie-Break */}
                <div className="bg-slate-850 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-md sm:col-span-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                        <span>⚖️</span>
                        <h3>Series Tie-Break Rule: Nett &rarr; Gross</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        When two or more boats finish with identical Nett series points, the current active tie-break rule ranks the competitor with the lowest <strong className="text-white">Gross points</strong> ahead (<span className="font-mono text-amber-300 font-semibold">Nett &rarr; Gross</span>).
                    </p>
                    <p className="text-[11px] text-slate-400">
                        📌 <em>Note: The Sailing Committee will separately confirm the official MYC tie-break requirement before competition commences (e.g. whether RRS Appendix A8 countback is formally designated).</em>
                    </p>
                </div>
            </div>
        </section>
    );
};
