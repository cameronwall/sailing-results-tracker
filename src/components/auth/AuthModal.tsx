import React, { useState } from 'react';
import { signInWithMagicLink } from '../../utils/supabaseClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            const { error } = await signInWithMagicLink(email.trim());
            if (error) {
                setStatus('error');
                setErrorMessage(error.message);
            } else {
                setStatus('success');
            }
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to send login link.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            {/* Backdrop click */}
            <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

            {/* Modal Dialog */}
            <div
                className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <h2 id="auth-modal-title" className="text-xl font-bold text-white flex items-center gap-2">
                            <span>🔐</span>
                            Admin Authentication
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Passwordless sign-in via Supabase Magic Link.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
                        aria-label="Close modal"
                    >
                        ✕
                    </button>
                </div>

                {status === 'success' ? (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl space-y-2 text-center">
                        <div className="text-2xl">📬</div>
                        <h3 className="text-sm font-bold text-emerald-400">Magic Link Sent!</h3>
                        <p className="text-xs text-slate-300">
                            Check your inbox for <strong className="text-white">{email}</strong> to sign in.
                        </p>
                        <button
                            onClick={onClose}
                            className="mt-3 w-full px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition min-h-[44px]"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="admin-email" className="block text-xs font-semibold text-slate-300 mb-1">
                                Administrator Email
                            </label>
                            <input
                                id="admin-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="racecommittee@myc.org.au"
                                className="w-full bg-slate-950/70 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                                autoFocus
                            />
                        </div>

                        {status === 'error' && (
                            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-xs">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-amber-500/20 min-h-[44px]"
                        >
                            {status === 'loading' ? 'Sending Magic Link...' : 'Send Magic Link'}
                        </button>

                        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                            ⚠️ Note: In accordance with MYC security rules, signing in grants access only if your account is pre-authorized in the official administrator roster.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};
