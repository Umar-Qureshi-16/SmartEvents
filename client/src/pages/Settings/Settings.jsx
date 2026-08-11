import React, { useState } from 'react';
import { User, Bell, Shield, Save, Camera, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings({ user }) {
    const [name, setName] = useState(user?.name || 'Smartie Member');
    const [email, setEmail] = useState(user?.email || 'member@smartie.io');

    const handleSave = (e) => {
        e.preventDefault();
        toast.success('Account settings saved successfully!');
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="space-y-1 border-b border-[#E5E7EB] pb-6">
                <span className="adyen-badge">USER PROFILE & PREFERENCES</span>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                    Account Settings
                </h1>
                <p className="text-xs text-slate-600 font-medium">Manage your personal profile, notification preferences, and security credentials.</p>
            </div>

            {/* Profile Form Card */}
            <div className="adyen-card p-8 bg-white border border-[#E5E7EB] rounded-3xl max-w-2xl space-y-6 shadow-md">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-[#0ABF53] text-white flex items-center justify-center text-3xl font-black shadow-md">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-[#111827]">{name}</h3>
                        <p className="text-xs text-slate-500 font-mono">{email}</p>
                        <span className="inline-block text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-[#0ABF53]/15 text-[#0ABF53] border border-[#0ABF53]/30 font-bold uppercase mt-1">
                            {user?.role || 'Organizer'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold pt-4 border-t border-[#E5E7EB]">
                    <div>
                        <label className="text-slate-700 block mb-1">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <div>
                        <label className="text-slate-700 block mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                        />
                    </div>

                    <button type="submit" className="btn-adyen-primary py-3 px-8 text-xs shadow-adyen-glow">
                        <Save size={16} />
                        <span>Save Account Changes</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
