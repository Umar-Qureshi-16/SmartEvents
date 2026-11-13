import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { UserCheck, Store, Shield, Crown, ArrowRight, ShieldCheck, CheckCircle2, Mail, RefreshCw, Loader2 } from 'lucide-react';
import EventManagerLogo from '../../components/EventManagerLogo';

function Signup({ onLoginSuccess }) {
    const navigate = useNavigate();
    const [role, setRole] = useState('customer');
    const [adminCode, setAdminCode] = useState('');
    const isElevated = role === 'admin' || role === 'superadmin';
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        category: 'catering',
        bio: '',
        location: ''
    });
    const [loading, setLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [resendLoading, setResendLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const executeLoginSuccess = (userObj, token, refreshToken) => {
        toast.success(`Welcome to Smartie, ${userObj.name}!`);
        localStorage.setItem('token', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userObj));
        if (onLoginSuccess) onLoginSuccess(userObj);
        navigate('/dashboard', { replace: true });
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        try {
            const res = await axios.post('/auth/google', {
                credential: credentialResponse.credential,
                role
            });
            if (res.data.success) {
                executeLoginSuccess(res.data.user, res.data.token, res.data.refreshToken);
            } else {
                toast.error(res.data.message || 'Google signup failed.');
            }
        } catch (err) {
            const message = err.response?.data?.message || 'Google authentication failed.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        toast.error('Google Sign-up was cancelled or encountered an error.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await axios.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role,
                ...(isElevated ? { adminCode } : {}),
                ...(role === 'provider' ? { category: formData.category } : {})
            });

            if (res.data.success) {
                setRegisteredEmail(formData.email);
                setIsRegistered(true);
                toast.success('Registration successful! Please verify your email.');
            }
        } catch (err) {
            const data = err.response?.data;
            const message = data?.errors?.length
                ? data.errors.map(e => e.message).join('. ')
                : data?.message
                || (err.response ? 'Could not create your account.' : 'Cannot reach the server. Is the backend running?');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (!registeredEmail) return;
        setResendLoading(true);
        try {
            const res = await axios.post('/auth/resend-verification', { email: registeredEmail });
            toast.success(res.data.message || 'Verification link sent! Check your inbox.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to resend verification email.');
        } finally {
            setResendLoading(false);
        }
    };

    // Screen shown after successful registration requiring email verification
    if (isRegistered) {
        return (
            <div className="min-h-screen bg-bg text-fg flex flex-col justify-center items-center py-12 px-6">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center space-y-3">
                        <div className="flex justify-center mb-2">
                            <EventManagerLogo />
                        </div>
                    </div>

                    <div className="adyen-card p-8 bg-surface border border-border text-center space-y-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                            <Mail className="w-8 h-8" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-black tracking-tight text-fg">Verify your email</h2>
                            <p className="text-xs text-muted leading-relaxed">
                                We've sent a verification link to <br />
                                <span className="font-semibold text-fg text-sm">{registeredEmail}</span>
                            </p>
                        </div>

                        <p className="text-xs text-muted leading-relaxed">
                            Please check your inbox (and spam folder) and click the link to activate your account. Once verified, you can sign in and start exploring Smartie!
                        </p>

                        <div className="pt-2 space-y-3">
                            <button
                                type="button"
                                onClick={handleResendVerification}
                                disabled={resendLoading}
                                className="w-full py-3 px-4 rounded-xl bg-surface-2 hover:bg-surface border border-border text-xs font-bold text-fg transition-all flex items-center justify-center gap-2"
                            >
                                {resendLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                Resend verification email
                            </button>

                            <Link
                                to="/login"
                                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                                Back to Sign In <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-fg flex flex-col justify-center items-center py-12 px-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-2">
                        <EventManagerLogo />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-fg">Create your Smartie Account</h2>
                    <p className="text-xs text-muted font-medium">Join the reverse event bidding & ticketing platform</p>
                </div>

                {/* Role Selector Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={() => setRole('customer')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'customer' ? 'bg-surface border-success text-success shadow-md font-bold' : 'bg-surface-2 border-transparent text-muted hover:text-fg'}`}
                    >
                        <UserCheck size={24} />
                        <div>
                            <span className="text-sm font-bold block text-fg">Organizer</span>
                            <span className="text-[10px] text-muted font-mono">Host & Post Events</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setRole('provider')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'provider' ? 'bg-surface border-success text-success shadow-md font-bold' : 'bg-surface-2 border-transparent text-muted hover:text-fg'}`}
                    >
                        <Store size={24} />
                        <div>
                            <span className="text-sm font-bold block text-fg">Vendor</span>
                            <span className="text-[10px] text-muted font-mono">Bid & Deliver Services</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setRole('admin')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'admin' ? 'bg-surface border-success text-success shadow-md font-bold' : 'bg-surface-2 border-transparent text-muted hover:text-fg'}`}
                    >
                        <Shield size={24} />
                        <div>
                            <span className="text-sm font-bold block text-fg">Admin</span>
                            <span className="text-[10px] text-muted font-mono">Manage the Platform</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setRole('superadmin')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'superadmin' ? 'bg-surface border-success text-success shadow-md font-bold' : 'bg-surface-2 border-transparent text-muted hover:text-fg'}`}
                    >
                        <Crown size={24} />
                        <div>
                            <span className="text-sm font-bold block text-fg">Super Admin</span>
                            <span className="text-[10px] text-muted font-mono">Full System Control</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="adyen-card p-6 space-y-4 bg-surface border border-border">
                    {/* FAST GOOGLE SIGN UP */}
                    {!isElevated && (<div className="space-y-3">
                        <label className="text-xs font-semibold text-fg block text-center">Fast Registration</label>
                        <div className="flex justify-center w-full">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                width="360"
                                text="signup_with"
                            />
                        </div>
                    </div>)}

                    {!isElevated && (<div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-border"></div>
                        <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-muted tracking-wider">Or register with email</span>
                        <div className="flex-grow border-t border-border"></div>
                    </div>)}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-fg">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-fg">Work Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@company.com"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-fg">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                        <p className="text-[10px] text-muted">At least 8 characters.</p>
                    </div>

                    {isElevated && (
                        <div className="space-y-1 pt-1">
                            <label className="text-xs font-semibold text-fg">Admin Signup Code</label>
                            <input
                                type="password"
                                required
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                placeholder="Code provided by the system owner"
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                            />
                            <p className="text-[10px] text-muted">Required for admin accounts. Email signup only.</p>
                        </div>
                    )}

                    {role === 'provider' && (
                        <div className="space-y-1 pt-1">
                            <label className="text-xs font-semibold text-fg">Primary Service Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                            >
                                <option value="catering">Catering & Dining</option>
                                <option value="venue">Venues & Ballrooms</option>
                                <option value="photography">Photography & Cinema</option>
                                <option value="music">Music, Stage & AV</option>
                                <option value="decoration">Decoration & Design</option>
                                <option value="makeup">Makeup & Styling</option>
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-adyen-primary py-3.5 rounded-full text-xs font-bold shadow-glow mt-4 justify-center"
                    >
                        {loading ? 'Creating account...' : 'Create free account'}
                    </button>

                    <div className="text-center pt-2">
                        <Link to="/login" className="text-xs text-muted hover:text-success transition-colors">
                            Already have an account? <span className="text-success font-bold">Sign in</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Signup;
