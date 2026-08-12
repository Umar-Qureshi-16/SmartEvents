import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
    BarChart3, ShieldAlert, Gavel, Users, ScrollText, Activity,
    RefreshCw, AlertTriangle, DollarSign, UserCheck, Loader2
} from 'lucide-react';

import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';

import EnterpriseAnalytics from '../../components/SuperAdmin/EnterpriseAnalytics';
import FraudDetectionCenter from '../../components/SuperAdmin/FraudDetectionCenter';
import DisputeResolutionCenter from '../../components/SuperAdmin/DisputeResolutionCenter';
import ProviderGovernance from '../../components/SuperAdmin/ProviderGovernance';
import GlobalAuditLogs from '../../components/SuperAdmin/GlobalAuditLogs';
import SystemHealthMonitor from '../../components/SuperAdmin/SystemHealthMonitor';
import PlatformPulseFeed from '../../components/SuperAdmin/PlatformPulseFeed';

const TABS = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'fraud', label: 'Fraud', icon: ShieldAlert },
    { id: 'disputes', label: 'Disputes', icon: Gavel },
    { id: 'providers', label: 'Providers', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: ScrollText },
    { id: 'health', label: 'Health', icon: Activity },
];

const HEALTH_POLL_MS = 15000;
const MAX_SAMPLES = 20;

export default function SuperAdminDashboard({ user }) {
    const [tab, setTab] = useState('analytics');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const [stats, setStats] = useState({});
    const [series, setSeries] = useState([]);
    const [risks, setRisks] = useState([]);
    const [disputes, setDisputes] = useState([]);
    const [providers, setProviders] = useState([]);
    const [logs, setLogs] = useState([]);

    const [health, setHealth] = useState({});
    const [samples, setSamples] = useState([]);
    const [liveEvents, setLiveEvents] = useState([]);

    const { socket } = useWebSockets();
    const mounted = useRef(true);
    useEffect(() => () => { mounted.current = false; }, []);

    const loadAll = useCallback(async (showSpinner = true) => {
        if (showSpinner) setLoading(true);
        setError(null);
        try {
            const [s, rs, fr, dp, pv, lg] = await Promise.all([
                axios.get('/super-admin/stats'),
                axios.get('/super-admin/revenue-series'),
                axios.get('/super-admin/fraud-risks'),
                axios.get('/super-admin/disputes'),
                axios.get('/super-admin/providers'),
                axios.get('/super-admin/logs'),
            ]);
            if (!mounted.current) return;
            setStats(s.data.data || {});
            setSeries(rs.data.data || []);
            setRisks(fr.data.data || []);
            setDisputes(dp.data.data || []);
            setProviders(pv.data.data || []);
            setLogs(lg.data.data || []);
        } catch (err) {
            if (!mounted.current) return;
            setError(err.response?.data?.message || 'Could not load the governance console.');
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Poll health and record measured round-trip latency.
    useEffect(() => {
        let cancelled = false;

        const sample = async () => {
            const started = performance.now();
            try {
                const res = await axios.get('/health');
                const latencyMs = Math.round(performance.now() - started);
                if (cancelled || !mounted.current) return;
                setHealth({ ...res.data.data, latencyMs });
                setSamples(prev => [
                    ...prev,
                    { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), latency: latencyMs }
                ].slice(-MAX_SAMPLES));
            } catch {
                if (cancelled || !mounted.current) return;
                setHealth(h => ({ ...h, status: 'degraded', latencyMs: null }));
            }
        };

        sample();
        const id = setInterval(sample, HEALTH_POLL_MS);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    // Stream live notifications into the pulse feed.
    useEffect(() => {
        if (!socket) return;
        const onNotification = (data) => {
            setLiveEvents(prev => [{
                id: `${data.id || Date.now()}-${Math.random()}`,
                action: data.title || 'PLATFORM_EVENT',
                detail: data.message,
                actor: 'platform',
                severity: data.priority === 'high' ? 'warning' : 'info',
                at: data.createdAt || new Date().toISOString(),
            }, ...prev].slice(0, 50));
        };
        socket.on('notification', onNotification);
        return () => socket.off('notification', onNotification);
    }, [socket]);

    // Audit entries provide the historical backdrop for the live feed.
    const pulseEvents = useMemo(() => ([
        ...liveEvents,
        ...logs.map(l => ({
            id: l._id,
            action: l.action,
            detail: l.targetType,
            actor: l.actor?.name || 'system',
            severity: l.severity,
            at: l.createdAt,
        })),
    ]).slice(0, 60), [liveEvents, logs]);

    const govern = useCallback(async (userId, action, name) => {
        setBusyId(userId);
        try {
            const res = await axios.post('/super-admin/user-governance', { userId, action });
            toast.success(res.data.message || `${name} updated.`);
            await loadAll(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update that account.');
        } finally {
            setBusyId(null);
        }
    }, [loadAll]);

    const resolveDispute = useCallback(async (bookingId, resolution) => {
        setBusyId(bookingId);
        try {
            await axios.put(`/admin/bookings/${bookingId}/resolve-dispute`, { resolution });
            toast.success('Dispute resolved.');
            await loadAll(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not resolve the dispute.');
        } finally {
            setBusyId(null);
        }
    }, [loadAll]);

    const exportCsv = useCallback((rows) => {
        const csv = ['Month,Revenue,Bookings', ...rows.map(r => `${r.name},${r.revenue},${r.bookings}`)].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `smartevents-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Revenue exported.');
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-ink px-6 py-10">
                <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
                    <div className="h-10 w-72 bg-fg/5 rounded-xl" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-fg/5 rounded-3xl" />)}
                    </div>
                    <div className="h-14 bg-fg/5 rounded-2xl" />
                    <div className="h-[420px] bg-fg/5 rounded-3xl" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-ink flex flex-col items-center justify-center gap-4 px-6 text-center">
                <AlertTriangle size={48} className="text-rose-400" />
                <h2 className="text-xl font-bold text-fg">Governance console unavailable</h2>
                <p className="text-sm text-muted max-w-md">{error}</p>
                <button
                    onClick={() => loadAll()}
                    className="px-5 py-3 rounded-xl bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                    <RefreshCw size={14} /> Retry
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-ink text-fg px-4 sm:px-6 py-10">
            <div className="max-w-7xl mx-auto space-y-8">

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            Platform Governance
                        </p>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-1">
                            Welcome back, {user?.name?.split(' ')[0] || 'Administrator'}
                        </h1>
                        <p className="text-sm text-muted mt-1">
                            Oversight across users, revenue, risk, and disputes.
                        </p>
                    </div>
                    <button
                        onClick={() => loadAll()}
                        className="px-4 py-2.5 rounded-xl bg-fg/5 border border-border text-xs font-bold uppercase tracking-widest hover:bg-surface/10 transition-all flex items-center gap-2 w-fit"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </header>

                <section aria-label="Platform summary" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Kpi icon={Users} label="Total Users" value={(stats.totalUsers ?? 0).toLocaleString()}
                         sub={`${stats.providers ?? 0} providers · ${stats.customers ?? 0} customers`} />
                    <Kpi icon={DollarSign} label="Gross Revenue" value={`$${(stats.revenue ?? 0).toLocaleString()}`}
                         sub={`${stats.closedDeals ?? 0} closed deals`} tone="text-emerald-400" />
                    <Kpi icon={UserCheck} label="Active Bookings" value={(stats.activeBookings ?? 0).toLocaleString()}
                         sub="pending, negotiating, confirmed" />
                    <Kpi icon={AlertTriangle} label="Open Disputes" value={(stats.disputes ?? 0).toLocaleString()}
                         sub={`${stats.bannedUsers ?? 0} suspended accounts`}
                         tone={stats.disputes > 0 ? 'text-amber-400' : 'text-muted'} />
                </section>

                <nav aria-label="Console sections" className="flex gap-2 overflow-x-auto pb-1">
                    {TABS.map(({ id, label, icon: Icon }) => {
                        const active = tab === id;
                        const badge = id === 'disputes' ? disputes.length
                            : id === 'fraud' ? risks.filter(r => ['HIGH', 'CRITICAL'].includes(r.classification)).length
                            : 0;
                        return (
                            <button
                                key={id}
                                onClick={() => setTab(id)}
                                aria-current={active ? 'page' : undefined}
                                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap flex items-center gap-2 transition-all border ${
                                    active
                                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20'
                                        : 'bg-fg/5 text-muted border-border hover:bg-surface/10 hover:text-white'
                                }`}
                            >
                                <Icon size={14} /> {label}
                                {badge > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[9px] font-black">
                                        {badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                    {tab === 'analytics' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <EnterpriseAnalytics series={series} stats={stats} onExport={exportCsv} />
                            </div>
                            <PlatformPulseFeed events={pulseEvents} connected={Boolean(socket?.connected)} />
                        </div>
                    )}
                    {tab === 'fraud' && <FraudDetectionCenter risks={risks} onGovern={govern} busyId={busyId} />}
                    {tab === 'disputes' && <DisputeResolutionCenter disputes={disputes} onResolve={resolveDispute} busyId={busyId} />}
                    {tab === 'providers' && <ProviderGovernance providers={providers} onGovern={govern} busyId={busyId} />}
                    {tab === 'audit' && <GlobalAuditLogs logs={logs} />}
                    {tab === 'health' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2">
                                <SystemHealthMonitor health={health} samples={samples} />
                            </div>
                            <PlatformPulseFeed events={pulseEvents} connected={Boolean(socket?.connected)} />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

const Kpi = ({ icon: Icon, label, value, sub, tone = 'text-white' }) => (
    <div className="glass p-5 rounded-3xl border-border space-y-2">
        <div className="flex items-center gap-2 text-muted">
            <Icon size={14} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className={`text-2xl font-black ${tone}`}>{value}</p>
        <p className="text-[10px] text-muted">{sub}</p>
    </div>
);
