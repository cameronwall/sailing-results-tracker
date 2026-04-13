import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { PublicDashboard } from './components/PublicDashboard';
import type { Boat } from './types';
import { calculateScores } from './utils/scoring';
import { supabase, mapBoatFromDB } from './utils/supabaseClient';

const App: React.FC = () => {
    const [boats, setBoats] = useState<Boat[]>([]);
    // const [loading, setLoading] = useState(true); // Loading state available if needed later

    // Initial Fetch
    useEffect(() => {
        fetchBoats();
    }, []);

    // Real-time Subscription
    useEffect(() => {
        const channel = supabase
            .channel('public:boats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'boats' }, (_payload) => {
                // Simplest strategy: Refetch all on any change to ensure sync
                // Optimizations possible, but this guarantees correctness for sailing series
                fetchBoats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchBoats = async () => {
        try {
            const { data, error } = await supabase.from('boats').select('*');
            if (error) throw error;

            if (data) {
                const mappedBoats: Boat[] = data.map(mapBoatFromDB);
                setBoats(calculateScores(mappedBoats));
            }
        } catch (error) {
            console.error('Error fetching boats:', error);
        }
    };

    const handleAddBoat = async (newBoat: Boat) => {
        // Optimistic Update
        const updatedBoats = [...boats, newBoat];
        setBoats(calculateScores(updatedBoats));

        try {
            const { error } = await supabase.from('boats').insert([{
                id: newBoat.id, // Use client-side ID to match optimistic state
                skipper: newBoat.skipper,
                boat_name: newBoat.boatName,
                sail_number: newBoat.sailNumber,
                results: []
            }]);
            if (error) throw error;
        } catch (err) {
            // Rollback on error (optional, simplified here)
            console.error('Failed to add boat:', err);
            // In a real app we might revert state here
            fetchBoats(); // Re-sync with server truth
        }
    };

    const handleUpdateResult = async (boatId: string, raceIndex: number, value: string) => {
        const val = value === '' ? 0 : parseInt(value, 10);
        if (isNaN(val)) return;

        // 1. Optimistic Local Update
        const updatedBoats = boats.map(b => {
            if (b.id === boatId) {
                const newResults = [...b.results];
                // Ensure array is long enough (fill with nulls if needed)
                while (newResults.length <= raceIndex) newResults.push(null);
                newResults[raceIndex] = val === 0 ? null : val;
                return { ...b, results: newResults };
            }
            return b;
        });

        setBoats(calculateScores(updatedBoats));

        // 2. Send to DB
        // Find the specific changed result array to send
        const changedBoat = updatedBoats.find(b => b.id === boatId);
        if (!changedBoat) return;

        try {
            const { error } = await supabase
                .from('boats')
                .update({ results: changedBoat.results })
                .eq('id', boatId);

            if (error) throw error;
        } catch (err) {
            console.error('Failed to update result:', err);
            // On error, re-fetch to restore valid state
            fetchBoats();
        }
    };

    const handleClearData = async () => {
        if (window.confirm('Are you sure you want to DELETE ALL DATA from the database? This affects all users.')) {
            try {
                // Delete all rows
                const { error } = await supabase.from('boats').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all valid UUIDs
                if (error) throw error;
            } catch (err) {
                console.error('Failed to clear data:', err);
            }
        }
    };

    return (
        <Router>
            <div className="min-h-screen p-4 md:p-8 flex flex-col gap-8 max-w-[1600px] mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-4">
                    <div>
                        <h1
                            className="text-4xl md:text-6xl font-black mb-2 tracking-tight"
                            style={{
                                background: 'linear-gradient(to right, #fde047, #ca8a04)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                lineHeight: '1',
                                fontWeight: 900
                            }}
                        >
                            2026 KEG CUP
                        </h1>
                        <h2 className="text-3xl font-bold text-slate-300">
                            Regatta Tracker
                        </h2>
                        <p className="text-slate-400 mt-2">Series Scoring & Results Management</p>
                    </div>
                </header>

                <Routes>
                    <Route
                        path="/"
                        element={
                            <AdminDashboard
                                boats={boats}
                                onAddBoat={handleAddBoat}
                                onUpdateResult={handleUpdateResult}
                                onClearData={handleClearData}
                            />
                        }
                    />
                    <Route
                        path="/standings"
                        element={
                            <PublicDashboard boats={boats} />
                        }
                    />
                </Routes>

                <footer className="text-center text-slate-600 text-sm py-8">
                    Built with React & Vite • Scoring Rules: Discards at 5, 10, 15 races
                </footer>
            </div>
        </Router>
    );
};

export default App;
