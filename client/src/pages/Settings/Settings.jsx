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
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="space-y-1 border-b border-border pb-6">
                <span className="adyen-badge">USER PROFILE & PREFERENCES</span>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                    Account Settings
                </h1>
                <p className="text-xs text-muted font-medium">Manage your personal profile, notification preferences, and security credentials.</p>
            </div>

            {/* Profile Form Card */}
            <div className="adyen-card p-8 bg-surface border border-border rounded-3xl max-w-2xl space-y-6 shadow-md">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-success text-white flex items-center justify-center text-3xl font-black shadow-md">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-fg">{name}</h3>
                        <p className="text-xs text-muted font-mono">{email}</p>
                        <span className="inline-block text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-success/15 text-success border border-success/30 font-bold uppercase mt-1">
                            {user?.role || 'Organizer'}
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold pt-4 border-t border-border">
                    <div>
                        <label className="text-fg block mb-1">Display Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <div>
                        <label className="text-fg block mb-1">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-xs text-fg outline-none focus:border-success"
                        />
                    </div>

                    <button type="submit" className="btn-adyen-primary py-3 px-8 text-xs shadow-glow">
                        <Save size={16} />
                        <span>Save Account Changes</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
