import React from 'react';

export type ActiveTab = 'standings' | 'races' | 'about' | 'admin';

interface MobileNavProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    isAdmin: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({
    activeTab,
    onTabChange,
    isAdmin
}) => {
    return (
        <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg pb-safe"
            aria-label="Main Navigation"
        >
            <div className="flex items-center justify-around h-16 px-2">
                {/* Standings Tab */}
                <button
                    onClick={() => onTabChange('standings')}
                    className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
                        activeTab === 'standings'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                    aria-label="Standings Tab"
                    aria-selected={activeTab === 'standings'}
                >
                    <span className="text-xl mb-0.5">🏆</span>
                    <span className="text-[11px] tracking-tight">Standings</span>
                </button>

                {/* Races Tab */}
                <button
                    onClick={() => onTabChange('races')}
                    className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
                        activeTab === 'races'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                    aria-label="Races Tab"
                    aria-selected={activeTab === 'races'}
                >
                    <span className="text-xl mb-0.5">⛵</span>
                    <span className="text-[11px] tracking-tight">Races</span>
                </button>

                {/* About & Scoring Tab */}
                <button
                    onClick={() => onTabChange('about')}
                    className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
                        activeTab === 'about'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                    aria-label="About and Scoring Tab"
                    aria-selected={activeTab === 'about'}
                >
                    <span className="text-xl mb-0.5">ℹ️</span>
                    <span className="text-[11px] tracking-tight">About</span>
                </button>

                {/* Admin Tab (Only if admin) */}
                {isAdmin && (
                    <button
                        onClick={() => onTabChange('admin')}
                        className={`flex flex-col items-center justify-center flex-1 h-full min-h-[44px] transition-colors ${
                            activeTab === 'admin'
                                ? 'text-cyan-400 font-bold'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                        aria-label="Admin Entry Tab"
                        aria-selected={activeTab === 'admin'}
                    >
                        <span className="text-xl mb-0.5">📝</span>
                        <span className="text-[11px] tracking-tight">Race Entry</span>
                    </button>
                )}
            </div>
        </nav>
    );
};
