import React from 'react';

interface SaveActionBarProps {
    isDirty: boolean;
    isSaving: boolean;
    lastSavedTime?: string | null;
    isCompleted: boolean;
    onSaveDraft: () => void;
    onPublishRace: () => void;
    onReopenDraft?: () => void;
}

export const SaveActionBar: React.FC<SaveActionBarProps> = ({
    isDirty,
    isSaving,
    lastSavedTime,
    isCompleted,
    onSaveDraft,
    onPublishRace,
    onReopenDraft
}) => {
    return (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 bg-slate-900/95 border-t border-slate-700/80 backdrop-blur-lg p-3 sm:p-4 shadow-2xl">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Save Status Indicator */}
                <div className="flex items-center gap-2 text-xs">
                    {isSaving ? (
                        <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                            Saving race results...
                        </span>
                    ) : isDirty ? (
                        <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            Unsaved changes
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {lastSavedTime ? `Saved at ${lastSavedTime}` : 'All changes saved'}
                        </span>
                    )}

                    <span className="text-slate-600">·</span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isCompleted
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    }`}>
                        {isCompleted ? 'Published' : 'Draft'}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isCompleted && onReopenDraft && (
                        <button
                            type="button"
                            onClick={onReopenDraft}
                            disabled={isSaving}
                            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                        >
                            Reopen as Draft
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onSaveDraft}
                        disabled={isSaving || !isDirty}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold border border-slate-700 transition min-h-[44px]"
                    >
                        Save as Draft
                    </button>

                    {!isCompleted && (
                        <button
                            type="button"
                            onClick={onPublishRace}
                            disabled={isSaving}
                            className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition min-h-[44px]"
                        >
                            Publish Race
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
