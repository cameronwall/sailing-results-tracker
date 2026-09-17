import React, { useState, useEffect, useRef } from 'react';
import type { RaceMeta, KegCupBoat, RaceResultSource } from '../../types';
import { EntryRowCard } from './EntryRowCard';
import { SaveActionBar } from './SaveActionBar';
import { validateRacePublish } from '../../utils/kegCupScoring';

interface AdminRaceEntryProps {
    races: RaceMeta[];
    qualifierBoats: KegCupBoat[];
    onSaveRace: (raceMeta: RaceMeta, results: Record<string, RaceResultSource>) => Promise<void>;
    onCreateRace: () => void;
}

export const AdminRaceEntry: React.FC<AdminRaceEntryProps> = ({
    races,
    qualifierBoats,
    onSaveRace,
    onCreateRace
}) => {
    // Current active race
    const [selectedRaceNumber, setSelectedRaceNumber] = useState<number>(
        races.length > 0 ? races[0].raceNumber : 1
    );

    const activeRace = races.find(r => r.raceNumber === selectedRaceNumber) || {
        raceNumber: selectedRaceNumber,
        raceDate: new Date().toISOString().split('T')[0],
        seriesEntrants: 21,
        boatsAtStart: 12,
        isCompleted: false
    };

    // Race-level metadata state
    const [raceDate, setRaceDate] = useState<string>(activeRace.raceDate || '');
    const [seriesEntrants, setSeriesEntrants] = useState<number>(activeRace.seriesEntrants || 21);
    const [boatsAtStart, setBoatsAtStart] = useState<number>(activeRace.boatsAtStart || 12);
    const [isCompleted, setIsCompleted] = useState<boolean>(activeRace.isCompleted || false);

    // Results state: boatId -> RaceResultSource
    const [resultsState, setResultsState] = useState<Record<string, RaceResultSource>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] }>({ valid: true, errors: [], warnings: [] });
    const [confirmTieApproved, setConfirmTieApproved] = useState(false);

    // Refs for auto-advancing focus from Scratch -> Handicap -> Next Competitor
    const scratchRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // When selected race changes, sync state
    useEffect(() => {
        const race = races.find(r => r.raceNumber === selectedRaceNumber) || activeRace;
        setRaceDate(race.raceDate || '');
        setSeriesEntrants(race.seriesEntrants || 21);
        setBoatsAtStart(race.boatsAtStart || 12);
        setIsCompleted(race.isCompleted || false);

        // Build results dictionary from qualifierBoats for this race
        const initialResults: Record<string, RaceResultSource> = {};
        qualifierBoats.forEach(b => {
            const existing = b.raceResults[race.raceNumber];
            initialResults[b.id] = existing ? { ...existing } : { statusCode: 'NONE' };
        });
        setResultsState(initialResults);
        setIsDirty(false);
    }, [selectedRaceNumber, races, qualifierBoats]);

    // Navigation guard for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const handleResultChange = (boatId: string, updated: RaceResultSource) => {
        setResultsState(prev => ({
            ...prev,
            [boatId]: updated
        }));
        setIsDirty(true);
    };

    const handleOpenPublishModal = () => {
        const meta: RaceMeta = {
            raceNumber: selectedRaceNumber,
            raceDate,
            seriesEntrants: Number(seriesEntrants),
            boatsAtStart: Number(boatsAtStart),
            isCompleted: true
        };
        const val = validateRacePublish(meta, resultsState, qualifierBoats);
        setValidationResult(val);
        setConfirmTieApproved(false);
        setShowPublishModal(true);
    };

    const handleSave = async (complete: boolean) => {
        setIsSaving(true);
        try {
            const updatedMeta: RaceMeta = {
                raceNumber: selectedRaceNumber,
                raceDate,
                seriesEntrants: Number(seriesEntrants),
                boatsAtStart: Number(boatsAtStart),
                isCompleted: complete
            };

            if (complete) {
                const val = validateRacePublish(updatedMeta, resultsState, qualifierBoats);
                if (!val.valid) {
                    alert(`Cannot publish race. Please correct validation errors:\n• ${val.errors.join('\n• ')}`);
                    setIsSaving(false);
                    return;
                }
                if (val.warnings.length > 0 && !confirmTieApproved) {
                    alert('Cannot publish race. Please review and explicitly confirm duplicate position warnings.');
                    setIsSaving(false);
                    return;
                }
            }

            await onSaveRace(updatedMeta, resultsState);
            setIsCompleted(complete);
            setIsDirty(false);
            setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            setShowPublishModal(false);
        } catch (err) {
            console.error('Failed to save race:', err);
            alert('Failed to save race results. Please retry.');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-advancing focus helper
    const advanceFocusToNext = (currentIndex: number) => {
        const nextBoat = qualifierBoats[currentIndex + 1];
        if (nextBoat && scratchRefs.current[nextBoat.id]) {
            scratchRefs.current[nextBoat.id]?.focus();
        }
    };

    return (
        <section className="w-full max-w-4xl mx-auto space-y-5 pb-32">
            {/* Race Selector Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            Race Results Entry
                        </h2>
                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">
                            Race {selectedRaceNumber}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Enter Scratch & Handicap positions for the complete MYC fleet
                    </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Race Picker */}
                    <select
                        value={selectedRaceNumber}
                        onChange={(e) => {
                            if (isDirty && !window.confirm('You have unsaved changes. Discard and switch race?')) {
                                return;
                            }
                            setSelectedRaceNumber(parseInt(e.target.value, 10));
                        }}
                        className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 outline-none cursor-pointer flex-1 sm:flex-initial min-h-[44px]"
                        aria-label="Select race to edit"
                    >
                        {races.map((r) => (
                            <option key={r.raceNumber} value={r.raceNumber}>
                                Race {r.raceNumber} {r.isCompleted ? '(Published)' : '(Draft)'}
                            </option>
                        ))}
                    </select>

                    {/* New Race Button */}
                    <button
                        type="button"
                        onClick={onCreateRace}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold border border-slate-700 transition flex items-center gap-1 min-h-[44px]"
                    >
                        <span>+</span>
                        <span>New Race</span>
                    </button>
                </div>
            </div>

            {/* Race Level Metadata Bar */}
            <div className="bg-slate-850 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Race Date
                    </label>
                    <input
                        type="date"
                        value={raceDate}
                        onChange={(e) => {
                            setRaceDate(e.target.value);
                            setIsDirty(true);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:border-amber-500 outline-none min-h-[44px]"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Boats at Starting Area
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={boatsAtStart}
                        onChange={(e) => {
                            setBoatsAtStart(parseInt(e.target.value, 10) || 0);
                            setIsDirty(true);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold rounded-lg px-3 py-2 focus:border-amber-500 outline-none min-h-[44px]"
                        title="Used for DNS, DNF, DSQ penalty scores (Starters + 1)"
                    />
                </div>

                <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1 uppercase tracking-wider">
                        Series Entrants Fleet
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={seriesEntrants}
                        onChange={(e) => {
                            setSeriesEntrants(parseInt(e.target.value, 10) || 0);
                            setIsDirty(true);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 text-white text-xs font-mono font-bold rounded-lg px-3 py-2 focus:border-amber-500 outline-none min-h-[44px]"
                        title="Used for DNC penalty score (Series + 1)"
                    />
                </div>
            </div>

            {/* Competitor Cards List (ONLY Keg Cup Qualifiers) */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                        Keg Cup Competitors ({qualifierBoats.length} qualified boats)
                    </span>
                    <span className="text-[11px] text-slate-400 italic">
                        Placings are in the full MYC fleet
                    </span>
                </div>

                {qualifierBoats.map((boat, idx) => (
                    <EntryRowCard
                        key={boat.id}
                        skipper={boat.skipper}
                        boatName={boat.boatName}
                        sailNumber={boat.sailNumber}
                        result={resultsState[boat.id] || { statusCode: 'NONE' }}
                        raceMeta={{
                            raceNumber: selectedRaceNumber,
                            raceDate,
                            seriesEntrants,
                            boatsAtStart,
                            isCompleted
                        }}
                        onChange={(updated) => handleResultChange(boat.id, updated)}
                        scratchInputRef={{
                            current: scratchRefs.current[boat.id] ?? null
                        } as any}
                        onScratchEnter={() => {
                            // Find handicap input and focus or advance
                        }}
                        onHandicapEnter={() => advanceFocusToNext(idx)}
                    />
                ))}

                {qualifierBoats.length === 0 && (
                    <div className="text-center p-12 bg-slate-900 border border-dashed border-slate-800 rounded-2xl text-slate-400 text-sm">
                        No Keg Cup qualifiers found. Please lock qualifiers in the Qualification Manager first.
                    </div>
                )}
            </div>

            {/* Sticky Bottom Save / Publish Bar */}
            <SaveActionBar
                isDirty={isDirty}
                isSaving={isSaving}
                lastSavedTime={lastSavedTime}
                isCompleted={isCompleted}
                onSaveDraft={() => handleSave(false)}
                onPublishRace={handleOpenPublishModal}
                onReopenDraft={() => handleSave(false)}
            />

            {/* Publish Confirmation Modal */}
            {showPublishModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center gap-3 text-amber-400">
                            <span className="text-2xl">🏁</span>
                            <h3 className="text-lg font-bold text-white">Complete & Publish Race {selectedRaceNumber}?</h3>
                        </div>

                        {/* Blocking Validation Errors */}
                        {validationResult.errors.length > 0 && (
                            <div className="p-3.5 bg-red-950/50 border border-red-800/60 rounded-xl space-y-1.5 text-xs text-red-200">
                                <div className="font-bold text-red-400 flex items-center gap-1.5">
                                    <span>⛔</span> Validation Errors Must Be Resolved:
                                </div>
                                <ul className="list-disc list-inside space-y-1">
                                    {validationResult.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Duplicate Finish / Dead Heat Warnings */}
                        {validationResult.warnings.length > 0 && (
                            <div className="p-3.5 bg-amber-950/50 border border-amber-700/60 rounded-xl space-y-2 text-xs text-amber-200">
                                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                                    <span>⚠️</span> Duplicate Finishing Position Flagged:
                                </div>
                                <ul className="list-disc list-inside space-y-1 text-amber-300/90">
                                    {validationResult.warnings.map((w, i) => (
                                        <li key={i}>{w}</li>
                                    ))}
                                </ul>
                                <label className="flex items-start gap-2 pt-1 font-semibold text-white cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={confirmTieApproved}
                                        onChange={(e) => setConfirmTieApproved(e.target.checked)}
                                        className="mt-0.5 rounded border-slate-700 accent-amber-500"
                                    />
                                    <span>I verify these duplicate positions are legitimate ties under RRS A7 (dead heat) or official handicap ties.</span>
                                </label>
                            </div>
                        )}

                        {validationResult.errors.length === 0 && (
                            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                                <p>
                                    Publishing will mark this race as <strong>Official & Completed</strong> in the Keg Cup standings.
                                </p>
                                <p className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-amber-200">
                                    ⚠️ Any Keg Cup competitor without an entered finish or penalty will automatically receive a <strong>DNC score ({seriesEntrants + 1} pts)</strong> according to regatta scoring rules.
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPublishModal(false)}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSave(true)}
                                disabled={
                                    isSaving ||
                                    validationResult.errors.length > 0 ||
                                    (validationResult.warnings.length > 0 && !confirmTieApproved)
                                }
                                className={`px-5 py-2 rounded-xl text-xs font-black min-h-[44px] transition ${
                                    isSaving ||
                                    validationResult.errors.length > 0 ||
                                    (validationResult.warnings.length > 0 && !confirmTieApproved)
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                                }`}
                            >
                                {isSaving ? 'Publishing...' : 'Confirm & Publish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};
