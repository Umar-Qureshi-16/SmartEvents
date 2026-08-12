import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, Calendar, ArrowRight, TrendingUp, Package,
    CalendarDays, Images, Star, Inbox
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import StatCard from '../../components/common/StatCard';
import TrustScoreWidget from '../../components/Dashboard/TrustScoreWidget';
import {
    Button, Card, Badge, SkeletonList, Skeleton, EmptyState, ErrorState,
    formatCurrency, formatDate, BOOKING_STATUS
} from '../../components/ui';

const TOOLKIT = [
    { label: 'Service packages', desc: 'Manage your offerings and pricing', path: '/services', icon: Package },
    { label: 'Portfolio', desc: 'Showcase your past work', path: '/portfolio', icon: Images },
    { label: 'Availability', desc: 'Block dates you cannot take', path: '/calendar', icon: CalendarDays },
    { label: 'Reviews', desc: 'Feedback across your events', path: '/reviews', icon: Star },
];

export default function ProviderDashboard({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const { socket } = useWebSockets();

    const fetchDashboardData = useCallback(async () => {
        setError(null);
        try {
            const res = await axios.get('/bookings/organizer/dashboard');
            setData(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your dashboard.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    // Refresh when a new offer or counter arrives.
    useEffect(() => {
        if (!socket) return;
        const onNotification = () => fetchDashboardData();
        socket.on('notification', onNotification);
        return () => socket.off('notification', onNotification);
    }, [socket, fetchDashboardData]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg p-6 max-w-[1280px] mx-auto space-y-8">
                <Skeleton className="h-12 w-72" />
                <SkeletonList count={4} height="h-32" cols="md:grid-cols-4" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-bg p-6 max-w-[1280px] mx-auto pt-10">
                <ErrorState message={error} onRetry={fetchDashboardData} />
            </div>
        );
    }

    const leads = data?.leads || [];
    const analytics = data?.analytics || { totalEarnings: 0, totalBookingsCount: 0 };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Badge tone="brand">Provider hub</Badge>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">
                        Welcome back, <span className="text-success">{user?.name?.split(' ')[0] || 'there'}</span>
                    </h1>
                    <p className="text-sm text-muted">
                        Respond to incoming offers, negotiate prices, and manage your services.
                    </p>
                </div>
                <Button onClick={() => navigate('/leads')}>
                    View all leads <ArrowRight size={16} />
                </Button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="OPEN LEADS" value={leads.length} icon={Inbox} tone="warning" />
                <StatCard label="CONFIRMED BOOKINGS" value={analytics.totalBookingsCount} icon={TrendingUp} tone="success" />
                <StatCard label="TOTAL REVENUE" value={formatCurrency(analytics.totalEarnings)} icon={DollarSign} tone="success" />
                <StatCard label="TRUST SCORE" value={user?.trustScore ?? '—'} icon={Star} tone="brand"
                          subtext="out of 100" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <section className="lg:col-span-8 space-y-4" aria-labelledby="leads-heading">
                    <Card className="p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h2 id="leads-heading" className="text-lg font-bold">Offers awaiting your response</h2>
                            {leads.length > 0 && <Badge tone="warning">{leads.length} open</Badge>}
                        </div>

                        {leads.length === 0 ? (
                            <EmptyState
                                icon={Inbox}
                                title="No open offers right now"
                                description="When a customer makes an offer on one of your services, it will appear here for you to accept, counter, or decline."
                                action={{ label: 'Manage your services', to: '/services' }}
                            />
                        ) : (
                            <ul className="space-y-4">
                                {leads.map(lead => {
                                    const status = BOOKING_STATUS[lead.status] || { label: lead.status, tone: 'neutral' };
                                    return (
                                        <li
                                            key={lead._id}
                                            className="p-4 rounded-2xl bg-surface-2 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="space-y-1 min-w-0">
                                                <h3 className="text-base font-bold truncate">
                                                    {lead.eventId?.title || lead.eventDetails?.eventType || 'Custom request'}
                                                </h3>
                                                <p className="text-xs text-muted font-semibold">
                                                    From {lead.customerId?.name || 'a customer'}
                                                    {lead.customerId?.trustScore != null && ` · trust ${lead.customerId.trustScore}`}
                                                </p>
                                                <p className="text-xs text-muted">
                                                    {lead.eventDetails?.location || '—'} · {formatDate(lead.eventDetails?.date)}
                                                </p>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2 shrink-0">
                                                <span className="text-lg font-black text-success">
                                                    {formatCurrency(lead.offerPrice)}
                                                </span>
                                                <Badge tone={status.tone}>{status.label}</Badge>
                                                <Button size="sm" variant="outline" onClick={() => navigate(`/negotiate/${lead._id}`)}>
                                                    Respond
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
                    <TrustScoreWidget score={user?.trustScore ?? 70} analytics={user?.analytics || {}} />

                    <Card className="p-6 space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider">Your toolkit</h2>
                        {TOOLKIT.map(({ label, desc, path, icon: Icon }) => (
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
                                <ArrowRight size={14} className="text-muted group-hover:text-brand transition-colors shrink-0" aria-hidden="true" />
                            </button>
                        ))}
                    </Card>
                </aside>
            </div>
        </div>
    );
}
