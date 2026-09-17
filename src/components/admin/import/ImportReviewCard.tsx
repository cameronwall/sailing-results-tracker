import React from 'react';
import type { MatchedCompetitorResult } from '../../../types/import';
import type { ResultStatusCode } from '../../../types';

interface ImportReviewCardProps {
    result: MatchedCompetitorResult;
    onUpdateResult: (updated: MatchedCompetitorResult) => void;
}

export const ImportReviewCard: React.FC<ImportReviewCardProps> = ({
    result,
    onUpdateResult
}) => {
    const isMissing = result.matchStatus === 'MISSING';
    const isReview = result.matchStatus === 'REVIEW';
    const isConfirmed = result.matchStatus === 'CONFIRMED';

    const hasPenalty = result.statusCode && result.statusCode !== 'NONE';
    const hasBothPlaces = result.scratchPlace !== null && result.handicapPlace !== null && !hasPenalty;
    const kegCupPreview = hasBothPlaces
        ? ((Number(result.scratchPlace) + Number(result.handicapPlace)) / 2).toFixed(1)
        : null;

    const handleScratchChange = (val: string) => {
        const num = val === '' ? null : parseInt(val, 10);
        const updated: MatchedCompetitorResult = {
            ...result,
            scratchPlace: isNaN(num as number) ? null : num,
            statusCode: 'NONE'
        };
        // Re-evaluate review status if scratch was missing
        if (updated.scratchPlace && updated.handicapPlace && updated.reviewReasons.includes('MISSING_SCRATCH')) {
            updated.reviewReasons = updated.reviewReasons.filter(r => r !== 'MISSING_SCRATCH');
            if (updated.reviewReasons.length === 0) updated.matchStatus = 'CONFIRMED';
        }
        onUpdateResult(updated);
    };

    const handleHandicapChange = (val: string) => {
        const num = val === '' ? null : parseInt(val, 10);
        const updated: MatchedCompetitorResult = {
            ...result,
            handicapPlace: isNaN(num as number) ? null : num,
            statusCode: 'NONE'
        };
        // Re-evaluate review status if handicap was missing
        if (updated.scratchPlace && updated.handicapPlace && updated.reviewReasons.includes('MISSING_HANDICAP')) {
            updated.reviewReasons = updated.reviewReasons.filter(r => r !== 'MISSING_HANDICAP');
            if (updated.reviewReasons.length === 0) updated.matchStatus = 'CONFIRMED';
        }
        onUpdateResult(updated);
    };

    const handleStatusChange = (status: ResultStatusCode) => {
        const updated: MatchedCompetitorResult = {
            ...result,
            statusCode: status,
            scratchPlace: status === 'NONE' ? result.scratchPlace : null,
            handicapPlace: status === 'NONE' ? result.handicapPlace : null,
            matchStatus: status !== 'NONE' ? 'CONFIRMED' : result.matchStatus
        };
        onUpdateResult(updated);
    };

    const getBadgeStyle = () => {
        if (isConfirmed) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
        if (isReview) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        return 'bg-slate-700/50 text-slate-400 border-slate-600';
    };

    const getReasonLabel = (reason: string) => {
        switch (reason) {
            case 'MISSING_HANDICAP': return 'Handicap placing missing';
            case 'MISSING_SCRATCH': return 'Scratch placing missing';
            case 'DEAD_HEAT': return 'Shared / dead-heat finish position';
            case 'MULTI_SHEET_CONFLICT': return 'Conflicting values across sheets';
            case 'FUZZY_NAME_MATCH': return 'Suggested fuzzy match (Confirm below)';
            default: return reason;
        }
    };

    return (
        <div className={`p-4 rounded-xl border transition-all ${
            isConfirmed
                ? 'bg-slate-900/60 border-slate-800'
                : isReview
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-900/30 border-slate-800/80 opacity-80'
        }`}>
            {/* Header: Skipper, Boat, Sail & Match Status */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm sm:text-base tracking-tight">
                            {result.skipper}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                            {result.boatName || 'Unregistered'}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Sail #{result.sailNumber}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getBadgeStyle()}`}>
                        {result.matchStatus}
                    </span>
                    {kegCupPreview && (
                        <div className="text-right">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">Keg Cup</span>
                            <span className="text-sm font-black text-amber-400">{kegCupPreview} pts</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Review Warning Message if applicable */}
            {isReview && result.reviewReasons.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1.5 mb-3 text-xs text-amber-200 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{result.reviewReasons.map(getReasonLabel).join(' · ')}</span>
                </div>
            )}

            {/* Missing Notice (Explicit: NO result assigned, NOT DNC) */}
            {isMissing && (
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg px-3 py-2 mb-3 text-xs text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <span>⚪</span>
                        <span>Not detected on uploaded sheet(s). <strong>No result assigned.</strong></span>
                    </span>
                    <button
                        type="button"
                        onClick={() => handleStatusChange('DNC')}
                        className="text-[11px] font-bold px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                    >
                        Mark DNC
                    </button>
                </div>
            )}

            {/* Controls: Scratch, Handicap & Penalty Codes */}
            {!isMissing && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                    {/* Inputs when finished */}
                    {!hasPenalty ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-400">Scratch:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={result.scratchPlace ?? ''}
                                    placeholder="Place"
                                    onChange={(e) => handleScratchChange(e.target.value)}
                                    className="w-16 px-2.5 py-1 text-center font-black text-sm bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-400">Handicap:</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={result.handicapPlace ?? ''}
                                    placeholder="Place"
                                    onChange={(e) => handleHandicapChange(e.target.value)}
                                    className="w-16 px-2.5 py-1 text-center font-black text-sm bg-slate-800 text-white rounded-lg border border-slate-700 focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs font-bold text-amber-400 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
                            Penalty Status: {result.statusCode}
                        </div>
                    )}

                    {/* Quick Penalty Toggles */}
                    <div className="flex items-center gap-1">
                        {(['NONE', 'DNF', 'DNS', 'DNC', 'DSQ'] as ResultStatusCode[]).map(code => (
                            <button
                                key={code}
                                type="button"
                                onClick={() => handleStatusChange(code)}
                                className={`px-2 py-1 text-[11px] font-black rounded transition-all ${
                                    (result.statusCode || 'NONE') === code
                                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {code === 'NONE' ? 'Finish' : code}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
