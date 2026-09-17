import React, { useState } from 'react';
import type { RawQualificationInput, Season, BoatQualificationStatus } from '../../types';
import { calculateQualification } from '../../utils/qualification';

interface QualificationManagerProps {
    season: Season;
    initialInputs: RawQualificationInput[];
    onLockQualifiers: (snapshot: BoatQualificationStatus[], reason: string) => Promise<void>;
    onUnlockQualifiers?: (reason: string) => Promise<void>;
}

export const QualificationManager: React.FC<QualificationManagerProps> = ({
    season,
    initialInputs,
    onLockQualifiers,
    onUnlockQualifiers
}) => {
    const [inputs, setInputs] = useState<RawQualificationInput[]>(initialInputs);
    const [threshold, setThreshold] = useState<number>(season.participationThreshold || 0.40);
    const [cutoffDate, setCutoffDate] = useState<string>(season.qualificationCutoffDate || '2026-12-20');
    const [isLocked, setIsLocked] = useState<boolean>(season.qualifiersLocked);
    const [showLockModal, setShowLockModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [auditReason, setAuditReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Compute live qualification summary
    const summary = calculateQualification(inputs, threshold);

    const handleInputChange = (
        boatId: string,
        field: 'springRank' | 'clubChampRank' | 'racesSailed' | 'racesAvailable',
        value: string
    ) => {
        if (isLocked) return;
        const num = parseInt(value, 10) || 0;
        setInputs(prev => prev.map(item => {
            if (item.boatId === boatId) {
                return { ...item, [field]: num };
            }
            return item;
        }));
    };

    const handleConfirmLock = async () => {
        if (!auditReason.trim()) {
            alert('Please provide an audit justification or notes for locking qualifiers.');
            return;
        }

        setIsProcessing(true);
        try {
            // Send full snapshot of ALL considered boats for deterministic audit
            await onLockQualifiers(summary.boats, auditReason);
            setIsLocked(true);
            setShowLockModal(false);
            setAuditReason('');
        } catch (err) {
            console.error('Failed to lock qualifiers:', err);
            alert('Error locking qualifiers. Please retry.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmUnlock = async () => {
        if (!auditReason.trim()) {
            alert('Please provide a mandatory administrative reason for unlocking.');
            return;
        }

        setIsProcessing(true);
        try {
            if (onUnlockQualifiers) {
                await onUnlockQualifiers(auditReason);
            }
            setIsLocked(false);
            setShowUnlockModal(false);
            setAuditReason('');
        } catch (err) {
            console.error('Failed to unlock qualifiers:', err);
            alert('Error unlocking qualifiers. Please retry.');
        } finally {
            setIsProcessing(false);
        }
    };

    const proposedQualifiers = summary.boats.filter(b => b.isQualified);
    const championshipFleet = summary.boats.filter(b => b.isEligible && !b.isQualified);
    const ineligibleBoats = summary.boats.filter(b => !b.isEligible);

    return (
        <section className="w-full max-w-5xl mx-auto space-y-6 pb-24">
            {/* Header & Lock State Status */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Pre-Christmas Qualification Manager
                        </h2>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            isLocked
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                        }`}>
                            {isLocked ? '🔒 Qualifiers Locked' : '✏️ Unlocked Preview'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Determines the lower-performing half of the active Laser fleet from Spring Pointscore & Club Championship results.
                    </p>
                </div>

                <div>
                    {isLocked ? (
                        <button
                            type="button"
                            onClick={() => setShowUnlockModal(true)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-slate-700 transition min-h-[44px]"
                        >
                            Unlock Qualifiers (Admin)
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setShowLockModal(true)}
                            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition min-h-[44px]"
                        >
                            Lock Keg Cup Qualifiers
                        </button>
                    )}
                </div>
            </div>

            {/* Threshold & Cut-Off Controls (Disabled if locked) */}
            <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-300 uppercase tracking-wider">
                            Participation Threshold
                        </span>
                        <span className="font-mono text-amber-400 font-bold">
                            {(threshold * 100).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.20"
                        max="0.60"
                        step="0.05"
                        disabled={isLocked}
                        value={threshold}
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
                        aria-label="Adjust participation threshold"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                        Boats must sail in at least this percentage of pre-Christmas races to be eligible.
                    </p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Cut-Off Date
                    </label>
                    <input
                        type="date"
                        disabled={isLocked}
                        value={cutoffDate}
                        onChange={(e) => setCutoffDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 outline-none disabled:opacity-50 min-h-[44px]"
                    />
                </div>
            </div>

            {/* Live Summary Statistics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                        Total Fleet
                    </span>
                    <strong className="text-xl font-mono font-bold text-white">
                        {summary.totalBoats}
                    </strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                        Active Eligible
                    </span>
                    <strong className="text-xl font-mono font-bold text-emerald-400">
                        {summary.eligibleBoatsCount}
                    </strong>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                        Keg Cup Qualifiers
                    </span>
                    <strong className="text-xl font-mono font-bold text-amber-400">
                        {summary.actualQualifiersCount}
                    </strong>
                    {summary.actualQualifiersCount > summary.qualifyingFleetTarget && (
                        <span className="text-[9px] text-amber-300 block mt-0.5">
                            (+{summary.actualQualifiersCount - summary.qualifyingFleetTarget} boundary tie)
                        </span>
                    )}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-center">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
                        Boundary Score
                    </span>
                    <strong className="text-xl font-mono font-bold text-cyan-400">
                        {summary.boundaryScore ? summary.boundaryScore.toFixed(1) : '—'}
                    </strong>
                </div>
            </div>

            {/* Proposed / Locked Qualifiers Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span>🏆</span>
                        <span>
                            {isLocked ? '2026/27 Keg Cup Qualifiers' : 'Proposed Keg Cup Qualifiers'} ({proposedQualifiers.length} boats)
                        </span>
                    </h3>
                    <span className="text-xs text-slate-400 italic">
                        Lower-performing half of active fleet
                    </span>
                </div>

                <div className="space-y-2.5">
                    {proposedQualifiers.map((boat) => (
                        <div
                            key={boat.boatId}
                            className="bg-slate-850 border border-amber-500/40 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-base">
                                        {boat.skipper}
                                    </span>
                                    {boat.boatName && (
                                        <span className="text-xs text-slate-300 font-medium">
                                            ({boat.boatName})
                                        </span>
                                    )}
                                    <span className="text-xs font-mono text-slate-400">
                                        Sail {boat.sailNumber}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">
                                    {boat.qualificationReason}
                                </p>
                            </div>

                            {/* Scoring stats & Manual Entry */}
                            <div className="flex flex-wrap items-center gap-3 text-xs flex-shrink-0">
                                {!isLocked ? (
                                    <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                                        <div>
                                            <label className="text-[10px] text-slate-400 block font-semibold">Spring Rank</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={boat.springRank}
                                                onChange={(e) => handleInputChange(boat.boatId, 'springRank', e.target.value)}
                                                className="w-14 bg-slate-900 border border-slate-700 text-white font-mono text-center rounded px-1 py-0.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block font-semibold">Champ Rank</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={boat.clubChampRank}
                                                onChange={(e) => handleInputChange(boat.boatId, 'clubChampRank', e.target.value)}
                                                className="w-14 bg-slate-900 border border-slate-700 text-white font-mono text-center rounded px-1 py-0.5"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 block font-semibold">Sailed</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={boat.racesSailed}
                                                onChange={(e) => handleInputChange(boat.boatId, 'racesSailed', e.target.value)}
                                                className="w-12 bg-slate-900 border border-slate-700 text-white font-mono text-center rounded px-1 py-0.5"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                            Spring / Club
                                        </span>
                                        <span className="font-mono text-slate-300">
                                            #{boat.springRank} / #{boat.clubChampRank}
                                        </span>
                                    </div>
                                )}
                                <div className="text-right pl-3 border-l border-slate-700">
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                        Qual Score
                                    </span>
                                    <span className="font-mono text-lg font-black text-amber-400">
                                        {boat.qualificationScore.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Championship Fleet (Upper Half) */}
            <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 px-1">
                    <span>⛵</span>
                    <span>Championship Fleet (Upper Half - Not in Keg Cup) ({championshipFleet.length} boats)</span>
                </h3>

                <div className="space-y-2">
                    {championshipFleet.map((boat) => (
                        <div
                            key={boat.boatId}
                            className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-slate-300 truncate">{boat.skipper}</span>
                                <span className="font-mono text-slate-500">Sail {boat.sailNumber}</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-400 flex-shrink-0">
                                <span>Spring #{boat.springRank} · Champ #{boat.clubChampRank}</span>
                                <span className="font-mono font-bold text-slate-300">Score: {boat.qualificationScore.toFixed(1)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Ineligible Boats (< 40% Participation) */}
            {ineligibleBoats.length > 0 && (
                <div className="space-y-3 pt-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5 px-1">
                        <span>⚠️</span>
                        <span>Ineligible Fleet (&lt; 40% Participation) ({ineligibleBoats.length} boats)</span>
                    </h3>

                    <div className="space-y-2">
                        {ineligibleBoats.map((boat) => (
                            <div
                                key={boat.boatId}
                                className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-red-300">{boat.skipper}</span>
                                    <span className="font-mono text-slate-500">Sail {boat.sailNumber}</span>
                                </div>
                                <span className="text-slate-400">
                                    {boat.qualificationReason}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lock Confirmation Modal */}
            {showLockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <span className="text-2xl">🔒</span>
                            <h3 className="text-lg font-bold text-white">Lock Keg Cup Qualifiers Snapshot</h3>
                        </div>

                        <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
                            <p>
                                You are about to permanently lock the <strong>{summary.actualQualifiersCount} qualifiers</strong> for the 2026/27 Keg Cup season.
                            </p>
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px]">
                                <div>• Active Eligible Boats: {summary.eligibleBoatsCount}</div>
                                <div>• Proposed Qualifiers: {summary.actualQualifiersCount} (Math.ceil split)</div>
                                <div>• Boundary Cut-Off Score: {summary.boundaryScore?.toFixed(1)}</div>
                                <div>• Participation Threshold: {(threshold * 100).toFixed(0)}%</div>
                            </div>
                            <p className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-200">
                                ⚠️ <strong>Audit Requirement:</strong> Once locked, the qualifying fleet remains fixed for this season. Subsequent regular season MYC race updates will NOT alter this roster.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Audit Note / Race Committee Authorization:
                            </label>
                            <input
                                type="text"
                                value={auditReason}
                                onChange={(e) => setAuditReason(e.target.value)}
                                placeholder="e.g. Official pre-Christmas cut-off confirmed by MYC Laser Committee"
                                className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowLockModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmLock}
                                disabled={isProcessing}
                                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black min-h-[44px]"
                            >
                                {isProcessing ? 'Locking Snapshot...' : 'Confirm & Lock Roster'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unlock Confirmation Modal */}
            {showUnlockModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-red-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <span className="text-2xl">⚠️</span>
                            <h3 className="text-lg font-bold text-white">Unlock Qualifiers for Re-evaluation?</h3>
                        </div>

                        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                            <p>
                                Unlocking allows modifying the Pre-Christmas qualification entries. An immutable audit record will be logged with your administrator user ID and justification.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Mandatory Justification for Unlocking:
                            </label>
                            <input
                                type="text"
                                required
                                value={auditReason}
                                onChange={(e) => setAuditReason(e.target.value)}
                                placeholder="e.g. Correcting official Spring Pointscore rank for boat AUS-214582"
                                className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowUnlockModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnlock}
                                disabled={isProcessing}
                                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold min-h-[44px]"
                            >
                                {isProcessing ? 'Unlocking...' : 'Confirm Unlock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
