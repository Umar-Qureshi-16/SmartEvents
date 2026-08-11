import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Sparkles, User, Cpu } from 'lucide-react';
import EventManagerLogo from './EventManagerLogo';

function Topbar({ user, onLogout }) {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);

    return (
        <header className="sticky top-0 z-40 bg-[#050505]/90 backdrop-blur-md border-b border-white/10 px-6 py-3.5 flex items-center justify-between gap-4">
            {/* Left: Mobile Brand & Index Ticker */}
            <div className="flex items-center gap-6">
                <div className="lg:hidden">
                    <EventManagerLogo collapsed={true} />
                </div>
                <div className="hidden md:flex items-center gap-3">
                    <span className="nuts-tag">ENGINE [v2.4]</span>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <Cpu size={14} className="text-[#ff5500]" />
                        <span>AI Matchmaker Active</span>
                    </div>
                </div>
            </div>

            {/* Middle: Command Search Input */}
            <div className="flex-1 max-w-md relative hidden sm:block">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search events, vendors, quotes..."
                    className="w-full bg-[#0d0d10] border border-white/10 rounded-xl pl-10 pr-12 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-[#ff5500] transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                    Ctrl+K
                </kbd>
            </div>

            {/* Right: Notifications & User Profile */}
            <div className="flex items-center gap-3">
                {/* System Ticker Tag */}
                <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-[10px] text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500] animate-ping" />
                    <span>NET_STATUS: OPTIMAL</span>
                </div>

                {/* Notifications Button */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2.5 rounded-xl bg-[#0d0d10] border border-white/10 hover:border-[#ff5500]/50 text-slate-300 hover:text-white transition-all relative"
                    >
                        <Bell size={18} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff5500]" />
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 mt-3 w-80 bg-[#0d0d10] border border-white/15 rounded-2xl p-4 shadow-2xl space-y-3 z-50">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <span className="font-mono text-xs font-bold text-white uppercase">[SYSTEM NOTIFICATIONS]</span>
                                <span className="nuts-tag">2 NEW</span>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-white">AI Deal Counter Proposal</span>
                                        <span className="font-mono text-[9px] text-slate-400">10m ago</span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">Provider accepted requested $3,200 package cap.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile Pill */}
                {user ? (
                    <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                        <div className="flex flex-col text-right hidden md:block">
                            <span className="text-xs font-bold text-white">{user.name}</span>
                            <span className="font-mono text-[9px] text-[#ff5500] uppercase font-bold tracking-wider">{user.role || 'Member'}</span>
                        </div>
                        <div className="w-9 h-9 rounded-xl bg-[#ff5500] text-white flex items-center justify-center font-extrabold text-xs shadow-md border border-[#ff5500]/50">
                            {user.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="btn-nuts px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                    >
                        <Sparkles size={14} />
                        <span>Sign In</span>
                    </button>
                )}
            </div>
        </header>
    );
}

export default Topbar;
