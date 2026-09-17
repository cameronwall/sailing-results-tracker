import React from 'react';
import type { MetadataComparison } from '../../../types/import';

interface MetadataConfirmBarProps {
    metadata: MetadataComparison;
    onUpdateMetadata: (updated: MetadataComparison) => void;
}

export const MetadataConfirmBar: React.FC<MetadataConfirmBarProps> = ({
    metadata,
    onUpdateMetadata
}) => {
    const { starters, seriesEntrants, raceDate } = metadata;
    const hasAnyDiscrepancy = starters.hasDiscrepancy || seriesEntrants.hasDiscrepancy || raceDate.hasDiscrepancy;

    if (!hasAnyDiscrepancy && !starters.detected && !seriesEntrants.detected) {
        return null;
    }

    return (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 mb-5 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400 text-base">⚠️</span>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Race Metadata Confirmation (Explicit Choice Required)
                </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Starters Comparison */}
                {starters.detected !== null && (
                    <div className={`p-3 rounded-lg border text-xs transition-colors ${
                        starters.hasDiscrepancy
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}>
                        <div className="font-bold mb-1 flex items-center justify-between">
                            <span>Boats at Starting Area:</span>
                            {starters.hasDiscrepancy && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                    Discrepancy
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="text-slate-400">
                                Current: <strong className="text-white">{starters.current}</strong> · Detected: <strong className="text-amber-400">{starters.detected}</strong>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onUpdateMetadata({
                                        ...metadata,
                                        starters: { ...starters, confirmedValue: starters.current }
                                    })}
                                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                                        starters.confirmedValue === starters.current
                                            ? 'bg-slate-700 text-white border border-slate-500 shadow-sm'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Keep {starters.current}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdateMetadata({
                                        ...metadata,
                                        starters: { ...starters, confirmedValue: starters.detected! }
                                    })}
                                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                                        starters.confirmedValue === starters.detected
                                            ? 'bg-amber-600 text-white shadow-sm border border-amber-400'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Use {starters.detected}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Series Entrants Comparison */}
                {seriesEntrants.detected !== null && (
                    <div className={`p-3 rounded-lg border text-xs transition-colors ${
                        seriesEntrants.hasDiscrepancy
                            ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                            : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}>
                        <div className="font-bold mb-1 flex items-center justify-between">
                            <span>Series Entrants Fleet:</span>
                            {seriesEntrants.hasDiscrepancy && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                    Discrepancy
                                </span>
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="text-slate-400">
                                Current: <strong className="text-white">{seriesEntrants.current}</strong> · Detected: <strong className="text-amber-400">{seriesEntrants.detected}</strong>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => onUpdateMetadata({
                                        ...metadata,
                                        seriesEntrants: { ...seriesEntrants, confirmedValue: seriesEntrants.current }
                                    })}
                                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                                        seriesEntrants.confirmedValue === seriesEntrants.current
                                            ? 'bg-slate-700 text-white border border-slate-500 shadow-sm'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Keep {seriesEntrants.current}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onUpdateMetadata({
                                        ...metadata,
                                        seriesEntrants: { ...seriesEntrants, confirmedValue: seriesEntrants.detected! }
                                    })}
                                    className={`px-2.5 py-1 rounded font-bold transition-all ${
                                        seriesEntrants.confirmedValue === seriesEntrants.detected
                                            ? 'bg-amber-600 text-white shadow-sm border border-amber-400'
                                            : 'bg-slate-800/80 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Use {seriesEntrants.detected}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
