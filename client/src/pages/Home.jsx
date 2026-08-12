import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight, ChevronRight, ChevronLeft, ShieldCheck, Zap,
    Layers, Cpu, Globe, CheckCircle2, Building2, TrendingUp, Sparkles, Mail,
    QrCode, DollarSign, UserCheck, Calendar, ArrowUpRight, HelpCircle, Star, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function Home({ user }) {
    const navigate = useNavigate();

    // Word switcher
    const [heroWordIndex, setHeroWordIndex] = useState(0);
    const heroWords = ['Counter-Offer Bids.', 'Instant QR Passes.', 'Escrow Payments.', 'Verified Vendors.'];

    useEffect(() => {
        const interval = setInterval(() => {
            setHeroWordIndex(prev => (prev + 1) % heroWords.length);
        }, 2800);
        return () => clearInterval(interval);
    }, []);

    // Stats visibility
    const [statsVisible, setStatsVisible] = useState(false);
    const statsRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStatsVisible(true);
                }
            },
            { threshold: 0.3 }
        );
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    // Featured vendors
    const featuredVendors = [
        { id: 'fv-1', businessName: 'Grand Hyatt Ballroom', category: 'venue', rating: 4.95, reviewsCount: 312, location: 'Chicago, IL', price: 2500, image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80', trustScore: 98 },
        { id: 'fv-2', businessName: 'Gourmet Royale Catering', category: 'catering', rating: 4.92, reviewsCount: 184, location: 'New York, NY', price: 120, image: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=600&q=80', trustScore: 96 },
        { id: 'fv-3', businessName: 'Aura Light & Sound AV', category: 'music', rating: 4.88, reviewsCount: 96, location: 'Miami, FL', price: 1500, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80', trustScore: 94 },
        { id: 'fv-4', businessName: 'Capture Film Co.', category: 'photography', rating: 4.97, reviewsCount: 142, location: 'Los Angeles, CA', price: 800, image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80', trustScore: 99 }
    ];

    // FAQ state
    const [openFaqIdx, setOpenFaqIdx] = useState(null);
    const faqs = [
        { q: "How does InDrive-style negotiation work on SmartEvents?", a: "When you post an event RFP or book a service package, you specify your budget or target offer price. The vendor can accept the offer immediately or counter with their proposed price. You both can exchange counter-offers in real-time until a mutual price is agreed upon and locked in escrow." },
        { q: "What is the Escrow Budget protection?", a: "Once you accept a vendor's counter-offer, the final price is deposited into the SmartEvents Escrow Ledger. The funds are securely held and are only released to the vendor's bank payout account once the event is marked as successfully completed or checked in." },
        { q: "How does the mobile staff QR Scanner gate work?", a: "Attendees receive dynamic, encrypted PDF gate passes via email and their ticket wallet. At the event entrance, staff scan these tickets using `/staff/scanner`. The terminal verifies check-in status instantly from the database and prevents duplicate entry fraud." },
        { q: "What does the AI Concierge do?", a: "Smartie, your AI Concierge, uses advanced RAG models to help you analyze event budgets, generate comprehensive RFP requirements from simple prompts, compare vendor service packages, and plan your event timelines step-by-step." }
    ];

    const categories = [
        { name: 'Venues', value: 'venue', icon: Building2, desc: 'Hotels, lofts, convention halls' },
        { name: 'Catering & Dining', value: 'catering', icon: Layers, desc: 'Multi-course dinners, bars, waitstaff' },
        { name: 'Decoration & Design', value: 'decoration', icon: Sparkles, desc: 'Florals, theme designs, backdrop sets' },
        { name: 'Photography & Film', value: 'photography', icon: UserCheck, desc: 'Professional event shoots & highlights' },
        { name: 'Music & Stage AV', value: 'music', icon: QrCode, desc: 'Live DJ systems, concert truss, sound rigs' },
        { name: 'Makeup Artists', value: 'makeup', icon: Cpu, desc: 'Professional event makeup & styling' }
    ];

    const [carouselIndex, setCarouselIndex] = useState(0);

    return (
        <div className="min-h-screen bg-bg text-fg font-sans selection:bg-success selection:text-white">

            {/* 1. HIGH-END DYNAMIC HERO SECTION */}
            <section className="relative min-h-[85vh] flex items-center pt-8 pb-16 px-6 overflow-hidden bg-bg">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0ABF53]/15 via-emerald-100/30 to-transparent pointer-events-none blur-3xl" />
                <div className="absolute bottom-10 left-10 w-96 h-96 bg-success/10 pointer-events-none blur-3xl rounded-full" />

                <div className="max-w-[1280px] mx-auto w-full relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    {/* Left Column: Headline & CTA */}
                    <div className="lg:col-span-7 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate('/signup')}
                            className="adyen-badge cursor-pointer hover:border-success transition-all bg-surface shadow-sm"
                        >
                            <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                            <span className="font-semibold">SMARTEVENTS 3.0 · AI Concierge & Reverse Bidding</span>
                            <ChevronRight size={14} className="text-success" />
                        </motion.div>

                        <div className="space-y-2">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl sm:text-6xl lg:text-[68px] font-black tracking-tight leading-[1.05] text-fg"
                            >
                                Your Event. Your Price. <br />
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={heroWordIndex}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.35 }}
                                        className="text-success inline-block font-extrabold"
                                    >
                                        {heroWords[heroWordIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </motion.h1>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-base sm:text-lg text-muted font-medium max-w-[620px] leading-relaxed"
                        >
                            Post your event budget, receive counter-bids from top verified vendors, and sell QR ticket passes with guaranteed escrow payments.
                        </motion.p>

                        {/* Action CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-wrap items-center gap-4 pt-2"
                        >
                            <button
                                onClick={() => navigate(user ? '/bookings' : '/signup')}
                                className="btn-adyen-primary text-sm sm:text-base px-8 py-4 font-bold shadow-glow"
                            >
                                <span>{user ? 'Post New Event RFP' : 'Post an Event Free'}</span>
                                <ArrowRight size={18} />
                            </button>

                            <button
                                onClick={() => navigate(user ? '/dashboard' : '/login')}
                                className="btn-adyen-outline text-sm sm:text-base px-7 py-4 font-bold"
                            >
                                {user ? 'Command Center' : 'Browse & Bid as Vendor'}
                            </button>
                        </motion.div>

                        {/* Value Badges */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="pt-4 flex flex-wrap items-center gap-6 text-xs font-semibold text-muted border-t border-border/80"
                        >
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>2-Way Counter-Offers</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>QR Code Gate Entry</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-success" />
                                <span>Stripe & Escrow Protected</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Live Mockup Widget */}
                    <div className="lg:col-span-5 relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="relative space-y-4"
                        >
                            <div className="adyen-card p-6 bg-surface border border-border shadow-2xl space-y-4 relative z-20">
                                <div className="flex items-center justify-between border-b border-border pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center font-bold text-xs">
                                            GR
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-fg">Gourmet Royale Catering</h4>
                                            <span className="text-[10px] text-muted font-mono">4.9 ★ (184 reviews)</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-success/10 text-success">
                                        COUNTER-OFFER
                                    </span>
                                </div>

                                <div className="space-y-2 bg-surface-2 p-3.5 rounded-xl border border-border text-xs">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted font-medium">Original Host Budget:</span>
                                        <span className="font-mono text-muted line-through">$5,000</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted font-medium">Vendor Initial Quote:</span>
                                        <span className="font-mono text-muted font-bold">$4,500</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-border/60">
                                        <span className="text-fg font-bold">Proposed Counter Price:</span>
                                        <span className="font-mono text-base font-black text-success">$4,200</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="flex-1 btn-adyen-primary py-2.5 text-xs justify-center shadow-glow"
                                    >
                                        Accept & Pay Escrow
                                    </button>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="btn-adyen-outline py-2.5 px-4 text-xs"
                                    >
                                        Counter
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="adyen-card p-4 bg-[#111827] text-fg border border-border shadow-2xl relative z-10 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-fg/10 flex items-center justify-center text-success">
                                        <QrCode size={20} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-mono text-muted uppercase font-bold block">GATE PASS TICKET</span>
                                        <h5 className="text-xs font-bold text-fg">VIP Gala Pass #TKT-9421</h5>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/20 border border-success/40 text-success text-[10px] font-mono font-bold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                    <span>VALID ENTRY</span>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 2. TRUST / STATS BAR */}
            <section ref={statsRef} className="py-16 px-6 bg-[#111827] text-fg">
                <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
                    <div className="space-y-2">
                        <div className="text-3xl md:text-5xl font-black text-success font-mono">
                            {statsVisible ? '6,200+' : '0'}
                        </div>
                        <p className="text-xs text-muted font-semibold uppercase">Events Formed</p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-3xl md:text-5xl font-black text-fg font-mono">
                            {statsVisible ? '99.98%' : '0%'}
                        </div>
                        <p className="text-xs text-muted font-semibold uppercase">Uptime Reliability</p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-3xl md:text-5xl font-black text-success font-mono">
                            {statsVisible ? '1,500+' : '0'}
                        </div>
                        <p className="text-xs text-muted font-semibold uppercase">Verified Vendors</p>
                    </div>

                    <div className="space-y-2">
                        <div className="text-3xl md:text-5xl font-black text-fg font-mono">
                            {statsVisible ? '98.6%' : '0%'}
                        </div>
                        <p className="text-xs text-muted font-semibold uppercase">Check-In Verification</p>
                    </div>

                    <div className="space-y-2 col-span-2 md:col-span-1">
                        <div className="text-3xl md:text-5xl font-black text-success font-mono">
                            {statsVisible ? '$4.5M+' : '$0'}
                        </div>
                        <p className="text-xs text-muted font-semibold uppercase">Escrow Volume</p>
                    </div>
                </div>
            </section>

            {/* 3. HOW IT WORKS (3-4 STEPS) */}
            <section className="py-24 px-6 bg-surface border-b border-border">
                <div className="max-w-[1280px] mx-auto space-y-16">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">TRANSACTION FLOW</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                            How SmartEvents Works
                        </h2>
                        <p className="text-xs text-muted font-medium">Four simple steps to host, negotiate, and verify your event listings securely.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Publish Event RFP', body: 'Hosts outline their requirements, location, estimated guest capacity, and initial budget parameters.', icon: Calendar },
                            { step: '02', title: 'AI Concierge RAG Analysis', body: 'Our smart agent analyzes requirements, generates matching recommendations, and scopes realistic budgets.', icon: Sparkles },
                            { step: '03', title: 'InDrive-Style Bidding', body: 'Negotiate pricing in real-time. Make counter-offers directly to vendors until both sides lock in the ideal price.', icon: DollarSign },
                            { step: '04', title: 'Escrow & QR Gate Passes', body: 'Funds are secured in escrow. Attendee tickets generate dynamic QR passes validated at gate terminals.', icon: QrCode }
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div key={idx} className="relative p-6 bg-bg rounded-3xl border border-border/80 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-3xl font-black text-success/20 font-mono">{item.step}</span>
                                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                                            <Icon size={18} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-bold text-fg">{item.title}</h4>
                                        <p className="text-xs text-muted leading-relaxed font-medium">{item.body}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 4. CLICKABLE CATEGORY GRID */}
            <section className="py-24 px-6 bg-bg border-b border-border">
                <div className="max-w-[1280px] mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="space-y-2">
                            <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">DISCOVER CATEGORIES</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                                Browse Verified Marketplace
                            </h2>
                        </div>
                        <button onClick={() => navigate('/vendors')} className="text-xs font-bold text-success flex items-center gap-1 hover:underline">
                            <span>Browse All Vendors</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat, idx) => {
                            const Icon = cat.icon;
                            return (
                                <div
                                    key={idx}
                                    onClick={() => navigate(`/vendors?category=${cat.value}`)}
                                    className="adyen-card p-6 bg-surface border border-border rounded-3xl flex items-center gap-4 cursor-pointer hover:border-success transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success group-hover:scale-110 transition-transform">
                                        <Icon size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-fg group-hover:text-success transition-colors">{cat.name}</h4>
                                        <p className="text-xs text-muted font-medium">{cat.desc}</p>
                                    </div>
                                    <ArrowUpRight size={16} className="text-muted ml-auto group-hover:text-success group-hover:translate-x-0.5 transition-all" />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 5. FEATURED PROVIDERS CAROUSEL */}
            <section className="py-24 px-6 bg-surface border-b border-border">
                <div className="max-w-[1280px] mx-auto space-y-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div className="space-y-2">
                            <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">PREMIUM PROVIDERS</span>
                            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                                Featured Professionals
                            </h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
                                className="p-2.5 rounded-full bg-surface border border-border hover:border-success text-fg shadow-sm transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCarouselIndex(Math.min(featuredVendors.length - 2, carouselIndex + 1))}
                                className="p-2.5 rounded-full bg-surface border border-border hover:border-success text-fg shadow-sm transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden">
                        <motion.div
                            animate={{ x: `-${carouselIndex * 300}px` }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                            className="flex gap-6"
                        >
                            {featuredVendors.map((vendor) => (
                                <div
                                    key={vendor.id}
                                    onClick={() => navigate(`/vendor/${vendor.id}`)}
                                    className="w-[280px] shrink-0 adyen-card bg-surface border border-border rounded-3xl overflow-hidden cursor-pointer hover:border-success shadow-sm transition-all"
                                >
                                    <div className="h-40 overflow-hidden relative">
                                        <img src={vendor.image} alt={vendor.businessName} className="w-full h-full object-cover" />
                                        <span className="absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#111827]/80 text-fg">
                                            Trust: {vendor.trustScore}%
                                        </span>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        <span className="text-[10px] font-mono text-success uppercase font-bold tracking-widest">{vendor.category}</span>
                                        <h4 className="text-base font-bold text-fg truncate">{vendor.businessName}</h4>
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-muted">{vendor.location}</span>
                                            <span className="text-success font-bold">{vendor.rating} ★</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 6. AI CONCIERGE TEASER SECTION */}
            <section className="py-24 px-6 bg-[#111827] text-fg overflow-hidden relative border-b border-border">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0ABF53]/10 to-transparent pointer-events-none blur-3xl" />
                <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    <div className="lg:col-span-6 space-y-6">
                        <span className="adyen-badge bg-success/15 text-success border-none font-bold">MEET SMARTIE</span>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-fg leading-tight">
                            The Smart AI Concierge
                        </h2>
                        <p className="text-xs text-muted font-medium leading-relaxed max-w-lg">
                            Harness dynamic RAG models to generate comprehensive RFP packages, analyze event budgets, manage vendor packages, and plan your schedules automatically.
                        </p>

                        <div className="space-y-3 font-semibold text-xs text-muted">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-success" />
                                <span>Budget constraints and pricing analyzers</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-success" />
                                <span>Timeline planner step-by-step generators</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-success" />
                                <span>Vector-backed similar documents search</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(user ? '/ai-concierge' : '/signup')}
                            className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-glow"
                        >
                            <span>Open AI Concierge Workspace</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Interactive chat widget teaser */}
                    <div className="lg:col-span-6">
                        <div className="bg-fg/5 border border-border rounded-3xl p-6 space-y-4 shadow-2xl relative">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                                <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-fg">Smartie AI Assistant</h4>
                                    <span className="text-[10px] text-muted font-mono">Agent Status: Active</span>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs leading-relaxed font-semibold">
                                <div className="bg-fg/5 border border-border p-3 rounded-2xl max-w-[85%] text-muted">
                                    "I need a catering vendor for 300 guests in Chicago with a maximum budget of $4,000."
                                </div>
                                <div className="bg-success/10 border border-success/20 p-3 rounded-2xl max-w-[85%] ml-auto text-white space-y-2">
                                    <p>I found 3 verified caterers matching your budget. I can draft an RFP with the following breakdown:</p>
                                    <ul className="list-disc list-inside text-muted text-[11px] font-mono">
                                        <li>Catering quote: $3,600</li>
                                        <li>Service fee: $200</li>
                                        <li>Remaining margin: $200</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. FEATURE GRID ("Why SmartEvents") */}
            <section className="py-24 px-6 bg-surface border-b border-border">
                <div className="max-w-[1280px] mx-auto space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">WHY SMARTEVENTS</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                            Enterprise Reliability, Standardized
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { title: 'Real-Time Negotiation', desc: 'Secure the price you want through counter-offer history tracking and concurrency checks.', icon: DollarSign },
                            { title: 'AI Concierge Planning', desc: 'Generative budget breakdowns and RFP scoper tools driven by vector embeddings.', icon: Sparkles },
                            { title: 'Verified Providers', desc: 'Vendor credentials and portfolio catalogs checked by platform moderators.', icon: UserCheck },
                            { title: 'Secure Escrow Process', desc: 'Escrow payment releases locked securely via Stripe ledgers.', icon: ShieldCheck }
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div key={idx} className="adyen-card p-6 flex flex-col justify-between space-y-6 hover:border-success">
                                    <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                                        <Icon size={22} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-base font-bold text-fg">{item.title}</h3>
                                        <p className="text-xs text-muted leading-relaxed font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 8. TESTIMONIALS */}
            <section className="py-24 px-6 bg-bg border-b border-border">
                <div className="max-w-[1280px] mx-auto space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">SUCCESS STORIES</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                            Loved by Event Organizers
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { name: 'Sarah Jenkins', role: 'Wedding Coordinator', quote: 'SmartEvents saved our clients thousands of dollars. The InDrive negotiation let us communicate budget boundaries clearly, and escrow payouts kept our vendors feeling secure.', rating: 5 },
                            { name: 'David Chen', role: 'Tech Summit Lead', quote: 'Managing attendee VIP tickets with the staff QR gate scanner was incredibly smooth. We checked in 800 attendees with zero ticket duplication errors.', rating: 5 },
                            { name: 'Umar Farooq', role: 'Premium AV Supplier', quote: 'As a provider, having a live dashboard of incoming proposals and negotiations has completely streamlined our onboarding. We respond instantly and close deals in minutes.', rating: 5 }
                        ].map((t, idx) => (
                            <div key={idx} className="adyen-card p-6 bg-surface border border-border/80 rounded-3xl space-y-4 hover:border-success">
                                <div className="flex items-center gap-1 text-success">
                                    {[...Array(t.rating)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                                </div>
                                <p className="text-xs text-muted italic font-medium leading-relaxed">"{t.quote}"</p>
                                <div>
                                    <h5 className="text-xs font-bold text-fg">{t.name}</h5>
                                    <span className="text-[10px] text-muted font-mono">{t.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 9. FAQ ACCORDION */}
            <section className="py-24 px-6 bg-surface border-b border-border">
                <div className="max-w-[800px] mx-auto space-y-12">
                    <div className="text-center space-y-3">
                        <span className="text-xs font-mono font-bold text-success uppercase tracking-widest">COMMON QUESTIONS</span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg">
                            Frequently Asked Questions
                        </h2>
                    </div>

                    <div className="divide-y divide-[#E5E7EB]">
                        {faqs.map((faq, idx) => {
                            const isOpen = openFaqIdx === idx;
                            return (
                                <div key={idx} className="py-4">
                                    <button
                                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                                        className="w-full flex items-center justify-between text-left text-sm font-bold text-fg py-2"
                                    >
                                        <span>{faq.q}</span>
                                        <HelpCircle size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180 text-success' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden text-xs text-muted font-medium leading-relaxed pt-2"
                                            >
                                                {faq.a}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 10. FINAL CTA BANNER */}
            <section className="py-28 px-6 bg-surface-2 border-b border-border text-center relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-success/5 pointer-events-none blur-3xl rounded-full" />
                <div className="max-w-[1280px] mx-auto space-y-8 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tight text-fg max-w-3xl mx-auto leading-tight">
                        Secure the perfect pricing model for your next event today.
                    </h2>
                    <button
                        onClick={() => navigate('/signup')}
                        className="btn-adyen-primary text-base px-10 py-4 font-bold shadow-glow mx-auto"
                    >
                        <span>Get Started Free</span>
                        <ArrowRight size={18} />
                    </button>
                </div>
            </section>

            {/* 11. FULL-SITEMAP FOOTER */}
            <footer className="bg-[#111827] py-16 px-6 text-xs text-muted">
                <div className="max-w-[1280px] mx-auto space-y-12">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                        <div className="space-y-3">
                            <h4 className="font-bold text-fg text-sm uppercase">Company</h4>
                            <ul className="space-y-2">
                                <li><span onClick={() => navigate('/about')} className="hover:text-fg cursor-pointer">About us</span></li>
                                <li><span onClick={() => navigate('/contact')} className="hover:text-fg cursor-pointer">Contact support</span></li>
                                <li><a href="#" className="hover:text-fg">Careers</a></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-bold text-fg text-sm uppercase">Features</h4>
                            <ul className="space-y-2">
                                <li><span onClick={() => navigate('/vendors')} className="hover:text-fg cursor-pointer">Marketplace</span></li>
                                <li><span onClick={() => navigate('/ai-concierge')} className="hover:text-fg cursor-pointer">AI Concierge</span></li>
                                <li><span onClick={() => navigate('/staff/scanner')} className="hover:text-fg cursor-pointer">QR Scanner Gate</span></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-bold text-fg text-sm uppercase">Ecosystem</h4>
                            <ul className="space-y-2">
                                <li><span onClick={() => navigate('/tickets')} className="hover:text-fg cursor-pointer">Dynamic passes</span></li>
                                <li><span onClick={() => navigate('/revenue')} className="hover:text-fg cursor-pointer">Escrow settlements</span></li>
                                <li><span onClick={() => navigate('/calendar')} className="hover:text-fg cursor-pointer">Availability schedules</span></li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-bold text-fg text-sm uppercase">Admin Panel</h4>
                            <ul className="space-y-2">
                                <li><span onClick={() => navigate('/admin/users')} className="hover:text-fg cursor-pointer">Users & Platform</span></li>
                            </ul>
                        </div>

                        <div className="space-y-4 col-span-2 md:col-span-1">
                            <h4 className="font-bold text-fg text-sm uppercase">Platform Notifications</h4>
                            <p className="text-[11px]">Keep track of escrow releases and RFP bids.</p>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Work email"
                                    className="bg-surface-2 border border-border rounded-full px-3.5 py-2 text-xs text-fg placeholder-slate-500 outline-none w-full"
                                />
                                <button className="p-2 bg-success text-white rounded-full"
                                aria-label="Subscribe">
                                    <Mail size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
                        <div>© 2026 SmartEvents Enterprise Ecosystem. All rights reserved.</div>
                        <div className="flex items-center gap-4">
                            <span>Global Network</span>
                            <span>Privacy Terms</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default Home;
