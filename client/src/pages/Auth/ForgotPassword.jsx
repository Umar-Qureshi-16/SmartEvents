import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess('Recovery link dispatched. Monitor your communication terminal.');
            } else {
                setError(data.message || 'Identity not found in ecosystem.');
            }
        } catch (err) {
            setError('System link failure. Ensure backend orchestration is active.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="glass p-8 md:p-10 rounded-[2.5rem] border-border space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl -mr-16 -mt-16" />

                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 text-[10px] font-black text-muted uppercase tracking-widest hover:text-fg transition-all group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Terminal
                    </button>

                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/10 group">
                            <KeyRound className="text-amber-400 group-hover:rotate-12 transition-transform" size={32} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-fg tracking-tighter uppercase italic">
                                Access<span className="text-amber-500">_Recovery</span>
                            </h2>
                            <p className="text-xs text-muted font-medium uppercase tracking-widest">Restore secure identity link</p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 text-xs font-bold">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-400 text-xs font-bold">
                            <CheckCircle2 size={16} />
                            {success}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted uppercase tracking-widest flex items-center gap-2 px-1">
                                    <Mail size={12} className="text-amber-400" /> Identity Link
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your_email@enterprise.com"
                                    className="w-full bg-fg/5 border border-border rounded-2xl px-5 py-4 text-sm text-fg placeholder:text-muted outline-none focus:border-amber-500/50 transition-all font-medium"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-warning text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : (
                                    <>
                                        Dispatch Link <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
