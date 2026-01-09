import React from 'react';
import type { Boat } from '../types';
import { TOTAL_RACES } from '../types';

interface ResultsGridProps {
    boats: Boat[];
    onUpdateResult: (boatId: string, raceIndex: number, value: string) => void;
}

export const ResultsGrid: React.FC<ResultsGridProps> = ({ boats, onUpdateResult }) => {
    const races = Array.from({ length: TOTAL_RACES }, (_, i) => i + 1);

    return (
        <div className="glass-card p-6 overflow-hidden flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-accent-cyan">Enter Race Results</h2>
            <div className="overflow-x-auto pb-4">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead>
                        <tr className="border-b border-slate-700 text-sm text-slate-400">
                            {/* Sticky Header Group */}
                            <th className="p-3 sticky left-0 z-20 bg-slate-900 min-w-[140px] border-r border-slate-700/50">Skipper</th>
                            <th className="p-3 sticky left-[140px] z-20 bg-slate-900 min-w-[120px] border-r border-slate-700/50">Boat Name</th>
                            <th className="p-3 sticky left-[260px] z-20 bg-slate-900 min-w-[80px] text-center border-r border-slate-800">Sail #</th>

                            {/* Race Headers */}
                            {races.map(r => (
                                <th key={r} className="p-3 text-center min-w-[50px] font-normal text-xs text-slate-500">R{r}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {boats.map(boat => (
                            <tr key={boat.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition group">
                                {/* Sticky Columns */}
                                <td className="p-3 sticky left-0 z-10 bg-slate-900/95 group-hover:bg-slate-800 transition-colors font-medium text-slate-200 border-r border-slate-700/50">
                                    {boat.skipper}
                                </td>
                                <td className="p-3 sticky left-[140px] z-10 bg-slate-900/95 group-hover:bg-slate-800 transition-colors text-slate-400 text-sm border-r border-slate-700/50">
                                    {boat.boatName || '-'}
                                </td>
                                <td className="p-3 sticky left-[260px] z-10 bg-slate-900/95 group-hover:bg-slate-800 transition-colors text-slate-400 font-mono text-center border-r border-slate-800">
                                    {boat.sailNumber}
                                </td>

                                {/* Input Columns */}
                                {boat.results.map((result, idx) => (
                                    <td key={idx} className="p-2 text-center">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-10 p-1 text-center bg-transparent border border-slate-800 rounded focus:border-cyan-500 focus:bg-slate-700 text-sm appearance-none transition-colors"
                                            placeholder="-"
                                            value={result || ''}
                                            onChange={(e) => onUpdateResult(boat.id, idx, e.target.value)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {boats.length === 0 && (
                    <div className="text-center p-12 text-slate-500 italic border border-dashed border-slate-800 rounded-lg mt-4 bg-slate-900/20">
                        No boats added yet. Add entrants above to start scoring.
                    </div>
                )}
            </div>
        </div>
    );
};
