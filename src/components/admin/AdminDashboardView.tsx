import React, { useState } from 'react';
import type {
    Season,
    RaceMeta,
    KegCupBoat,
    RawQualificationInput,
    BoatQualificationStatus,
    RaceResultSource,
    Boat
} from '../../types';
import { AdminRaceEntry } from './AdminRaceEntry';
import { QualificationManager } from './QualificationManager';

interface AdminDashboardViewProps {
    season: Season;
    races: RaceMeta[];
    qualifierBoats: KegCupBoat[];
    registeredBoats?: Boat[];
    qualificationInputs: RawQualificationInput[];
    onSaveRace: (raceMeta: RaceMeta, results: Record<string, RaceResultSource>) => Promise<void>;
    onCreateRace: () => void;
    onLockQualifiers: (snapshot: BoatQualificationStatus[], reason: string) => Promise<void>;
    onUnlockQualifiers?: (reason: string) => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
    season,
    races,
    qualifierBoats,
    registeredBoats = [],
    qualificationInputs,
    onSaveRace,
    onCreateRace,
    onLockQualifiers,
    onUnlockQualifiers
}) => {
    const [adminTab, setAdminTab] = useState<'race-entry' | 'qualification'>(() => {
        const s = new URLSearchParams(window.location.search).get('subtab');
        if (s === 'qualification') return 'qualification';
        return 'race-entry';
    });

    return (
        <div className="w-full space-y-5">
            {/* Admin Header & Sub-Navigation */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                        Admin Workspace
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs font-semibold text-slate-300">
                        {season.name}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setAdminTab('race-entry')}
                        className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                            adminTab === 'race-entry'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        📝 Race Entry
                    </button>
                    <button
                        type="button"
                        onClick={() => setAdminTab('qualification')}
                        className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${
                            adminTab === 'qualification'
                                ? 'bg-amber-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        🎯 Qualification & Lock
                    </button>
                </div>
            </div>

            {/* Sub-View Content */}
            {adminTab === 'race-entry' && (
                <AdminRaceEntry
                    races={races}
                    qualifierBoats={qualifierBoats}
                    registeredBoats={registeredBoats}
                    onSaveRace={onSaveRace}
                    onCreateRace={onCreateRace}
                />
            )}

            {adminTab === 'qualification' && (
                <QualificationManager
                    season={season}
                    initialInputs={qualificationInputs}
                    onLockQualifiers={onLockQualifiers}
                    onUnlockQualifiers={onUnlockQualifiers}
                />
            )}
        </div>
    );
};
