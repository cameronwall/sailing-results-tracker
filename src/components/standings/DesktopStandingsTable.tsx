import React from 'react';
import type { ScoredKegCupBoat, RaceMeta } from '../../types';

interface DesktopStandingsTableProps {
    boats: ScoredKegCupBoat[];
    races: RaceMeta[];
    onSelectBoat: (boat: ScoredKegCupBoat) => void;
}

export const DesktopStandingsTable: React.FC<DesktopStandingsTableProps> = ({
    boats,
    races,
    onSelectBoat
}) => {
    return (
        <div className="hidden lg:block w-full bg-slate-900/90 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-max text-sm">
                    <thead>
                        <tr className="border-b border-slate-700/80 bg-slate-850/80 text-xs text-slate-400 font-semibold tracking-wider uppercase">
                            <th className="p-3 text-center w-14 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                                Rank
                            </th>
                            <th className="p-3 min-w-[160px] sticky left-14 z-20 bg-slate-900 border-r border-slate-800">
                                Skipper
                            </th>
                            <th className="p-3 min-w-[120px] text-slate-400 border-r border-slate-800">
                                Boat
                            </th>
                            <th className="p-3 w-20 text-center font-mono border-r border-slate-800">
                                Sail #
                            </th>
                            <th className="p-3 w-20 text-center bg-amber-500/10 text-amber-400 font-bold border-r border-slate-800">
                                Nett
                            </th>
                            <th className="p-3 w-16 text-center text-slate-400 border-r border-slate-800">
                                Total
                            </th>
                            {races.map((r) => (
                                <th
                                    key={r.raceNumber}
                                    className={`p-2 text-center w-14 border-r border-slate-800/60 ${
                                        r.isCompleted ? 'text-slate-200' : 'text-slate-600'
                                    }`}
                                    title={r.raceDate ? `Race ${r.raceNumber} (${r.raceDate})` : `Race ${r.raceNumber}`}
                                >
                                    R{r.raceNumber}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {boats.map((boat) => (
                            <tr
                                key={boat.id}
                                onClick={() => onSelectBoat(boat)}
                                className="hover:bg-slate-800/50 transition cursor-pointer group"
                            >
                                {/* Sticky Rank */}
                                <td className="p-3 text-center font-bold text-base sticky left-0 z-10 bg-slate-900 group-hover:bg-slate-800/80 border-r border-slate-800 font-mono">
                                    {boat.rank === 1 ? '🥇' : boat.rank === 2 ? '🥈' : boat.rank === 3 ? '🥉' : `#${boat.rank}`}
                                </td>

                                {/* Sticky Skipper */}
                                <td className="p-3 font-bold text-white sticky left-14 z-10 bg-slate-900 group-hover:bg-slate-800/80 border-r border-slate-800">
                                    {boat.skipper}
                                </td>

                                {/* Boat Name */}
                                <td className="p-3 text-slate-400 text-xs border-r border-slate-800">
                                    {boat.boatName || '—'}
                                </td>

                                {/* Sail # */}
                                <td className="p-3 text-center text-slate-300 font-mono text-xs border-r border-slate-800">
                                    {boat.sailNumber}
                                </td>

                                {/* Dominant Nett */}
                                <td className="p-3 text-center bg-amber-500/10 border-r border-slate-800">
                                    <span className="font-mono font-black text-amber-400 text-base">
                                        {boat.nett.toFixed(1)}
                                    </span>
                                </td>

                                {/* Gross Total */}
                                <td className="p-3 text-center font-mono text-slate-400 text-xs border-r border-slate-800">
                                    {boat.total.toFixed(1)}
                                </td>

                                {/* Per Race Scores */}
                                {races.map((race) => {
                                    const scoreData = boat.scores[race.raceNumber];
                                    const isDiscarded = boat.discardedRaceNumbers.includes(race.raceNumber);
                                    const isCompleted = race.isCompleted;

                                    if (!isCompleted) {
                                        return (
                                            <td key={race.raceNumber} className="p-2 text-center text-slate-700 font-mono text-xs border-r border-slate-800/50">
                                                —
                                            </td>
                                        );
                                    }

                                    const tooltipText = scoreData?.isPenalty
                                        ? `${scoreData.statusCode} (${scoreData.calculatedScore.toFixed(1)} pts)`
                                        : `Scratch: ${scoreData?.scratchPlace} | Handicap: ${scoreData?.handicapPlace} -> ${scoreData?.calculatedScore.toFixed(1)}`;

                                    return (
                                        <td
                                            key={race.raceNumber}
                                            className="p-2 text-center border-r border-slate-800/50 relative group/cell"
                                        >
                                            <span
                                                className={`inline-block px-1.5 py-0.5 rounded font-mono text-xs font-bold transition ${
                                                    isDiscarded
                                                        ? 'text-slate-500 line-through bg-slate-800/30'
                                                        : scoreData?.isPenalty
                                                        ? 'text-red-400 bg-red-950/40'
                                                        : 'text-slate-200'
                                                }`}
                                            >
                                                {scoreData?.calculatedScore.toFixed(1)}
                                            </span>

                                            {/* Hover Tooltip */}
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/cell:block z-30 bg-slate-950 text-white text-[11px] px-2.5 py-1 rounded-md shadow-xl border border-slate-700 whitespace-nowrap pointer-events-none">
                                                {tooltipText}
                                                {isDiscarded && <span className="text-amber-400 ml-1 font-bold">(Discarded)</span>}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
