import React, { useState } from 'react';
import { type Boat, TOTAL_RACES } from '../types';

interface BoatFormProps {
    onAddBoat: (boat: Boat) => void;
}

export const BoatForm: React.FC<BoatFormProps> = ({ onAddBoat }) => {
    const [skipper, setSkipper] = useState('');
    const [boatName, setBoatName] = useState('');
    const [sailNumber, setSailNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!skipper || !sailNumber) return;

        const newBoat: Boat = {
            id: crypto.randomUUID(),
            skipper,
            boatName,
            sailNumber,
            results: Array(TOTAL_RACES).fill(null),
            nett: 0,
            total: 0,
            rank: 0,
        };

        onAddBoat(newBoat);
        setSkipper('');
        setBoatName('');
        setSailNumber('');
    };

    return (
        <div className="glass-card p-6 mb-8 w-full max-w-2xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-accent-blue">Add New Entry</h2>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Skipper Name"
                    value={skipper}
                    onChange={(e) => setSkipper(e.target.value)}
                    className="flex-1"
                    required
                />
                <input
                    type="text"
                    placeholder="Boat Name (Optional)"
                    value={boatName}
                    onChange={(e) => setBoatName(e.target.value)}
                    className="flex-1"
                />
                <input
                    type="text"
                    placeholder="Sail Number"
                    value={sailNumber}
                    onChange={(e) => setSailNumber(e.target.value)}
                    className="w-full md:w-32"
                    required
                />
                <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-lg shadow-sky-500/20"
                >
                    Add Boat
                </button>
            </form>
        </div>
    );
};
