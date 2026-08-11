import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight, Bell, Menu as MenuIcon, X, ChevronDown, User, LogOut,
    LayoutDashboard, Package, CalendarDays, DollarSign, QrCode,
    Settings, ShieldCheck, Sparkles, PlusCircle, Layers, ChevronRight, Store, Compass,
    Camera, Music, Building, Award, FileText, CheckCircle2, Ticket
} from 'lucide-react';
import EventManagerLogo from '../EventManagerLogo';

export default function DynamicNavbar({ user, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();

    // HOVER & SUB-MENU DROPDOWN STATES
    const [isHovered, setIsHovered] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);

    // Close dropdowns on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
        setNotificationOpen(false);
        setActiveSubmenu(null);
    }, [location.pathname]);

    // DYNAMIC NAVIGATION LINKS WITH EXPLORATION SUB-OPTIONS
    const getNavLinks = () => {
        if (!user) {
            return [
                {
                    label: 'Discover Events',
                    path: '/events',
                    icon: Compass,
                    subOptions: [
                        { label: 'Corporate Conferences', desc: 'Enterprise stage & AV expos', path: '/events?category=Corporate Conferences' },
                        { label: 'Music Festivals', desc: 'High-speed QR entry pass events', path: '/events?category=Music Festivals' },
                        { label: 'Weddings & Galas', desc: 'Catering & decor counter-bidding', path: '/events?category=Weddings %26 Galas' },
                        { label: 'Live Bidding Events', desc: 'Open events with active quotes', path: '/events?category=Live Bidding Events' }
                    ]
                },
                {
                    label: 'Vendor Marketplace',
                    path: '/vendors',
                    icon: Store,
                    subOptions: [
                        { label: 'Catering & Dining', desc: 'Verified gourmet food partners', path: '/vendors?category=Catering %26 Dining' },
                        { label: 'Stage & Lighting AV', desc: 'Professional audio-visual crews', path: '/vendors?category=Stage %26 Lighting AV' },
                        { label: 'Photography & Cinema', desc: 'Event videographers & drones', path: '/vendors?category=Photography %26 Cinema' },
                        { label: 'Venues & Ballrooms', desc: 'Indoor & outdoor capacity venues', path: '/vendors?category=Venues %26 Ballrooms' }
                    ]
                },
                {
                    label: 'How Bidding Works',
                    path: '/how-it-works',
                    icon: Layers,
                    subOptions: [
                        { label: 'Host Budget Posting', desc: 'Post min/max target range', path: '/how-it-works' },
                        { label: 'Vendor Proposals', desc: 'Submit quotes & deliverables', path: '/how-it-works' },
                        { label: 'Counter-Offer Engine', desc: 'Negotiate price in 2-way loop', path: '/how-it-works' },
                        { label: 'Escrow Protection', desc: 'Stripe escrow budget holding', path: '/how-it-works' }
                    ]
                },
                {
                    label: 'Pricing & Passes',
                    path: '/pricing',
                    icon: QrCode,
                    subOptions: [
                        { label: 'Free General Tickets', desc: 'Free RSVP attendee passes', path: '/pricing' },
                        { label: 'VIP Pass Tier', desc: 'Premium perks & lounge access', path: '/pricing' },
                        { label: 'Student Discount Pass', desc: 'Verified institutional passes', path: '/pricing' },
                        { label: 'Staff Entry Gate Scanner', desc: 'QR code validation terminal', path: '/staff/scanner' }
                    ]
                }
            ];
        }

        if (user.role === 'admin' || user.role === 'superadmin') {
            return [
                {
                    label: 'Command Center',
                    path: '/dashboard',
                    icon: LayoutDashboard,
                    subOptions: [
                        { label: 'System Health', desc: 'Real-time server & DB metrics', path: '/dashboard' },
                        { label: 'Live Bids Log', desc: 'Monitor active negotiations', path: '/dashboard' }
                    ]
                },
                {
                    label: 'User Governance',
                    path: '/admin/users',
                    icon: User,
                    subOptions: [
                        { label: 'Organizers Roster', desc: 'Manage verified event hosts', path: '/admin/users' },
                        { label: 'Vendor Verifications', desc: 'Approve category credentials', path: '/admin/users' }
                    ]
                },
                {
                    label: 'Platform Revenue',
                    path: '/revenue',
                    icon: DollarSign,
                    subOptions: [
                        { label: 'Escrow Volume', desc: 'Total dollar volume in escrow', path: '/revenue' },
                        { label: 'Platform Fees', desc: 'Commission revenue ledger', path: '/revenue' }
                    ]
                }
            ];
        }

        if (user.role === 'vendor') {
            return [
                {
                    label: 'Vendor Hub',
                    path: '/dashboard',
                    icon: LayoutDashboard,
                    subOptions: [
                        { label: 'Active Proposals', desc: 'Submitted bids awaiting review', path: '/dashboard' },
                        { label: 'Performance Stats', desc: 'Rating & win-rate metrics', path: '/dashboard' }
                    ]
                },
                {
                    label: 'Browse Events & Bid',
                    path: '/bookings',
                    icon: CalendarDays,
                    subOptions: [
                        { label: 'Corporate Events', desc: 'High-budget corporate RFPs', path: '/bookings' },
                        { label: 'Concerts & Festivals', desc: 'Stage & sound opportunities', path: '/bookings' },
                        { label: 'Filter by Budget', desc: 'Search high-margin events', path: '/bookings' }
                    ]
                },
                {
                    label: 'Service Portfolio',
                    path: '/services',
                    icon: Package,
                    subOptions: [
                        { label: 'Manage Offerings', desc: 'Update packages & pricing', path: '/services' },
                        { label: 'Upload Showcase Photos', desc: 'Add work samples to profile', path: '/services' }
                    ]
                },
                {
                    label: 'Payout Ledger',
                    path: '/revenue',
                    icon: DollarSign,
                    subOptions: [
                        { label: 'Escrow Funds Pending', desc: 'Funds ready upon event completion', path: '/revenue' },
                        { label: 'Completed Earnings', desc: 'Bank payouts history', path: '/revenue' }
                    ]
                }
            ];
        }

        // Default: Organizer
        return [
            {
                label: 'Dashboard',
                path: '/dashboard',
                icon: LayoutDashboard,
                subOptions: [
                    { label: 'Overview Metrics', desc: 'Registrations & budget stats', path: '/dashboard' },
                    { label: 'Live Matchmaker', desc: 'AI vendor recommendations', path: '/dashboard' }
                ]
            },
            {
                label: 'Manage Events',
                path: '/bookings',
                icon: CalendarDays,
                subOptions: [
                    { label: 'Post New Event Wizard', desc: 'Set budget & service requirements', path: '/bookings' },
                    { label: 'Bid Counter-Offer Inbox', desc: 'Evaluate & negotiate quotes', path: '/bookings' },
                    { label: 'Confirmed Events', desc: 'Contracts ready for execution', path: '/bookings' }
                ]
            },
            {
                label: 'Pass Wallet & Gate',
                path: '/tickets',
                icon: QrCode,
                subOptions: [
                    { label: 'Digital Ticket Passes', desc: 'QR passes with PDF download', path: '/tickets' },
                    { label: 'Staff Entry Gate Scanner', desc: 'Mobile terminal for gate staff', path: '/staff/scanner' }
                ]
            },
            {
                label: 'Revenue & Escrow',
                path: '/revenue',
                icon: DollarSign,
                subOptions: [
                    { label: 'Escrow Budget Ledger', desc: 'Track committed vendor funds', path: '/revenue' },
                    { label: 'Ticket Revenue', desc: 'Sales analytics & payouts', path: '/revenue' }
                ]
            }
        ];
    };

    const navLinks = getNavLinks();

    const mockNotifications = [
        { id: 1, title: 'Counter-Offer Received', desc: 'Apex Catering proposed $4,200 for Gala Event', time: '10m ago', unread: true },
        { id: 2, title: 'Bid Accepted!', desc: 'Your bid of $3,500 was accepted by Organizers Inc.', time: '1h ago', unread: true },
        { id: 3, title: 'Escrow Settlement', desc: 'Payment of $5,000 received in escrow', time: '3h ago', unread: false },
    ];

    const unreadCount = mockNotifications.filter(n => n.unread).length;

    return (
        <>
            {/* FLOATING HOVER-EXPAND PURE BLACK NAVBAR */}
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-auto">
                <motion.div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => {
                        setIsHovered(false);
                        setProfileDropdownOpen(false);
                        setNotificationOpen(false);
                        setActiveSubmenu(null);
                    }}
                    animate={{
                        width: isHovered || mobileMenuOpen ? 'min(1150px, 94vw)' : '140px',
                        borderRadius: '9999px',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    className="bg-[#000000] border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.95)] py-2.5 px-4 text-white overflow-visible relative"
                >
                    <div className="flex items-center justify-between gap-3">
                        {/* BRAND EMBLEM: Smartie */}
                        <div onClick={() => navigate('/')} className="cursor-pointer shrink-0">
                            <EventManagerLogo collapsed={!isHovered && !mobileMenuOpen} />
                        </div>

                        {/* COLLAPSED PILL: ONLY GREEN DOT + COMPLETE WORD "MENU" */}
                        {!isHovered && !mobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 cursor-pointer select-none"
                            >
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
                                <span className="text-white font-black text-xs uppercase tracking-widest font-sans">MENU</span>
                            </motion.div>
                        )}

                        {/* EXPANDED DESKTOP NAVIGATION LINKS WITH HOVER SUBMENU TRIGGER */}
                        <AnimatePresence>
                            {(isHovered || mobileMenuOpen) && (
                                <motion.nav
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="hidden lg:flex items-center gap-2 text-xs font-bold tracking-wide text-white relative"
                                >
                                    {navLinks.map((link, idx) => {
                                        const Icon = link.icon;
                                        const isActive = location.pathname === link.path;
                                        const isSubmenuOpen = activeSubmenu === idx;

                                        return (
                                            <div
                                                key={idx}
                                                className="relative"
                                                onMouseEnter={() => setActiveSubmenu(idx)}
                                            >
                                                <a
                                                    href={link.path}
                                                    onClick={(e) => {
                                                        if (!link.path.includes('#')) {
                                                            e.preventDefault();
                                                            navigate(link.path);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-full transition-all cursor-pointer ${isActive || isSubmenuOpen
                                                            ? 'bg-white text-black font-black shadow-md'
                                                            : 'text-white hover:bg-white/15'
                                                        }`}
                                                >
                                                    {Icon && <Icon size={14} className={isActive || isSubmenuOpen ? 'text-black' : 'text-white'} />}
                                                    <span>{link.label}</span>
                                                    {link.subOptions && (
                                                        <ChevronDown size={12} className={isActive || isSubmenuOpen ? 'text-black' : 'text-slate-400'} />
                                                    )}
                                                </a>

                                                {/* NESTED EXPLORATION SUBMENU DROPDOWN */}
                                                <AnimatePresence>
                                                    {isSubmenuOpen && link.subOptions && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                                            onMouseLeave={() => setActiveSubmenu(null)}
                                                            className="absolute top-full left-0 mt-3 w-64 p-3 bg-black border border-white/20 rounded-2xl shadow-2xl z-50 space-y-1.5"
                                                        >
                                                            <div className="px-2 py-1 border-b border-white/10 text-[10px] font-mono text-[#0ABF53] uppercase font-bold tracking-wider">
                                                                Explore {link.label}
                                                            </div>
                                                            {link.subOptions.map((sub, sIdx) => (
                                                                <div
                                                                    key={sIdx}
                                                                    onClick={() => {
                                                                        setActiveSubmenu(null);
                                                                        if (sub.path.includes('#')) {
                                                                            window.location.href = sub.path;
                                                                        } else {
                                                                            navigate(sub.path);
                                                                        }
                                                                    }}
                                                                    className="p-2 rounded-xl hover:bg-white/15 cursor-pointer transition-colors space-y-0.5 group"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs font-bold text-white group-hover:text-[#0ABF53]">
                                                                        <span>{sub.label}</span>
                                                                        <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#0ABF53]" />
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 line-clamp-1">{sub.desc}</p>
                                                                </div>
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

                        {/* RIGHT ACTIONS BLOCK */}
                        <AnimatePresence>
                            {(isHovered || mobileMenuOpen) && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-3 shrink-0"
                                >
                                    {user ? (
                                        <>
                                            {user.role === 'organizer' && (
                                                <button
                                                    onClick={() => navigate('/bookings')}
                                                    className="hidden sm:flex items-center gap-1.5 bg-[#0ABF53] text-black text-[11px] px-4 py-1.5 font-black rounded-full shadow-adyen-glow hover:bg-[#09aa49] transition-all"
                                                >
                                                    <PlusCircle size={13} />
                                                    <span>Post Event</span>
                                                </button>
                                            )}

                                            {/* Notification Bell */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => {
                                                        setNotificationOpen(!notificationOpen);
                                                        setProfileDropdownOpen(false);
                                                    }}
                                                    className="p-2 rounded-full bg-white/10 border border-white/20 hover:border-white text-white transition-colors relative"
                                                >
                                                    <Bell size={15} className="text-white" />
                                                    {unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#0ABF53] text-black text-[9px] font-black rounded-full flex items-center justify-center border border-black">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </button>

                                                <AnimatePresence>
                                                    {notificationOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            className="absolute right-0 mt-3 w-80 p-4 shadow-2xl rounded-2xl border border-white/20 bg-black z-50 space-y-3 text-white"
                                                        >
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                                                <span className="text-xs font-black text-white uppercase tracking-wider">Notifications</span>
                                                                <span className="text-[10px] text-[#0ABF53] font-mono font-bold cursor-pointer hover:underline">Mark all read</span>
                                                            </div>
                                                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                {mockNotifications.map(n => (
                                                                    <div key={n.id} className="p-2.5 rounded-xl bg-white/10 border border-white/10 space-y-1 text-white">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold text-white">{n.title}</span>
                                                                            <span className="text-[9px] font-mono text-slate-300">{n.time}</span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-200 leading-tight">{n.desc}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* Profile Menu Dropdown */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => {
                                                        setProfileDropdownOpen(!profileDropdownOpen);
                                                        setNotificationOpen(false);
                                                    }}
                                                    className="flex items-center gap-2 p-1 pl-2.5 rounded-full bg-white/10 border border-white/20 hover:border-white transition-all cursor-pointer text-white"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-[#0ABF53] text-black font-black text-[11px] flex items-center justify-center">
                                                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <span className="hidden md:inline text-xs font-bold text-white">{user.name}</span>
                                                    <ChevronDown size={13} className="text-white" />
                                                </button>

                                                <AnimatePresence>
                                                    {profileDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: 10 }}
                                                            className="absolute right-0 mt-3 w-56 p-3 shadow-2xl rounded-2xl border border-white/20 bg-black z-50 space-y-2 text-white"
                                                        >
                                                            <div className="px-3 py-2 border-b border-white/10 space-y-1">
                                                                <p className="text-xs font-bold text-white">{user.name}</p>
                                                                <p className="text-[10px] text-slate-300 truncate">{user.email}</p>
                                                                <span className="inline-block text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#0ABF53]/20 text-[#0ABF53] border border-[#0ABF53]/40 font-bold uppercase mt-1">
                                                                    {user.role || 'Member'}
                                                                </span>
                                                            </div>

                                                            <div className="space-y-1 text-xs font-bold text-white">
                                                                <button
                                                                    onClick={() => navigate('/settings')}
                                                                    className="w-full text-left px-3 py-2 rounded-xl text-white hover:bg-white/15 flex items-center gap-2"
                                                                >
                                                                    <Settings size={14} className="text-[#0ABF53]" />
                                                                    <span>Account Settings</span>
                                                                </button>
                                                                <button
                                                                    onClick={onLogout}
                                                                    className="w-full text-left px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/20 flex items-center gap-2"
                                                                >
                                                                    <LogOut size={14} />
                                                                    <span>Sign Out</span>
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </>
                                    ) : (
                                        /* GUEST CTAs */
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate('/login')}
                                                className="border border-white text-white hover:bg-white hover:text-black rounded-full text-[11px] px-4 py-1.5 font-bold transition-all"
                                            >
                                                Sign in
                                            </button>
                                            <button
                                                onClick={() => navigate('/signup')}
                                                className="bg-[#0ABF53] text-black hover:bg-[#09aa49] rounded-full text-[11px] px-4 py-1.5 font-black flex items-center gap-1 transition-all"
                                            >
                                                <span>Contact us</span>
                                                <ArrowRight size={13} />
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* MOBILE HAMBURGER TOGGLE */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-1.5 rounded-full bg-white/10 border border-white/20 text-white shrink-0"
                        >
                            {mobileMenuOpen ? <X size={18} /> : <MenuIcon size={18} />}
                        </button>
                    </div>

                    {/* MOBILE SLIDE-OUT MENU */}
                    <AnimatePresence>
                        {mobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="lg:hidden pt-4 border-t border-white/10 mt-3 space-y-3 text-white"
                            >
                                <div className="space-y-1.5">
                                    {navLinks.map((link, idx) => (
                                        <a
                                            key={idx}
                                            href={link.path}
                                            onClick={() => {
                                                setMobileMenuOpen(false);
                                                navigate(link.path);
                                            }}
                                            className="block p-2.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold text-white hover:border-[#0ABF53]"
                                        >
                                            {link.label}
                                        </a>
                                    ))}
                                </div>

                                {!user && (
                                    <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => navigate('/login')}
                                            className="border border-white text-white py-2 rounded-full font-bold text-xs w-full"
                                        >
                                            Sign in
                                        </button>
                                        <button
                                            onClick={() => navigate('/signup')}
                                            className="bg-[#0ABF53] text-black py-2 rounded-full font-black text-xs w-full"
                                        >
                                            Get Started
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </>
    );
}
