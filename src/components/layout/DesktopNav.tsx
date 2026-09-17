import React from 'react';
import type { ActiveTab } from './MobileNav';

interface DesktopNavProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    isAdmin: boolean;
}

export const DesktopNav: React.FC<DesktopNavProps> = ({
    activeTab,
    onTabChange,
    isAdmin
}) => {
    return (
        <div className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 self-center">
            <button
                onClick={() => onTabChange('standings')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'standings'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
                <span>🏆</span>
                <span>Standings</span>
            </button>

            <button
                onClick={() => onTabChange('races')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'races'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
                <span>⛵</span>
                <span>Races Explorer</span>
            </button>

            <button
                onClick={() => onTabChange('about')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === 'about'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
                <span>ℹ️</span>
                <span>About & Scoring</span>
            </button>

            {isAdmin && (
                <button
                    onClick={() => onTabChange('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                        activeTab === 'admin'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                >
                    <span>📝</span>
                    <span>Admin Entry</span>
                </button>
            )}
        </div>
    );
};
