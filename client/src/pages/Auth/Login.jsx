import React, { useState } from 'react';
import PasswordField from '../../components/ui/PasswordField';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { ArrowRight, Lock, Mail, ShieldCheck, UserCheck, Building2, QrCode, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import EventManagerLogo from '../../components/EventManagerLogo';

function Login({ onLoginSuccess }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [resending, setResending] = useState(false);
    // Admin and Super Admin accounts must also give the admin access code.
    const [adminCode, setAdminCode] = useState('');
    const [showAdminCode, setShowAdminCode] = useState(false);

    // The server says when an account needs the code; reveal the field then.
    const needsAdminCode = (err) => ['ADMIN_CODE_REQUIRED', 'ADMIN_CODE_INVALID'].includes(err.response?.data?.code);
    const withCode = (body) => (adminCode.trim() ? { ...body, adminCode: adminCode.trim() } : body);

    // Seeded demo accounts. These must match server/scripts/seedData.js —
    // run `npm run seed` in server/ before using them. Each button signs in
    // through the real /auth/login endpoint; none of them fake a session.
    const testAccounts = [
        {
            role: 'Super Admin',
            email: 'superadmin@smartevents.com',
            password: 'password123',
            icon: ShieldCheck,
            color: 'bg-emerald-500/20 text-success border-emerald-500/30'
        },
        {
            role: 'Admin',
            email: 'admin@smartevents.com',
            password: 'password123',
            icon: Building2,
            color: 'bg-indigo-500/20 text-brand border-indigo-500/30'
        },
        {
            role: 'Provider',
            email: 'umar_provider@example.com',
            password: 'password123',
            icon: UserCheck,
            color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
        },
        {
            role: 'Customer',
            email: 'ali@example.com',
            password: 'password123',
            icon: QrCode,
            color: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
        }
    ];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (unverifiedEmail) setUnverifiedEmail('');
    };

    const executeLoginSuccess = (userObj) => {
        toast.success(`Welcome back, ${userObj.name}!`);
        if (onLoginSuccess) onLoginSuccess(userObj);

        // Return them to wherever the route guard intercepted them, if any.
        const destination = location.state?.from?.pathname
            || (userObj.role === 'admin' || userObj.role === 'superadmin' ? '/admin/users' : '/dashboard');
        navigate(destination, { replace: true });
    };

    const login = async (email, password) => {
        setLoading(true);
        setUnverifiedEmail('');
        try {
            const res = await axios.post('/auth/login', withCode({ email, password }));
            if (res.data.success) {
                executeLoginSuccess(res.data.user);
            } else {
                toast.error(res.data.message || 'Sign in failed.');
            }
        } catch (err) {
            const status = err.response?.status;
            const message = err.response?.data?.message
                || (err.response ? 'Invalid email or password.' : 'Cannot reach the server. Is the backend running?');

            if (needsAdminCode(err)) {
                setShowAdminCode(true);
            } else if (status === 403 && message.toLowerCase().includes('verify')) {
                setUnverifiedEmail(email);
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        try {
            const res = await axios.post('/auth/google', withCode({
                credential: credentialResponse.credential
            }));
            if (res.data.success) {
                executeLoginSuccess(res.data.user);
            } else {
                toast.error(res.data.message || 'Google sign in failed.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Google authentication failed.';
            if (needsAdminCode(err)) {
                setShowAdminCode(true);
                toast.error(`${msg} Enter it below, then sign in with Google again.`);
            } else {
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast.error('Google Sign-in was cancelled or encountered an error.');
    };

    const handleResendVerification = async () => {
        if (!unverifiedEmail) return;
        setResending(true);
        try {
            const res = await axios.post('/auth/resend-verification', { email: unverifiedEmail });
            toast.success(res.data.message || 'Verification email resent! Please check your inbox.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend verification link.');
        } finally {
            setResending(false);
        }
    };

    // Fills the form with a seeded demo account and signs in through the real API.
    const handleQuickLogin = (acc) => {
        setFormData({ email: acc.email, password: acc.password });
        login(acc.email, acc.password);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        login(formData.email, formData.password);
    };

    return (
        <div className="min-h-screen bg-bg text-fg flex flex-col justify-center items-center py-12 px-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-2">
                        <EventManagerLogo tone="theme" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-fg">Sign in to Smartie</h2>
                    <p className="text-xs text-muted font-medium">Access your reverse bids, events, and payment escrow dashboard</p>
                </div>

                {/* QUICK ONE-CLICK TEST LOGIN BUTTONS */}
                <div className="adyen-card p-4 space-y-3 bg-surface border border-border">
                    <span className="text-[10px] font-mono text-success uppercase font-bold tracking-wider block">
                        ONE-CLICK TEST LOGIN (SELECT ROLE)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                        {testAccounts.map((acc, idx) => {
                            const Icon = acc.icon;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleQuickLogin(acc)}
                                    className="p-2.5 rounded-2xl border border-border hover:border-success bg-surface-2 text-left transition-all space-y-1 group"
                                >
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-fg group-hover:text-success">
                                        <Icon size={14} className="text-success" />
                                        <span>{acc.role}</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-muted truncate">{acc.email}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* UNVERIFIED EMAIL ALERT BANNER */}
                {unverifiedEmail && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold text-amber-300">
                            <AlertCircle size={16} />
                            <span>Email Verification Required</span>
                        </div>
                        <p className="text-amber-200/80">
                            Your account is not verified yet. We sent a verification link to <span className="font-semibold text-white">{unverifiedEmail}</span>.
                        </p>
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resending}
                            className="inline-flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors disabled:opacity-50"
                        >
                            {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                            Resend verification link
                        </button>
                    </div>
                )}

                {/* REGULAR FORM */}
                <form onSubmit={handleSubmit} className="adyen-card p-6 space-y-4 bg-surface border border-border">
                    {/* ADMIN ACCESS CODE: required for Admin and Super Admin, with email or Google */}
                    {showAdminCode ? (
                        <div className="space-y-1 p-3 rounded-2xl border border-brand/30 bg-brand/5">
                            <label htmlFor="admin-code" className="text-xs font-semibold text-fg">Admin access code</label>
                            <PasswordField
                                id="admin-code"
                                autoComplete="off"
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                placeholder="Required for Admin and Super Admin accounts"
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                            />
                            <p className="text-[10px] text-muted">Needed every time an Admin or Super Admin signs in, with email or with Google.</p>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setShowAdminCode(true)} className="text-[11px] text-muted hover:text-success underline underline-offset-4 block mx-auto">
                            Signing in as Admin or Super Admin?
                        </button>
                    )}

                    {/* GOOGLE SIGN IN BUTTON */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-fg block text-center">Fast Sign-in</label>
                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                width="360"
                                text="signin_with"
                            />
                        </div>
                    </div>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-muted tracking-wider">Or continue with email</span>
                        <div className="flex-grow border-t border-border"></div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-fg">Work Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="organizer@smartie.io"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-fg">Password</label>
                            <Link to="/forgot-password" className="text-[10px] text-muted hover:text-success">Forgot password?</Link>
                        </div>
                        <PasswordField
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-adyen-primary py-3.5 rounded-full text-xs font-bold shadow-glow mt-4 justify-center"
                    >
                        {loading ? 'Signing in...' : 'Sign in to platform'}
                    </button>

                    <div className="text-center pt-2">
                        <Link to="/signup" className="text-xs text-muted hover:text-success transition-colors">
                            Don't have an account? <span className="text-success font-bold">Register free</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
