import React from 'react';
import type { ResultStatusCode, RaceResultSource, RaceMeta } from '../../types';
import { calculateKegCupRaceScore } from '../../utils/kegCupScoring';

interface EntryRowCardProps {
    skipper: string;
    boatName?: string;
    sailNumber: string;
    result: RaceResultSource;
    raceMeta: RaceMeta;
    onChange: (updated: RaceResultSource) => void;
    scratchInputRef?: React.RefObject<HTMLInputElement | null>;
    onScratchEnter?: () => void;
    onHandicapEnter?: () => void;
}

export const EntryRowCard: React.FC<EntryRowCardProps> = ({
    skipper,
    boatName,
    sailNumber,
    result,
    raceMeta,
    onChange,
    scratchInputRef,
    onScratchEnter,
    onHandicapEnter
}) => {
    const statusCode = result.statusCode || 'NONE';
    const isPenalty = statusCode !== 'NONE';

    // Calculate preview score in real time
    const calculated = calculateKegCupRaceScore(result, raceMeta);

    const handleStatusChange = (newStatus: ResultStatusCode) => {
        if (newStatus === 'NONE') {
            onChange({
                ...result,
                statusCode: 'NONE'
            });
        } else {
            // When penalty is selected, clear scratch and handicap places per Rule 8
            onChange({
                ...result,
                statusCode: newStatus,
                scratchPlace: null,
                handicapPlace: null
            });
        }
    };

    const handleScratchChange = (val: string) => {
        const num = val === '' ? null : parseInt(val, 10);
        onChange({
            ...result,
            statusCode: 'NONE',
            scratchPlace: isNaN(num as number) ? null : num
        });
    };

    const handleHandicapChange = (val: string) => {
        const num = val === '' ? null : parseInt(val, 10);
        onChange({
            ...result,
            statusCode: 'NONE',
            handicapPlace: isNaN(num as number) ? null : num
        });
    };

    return (
        <div className="bg-slate-850 border border-slate-700/70 rounded-xl p-4 shadow-sm space-y-3">
            {/* Competitor Header */}
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                        {skipper}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        {boatName && <span className="text-slate-300 font-medium">{boatName}</span>}
                        {boatName && <span className="text-slate-600">·</span>}
                        <span className="font-mono text-slate-400">Sail {sailNumber}</span>
                    </div>
                </div>

                {/* Live Score Badge */}
                <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
                        Score
                    </span>
                    <span className="font-mono text-xl font-black text-amber-400 leading-none">
                        {calculated.calculatedScore > 0 ? calculated.calculatedScore.toFixed(1) : '—'}
                    </span>
                </div>
            </div>

            {/* Status Selector (Segmented control) */}
            <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Result Status
                </label>
                <div className="grid grid-cols-5 gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
                    {(['NONE', 'DNC', 'DNS', 'DNF', 'DSQ'] as ResultStatusCode[]).map((st) => {
                        const isSelected = statusCode === st;
                        const label = st === 'NONE' ? 'Finish' : st;

                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(st)}
                                className={`py-1.5 text-xs font-bold rounded transition min-h-[36px] flex items-center justify-center ${
                                    isSelected
                                        ? st === 'NONE'
                                            ? 'bg-amber-500 text-slate-950 shadow-sm'
                                            : 'bg-red-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Inputs for Finish: Scratch + Handicap (Position in COMPLETE MYC Fleet) */}
            {!isPenalty ? (
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Scratch Place <span className="text-slate-500 font-normal">(Full Fleet)</span>
                        </label>
                        <input
                            ref={scratchInputRef}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 3"
                            value={result.scratchPlace ?? ''}
                            onChange={(e) => handleScratchChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onScratchEnter?.();
                                }
                            }}
                            className="w-full bg-slate-950/80 border border-slate-700 text-white font-mono font-bold text-center text-lg rounded-lg py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition min-h-[44px]"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                            Handicap Place <span className="text-slate-500 font-normal">(Full Fleet)</span>
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="e.g. 5"
                            value={result.handicapPlace ?? ''}
                            onChange={(e) => handleHandicapChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onHandicapEnter?.();
                                }
                            }}
                            className="w-full bg-slate-950/80 border border-slate-700 text-white font-mono font-bold text-center text-lg rounded-lg py-2 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition min-h-[44px]"
                        />
                    </div>
                </div>
            ) : (
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/30 flex items-center justify-between text-xs">
                    <span className="text-red-300 font-semibold">
                        Penalty: {statusCode}
                    </span>
                    <span className="text-slate-400 font-mono">
                        {statusCode === 'DNC'
                            ? `Series (${raceMeta.seriesEntrants}) + 1 = ${raceMeta.seriesEntrants + 1} pts`
                            : `Starters (${raceMeta.boatsAtStart}) + 1 = ${raceMeta.boatsAtStart + 1} pts`}
                    </span>
                </div>
            )}
        </div>
    );
};
