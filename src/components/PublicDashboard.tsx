import React from 'react';
import { Leaderboard } from './Leaderboard';
import type { Boat } from '../types';
import { Link } from 'react-router-dom';

interface PublicDashboardProps {
    boats: Boat[];
}

export const PublicDashboard: React.FC<PublicDashboardProps> = ({ boats }) => {
    return (
        <main className="grid gap-8">
            <section>
                <div className="flex justify-end mb-2">
                    <Link to="/" className="text-xs text-slate-600 hover:text-slate-400 trasition">
                        Admin Login
                    </Link>
                </div>
                <Leaderboard boats={boats} />
            </section>

            <section className="text-center p-8 glass-card">
                <p className="text-slate-400">
                    Official results for the 2026 Keg Cup Series.
                    <br />
                    Results are provisional until confirmed by the race committee.
                </p>
            </section>
        </main>
    );
};
