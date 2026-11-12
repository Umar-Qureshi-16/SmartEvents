import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Mail, Loader2, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { setCredentials } from '../../store/slices/authSlice';
import EventManagerLogo from '../../components/EventManagerLogo';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error' | 'resend'
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(5);
    const [resendEmail, setResendEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided in the URL.');
            return;
        }

        let isMounted = true;

        const verify = async () => {
            try {
                const res = await axios.post('/auth/verify-email', { token });
                if (!isMounted) return;

                if (res.data.success) {
                    setStatus('success');
                    setMessage(res.data.message || 'Email verified successfully!');

                    // Save session and update Redux
                    if (res.data.token && res.data.user) {
                        localStorage.setItem('token', res.data.token);
                        if (res.data.refreshToken) {
                            localStorage.setItem('refreshToken', res.data.refreshToken);
                        }
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                        dispatch(setCredentials({
                            user: res.data.user,
                            token: res.data.token,
                            refreshToken: res.data.refreshToken
                        }));
                    }
                    toast.success('Account successfully verified!');
                } else {
                    setStatus('error');
                    setMessage(res.data.message || 'Verification failed.');
                }
            } catch (err) {
                if (!isMounted) return;
                setStatus('error');
                const errMsg = err.response?.data?.message || 'Verification link is invalid or has expired.';
                setMessage(errMsg);
            }
        };

        verify();

        return () => {
            isMounted = false;
        };
    }, [token, dispatch]);

    // Auto-redirect countdown on success
    useEffect(() => {
        if (status === 'success' && countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        } else if (status === 'success' && countdown === 0) {
            navigate('/dashboard', { replace: true });
        }
    }, [status, countdown, navigate]);

    const handleResend = async (e) => {
        e.preventDefault();
        if (!resendEmail) return;

        setResendLoading(true);
        setResendSuccess('');
        try {
            const res = await axios.post('/auth/resend-verification', { email: resendEmail });
            setResendSuccess(res.data.message || 'Verification email sent! Please check your inbox.');
            toast.success('Verification email sent!');
        } catch (err) {
            const errText = err.response?.data?.message || 'Failed to resend verification email.';
            toast.error(errText);
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.02] pointer-events-none" />
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-pulse" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                        <EventManagerLogo />
                    </div>
                </div>

                <div className="glass p-8 md:p-10 rounded-[2.5rem] border border-white/10 space-y-6 text-center shadow-2xl relative overflow-hidden bg-surface/50 backdrop-blur-xl">
                    {status === 'verifying' && (
                        <div className="space-y-4 py-8">
                            <Loader2 className="w-14 h-14 text-brand animate-spin mx-auto text-emerald-400" />
                            <h2 className="text-2xl font-bold tracking-tight text-fg">Verifying your email...</h2>
                            <p className="text-sm text-muted">Please hold on while we validate your credentials.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-5 py-4">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-fg tracking-tight">Email Verified!</h2>
                                <p className="text-sm text-muted mt-2">{message}</p>
                            </div>
                            <p className="text-xs text-muted font-mono">
                                Redirecting to dashboard in {countdown}s...
                            </p>
                            <button
                                onClick={() => navigate('/dashboard', { replace: true })}
                                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                            >
                                Continue to Dashboard <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-5 py-4">
                            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-fg tracking-tight">Verification Failed</h2>
                                <p className="text-sm text-rose-300 mt-2">{message}</p>
                            </div>

                            <div className="pt-4 border-t border-white/10 text-left">
                                <p className="text-xs font-semibold text-fg mb-3 uppercase tracking-wider">Request a fresh verification link:</p>
                                <form onSubmit={handleResend} className="space-y-3">
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-muted" />
                                        <input
                                            type="email"
                                            required
                                            placeholder="Enter your email address"
                                            value={resendEmail}
                                            onChange={(e) => setResendEmail(e.target.value)}
                                            className="w-full bg-surface-2 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-brand transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={resendLoading}
                                        className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-fg text-xs font-bold border border-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        {resendLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                        Resend Verification Link
                                    </button>
                                </form>
                                {resendSuccess && (
                                    <p className="text-xs text-emerald-400 mt-2 font-medium">{resendSuccess}</p>
                                )}
                            </div>

                            <div className="pt-2">
                                <Link to="/login" className="text-xs text-muted hover:text-fg transition-colors">
                                    Return to Sign In
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default VerifyEmail;

