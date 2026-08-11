import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Home, Palette, Package,
    TrendingUp, CalendarDays, DollarSign,
    ChevronLeft, ChevronRight, LogOut, QrCode, Settings, Sparkles
} from 'lucide-react';
import EventManagerLogo from './EventManagerLogo';

function Navbar({ currentPage, user, onLogout }) {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <motion.aside
            animate={{ width: collapsed ? 80 : 280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="sidebar-v2 flex flex-col z-50 overflow-hidden bg-[#000c20] border-r border-white/10"
        >
            {/* BRAND LOGO */}
            <div className="px-2 mb-8">
                <EventManagerLogo collapsed={collapsed} />
            </div>

            {/* NAV LINKS */}
            <nav className="flex-1 space-y-6 overflow-y-auto pr-1 custom-scrollbar">
                <NavGroup index="01" title="MAIN COMMAND" collapsed={collapsed}>
                    <NavItem
                        icon={<LayoutDashboard size={18} />}
                        label="Command Center"
                        isActive={currentPage === 'dashboard' || currentPage === ''}
                        collapsed={collapsed}
                        onClick={() => navigate('/')}
                        badge="LIVE"
                    />
                </NavGroup>

                <NavGroup index="02" title="DISCOVER" collapsed={collapsed}>
                    <NavItem icon={<Home size={18} />} label="Explore Portal" isActive={currentPage === 'home'} collapsed={collapsed} onClick={() => navigate('/home')} />
                    {user && <NavItem icon={<QrCode size={18} />} label="Pass Wallet" isActive={currentPage === 'tickets'} collapsed={collapsed} onClick={() => navigate('/tickets')} />}
                    <NavItem icon={<Palette size={18} />} label="Inspiration Hub" isActive={currentPage === 'inspiration'} collapsed={collapsed} onClick={() => navigate('/inspiration')} />
                    <NavItem icon={<Settings size={18} />} label="System Settings" isActive={currentPage === 'settings'} collapsed={collapsed} onClick={() => navigate('/settings')} />
                </NavGroup>

                {user && (user.role === 'provider' || user.role === 'admin' || user.role === 'superadmin') && (
                    <NavGroup index="03" title="MANAGEMENT" collapsed={collapsed}>
                        <NavItem icon={<Package size={18} />} label="Service Catalog" isActive={currentPage === 'services'} collapsed={collapsed} onClick={() => navigate('/services')} />
                        <NavItem icon={<TrendingUp size={18} />} label="Lead Pipeline" isActive={currentPage === 'leads'} collapsed={collapsed} onClick={() => navigate('/leads')} />
                        <NavItem icon={<CalendarDays size={18} />} label="Bookings & Deals" isActive={currentPage === 'bookings'} collapsed={collapsed} onClick={() => navigate('/bookings')} />
                        <NavItem icon={<DollarSign size={18} />} label="Revenue Ledger" isActive={currentPage === 'revenue'} collapsed={collapsed} onClick={() => navigate('/revenue')} />
                    </NavGroup>
                )}
            </nav>

            {/* FOOTER */}
            <div className="pt-4 border-t border-white/10 space-y-3">
                {user && !collapsed && (
                    <div className="p-3 rounded-2xl bg-[#051838] border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-8 h-8 rounded-full bg-emerald flex items-center justify-center font-extrabold text-white text-xs shadow-md">
                                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-xs font-bold text-white truncate">{user.name}</span>
                                <span className="text-[9px] font-mono text-emerald uppercase tracking-wider">
                                    {user.role || 'Member'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center gap-2 w-full p-2.5 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-all text-xs font-mono border border-transparent hover:border-white/10"
                >
                    {collapsed ? <ChevronRight size={18} /> : <div className="flex items-center gap-2"><ChevronLeft size={18} /> <span>Collapse View</span></div>}
                </button>

                {user ? (
                    <button
                        className="flex items-center justify-center gap-2 w-full p-2.5 rounded-full text-coral hover:bg-coral/10 border border-transparent hover:border-coral/20 transition-all font-semibold text-xs"
                        onClick={onLogout}
                    >
                        <LogOut size={16} />
                        {!collapsed && <span>Sign Out</span>}
                    </button>
                ) : (
                    <button
                        className="w-full btn-adyen-primary text-white py-3 rounded-full font-bold transition-all text-xs flex items-center justify-center gap-2"
                        onClick={() => navigate('/login')}
                    >
                        <Sparkles size={14} />
                        {!collapsed ? 'Sign In / Register' : 'Sign In'}
                    </button>
                )}
            </div>
        </motion.aside>
    );
}

function NavGroup({ index, title, children, collapsed }) {
    return (
        <div className="mb-4">
            {!collapsed && (
                <div className="flex items-center gap-2 mb-2 px-2">
                    <span className="font-mono text-[9px] text-emerald font-bold">[{index}]</span>
                    <h3 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                </div>
            )}
            <div className="space-y-1">{children}</div>
        </div>
    );
}

function NavItem({ icon, label, isActive, collapsed, onClick, badge }) {
    return (
        <motion.div
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all relative group text-xs font-semibold
                ${isActive
                    ? 'bg-ink text-white border border-emerald/40 text-emerald'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }
                ${collapsed ? 'justify-center px-0' : ''}
            `}
        >
            <div className={`${isActive ? 'text-emerald' : 'group-hover:text-emerald'} transition-colors`}>
                {icon}
            </div>
            {!collapsed && <span className="truncate">{label}</span>}
            
            {!collapsed && badge && (
                <span className="ml-auto font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald/15 text-emerald border border-emerald/30">
                    {badge}
                </span>
            )}
        </motion.div>
    );
}

export default Navbar;
