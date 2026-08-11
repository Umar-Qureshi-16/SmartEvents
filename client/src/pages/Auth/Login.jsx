import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { ArrowRight, Lock, Mail, ShieldCheck, UserCheck, Building2, QrCode } from 'lucide-react';
import EventManagerLogo from '../../components/EventManagerLogo';

function Login({ onLoginSuccess }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);

    // Seeded demo accounts. These must match server/scripts/seedData.js —
    // run `npm run seed` in server/ before using them. Each button signs in
    // through the real /auth/login endpoint; none of them fake a session.
    const testAccounts = [
        {
            role: 'Super Admin',
            email: 'superadmin@smartevents.com',
            password: 'password123',
            icon: ShieldCheck,
            color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        },
        {
            role: 'Admin',
            email: 'admin@smartevents.com',
            password: 'password123',
            icon: Building2,
            color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
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
    };

    const executeLoginSuccess = (userObj, token, refreshToken) => {
        toast.success(`Welcome back, ${userObj.name}!`);
        localStorage.setItem('token', token);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userObj));
        if (onLoginSuccess) onLoginSuccess(userObj);

        // Return them to wherever the route guard intercepted them, if any.
        const destination = location.state?.from?.pathname
            || (userObj.role === 'admin' || userObj.role === 'superadmin' ? '/admin/users' : '/dashboard');
        navigate(destination, { replace: true });
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const res = await axios.post('/auth/login', { email, password });
            if (res.data.success) {
                executeLoginSuccess(res.data.user, res.data.token, res.data.refreshToken);
            } else {
                toast.error(res.data.message || 'Sign in failed.');
            }
        } catch (err) {
            // Authentication must fail closed. This previously fell back to
            // fabricating a user object with a fake token, which let ANY
            // email and password combination sign in whenever the API was
            // unreachable — and left every subsequent request 401ing.
            const message = err.response?.data?.message
                || (err.response ? 'Invalid email or password.' : 'Cannot reach the server. Is the backend running?');
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Fills the form with a seeded demo account and signs in through the real
    // API. Run `npm run seed` in server/ to create these accounts.
    const handleQuickLogin = (acc) => {
        setFormData({ email: acc.email, password: acc.password });
        login(acc.email, acc.password);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        login(formData.email, formData.password);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col justify-center items-center py-12 px-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-2">
                        <EventManagerLogo />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-[#111827]">Sign in to Smartie</h2>
                    <p className="text-xs text-slate-500 font-medium">Access your reverse bids, events, and payment escrow dashboard</p>
                </div>

                {/* QUICK ONE-CLICK TEST LOGIN BUTTONS */}
                <div className="adyen-card p-4 space-y-3 bg-white border border-[#E5E7EB]">
                    <span className="text-[10px] font-mono text-[#0ABF53] uppercase font-bold tracking-wider block">
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
                                    className="p-2.5 rounded-2xl border border-slate-200 hover:border-[#0ABF53] bg-slate-50 text-left transition-all space-y-1 group"
                                >
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827] group-hover:text-[#0ABF53]">
                                        <Icon size={14} className="text-[#0ABF53]" />
                                        <span>{acc.role}</span>
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-400 truncate">{acc.email}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* REGULAR FORM */}
                <form onSubmit={handleSubmit} className="adyen-card p-6 space-y-4 bg-white border border-[#E5E7EB]">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Work Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="organizer@smartie.io"
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-semibold text-slate-700">Password</label>
                            <a href="#" className="text-[10px] text-slate-500 hover:text-[#0ABF53]">Forgot password?</a>
                        </div>
                        <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-adyen-primary py-3.5 rounded-full text-xs font-bold shadow-adyen-glow mt-4 justify-center"
                    >
                        {loading ? 'Signing in...' : 'Sign in to platform'}
                    </button>

                    <div className="text-center pt-2">
                        <Link to="/signup" className="text-xs text-slate-500 hover:text-[#0ABF53] transition-colors">
                            Don't have an account? <span className="text-[#0ABF53] font-bold">Register free</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Login;
