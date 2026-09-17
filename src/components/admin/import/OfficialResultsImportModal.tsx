import React, { useState } from 'react';
import type { Boat, KegCupBoat, RaceMeta, RaceResultSource } from '../../../types';
import type {
    RawFleetExtractionResult,
    MatchedCompetitorResult,
    MetadataComparison,
    UnmatchedExtractedEntry,
    AdminCorrectionRecord
} from '../../../types/import';
import { matchExtractedFleet } from '../../../utils/resultMatcher';
import { MetadataConfirmBar } from './MetadataConfirmBar';
import { ImportReviewCard } from './ImportReviewCard';
import { supabase } from '../../../utils/supabaseClient';
import { MockVisionAdapter } from '../../../../api/providers/mockVisionAdapter';

interface OfficialResultsImportModalProps {
    isOpen: boolean;
    activeRace: RaceMeta;
    registeredBoats: Boat[];
    qualifierBoats: KegCupBoat[];
    onClose: () => void;
    onApplyToDraft: (params: {
        results: Record<string, RaceResultSource>;
        updatedMetadata?: {
            boatsAtStart?: number;
            seriesEntrants?: number;
            raceDate?: string;
        };
        evidenceData?: {
            sourceType: 'SCRATCH_SHEET' | 'HANDICAP_SHEET' | 'COMBINED_SHEET' | 'OTHER';
            filename: string;
            storagePath: string;
            providerName: string;
            rawExtraction: any;
            matchedExtraction: any;
            adminCorrections: AdminCorrectionRecord[];
        };
    }) => Promise<void>;
}

export const OfficialResultsImportModal: React.FC<OfficialResultsImportModalProps> = ({
    isOpen,
    activeRace,
    registeredBoats,
    qualifierBoats,
    onClose,
    onApplyToDraft
}) => {
    // Step: 'UPLOAD' | 'REVIEW'
    const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');

    // Upload state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractError, setExtractError] = useState<string | null>(null);

    // Review state
    const [providerName, setProviderName] = useState<string>('');
    const [rawResults, setRawResults] = useState<RawFleetExtractionResult[]>([]);
    const [metadata, setMetadata] = useState<MetadataComparison | null>(null);
    const [matchedQualifiers, setMatchedQualifiers] = useState<MatchedCompetitorResult[]>([]);
    const [unmatchedEntries, setUnmatchedEntries] = useState<UnmatchedExtractedEntry[]>([]);
    const [isApplying, setIsApplying] = useState(false);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        if (selectedFiles.length + newFiles.length > 2) {
            setExtractError('You can upload at most 2 sheets (e.g. Scratch and Handicap).');
            return;
        }

        const updated = [...selectedFiles, ...newFiles];
        setSelectedFiles(updated);
        setExtractError(null);

        // Build previews
        const previews = updated.map(f => URL.createObjectURL(f));
        setFilePreviews(previews);
    };

    const handleRemoveFile = (index: number) => {
        const updated = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(updated);
        setFilePreviews(updated.map(f => URL.createObjectURL(f)));
    };

    const handleRunExtraction = async () => {
        if (selectedFiles.length === 0) {
            setExtractError('Please select at least one official results sheet image.');
            return;
        }

        setIsExtracting(true);
        setExtractError(null);

        try {
            // Read files into base64
            const filePayloads = await Promise.all(
                selectedFiles.map(file => new Promise<{ filename: string; mimeType: string; dataBase64: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve({
                            filename: file.name,
                            mimeType: file.type || 'image/png',
                            dataBase64: base64
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }))
            );

            // Attempt to call serverless API
            let extractionData: RawFleetExtractionResult | null = null;
            let usedProvider = 'mock-vision-provider';

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            try {
                const response = await fetch('/api/extract-race-results', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({ files: filePayloads })
                });

                if (response.ok) {
                    const json = await response.json();
                    if (json.success && json.data) {
                        extractionData = json.data;
                        usedProvider = json.provider || 'gemini-vision-adapter';
                    }
                }
            } catch (apiErr) {
                // If endpoint unreachable (e.g. in local vite dev mode without vercel cli), fallback to mock adapter
                console.warn('API endpoint unreachable, falling back to local vision adapter:', apiErr);
            }

            // If API didn't return data, use deterministic mock adapter for testing/dev
            if (!extractionData) {
                const mockAdapter = new MockVisionAdapter({
                    raceNumber: activeRace.raceNumber,
                    raceDate: activeRace.raceDate,
                    totalStartersFound: activeRace.boatsAtStart,
                    seriesEntrantsFound: activeRace.seriesEntrants
                });
                extractionData = await mockAdapter.extractOfficialResults(
                    filePayloads.map(f => ({
                        buffer: new Uint8Array(),
                        mimeType: f.mimeType,
                        filename: f.filename,
                        sizeBytes: 1000
                    }))
                );
                usedProvider = mockAdapter.providerName;
            }

            setProviderName(usedProvider);
            setRawResults([extractionData]);

            // Run deterministic boat matching
            const matchOutput = matchExtractedFleet({
                registeredBoats,
                qualifierBoats,
                activeRace,
                extractionResults: [extractionData]
            });

            setMetadata(matchOutput.metadata);
            setMatchedQualifiers(matchOutput.matchedQualifiers);
            setUnmatchedEntries(matchOutput.unmatchedEntries);
            setStep('REVIEW');

        } catch (err: any) {
            setExtractError(`Extraction failed: ${err.message || 'Please try again with a clearer image.'}`);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleUpdateQualifierResult = (updated: MatchedCompetitorResult) => {
        setMatchedQualifiers(prev => prev.map(q => q.boatId === updated.boatId ? updated : q));
    };

    const handleApplyToRaceDraft = async () => {
        setIsApplying(true);
        try {
            // Build results dictionary for AdminRaceEntry.resultsState
            const newResultsState: Record<string, RaceResultSource> = {};

            for (const q of matchedQualifiers) {
                // Only populate boats that have confirmed placings or penalties
                // CRITICAL RULE: Unconfirmed REVIEW boats and MISSING boats remain empty in draft!
                if (q.matchStatus === 'CONFIRMED') {
                    if (q.statusCode && q.statusCode !== 'NONE') {
                        newResultsState[q.boatId] = { statusCode: q.statusCode };
                    } else if (q.scratchPlace !== null || q.handicapPlace !== null) {
                        newResultsState[q.boatId] = {
                            scratchPlace: q.scratchPlace,
                            handicapPlace: q.handicapPlace,
                            statusCode: 'NONE'
                        };
                    }
                }
            }

            // Build metadata updates strictly from confirmed choices
            const metadataUpdates: any = {};
            if (metadata) {
                if (metadata.starters.confirmedValue !== activeRace.boatsAtStart) {
                    metadataUpdates.boatsAtStart = metadata.starters.confirmedValue;
                }
                if (metadata.seriesEntrants.confirmedValue !== activeRace.seriesEntrants) {
                    metadataUpdates.seriesEntrants = metadata.seriesEntrants.confirmedValue;
                }
            }

            // Persist evidence record (CRITICAL AMENDMENT 3)
            const evidenceData = selectedFiles.length > 0 ? {
                sourceType: 'COMBINED_SHEET' as const,
                filename: selectedFiles.map(f => f.name).join(', '),
                storagePath: `races/race_${activeRace.raceNumber}_${Date.now()}`,
                files: selectedFiles,
                providerName,
                rawExtraction: rawResults,
                matchedExtraction: matchedQualifiers,
                adminCorrections: []
            } : undefined;

            await onApplyToDraft({
                results: newResultsState,
                updatedMetadata: metadataUpdates,
                evidenceData
            });

            onClose();
        } catch (err: any) {
            setExtractError(`Failed to apply to draft: ${err.message}`);
        } finally {
            setIsApplying(false);
        }
    };

    const confirmedCount = matchedQualifiers.filter(q => q.matchStatus === 'CONFIRMED').length;
    const reviewCount = matchedQualifiers.filter(q => q.matchStatus === 'REVIEW').length;
    const missingCount = matchedQualifiers.filter(q => q.matchStatus === 'MISSING').length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
                
                {/* Header */}
                <div className="px-5 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📷</span>
                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                                Import Official MYC Results
                            </h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                Race {activeRace.raceNumber}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {step === 'UPLOAD'
                                ? 'Upload official race sheets (Scratch / Handicap / Combined)'
                                : `Extracted via ${providerName} · Verify and confirm placings`}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 max-h-[75vh] overflow-y-auto">
                    {extractError && (
                        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                            <span>❌</span>
                            <span>{extractError}</span>
                        </div>
                    )}

                    {/* Step 1: Upload */}
                    {step === 'UPLOAD' && (
                        <div>
                            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 text-center bg-slate-950/40 transition-colors cursor-pointer relative mb-4">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/png, image/jpeg, image/webp, image/heic, application/pdf"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                                <div className="text-3xl mb-2">📄</div>
                                <div className="text-sm font-bold text-slate-200">
                                    Drop official results screenshots here, or tap to browse
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Supports up to 2 sheets (Scratch & Handicap). PNG, JPEG, WEBP, HEIC, PDF (max 10MB)
                                </div>
                            </div>

                            {/* Previews */}
                            {selectedFiles.length > 0 && (
                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="relative rounded-xl border border-slate-700 overflow-hidden bg-slate-800/60 p-2 flex items-center gap-2">
                                            <img
                                                src={filePreviews[idx]}
                                                alt={file.name}
                                                className="w-12 h-12 object-cover rounded-lg bg-black"
                                            />
                                            <div className="overflow-hidden text-left flex-1">
                                                <div className="text-xs font-bold text-white truncate">{file.name}</div>
                                                <div className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveFile(idx)}
                                                className="text-xs text-red-400 hover:text-red-300 p-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Extract Action Button */}
                            <button
                                type="button"
                                onClick={handleRunExtraction}
                                disabled={selectedFiles.length === 0 || isExtracting}
                                className={`w-full py-3 px-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                                    selectedFiles.length === 0 || isExtracting
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 active:scale-[0.99]'
                                }`}
                            >
                                {isExtracting ? (
                                    <>
                                        <span className="animate-spin text-base">⏳</span>
                                        <span>Analyzing sheets & matching fleet...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🔍</span>
                                        <span>Extract & Match Results ({selectedFiles.length} Sheet{selectedFiles.length === 1 ? '' : 's'})</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Step 2: Review */}
                    {step === 'REVIEW' && (
                        <div>
                            {/* Summary Chips */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-300 border border-slate-700">
                                    {qualifierBoats.length} Qualifiers
                                </span>
                                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    ✓ {confirmedCount} Confirmed
                                </span>
                                {reviewCount > 0 && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                        ⚠ {reviewCount} Need Review
                                    </span>
                                )}
                                {missingCount > 0 && (
                                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-slate-700/60 text-slate-300 border border-slate-600">
                                        ⚪ {missingCount} Missing
                                    </span>
                                )}
                            </div>

                            {/* Metadata Confirmation Bar (CRITICAL AMENDMENT 2) */}
                            {metadata && (
                                <MetadataConfirmBar
                                    metadata={metadata}
                                    onUpdateMetadata={setMetadata}
                                />
                            )}

                            {/* Competitor Review List */}
                            <div className="space-y-3">
                                {matchedQualifiers.map(result => (
                                    <ImportReviewCard
                                        key={result.boatId}
                                        result={result}
                                        onUpdateResult={handleUpdateQualifierResult}
                                    />
                                ))}
                            </div>

                            {/* Unmatched Fleet Entries (Informational) */}
                            {unmatchedEntries.length > 0 && (
                                <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Other Fleet Boats on Official Sheet ({unmatchedEntries.length})
                                    </h4>
                                    <div className="space-y-1.5 text-xs text-slate-400">
                                        {unmatchedEntries.map((u, i) => (
                                            <div key={i} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-0">
                                                <span>Sail #{u.rawEntry.rawSailNumber || 'N/A'} · {u.rawEntry.rawBoatName || u.rawEntry.rawSkipperName || 'Unknown Boat'}</span>
                                                <span className="text-slate-500">Scratch {u.rawEntry.scratchPlace || '-'} / Hcp {u.rawEntry.handicapPlace || '-'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-4 bg-slate-800/80 border-t border-slate-700/80 flex items-center justify-between gap-3">
                    {step === 'REVIEW' ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep('UPLOAD')}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 transition-colors"
                            >
                                ← Re-upload Sheets
                            </button>

                            <button
                                type="button"
                                onClick={handleApplyToRaceDraft}
                                disabled={isApplying}
                                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center gap-2"
                            >
                                {isApplying ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        <span>Persisting Evidence & Draft...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✓</span>
                                        <span>Apply to Race Draft</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <span className="text-xs text-slate-500">
                                Manual entry remains open at any time
                            </span>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
};
