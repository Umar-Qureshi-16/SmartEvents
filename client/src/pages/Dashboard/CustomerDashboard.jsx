import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    AlertCircle, ArrowRight, ArrowUpRight, Calendar, CalendarCheck, CheckCircle2, DollarSign, Heart, MapPin,
    MessageSquare, Sparkles, Star, Store, Ticket, UserCircle,
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import StatCard from '../../components/common/StatCard';
import BudgetPlanner from '../../components/planner/BudgetPlanner';
import TimelineBoard from '../../components/Dashboard/TimelineBoard';
import BookingInsight from '../../components/Dashboard/BookingInsight';
import StarRating from '../../components/reviews/StarRating';
import { AttentionList, NextUp, Panel, QuickGrid } from '../../components/Dashboard/DashboardBits';
import {
    Badge, Button, Card, EmptyState, ErrorState, Skeleton, SkeletonList,
    formatCurrency, formatDateRange, BOOKING_STATUS } from '../../components/ui';

const DAY = 86400000;
const QUICK_ACTIONS = [
    { label: 'Event planner', desc: 'Tasks and vendor packages, step by step', path: '/planner', icon: CalendarCheck },
    { label: 'Browse events', desc: 'Find something to make an offer on', path: '/events', icon: Calendar },
    { label: 'Find a vendor', desc: 'Profiles, packages and reviews', path: '/vendors', icon: Store },
    { label: 'My tickets', desc: 'QR passes for confirmed events', path: '/tickets', icon: Ticket },
    { label: 'Budget tracker', desc: 'Split and check your spend', path: '/budget-tracker', icon: DollarSign },
    { label: 'My profile', desc: 'Plans, following, reviews', path: '/me', icon: UserCircle },
];
const FILTERS = [['all', 'All'], ['active', 'In negotiation'], ['confirmed', 'Confirmed'], ['completed', 'Completed']];

const titleOf = (b) => b.eventId?.title || b.serviceId?.title || b.designConcepts?.find((c) => c.selected)?.title || b.eventDetails?.eventType || 'Custom booking';
const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);

export default function CustomerDashboard({ user }) {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [insight, setInsight] = useState(null); // which number's detail panel is open
    const { socket } = useWebSockets();
    const myId = String(user?._id || user?.id || '');

    const load = useCallback(async () => {
        setError(null);
        try {
            const [b, p] = await Promise.all([
                axios.get('/bookings/my'),
                axios.get('/organizers/me').catch(() => null),
            ]);
            setBookings(b.data.data || []);
            setMe(p?.data?.data || null);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your bookings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!socket) return undefined;
        const refresh = () => load();
        socket.on('notification', refresh);
        return () => socket.off('notification', refresh);
    }, [socket, load]);

    const stats = useMemo(() => {
        const active = bookings.filter((b) => ['pending', 'negotiating'].includes(b.status));
        const booked = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));
        return {
            total: bookings.length,
            active: active.length,
            confirmed: bookings.filter((b) => b.status === 'confirmed').length,
            spend: booked.reduce((sum, b) => sum + (b.offerPrice || 0), 0),
        };
    }, [bookings]);

    const nextEvent = useMemo(() => bookings
        .filter((b) => b.status === 'confirmed' && b.eventDetails?.date && daysUntil(b.eventDetails.date) >= 0)
        .sort((a, b) => new Date(a.eventDetails.date) - new Date(b.eventDetails.date))[0] || null, [bookings]);

    // Things only the organizer can move forward.
    const todo = useMemo(() => {
        const items = [];
        const reviewedEvents = new Set((me?.reviews || []).map((r) => String(r.event?._id)));
        for (const b of bookings) {
            const last = b.negotiationHistory?.[b.negotiationHistory.length - 1];
            const vendor = b.vendorId?.name || 'The vendor';
            if (['pending', 'negotiating'].includes(b.status) && last && String(last.offeredBy?._id || last.offeredBy) !== myId) {
                items.push({ key: `c${b._id}`, tone: 'warning', icon: MessageSquare, text: `${vendor} countered at ${formatCurrency(last.price)} for ${titleOf(b)}`, cta: 'Reply', to: `/negotiate/${b._id}` });
            }
            if (b.status === 'confirmed' && b.eventDetails?.date && daysUntil(b.eventDetails.date) < 0) {
                items.push({ key: `d${b._id}`, tone: 'brand', icon: CheckCircle2, text: `${titleOf(b)} has taken place. Mark it complete to release payment.`, cta: 'Complete', to: '/bookings?status=confirmed' });
            }
            if (b.status === 'completed' && b.eventId?._id && !reviewedEvents.has(String(b.eventId._id))) {
                items.push({ key: `r${b._id}`, tone: 'success', icon: Star, text: `How was ${vendor}? Rate ${titleOf(b)}.`, cta: 'Review', to: `/vendor/${b.vendorId?._id || b.vendorId}#reviews` });
            }
        }
        if (me && (!me.user.avatar || !me.user.city)) {
            items.push({ key: 'profile', tone: 'brand', icon: UserCircle, text: 'Add a photo and your city. Vendors see your profile when you send an offer.', cta: 'Profile', to: '/me' });
        }
        return items.slice(0, 6);
    }, [bookings, me, myId]);

    const shown = useMemo(() => bookings.filter((b) => (
        filter === 'all' ? true : filter === 'active' ? ['pending', 'negotiating'].includes(b.status) : b.status === filter
    )).slice(0, 6), [bookings, filter]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg p-6 max-w-[1440px] mx-auto space-y-8">
                <Skeleton className="h-12 w-72" />
                <SkeletonList count={4} height="h-32" cols="md:grid-cols-4" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-fg px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Link to="/me" className="flex items-center gap-4 group">
                    <span className="w-14 h-14 rounded-full bg-brand/10 text-brand text-xl font-black flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-brand transition">
                        {me?.user?.avatar ? <img src={me.user.avatar} alt="" className="w-full h-full object-cover" /> : (user?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                    <span>
                        <span className="block text-2xl md:text-3xl font-black tracking-tight">
                            Welcome back, <span className="text-success">{user?.name?.split(' ')[0] || 'there'}</span>
                        </span>
                        <span className="block text-sm text-muted">
                            {todo.length ? `${todo.length} thing${todo.length === 1 ? '' : 's'} need${todo.length === 1 ? 's' : ''} you` : 'You are all caught up'} · <span className="text-brand font-bold group-hover:underline">View my profile</span>
                        </span>
                    </span>
                </Link>
                <div className="flex gap-2">
                    <Button variant="outline" icon={CalendarCheck} onClick={() => navigate('/planner')}>Plan an event</Button>
                    <Button onClick={() => navigate('/events')}>Browse events <ArrowUpRight size={16} /></Button>
                </div>
            </header>

            {/* Every number opens its own overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="TOTAL BOOKINGS" value={stats.total} icon={Calendar} subtext="Tap for the overview" onClick={() => setInsight('all')} />
                <StatCard label="IN NEGOTIATION" value={stats.active} icon={MessageSquare} tone="warning" subtext="Reply, accept or counter" onClick={() => setInsight('negotiating')} />
                <StatCard label="CONFIRMED" value={stats.confirmed} icon={CheckCircle2} tone="success" subtext="Countdown and next steps" onClick={() => setInsight('confirmed')} />
                <StatCard label="TOTAL COMMITTED" value={formatCurrency(stats.spend)} icon={DollarSign} tone="success" subtext="Escrow and by vendor" onClick={() => setInsight('committed')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Main column */}
                <div className="lg:col-span-2 space-y-6">
                    <NextUp
                        to={nextEvent && `/negotiate/${nextEvent._id}`}
                        label="Your next event" title={nextEvent && titleOf(nextEvent)}
                        date={nextEvent && formatDateRange(nextEvent.eventDetails.date, nextEvent.eventDetails.endDate)} location={nextEvent?.eventDetails?.location}
                        withName={nextEvent?.vendorId?.name} image={nextEvent?.eventId?.image}
                        days={nextEvent && daysUntil(nextEvent.eventDetails.date)}
                        empty={(
                            <Panel className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold">No confirmed event yet</h2>
                                    <p className="text-sm text-muted">Start a plan and Smartie lists every step with vendor packages, or browse events to make an offer.</p>
                                </div>
                                <Button icon={Sparkles} onClick={() => navigate('/planner')}>Start a plan</Button>
                            </Panel>
                        )}
                    />

                    <Panel title="Your bookings" icon={Calendar} action={(
                        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter bookings">
                            {FILTERS.map(([k, l]) => (
                                <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                                    className={`text-xs font-bold rounded-full px-3 py-1 border ${filter === k ? 'bg-brand text-white border-brand' : 'border-border text-fg hover:border-brand/50'}`}>{l}</button>
                            ))}
                        </div>
                    )}>
                        {error ? (
                            <ErrorState message={error} onRetry={load} />
                        ) : bookings.length === 0 ? (
                            <EmptyState icon={Calendar} title="No bookings yet"
                                description="Find an event or a vendor you like, then make an offer at the price that works for you."
                                action={{ label: 'Explore events', to: '/events' }} />
                        ) : shown.length === 0 ? (
                            <p className="text-sm text-muted py-4 text-center">Nothing here. Try another filter.</p>
                        ) : (
                            <ul className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
                                {shown.map((b) => {
                                    const status = BOOKING_STATUS[b.status] || { label: b.status, tone: 'neutral' };
                                    return (
                                        <li key={b._id}>
                                            <Link to={`/negotiate/${b._id}`} className="h-full p-3 rounded-2xl bg-surface-2 border border-border hover:border-brand/50 transition-colors flex items-center gap-3">
                                                {b.eventId?.image ? <img src={b.eventId.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" loading="lazy" /> : <span className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Calendar size={18} aria-hidden="true" /></span>}
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-bold truncate">{titleOf(b)}</span>
                                                    <span className="block text-[11px] text-muted truncate">{b.vendorId?.name || 'Vendor'} · {formatDateRange(b.eventDetails?.date, b.eventDetails?.endDate)}</span>
                                                </span>
                                                <span className="text-right shrink-0 space-y-1">
                                                    <span className="block text-sm font-black text-success">{formatCurrency(b.offerPrice)}</span>
                                                    <Badge tone={status.tone}>{status.label}</Badge>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {bookings.length > 0 && <Link to="/bookings" className="block text-center text-sm font-bold text-brand hover:underline mt-3">Open all {bookings.length} bookings</Link>}
                    </Panel>

                    <BudgetPlanner compact />
                </div>

                {/* Side column */}
                <aside className="space-y-6">
                    <AttentionList items={todo} />
                    <TimelineBoard nextBooking={nextEvent} />
                    <Panel title="Following" icon={Heart} action={<Link to="/me?tab=following" className="text-xs font-bold text-brand">See all</Link>}>
                        {(me?.following || []).length === 0 ? (
                            <p className="text-xs text-muted">Follow vendors you like to keep them one click away. <Link to="/vendors" className="text-brand font-bold">Find vendors</Link></p>
                        ) : (
                            <ul className="space-y-1">
                                {me.following.slice(0, 3).map((v) => (
                                    <li key={v.userId}>
                                        <Link to={`/vendor/${v.userId}`} className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-surface-2">
                                            <span className="w-9 h-9 rounded-lg bg-brand/10 text-brand font-black flex items-center justify-center overflow-hidden shrink-0">
                                                {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover" /> : v.businessName.charAt(0)}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-bold truncate">{v.businessName}</span>
                                                <StarRating value={v.rating} size={10} showValue count={v.reviewsCount} />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>
                    <Panel title="Quick actions">
                        <QuickGrid items={QUICK_ACTIONS} />
                    </Panel>
                </aside>
            </div>

            {insight && <BookingInsight kind={insight} bookings={bookings} myId={myId} onClose={() => setInsight(null)} onChanged={load} />}
        </div>
    );
}
