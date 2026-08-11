import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { UserCheck, Store, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import EventManagerLogo from '../../components/EventManagerLogo';

function Signup({ onLoginSuccess }) {
    const navigate = useNavigate();
    const [role, setRole] = useState('customer');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        category: 'Catering & Dining',
        bio: '',
        location: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // The API only accepts these four fields, and role must be one of
            // the schema's enum values. The selector's labels ("Organizer" /
            // "Vendor") map onto 'customer' / 'provider'.
            await axios.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role
            });

            // /auth/register does not issue tokens, so sign in immediately to
            // obtain a real session rather than fabricating one.
            const loginRes = await axios.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            const { user, token, refreshToken } = loginRes.data;
            toast.success(`Welcome to SmartEvents, ${user.name}!`);
            localStorage.setItem('token', token);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(user));
            if (onLoginSuccess) onLoginSuccess(user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            // Registration must fail closed. This previously fell back to
            // creating a fake local session whenever the API rejected the
            // request — which it always did, because the role values sent
            // ('organizer' / 'vendor') are not in the User schema enum.
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

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col justify-center items-center py-12 px-6">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center space-y-3">
                    <div className="flex justify-center mb-2">
                        <EventManagerLogo />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-[#111827]">Create your Smartie Account</h2>
                    <p className="text-xs text-slate-500 font-medium">Join the reverse event bidding & ticketing platform</p>
                </div>

                {/* Role Selector Cards */}
                <div className="grid grid-cols-2 gap-4">
                    <div
                        onClick={() => setRole('customer')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'customer' ? 'bg-white border-[#0ABF53] text-[#0ABF53] shadow-md font-bold' : 'bg-slate-100 border-transparent text-slate-500 hover:text-[#111827]'}`}
                    >
                        <UserCheck size={24} />
                        <div>
                            <span className="text-sm font-bold block text-[#111827]">Organizer</span>
                            <span className="text-[10px] text-slate-400 font-mono">Host & Post Events</span>
                        </div>
                    </div>

                    <div
                        onClick={() => setRole('provider')}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all flex flex-col items-center text-center space-y-2 ${role === 'provider' ? 'bg-white border-[#0ABF53] text-[#0ABF53] shadow-md font-bold' : 'bg-slate-100 border-transparent text-slate-500 hover:text-[#111827]'}`}
                    >
                        <Store size={24} />
                        <div>
                            <span className="text-sm font-bold block text-[#111827]">Vendor</span>
                            <span className="text-[10px] text-slate-400 font-mono">Bid & Deliver Services</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="adyen-card p-6 space-y-4 bg-white border border-[#E5E7EB]">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Work Email</label>
                        <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@company.com"
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                        <p className="text-[10px] text-slate-400">At least 8 characters.</p>
                    </div>

                    {role === 'provider' && (
                        <div className="space-y-1 pt-1">
                            <label className="text-xs font-semibold text-slate-700">Primary Service Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                            >
                                <option value="Catering & Dining">Catering & Dining</option>
                                <option value="Stage & Lighting AV">Stage & Lighting AV</option>
                                <option value="Photography & Cinema">Photography & Cinema</option>
                                <option value="Venues & Ballrooms">Venues & Ballrooms</option>
                            </select>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-adyen-primary py-3.5 rounded-full text-xs font-bold shadow-adyen-glow mt-4 justify-center"
                    >
                        {loading ? 'Creating account...' : 'Create free account'}
                    </button>

                    <div className="text-center pt-2">
                        <Link to="/login" className="text-xs text-slate-500 hover:text-[#0ABF53] transition-colors">
                            Already have an account? <span className="text-[#0ABF53] font-bold">Sign in</span>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Signup;
