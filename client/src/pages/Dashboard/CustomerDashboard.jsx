import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, MessageSquare, CheckCircle2, DollarSign,
    ArrowUpRight, Store, Ticket, Sparkles
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import StatCard from '../../components/common/StatCard';
import HeroAIMatchmaker from '../../components/Dashboard/HeroAIMatchmaker';
import TimelineBoard from '../../components/Dashboard/TimelineBoard';
import {
    Button, Card, Badge, Skeleton, SkeletonList, EmptyState, ErrorState,
    formatCurrency, formatDate, BOOKING_STATUS
} from '../../components/ui';

const QUICK_ACTIONS = [
    { label: 'Browse events', desc: 'Find something to make an offer on', path: '/events', icon: Calendar },
    { label: 'Find a provider', desc: 'Search the vendor marketplace', path: '/vendors', icon: Store },
    { label: 'My tickets', desc: 'QR passes for confirmed events', path: '/tickets', icon: Ticket },
    { label: 'Budget tracker', desc: 'Plan and check your spend', path: '/budget-tracker', icon: Sparkles },
];

export default function CustomerDashboard({ user }) {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket } = useWebSockets();

    const fetchBookings = useCallback(async () => {
        setError(null);
        try {
            const res = await axios.get('/bookings/my');
            setBookings(res.data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your bookings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    useEffect(() => {
        if (!socket) return;
        const onNotification = () => fetchBookings();
        socket.on('notification', onNotification);
        return () => socket.off('notification', onNotification);
    }, [socket, fetchBookings]);

    const stats = useMemo(() => {
        const active = bookings.filter(b => ['pending', 'negotiating'].includes(b.status));
        const confirmed = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
        return {
            total: bookings.length,
            active: active.length,
            confirmed: confirmed.length,
            spend: confirmed.reduce((sum, b) => sum + (b.offerPrice || 0), 0),
        };
    }, [bookings]);

    // Feed the timeline with the soonest confirmed event.
    const nextEvent = useMemo(() => {
        const upcoming = bookings
            .filter(b => b.status === 'confirmed' && b.eventDetails?.date)
            .sort((a, b) => new Date(a.eventDetails.date) - new Date(b.eventDetails.date))[0];
        if (!upcoming) return null;
        return {
            title: upcoming.eventId?.title || upcoming.eventDetails.eventType,
            type: upcoming.eventDetails.eventType,
            date: upcoming.eventDetails.date,
        };
    }, [bookings]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg p-6 max-w-[1280px] mx-auto space-y-8">
                <Skeleton className="h-12 w-72" />
                <SkeletonList count={4} height="h-32" cols="md:grid-cols-4" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Badge tone="brand">My events</Badge>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        Welcome back, <span className="text-success">{user?.name?.split(' ')[0] || 'there'}</span>
                    </h1>
                    <p className="text-sm text-muted">
                        Make offers, negotiate prices, and keep track of your confirmed bookings.
                    </p>
                </div>
                <Button onClick={() => navigate('/events')}>
                    Browse events <ArrowUpRight size={16} />
                </Button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="TOTAL BOOKINGS" value={stats.total} icon={Calendar} />
                <StatCard label="IN NEGOTIATION" value={stats.active} icon={MessageSquare} tone="warning" />
                <StatCard label="CONFIRMED" value={stats.confirmed} icon={CheckCircle2} tone="success" />
                <StatCard label="TOTAL COMMITTED" value={formatCurrency(stats.spend)} icon={DollarSign} tone="success" />
            </div>

            <HeroAIMatchmaker />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-8 space-y-4" aria-labelledby="bookings-heading">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 id="bookings-heading" className="text-lg font-bold">Your bookings</h2>
                            {bookings.length > 0 && (
                                <Button size="sm" variant="ghost" onClick={() => navigate('/bookings')}>View all</Button>
                            )}
                        </div>

                        {error ? (
                            <ErrorState message={error} onRetry={fetchBookings} />
                        ) : bookings.length === 0 ? (
                            <EmptyState
                                icon={Calendar}
                                title="No bookings yet"
                                description="Find an event or a provider you like, then make an offer at the price that works for you. They can accept it or counter."
                                action={{ label: 'Explore events', to: '/events' }}
                            />
                        ) : (
                            <ul className="space-y-4">
                                {bookings.slice(0, 5).map(booking => {
                                    const status = BOOKING_STATUS[booking.status] || { label: booking.status, tone: 'neutral' };
                                    return (
                                        <li
                                            key={booking._id}
                                            className="p-4 rounded-2xl bg-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <h3 className="text-base font-bold truncate">
                                                    {booking.eventId?.title || booking.eventDetails?.eventType || 'Custom booking'}
                                                </h3>
                                                <p className="text-xs text-muted font-semibold truncate">
                                                    {booking.vendorId?.name || 'Provider'} · {booking.eventDetails?.location || '—'}
                                                </p>
                                                <p className="text-xs text-muted">{formatDate(booking.eventDetails?.date)}</p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                                <span className="text-lg font-black text-success">
                                                    {formatCurrency(booking.offerPrice)}
                                                </span>
                                                <Badge tone={status.tone}>{status.label}</Badge>
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/negotiate/${booking._id}`)}>
                                                    {['pending', 'negotiating'].includes(booking.status) ? 'Negotiate' : 'View'}
                                                </Button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </section>

                <aside className="lg:col-span-4 space-y-6">
                    {nextEvent && <TimelineBoard eventDetails={nextEvent} />}

                    <Card className="p-6 space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider">Quick actions</h2>
                        {QUICK_ACTIONS.map(({ label, desc, path, icon: Icon }) => (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="w-full p-3 rounded-xl bg-surface-2 hover:bg-border/60 text-left flex items-center gap-3 transition-colors group"
                            >
                                <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                                    <Icon size={16} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-xs font-bold truncate">{label}</span>
                                    <span className="block text-[11px] text-muted truncate">{desc}</span>
                                </span>
                                <ArrowUpRight size={14} className="text-muted group-hover:text-brand transition-colors shrink-0" aria-hidden="true" />
                            </button>
                        ))}
                    </Card>
                </aside>
            </div>
        </div>
    );
}
