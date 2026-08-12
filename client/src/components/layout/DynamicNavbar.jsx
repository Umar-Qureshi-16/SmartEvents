import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell, Menu as MenuIcon, X, ChevronDown, User, LogOut,
    LayoutDashboard, Package, CalendarDays, DollarSign, QrCode,
    Settings, Sparkles, Layers, Store, Compass, Ticket, ShieldCheck,
    MessageSquare, Heart, Star, Images
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import EventManagerLogo from '../EventManagerLogo';
import ThemeToggle from '../ThemeToggle';
import { formatRelative } from '../ui';

/**
 * Navigation links per role.
 *
 * Previously branched on 'vendor' and 'organizer', which are not values in the
 * User schema enum ('customer' | 'provider' | 'admin' | 'superadmin'), so
 * providers silently fell through to the customer menu and were shown links to
 * customer-only routes.
 */
const NAV_BY_ROLE = {
    guest: [
        {
            label: 'Discover Events', path: '/events', icon: Compass,
            subOptions: [
                { label: 'Corporate', desc: 'Conferences and company events', path: '/events?category=Corporate' },
                { label: 'Concerts', desc: 'Live music and festivals', path: '/events?category=Concert' },
                { label: 'Weddings', desc: 'Catering, decor and venues', path: '/events?category=Wedding' },
                { label: 'All events', desc: 'Browse everything on offer', path: '/events' },
            ],
        },
        {
            label: 'Vendors', path: '/vendors', icon: Store,
            subOptions: [
                { label: 'Catering', desc: 'Food and beverage partners', path: '/vendors?category=catering' },
                { label: 'Photography', desc: 'Photographers and videographers', path: '/vendors?category=photography' },
                { label: 'Venues', desc: 'Halls, gardens and ballrooms', path: '/vendors?category=venue' },
                { label: 'Music', desc: 'DJs, bands and sound crews', path: '/vendors?category=music' },
            ],
        },
        {
            label: 'How It Works', path: '/how-it-works', icon: Layers,
            subOptions: [
                { label: 'Make an offer', desc: 'Propose your budget to a provider', path: '/how-it-works' },
                { label: 'Negotiate live', desc: 'Counter-offer in real time', path: '/how-it-works' },
                { label: 'Confirm and attend', desc: 'Agree a price and get your pass', path: '/how-it-works' },
            ],
        },
        { label: 'Pricing', path: '/pricing', icon: QrCode },
    ],

    customer: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        {
            label: 'My Bookings', path: '/bookings', icon: CalendarDays,
            subOptions: [
                { label: 'All bookings', desc: 'Offers, negotiations and confirmations', path: '/bookings' },
                { label: 'Favourites', desc: 'Providers you have shortlisted', path: '/favorites' },
            ],
        },
        {
            label: 'Explore', path: '/events', icon: Compass,
            subOptions: [
                { label: 'Events', desc: 'Browse and make an offer', path: '/events' },
                { label: 'Vendors', desc: 'Find a provider directly', path: '/vendors' },
            ],
        },
        {
            label: 'Planning', path: '/ai-concierge', icon: Sparkles,
            subOptions: [
                { label: 'AI Concierge', desc: 'Ask Smartie about your event', path: '/ai-concierge' },
                { label: 'Budget tracker', desc: 'Break down and check your spend', path: '/budget-tracker' },
                { label: 'My tickets', desc: 'QR passes for confirmed events', path: '/tickets' },
            ],
        },
    ],

    provider: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        {
            label: 'Leads', path: '/leads', icon: MessageSquare,
            subOptions: [
                { label: 'Incoming offers', desc: 'Requests awaiting your response', path: '/leads' },
                { label: 'Reviews', desc: 'Feedback across your events', path: '/reviews' },
            ],
        },
        {
            label: 'My Services', path: '/services', icon: Package,
            subOptions: [
                { label: 'Service packages', desc: 'Manage your offerings and prices', path: '/services' },
                { label: 'Portfolio', desc: 'Showcase your past work', path: '/portfolio' },
                { label: 'Availability', desc: 'Block dates you cannot take', path: '/calendar' },
            ],
        },
        {
            label: 'Business', path: '/revenue', icon: DollarSign,
            subOptions: [
                { label: 'Revenue', desc: 'Confirmed and completed bookings', path: '/revenue' },
                { label: 'Ticket scanner', desc: 'Check guests in at the gate', path: '/staff/scanner' },
                { label: 'AI Concierge', desc: 'Ask Smartie about your business', path: '/ai-concierge' },
            ],
        },
    ],

    admin: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Users', path: '/admin/users', icon: User },
        { label: 'Revenue', path: '/revenue', icon: DollarSign },
    ],
};

NAV_BY_ROLE.superadmin = NAV_BY_ROLE.admin;

const QUICK_LINKS = [
    { label: 'Settings', path: '/settings', icon: Settings },
    { label: 'Notifications', path: '/notifications', icon: Bell },
];

export default function DynamicNavbar({ user, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { socket } = useWebSockets();

    const [isHovered, setIsHovered] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const containerRef = useRef(null);

    const navLinks = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.guest;
    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Close everything on navigation.
    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileOpen(false);
        setNotificationOpen(false);
        setActiveSubmenu(null);
    }, [location.pathname]);

    // Real notifications, replacing the hardcoded mock array this used to show.
    const loadNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axios.get('/notifications');
            setNotifications((res.data.data || []).slice(0, 8));
        } catch {
            /* the bell is non-critical — stay silent */
        }
    }, [user]);

    useEffect(() => { loadNotifications(); }, [loadNotifications]);

    useEffect(() => {
        if (!socket) return;
        const onNotification = (data) => {
            setNotifications(prev => [{ ...data, _id: data.id || Date.now(), isRead: false }, ...prev].slice(0, 8));
        };
        socket.on('notification', onNotification);
        return () => socket.off('notification', onNotification);
    }, [socket]);

    const markAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try { await axios.put('/notifications/read-all'); } catch { loadNotifications(); }
    };

    // Close dropdowns when focus or a click leaves the navbar.
    useEffect(() => {
        const onDocClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setProfileOpen(false);
                setNotificationOpen(false);
                setActiveSubmenu(null);
            }
        };
        const onEscape = (e) => {
            if (e.key !== 'Escape') return;
            setProfileOpen(false);
            setNotificationOpen(false);
            setActiveSubmenu(null);
            setMobileMenuOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEscape);
        };
    }, []);

    const expanded = isHovered || mobileMenuOpen;

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full px-4 flex justify-center pointer-events-none">
            <motion.div
                ref={containerRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsHovered(false);
                    setProfileOpen(false);
                    setNotificationOpen(false);
                    setActiveSubmenu(null);
                }}
                // Keyboard users never trigger mouseenter, so expand on focus too.
                onFocusCapture={() => setIsHovered(true)}
                animate={{
                    width: expanded ? 'min(1150px, 94vw)' : '150px',
                    borderRadius: mobileMenuOpen ? '28px' : '9999px',
                }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="pointer-events-auto bg-[#0b0d12] border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.55)] py-2.5 px-4 text-white relative"
            >
                <div className="flex items-center justify-between gap-3">
                    <Link to="/" className="shrink-0" aria-label="SmartEvents home">
                        <EventManagerLogo collapsed={!expanded} />
                    </Link>

                    {!expanded && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 select-none">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" aria-hidden="true" />
                            <span className="text-white font-black text-xs uppercase tracking-widest">Menu</span>
                        </motion.div>
                    )}

                    {/* ---------- Desktop links ---------- */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.nav
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                aria-label="Main"
                                className="hidden lg:flex items-center gap-1 text-xs font-bold tracking-wide relative"
                            >
                                {navLinks.map((link, idx) => {
                                    const Icon = link.icon;
                                    const isActive = location.pathname === link.path;
                                    const submenuOpen = activeSubmenu === idx;

                                    return (
                                        <div key={link.path} className="relative" onMouseEnter={() => setActiveSubmenu(idx)}>
                                            <Link
                                                to={link.path}
                                                aria-current={isActive ? 'page' : undefined}
                                                aria-expanded={link.subOptions ? submenuOpen : undefined}
                                                className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all ${
                                                    isActive || submenuOpen
                                                        ? 'bg-white text-black font-black shadow-md'
                                                        : 'text-white hover:bg-white/15'
                                                }`}
                                            >
                                                {Icon && <Icon size={14} aria-hidden="true" />}
                                                <span>{link.label}</span>
                                                {link.subOptions && <ChevronDown size={12} aria-hidden="true" />}
                                            </Link>

                                            <AnimatePresence>
                                                {submenuOpen && link.subOptions && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                                        onMouseLeave={() => setActiveSubmenu(null)}
                                                        className="absolute top-full left-0 mt-3 w-64 p-3 bg-[#0b0d12] border border-white/15 rounded-2xl shadow-2xl z-50 space-y-1"
                                                    >
                                                        {link.subOptions.map((sub) => (
                                                            <Link
                                                                key={sub.path + sub.label}
                                                                to={sub.path}
                                                                onClick={() => setActiveSubmenu(null)}
                                                                className="block p-2 rounded-xl hover:bg-white/15 transition-colors group"
                                                            >
                                                                <span className="block text-xs font-bold text-white group-hover:text-emerald-400">
                                                                    {sub.label}
                                                                </span>
                                                                <span className="block text-[10px] text-slate-400">{sub.desc}</span>
                                                            </Link>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </motion.nav>
                        )}
                    </AnimatePresence>

                    {/* ---------- Right-hand actions ---------- */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex items-center gap-2 shrink-0"
                            >
                                <ThemeToggle className="hidden sm:block !bg-white/10 !border-white/20" />

                                {user ? (
                                    <>
                                        {/* Notifications */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => { setNotificationOpen(v => !v); setProfileOpen(false); }}
                                                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                                                aria-expanded={notificationOpen}
                                                className="p-2 rounded-full bg-white/10 border border-white/20 hover:border-white transition-colors relative"
                                            >
                                                <Bell size={15} aria-hidden="true" />
                                                {unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-emerald-400 text-black text-[9px] font-black rounded-full flex items-center justify-center border border-black">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                )}
                                            </button>

                                            <AnimatePresence>
                                                {notificationOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute right-0 mt-3 w-80 p-4 shadow-2xl rounded-2xl border border-white/15 bg-[#0b0d12] z-50 space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                            <span className="text-xs font-black uppercase tracking-wider">Notifications</span>
                                                            {unreadCount > 0 && (
                                                                <button onClick={markAllRead} className="text-[10px] text-emerald-400 font-bold hover:underline">
                                                                    Mark all read
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                                            {notifications.length === 0 ? (
                                                                <p className="text-[11px] text-slate-400 py-6 text-center">
                                                                    You are all caught up.
                                                                </p>
                                                            ) : (
                                                                notifications.map(n => (
                                                                    <div
                                                                        key={n._id}
                                                                        className={`p-2.5 rounded-xl border space-y-1 ${
                                                                            n.isRead ? 'bg-white/5 border-white/5' : 'bg-white/10 border-emerald-400/30'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            <span className="text-xs font-bold truncate">{n.title}</span>
                                                                            <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                                                {formatRelative(n.createdAt)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-300 leading-tight">{n.message}</p>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                        <Link to="/notifications" className="block text-center text-[10px] font-bold text-emerald-400 hover:underline pt-1">
                                                            View all
                                                        </Link>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Profile */}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => { setProfileOpen(v => !v); setNotificationOpen(false); }}
                                                aria-label="Account menu"
                                                aria-expanded={profileOpen}
                                                className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-white/10 border border-white/20 hover:border-white transition-all"
                                            >
                                                <span className="w-6 h-6 rounded-full bg-emerald-400 text-black font-black text-[11px] flex items-center justify-center">
                                                    {user.name?.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                                <span className="hidden md:inline text-xs font-bold max-w-[120px] truncate">{user.name}</span>
                                                <ChevronDown size={13} aria-hidden="true" />
                                            </button>

                                            <AnimatePresence>
                                                {profileOpen && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute right-0 mt-3 w-60 p-3 shadow-2xl rounded-2xl border border-white/15 bg-[#0b0d12] z-50 space-y-1"
                                                    >
                                                        <div className="px-3 py-2 border-b border-white/10 space-y-0.5">
                                                            <p className="text-xs font-bold truncate">{user.name}</p>
                                                            <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                                                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                                                                {user.role}
                                                            </span>
                                                        </div>
                                                        {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                                                            <Link key={path} to={path}
                                                                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-xs font-semibold transition-colors">
                                                                <Icon size={14} aria-hidden="true" /> {label}
                                                            </Link>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={onLogout}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/15 text-xs font-semibold text-rose-400 transition-colors"
                                                        >
                                                            <LogOut size={14} aria-hidden="true" /> Sign out
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </>
                                ) : (
                                    <div className="hidden sm:flex items-center gap-2">
                                        <Link to="/login" className="px-4 py-1.5 rounded-full border border-white/40 text-[11px] font-bold hover:bg-white/10 transition-all">
                                            Sign in
                                        </Link>
                                        <Link to="/signup" className="px-4 py-1.5 rounded-full bg-emerald-400 text-black text-[11px] font-black hover:bg-emerald-300 transition-all">
                                            Get started
                                        </Link>
                                    </div>
                                )}

                                {/* Mobile toggle */}
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(v => !v)}
                                    aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                                    aria-expanded={mobileMenuOpen}
                                    className="lg:hidden p-1.5 rounded-full bg-white/10 border border-white/20 shrink-0"
                                >
                                    {mobileMenuOpen ? <X size={18} /> : <MenuIcon size={18} />}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Collapsed state still needs a way into the menu on mobile. */}
                    {!expanded && (
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            aria-label="Open menu"
                            className="lg:hidden p-1.5 rounded-full bg-white/10 border border-white/20 shrink-0"
                        >
                            <MenuIcon size={18} />
                        </button>
                    )}
                </div>

                {/* ---------- Mobile menu ---------- */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden pt-4 border-t border-white/10 mt-3 space-y-3 overflow-hidden"
                        >
                            <nav aria-label="Mobile" className="space-y-1.5">
                                {/* These were <a href> with an onClick that never called
                                    preventDefault, so every tap did a FULL PAGE RELOAD. */}
                                {navLinks.map(link => (
                                    <React.Fragment key={link.path}>
                                        <Link
                                            to={link.path}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-2 p-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold hover:border-emerald-400 transition-colors"
                                        >
                                            {link.icon && <link.icon size={14} aria-hidden="true" />}
                                            {link.label}
                                        </Link>
                                        {link.subOptions?.map(sub => (
                                            <Link
                                                key={sub.path + sub.label}
                                                to={sub.path}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block pl-9 pr-2.5 py-2 rounded-xl text-[11px] font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                                            >
                                                {sub.label}
                                            </Link>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </nav>

                            {/* Signed-in users previously got NO links here at all — the
                                mobile menu only rendered auth buttons for guests. */}
                            {user ? (
                                <div className="pt-2 border-t border-white/10 space-y-1.5">
                                    {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                                        <Link key={path} to={path} onClick={() => setMobileMenuOpen(false)}
                                              className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10">
                                            <Icon size={14} aria-hidden="true" /> {label}
                                        </Link>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => { setMobileMenuOpen(false); onLogout?.(); }}
                                        className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                                    >
                                        <LogOut size={14} aria-hidden="true" /> Sign out
                                    </button>
                                </div>
                            ) : (
                                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                                          className="border border-white text-center py-2 rounded-full font-bold text-xs">
                                        Sign in
                                    </Link>
                                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}
                                          className="bg-emerald-400 text-black text-center py-2 rounded-full font-black text-xs">
                                        Get started
                                    </Link>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
