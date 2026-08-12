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
                </div>

                <form onSubmit={handleSubmit} className="adyen-card p-6 space-y-4 bg-surface border border-border">
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

                    {role === 'provider' && (
                        <div className="space-y-1 pt-1">
                            <label className="text-xs font-semibold text-fg">Primary Service Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
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
