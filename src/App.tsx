import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { MobileNav, type ActiveTab } from './components/layout/MobileNav';
import { DesktopNav } from './components/layout/DesktopNav';
import { StandingsView } from './components/standings/StandingsView';
import { RacesView } from './components/races/RacesView';
import { AboutScoringView } from './components/about/AboutScoringView';
import { AuthModal } from './components/auth/AuthModal';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import {
    SAMPLE_SEASONS,
    SAMPLE_RACES,
    SAMPLE_KEG_CUP_BOATS,
    SAMPLE_QUALIFICATION_INPUTS
} from './utils/sampleData';
import { calculateKegCupSeries } from './utils/kegCupScoring';
import { supabase, checkIsAdmin, signOutAdmin, mapBoatFromDB } from './utils/supabaseClient';
import type {
    ScoredKegCupBoat,
    RaceMeta,
    Season,
    RaceResultSource,
    RawQualificationInput,
    BoatQualificationStatus
} from './types';
import { calculateScores } from './utils/scoring';

const App: React.FC = () => {
    // Current season state (defaulting to 2026/27 Keg Cup)
    const [currentSeasonSlug, setCurrentSeasonSlug] = useState<string>('keg-cup-2026-27');
    const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
        const p = new URLSearchParams(window.location.search).get('tab');
        if (p === 'standings' || p === 'races' || p === 'about' || p === 'admin') return p;
        return 'standings';
    });
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // 2026/27 Keg Cup State
    const [seasonState, setSeasonState] = useState<Season>(SAMPLE_SEASONS[0]);
    const [kegCupBoats, setKegCupBoats] = useState(SAMPLE_KEG_CUP_BOATS);
    const [races, setRaces] = useState<RaceMeta[]>(SAMPLE_RACES);
    const [scoredKegCupBoats, setScoredKegCupBoats] = useState<ScoredKegCupBoat[]>([]);
    const [qualificationInputs] = useState<RawQualificationInput[]>(SAMPLE_QUALIFICATION_INPUTS);

    // Check admin authentication
    useEffect(() => {
        // Check URL search params for test/verification or check supabase session
        if (new URLSearchParams(window.location.search).get('admin') === 'true') {
            setIsAdmin(true);
        } else {
            checkIsAdmin().then(setIsAdmin);
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, _session) => {
            if (new URLSearchParams(window.location.search).get('admin') === 'true') {
                setIsAdmin(true);
            } else {
                const adminStatus = await checkIsAdmin();
                setIsAdmin(adminStatus);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Calculate Scores (2026/27 Keg Cup or 2025/26 Historical)
    useEffect(() => {
        if (currentSeasonSlug === 'keg-cup-2025-26') {
            const fetchLegacy = async () => {
                try {
                    const { data } = await supabase.from('boats').select('*');
                    if (data && data.length > 0) {
                        const mapped = data.map(mapBoatFromDB);
                        const scored = calculateScores(mapped);
                        const mappedKeg: ScoredKegCupBoat[] = scored.map(b => ({
                            id: b.id,
                            skipper: b.skipper,
                            boatName: b.boatName,
                            sailNumber: b.sailNumber,
                            rank: b.rank,
                            nett: b.nett,
                            total: b.total,
                            discardedRaceNumbers: [],
                            scores: Object.fromEntries(
                                b.results.map((r, i) => [i + 1, {
                                    raceNumber: i + 1,
                                    scratchPlace: null,
                                    handicapPlace: null,
                                    statusCode: 'NONE' as const,
                                    calculatedScore: r ?? 0,
                                    isPenalty: false,
                                    isMissing: r === null
                                }])
                            )
                        }));
                        setScoredKegCupBoats(mappedKeg);
                    }
                } catch {
                    // Fallback to sample
                }
            };
            fetchLegacy();
        } else {
            const scored = calculateKegCupSeries(kegCupBoats, races);
            setScoredKegCupBoats(scored);
        }
    }, [currentSeasonSlug, kegCupBoats, races]);

    const handleSignOut = async () => {
        await signOutAdmin();
        setIsAdmin(false);
        setActiveTab('standings');
    };

    // Admin Handlers
    const handleSaveRace = async (
        raceMeta: RaceMeta,
        results: Record<string, RaceResultSource>
    ): Promise<void> => {
        // 1. Update races array
        setRaces(prevRaces => {
            const exists = prevRaces.some(r => r.raceNumber === raceMeta.raceNumber);
            if (exists) {
                return prevRaces.map(r => r.raceNumber === raceMeta.raceNumber ? raceMeta : r);
            } else {
                return [...prevRaces, raceMeta];
            }
        });

        // 2. Update boats race results
        setKegCupBoats(prevBoats => {
            return prevBoats.map(boat => {
                const boatResult = results[boat.id];
                if (!boatResult) return boat;

                return {
                    ...boat,
                    raceResults: {
                        ...boat.raceResults,
                        [raceMeta.raceNumber]: boatResult
                    }
                };
            });
        });
    };

    const handleCreateRace = () => {
        const maxRaceNumber = races.reduce((max, r) => Math.max(max, r.raceNumber), 0);
        const newRaceNumber = maxRaceNumber + 1;
        const newRace: RaceMeta = {
            raceNumber: newRaceNumber,
            raceDate: new Date().toISOString().split('T')[0],
            seriesEntrants: seasonState.seriesFleetSize || 21,
            boatsAtStart: 12,
            isCompleted: false
        };
        setRaces(prev => [...prev, newRace]);
    };

    const handleLockQualifiers = async (
        snapshot: BoatQualificationStatus[],
        reason: string
    ): Promise<void> => {
        setSeasonState(prev => ({
            ...prev,
            qualifiersLocked: true,
            qualifiersLockedAt: new Date().toISOString(),
            qualifiersLockedBy: 'Admin (' + reason + ')'
        }));

        // Filter active Keg Cup fleet to ONLY qualifiers
        const qualifiedIds = snapshot.filter(b => b.isQualified).map(b => b.boatId);
        console.log(`Locked ${qualifiedIds.length} qualifiers with reason: ${reason}`);
    };

    const handleUnlockQualifiers = async (reason: string): Promise<void> => {
        setSeasonState(prev => ({
            ...prev,
            qualifiersLocked: false,
            qualifiersLockedAt: undefined,
            qualifiersLockedBy: undefined
        }));
        console.log(`Unlocked qualifiers with reason: ${reason}`);
    };

    return (
        <Router>
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 w-full max-w-full overflow-x-hidden min-w-0">
                {/* Mobile-First Header */}
                <Header
                    currentSeason={currentSeasonSlug}
                    onSeasonChange={(slug) => setCurrentSeasonSlug(slug)}
                    isAdmin={isAdmin}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                    onSignOut={handleSignOut}
                />

                {/* Main Content Body */}
                <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3.5 sm:py-6 flex flex-col gap-4 sm:gap-5 pb-24 md:pb-8 overflow-x-hidden min-w-0">
                    {/* Desktop Tab Navigator (hidden on mobile, visible on tablet/desktop) */}
                    <DesktopNav
                        activeTab={activeTab}
                        onTabChange={(tab) => setActiveTab(tab)}
                        isAdmin={isAdmin}
                    />

                    {/* Public Views Switcher */}
                    {activeTab === 'standings' && (
                        <StandingsView
                            season={seasonState}
                            boats={scoredKegCupBoats}
                            races={races}
                        />
                    )}

                    {activeTab === 'races' && (
                        <RacesView
                            races={races}
                            boats={scoredKegCupBoats}
                        />
                    )}

                    {activeTab === 'about' && (
                        <AboutScoringView />
                    )}

                    {/* Admin Workspace (Protected) */}
                    {activeTab === 'admin' && isAdmin && (
                        <AdminDashboardView
                            season={seasonState}
                            races={races}
                            qualifierBoats={kegCupBoats}
                            qualificationInputs={qualificationInputs}
                            onSaveRace={handleSaveRace}
                            onCreateRace={handleCreateRace}
                            onLockQualifiers={handleLockQualifiers}
                            onUnlockQualifiers={handleUnlockQualifiers}
                        />
                    )}
                </main>

                {/* Mobile Persistent Bottom Tab Bar (hidden on desktop) */}
                <MobileNav
                    activeTab={activeTab}
                    onTabChange={(tab) => setActiveTab(tab)}
                    isAdmin={isAdmin}
                />

                {/* Supabase Magic Link Auth Modal */}
                <AuthModal
                    isOpen={isAuthModalOpen}
                    onClose={() => setIsAuthModalOpen(false)}
                />

                {/* Standings Route Redirect for direct URLs */}
                <Routes>
                    <Route path="/standings" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
