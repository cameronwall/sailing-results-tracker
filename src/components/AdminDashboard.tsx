import React from 'react';
import { BoatForm } from './BoatForm';
import { ResultsGrid } from './ResultsGrid';
import { Leaderboard } from './Leaderboard';
import type { Boat } from '../types';

interface AdminDashboardProps {
    boats: Boat[];
    onAddBoat: (newBoat: Boat) => void;
    onUpdateResult: (boatId: string, raceIndex: number, value: string) => void;
    onClearData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    boats,
    onAddBoat,
    onUpdateResult,
    onClearData
}) => {
    return (
        <>
            <main className="grid gap-8">
                <section>
                    <Leaderboard boats={boats} />
                </section>

                <section className="grid xl:grid-cols-3 gap-8 items-start">
                    <div className="xl:col-span-1">
                        <BoatForm onAddBoat={onAddBoat} />
                    </div>
                    <div className="xl:col-span-2">
                        <ResultsGrid boats={boats} onUpdateResult={onUpdateResult} />
                    </div>
                </section>

                <div className="flex justify-center mt-8">
                    <button
                        onClick={onClearData}
                        className="text-red-400 hover:text-red-300 text-sm px-4 py-2 hover:bg-red-900/20 rounded transition"
                    >
                        Reset Series Data
                    </button>
                </div>
            </main>
        </>
    );
};
