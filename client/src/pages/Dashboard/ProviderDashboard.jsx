import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight, CalendarDays, Palette, CheckCircle2, DollarSign, Images, Inbox, MessageSquare, Package, Plus,
    QrCode, ShieldCheck, Star, Store, Users,
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import StatCard from '../../components/common/StatCard';
import BookingInsight from '../../components/Dashboard/BookingInsight';
import { AttentionList, NextUp, Panel, QuickGrid } from '../../components/Dashboard/DashboardBits';
import StarRating from '../../components/reviews/StarRating';
import {
    Badge, Button, EmptyState, ErrorState, Skeleton, SkeletonList, formatCurrency, formatDate, BOOKING_STATUS,
} from '../../components/ui';

const DAY = 86400000;
const TOOLKIT = [
    { label: 'Service packages', path: '/services', icon: Package },
    { label: 'Design studio', path: '/design-studio', icon: Palette },
    { label: 'My events', path: '/my-events', icon: CalendarDays },
    { label: 'Public profile', path: '/my-profile', icon: Images },
    { label: 'Availability', path: '/calendar', icon: CalendarDays },
    { label: 'Revenue', path: '/revenue', icon: DollarSign },
    { label: 'Ticket scanner', path: '/staff/scanner', icon: QrCode },
    { label: 'Reviews', path: '/reviews', icon: Star },
];
const FILTERS = [['offers', 'Offers'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['all', 'All']];

const titleOf = (b) => b.eventId?.title || b.serviceId?.title || b.eventDetails?.eventType || 'Custom request';
const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
const OPEN = ['pending', 'negotiating'];

export default function ProviderDashboard({ user }) {
    const navigate = useNavigate();
    const myId = String(user?._id || user?.id || '');
    const [bookings, setBookings] = useState([]);
    const [pub, setPub] = useState(null); // public profile: stats, rating, trust
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('offers');
    const [insight, setInsight] = useState(null);
    const { socket } = useWebSockets();

    const load = useCallback(async () => {
        setError(null);
        try {
            const [b, p] = await Promise.all([
                axios.get('/bookings/organizer'),
                myId ? axios.get(`/vendor/profile/${myId}`).catch(() => null) : null,
            ]);
            setBookings(b.data.data || []);
            setPub(p?.data || null);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your dashboard.');
        } finally {
            setLoading(false);
        }
    }, [myId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!socket) return undefined;
        const refresh = () => load();
        socket.on('notification', refresh);
        return () => socket.off('notification', refresh);
    }, [socket, load]);

    const profile = pub?.profile;
    const stats = useMemo(() => {
        const open = bookings.filter((b) => OPEN.includes(b.status));
        const booked = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));
        return {
            open: open.length,
            yourTurn: open.filter((b) => { const l = b.negotiationHistory?.[b.negotiationHistory.length - 1]; return l && String(l.offeredBy?._id || l.offeredBy) !== myId; }).length,
            upcoming: bookings.filter((b) => b.status === 'confirmed').length,
            revenue: booked.reduce((t, b) => t + (b.offerPrice || 0), 0),
            released: booked.filter((b) => b.status === 'completed' || b.escrow?.status === 'released').reduce((t, b) => t + (b.offerPrice || 0), 0),
        };
    }, [bookings, myId]);

    const nextJob = useMemo(() => bookings
        .filter((b) => b.status === 'confirmed' && b.eventDetails?.date && daysUntil(b.eventDetails.date) >= 0)
        .sort((a, b) => new Date(a.eventDetails.date) - new Date(b.eventDetails.date))[0] || null, [bookings]);

    const todo = useMemo(() => {
        const items = [];
        for (const b of bookings) {
            const last = b.negotiationHistory?.[b.negotiationHistory.length - 1];
            const who = b.customerId?.name || 'An organizer';
            if (OPEN.includes(b.status) && last && String(last.offeredBy?._id || last.offeredBy) !== myId) {
                items.push({ key: `o${b._id}`, tone: 'warning', icon: MessageSquare, text: `${who} offered ${formatCurrency(last.price)} for ${titleOf(b)}`, cta: 'Reply', to: `/negotiate/${b._id}` });
            }
            if (b.status === 'confirmed' && b.eventDetails?.date) {
                const d = daysUntil(b.eventDetails.date);
                if (d >= 0 && d <= 7) items.push({ key: `s${b._id}`, tone: 'brand', icon: CalendarDays, text: `${titleOf(b)} is in ${d === 0 ? 'less than a day' : `${d} day${d === 1 ? '' : 's'}`}. Check the design brief.`, cta: 'Prepare', to: `/negotiate/${b._id}?view=design` });
            }
        }
        if (profile) {
            const missing = [
                (!profile.location || profile.location === 'Not specified yet') && 'city',
                !(profile.description || '').trim() && 'description',
                !profile.tagline && 'tagline',
                !profile.coverImage && !(profile.gallery || []).length && 'cover photo',
            ].filter(Boolean);
            if (missing.length) items.push({ key: 'profile', tone: 'brand', icon: Store, text: `Your public profile is missing a ${missing.join(', ')}.`, cta: 'Fix', to: '/my-profile' });
            if (!(pub?.services || []).length) items.push({ key: 'pkg', tone: 'brand', icon: Package, text: 'Add a package so organizers can book you from their planner.', cta: 'Add', to: '/services' });
        }
        return items.slice(0, 6);
    }, [bookings, myId, profile, pub]);

    const shown = useMemo(() => bookings.filter((b) => (
        filter === 'all' ? true
            : filter === 'offers' ? OPEN.includes(b.status)
                : filter === 'upcoming' ? b.status === 'confirmed'
                    : b.status === 'completed'
    )).slice(0, 8), [bookings, filter]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto space-y-6">
                <Skeleton className="h-14 w-80" />
                <SkeletonList count={4} height="h-28" cols="md:grid-cols-4" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const pStats = profile?.stats || {};
    const logo = profile?.portfolioImages?.[0];

    return (
        <div className="min-h-screen bg-bg text-fg px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Link to="/my-profile" className="flex items-center gap-4 group">
                    <span className="w-14 h-14 rounded-2xl bg-brand/10 text-brand text-xl font-black flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-brand transition">
                        {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : (profile?.businessName || user?.name || 'V').charAt(0).toUpperCase()}
                    </span>
                    <span>
                        <span className="block text-2xl md:text-3xl font-black tracking-tight">
                            Welcome back, <span className="text-success">{user?.name?.split(' ')[0] || 'there'}</span>
                        </span>
                        <span className="block text-sm text-muted">
                            {profile?.businessName ? `${profile.businessName} · ` : ''}
                            {todo.length ? `${todo.length} thing${todo.length === 1 ? '' : 's'} need${todo.length === 1 ? 's' : ''} you` : 'You are all caught up'} · <span className="text-brand font-bold group-hover:underline">Manage profile</span>
                        </span>
                    </span>
                </Link>
                <div className="flex gap-2">
                    <Button variant="outline" icon={Plus} onClick={() => navigate('/services')}>Add package</Button>
                    <Button onClick={() => navigate('/leads')}>Open leads <ArrowRight size={16} /></Button>
                </div>
            </header>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="OPEN OFFERS" value={stats.open} icon={Inbox} tone="warning" subtext={stats.yourTurn ? `${stats.yourTurn} waiting on you` : 'Accept or counter'} onClick={() => setInsight('negotiating')} />
                <StatCard label="UPCOMING JOBS" value={stats.upcoming} icon={CheckCircle2} tone="success" subtext="Countdown and design brief" onClick={() => setInsight('confirmed')} />
                <StatCard label="REVENUE" value={formatCurrency(stats.revenue)} icon={DollarSign} tone="success" subtext={`${formatCurrency(stats.released)} released`} onClick={() => setInsight('committed')} />
                <StatCard label="RATING" value={profile?.reviewsCount ? profile.rating.toFixed(1) : 'New'} icon={Star} subtext={`${profile?.reviewsCount || 0} reviews · trust ${profile?.trustScore ?? 70}`} onClick={() => navigate('/my-profile?section=reviews')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <NextUp
                        to={nextJob && `/negotiate/${nextJob._id}`}
                        label="Your next job" title={nextJob && titleOf(nextJob)}
                        date={nextJob && formatDate(nextJob.eventDetails.date)} location={nextJob?.eventDetails?.location}
                        withName={nextJob?.customerId?.name} image={nextJob?.eventId?.image}
                        days={nextJob && daysUntil(nextJob.eventDetails.date)}
                        empty={(
                            <Panel className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold">No confirmed jobs yet</h2>
                                    <p className="text-sm text-muted">Packages and events with photos get more offers. Organizers can book your packages straight from their event planner.</p>
                                </div>
                                <Button icon={Plus} onClick={() => navigate('/my-events')}>Publish an event</Button>
                            </Panel>
                        )}
                    />

                    <Panel title="Your jobs" icon={Inbox} action={(
                        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter jobs">
                            {FILTERS.map(([k, l]) => (
                                <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                                    className={`text-xs font-bold rounded-full px-3 py-1 border ${filter === k ? 'bg-brand text-white border-brand' : 'border-border text-fg hover:border-brand/50'}`}>{l}</button>
                            ))}
                        </div>
                    )}>
                        {error ? (
                            <ErrorState message={error} onRetry={load} />
                        ) : shown.length === 0 ? (
                            filter === 'offers'
                                ? <EmptyState icon={Inbox} title="No open offers right now" description="When an organizer makes an offer on your events or packages, it appears here." action={{ label: 'Manage packages', to: '/services' }} />
                                : <p className="text-sm text-muted py-4 text-center">Nothing here. Try another filter.</p>
                        ) : (
                            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                                {shown.map((b) => {
                                    const st = BOOKING_STATUS[b.status] || { label: b.status, tone: 'neutral' };
                                    const last = b.negotiationHistory?.[b.negotiationHistory.length - 1];
                                    const yourTurn = OPEN.includes(b.status) && last && String(last.offeredBy?._id || last.offeredBy) !== myId;
                                    return (
                                        <li key={b._id}>
                                            <Link to={`/negotiate/${b._id}`} className="h-full p-3 rounded-2xl bg-surface-2 border border-border hover:border-brand/50 transition-colors flex items-center gap-3">
                                                {b.eventId?.image ? <img src={b.eventId.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" /> : <span className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><CalendarDays size={18} aria-hidden="true" /></span>}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold truncate">{titleOf(b)}</span>
                                                    <span className="block text-[11px] text-muted truncate">{b.customerId?.name || 'Organizer'} · {formatDate(b.eventDetails?.date)}</span>
                                                </span>
                                                <span className="text-right shrink-0 space-y-1">
                                                    <span className="block text-sm font-black text-success">{formatCurrency(b.offerPrice)}</span>
                                                    {yourTurn ? <Badge tone="warning">Your turn</Badge> : <Badge tone={st.tone}>{st.label}</Badge>}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {bookings.length > 0 && <Link to="/leads" className="block text-center text-sm font-bold text-brand hover:underline mt-3">Open all {bookings.length} jobs in Leads</Link>}
                    </Panel>
                </div>

                <aside className="space-y-6">
                    <AttentionList items={todo} />

                    <Panel title="Reputation" icon={ShieldCheck} action={<Link to="/my-profile?section=trust" className="text-xs font-bold text-brand">How it works</Link>}>
                        <div className="flex items-center gap-4">
                            <span className="w-16 h-16 rounded-2xl bg-success/10 text-success flex flex-col items-center justify-center shrink-0">
                                <span className="text-2xl font-black leading-none">{profile?.trustScore ?? 70}</span>
                                <span className="text-[9px] font-bold uppercase">trust</span>
                            </span>
                            <div className="space-y-1 min-w-0">
                                <StarRating value={profile?.rating || 0} size={14} showValue count={profile?.reviewsCount || 0} />
                                <p className="text-xs text-muted">{pStats.completedBookings || 0} events delivered</p>
                            </div>
                        </div>
                        <dl className="grid grid-cols-3 gap-2 mt-4 text-center">
                            {[[Users, pStats.followers ?? 0, 'Followers', '/my-profile?section=followers'], [Package, pStats.packages ?? 0, 'Packages', '/my-profile?section=packages'], [CalendarDays, pStats.events ?? 0, 'Events', '/my-profile?section=events']].map(([Icon, v, l, to]) => (
                                <Link key={l} to={to} className="bg-surface-2 rounded-xl py-2 hover:ring-1 hover:ring-brand/40">
                                    <dt className="text-[10px] text-muted font-bold uppercase flex items-center justify-center gap-1"><Icon size={11} aria-hidden="true" />{l}</dt>
                                    <dd className="text-base font-black text-fg">{v}</dd>
                                </Link>
                            ))}
                        </dl>
                    </Panel>

                    <Panel title="Your toolkit">
                        <QuickGrid items={TOOLKIT} />
                    </Panel>
                </aside>
            </div>

            {insight && <BookingInsight role="provider" kind={insight} bookings={bookings} myId={myId} onClose={() => setInsight(null)} onChanged={load} />}
        </div>
    );
}
