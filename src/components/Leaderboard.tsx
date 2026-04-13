import React from 'react';
import { type Boat, TOTAL_RACES } from '../types';
import { calculateDiscards, getCompletedRaceIndices, getHighestRaceNumber } from '../utils/scoring';

interface LeaderboardProps {
    boats: Boat[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ boats }) => {
    const getDiscardIndices = (boat: Boat): number[] => {
        const completedRaceIndices = getCompletedRaceIndices(boats);
        const highestRaceNumber = getHighestRaceNumber(boats);
        const numDiscards = calculateDiscards(highestRaceNumber);
        if (numDiscards === 0) return [];

        const numberedResults = completedRaceIndices.map(idx => {
            const score = boat.results[idx];
            return {
                score: (score === null || score === 0) ? (boats.length + 1) : score,
                idx
            };
        });

        numberedResults.sort((a, b) => b.score - a.score);

        const discardIndices = numberedResults.slice(0, numDiscards).map(r => r.idx);
        return discardIndices;
    };

    const races = Array.from({ length: TOTAL_RACES }, (_, i) => i + 1);

    return (
        <div className="glass-card p-6 overflow-hidden flex flex-col mt-8">
            <h2 className="text-xl font-bold mb-4 text-accent-purple">Series Standings</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                        <tr className="border-b border-slate-700 text-xs uppercase tracking-wider text-slate-400 bg-slate-800/20">
                            <th className="p-3 text-center w-16 border-r border-slate-800 sticky left-0 z-20 bg-slate-900">Rank</th>
                            <th className="p-3 sticky left-16 z-20 bg-slate-900 border-r border-slate-800 min-w-[110px]">Skipper</th>
                            <th className="p-3 static md:sticky md:left-[174px] z-20 bg-slate-900 border-r border-slate-800 min-w-[100px]">Boat</th>
                            <th className="p-3 static md:sticky md:left-[274px] z-20 bg-slate-900 border-r border-slate-800 text-center w-24">Sail #</th>
                            <th className="p-3 text-center border-r border-slate-800 w-24" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>Nett</th>
                            <th className="p-3 text-center border-r border-slate-800 w-24 bg-slate-900/50 text-slate-600">Total</th>
                            {races.map(r => (
                                <th key={r} className="p-2 text-center w-16 text-slate-600 font-normal border-r border-slate-800/50">R{r}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {boats.map(boat => {
                            const discardIndices = getDiscardIndices(boat);

                            return (
                                <tr key={boat.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition group">
                                    <td className="p-3 text-center font-bold text-xl border-r border-slate-800 sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors">
                                        {boat.rank === 1 ? '🥇' : boat.rank === 2 ? '🥈' : boat.rank === 3 ? '🥉' : <span className="text-slate-500 text-base">#{boat.rank}</span>}
                                    </td>
                                    <td className="p-3 border-r border-slate-800 sticky left-16 z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors">
                                        <div className="font-bold text-slate-200">{boat.skipper}</div>
                                    </td>
                                    <td className="p-3 text-slate-400 text-sm border-r border-slate-800 static md:sticky md:left-[174px] z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors">
                                        {boat.boatName || '-'}
                                    </td>
                                    <td className="p-3 text-center text-slate-500 font-mono text-sm border-r border-slate-800 static md:sticky md:left-[274px] z-10 bg-slate-900 group-hover:bg-slate-800 transition-colors">
                                        {boat.sailNumber}
                                    </td>
                                    <td className="p-3 text-center border-r border-slate-800" style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                                        <span className="font-mono text-xl font-bold" style={{ color: '#facc15' }}>
                                            {boat.nett}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center border-r border-slate-800 font-mono text-slate-600 bg-slate-900/30">
                                        {boat.total}
                                    </td>
                                    {boat.results.map((res, idx) => {
                                        const isDiscard = discardIndices.includes(idx);
                                        const display = (res === null || res === 0) ? '-' : res;
                                        const isFirst = !isDiscard && res === 1;

                                        return (
                                            <td key={idx} className="p-2 text-center border-r border-slate-800/50 relative w-16">
                                                <div className="flex justify-center items-center">
                                                    <span
                                                        className={`
                                                            w-8 h-8 flex items-center justify-center rounded text-sm font-bold
                                                            ${isDiscard
                                                                ? 'text-slate-600 line-through decoration-slate-500/50 bg-slate-800/20'
                                                                : 'text-slate-300'}
                                                            ${isFirst
                                                                ? '!bg-yellow-500/10 !text-yellow-400 border border-yellow-500/30 shadow-[0_0_10px_-4px_rgba(234,179,8,0.5)]'
                                                                : ''}
                                                        `}
                                                    >
                                                        {display}
                                                    </span>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {boats.length === 0 && (
                    <div className="text-center p-16 text-slate-600 italic">
                        No races scored yet.
                    </div>
                )}
            </div>
        </div>
    );
};
