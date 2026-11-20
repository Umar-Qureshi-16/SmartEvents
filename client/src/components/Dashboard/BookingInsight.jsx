import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowRight, Calendar, CheckCircle2, Clock, DollarSign, MessageSquare, Palette, Ticket, X,
} from 'lucide-react';
import axios from '../../api/axios';
import { Badge, formatCurrency, formatDateRange, BOOKING_STATUS } from '../ui';

const DAY = 86400000;
const titleOf = (b) => b.eventId?.title || b.serviceId?.title || b.designConcepts?.find((c) => c.selected)?.title || b.eventDetails?.eventType || 'Custom booking';
const daysUntil = (d) => Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / DAY);
const lastMove = (b) => b.negotiationHistory?.[b.negotiationHistory.length - 1];
const isMine = (entry, myId) => entry && String(entry.offeredBy?._id || entry.offeredBy) === myId;
// The other party: the vendor for an organizer, the organizer for a vendor.
const otherOf = (b, role) => (role === 'provider' ? b.customerId : b.vendorId);

const META = {
    all: { title: 'All bookings', icon: Calendar, tone: 'bg-brand/10 text-brand' },
    negotiating: { title: 'In negotiation', icon: MessageSquare, tone: 'bg-warning/10 text-warning' },
    confirmed: { title: 'Confirmed', icon: CheckCircle2, tone: 'bg-success/10 text-success' },
    committed: { title: 'Money committed', icon: DollarSign, tone: 'bg-success/10 text-success' },
};

function Row({ b, children, right, role }) {
    return (
        <li className="bg-surface-2 border border-border rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-3">
                {b.eventId?.image
                    ? <img src={b.eventId.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    : <span className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Calendar size={18} aria-hidden="true" /></span>}
                <Link to={`/negotiate/${b._id}`} className="min-w-0 flex-1 group">
                    <span className="block text-sm font-bold text-fg truncate group-hover:text-brand">{titleOf(b)}</span>
                    <span className="block text-[11px] text-muted truncate">{otherOf(b, role)?.name || (role === 'provider' ? 'Organizer' : 'Vendor')} · {formatDateRange(b.eventDetails?.date, b.eventDetails?.endDate)}</span>
                </Link>
                {right}
            </div>
            {children}
        </li>
    );
}

function Bars({ rows, onPick, active }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <ul className="space-y-2">
            {rows.map((r) => (
                <li key={r.key}>
                    <button type="button" onClick={() => onPick?.(r.key)} aria-pressed={active === r.key}
                        className={`w-full text-left rounded-xl px-2 py-1.5 ${onPick ? 'hover:bg-surface-2' : ''} ${active === r.key ? 'bg-surface-2' : ''}`}>
                        <span className="flex justify-between text-xs font-bold text-fg mb-1"><span>{r.label}</span><span>{r.display ?? r.value}</span></span>
                        <span className="block h-2 rounded-full bg-surface-2 overflow-hidden"><span className={`block h-full rounded-full ${r.color || 'bg-brand'}`} style={{ width: `${(r.value / max) * 100}%` }} /></span>
                    </button>
                </li>
            ))}
        </ul>
    );
}

function Negotiation({ b, myId, onChanged, role }) {
    const last = lastMove(b);
    const myTurn = last && !isMine(last, myId);
    const mine = [...(b.negotiationHistory || [])].reverse().find((h) => isMine(h, myId));
    const theirs = [...(b.negotiationHistory || [])].reverse().find((h) => h.offeredBy && !isMine(h, myId));
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState(null);

    const act = async (kind) => {
        setBusy(kind);
        try {
            if (kind === 'accept') await axios.put(`/bookings/${b._id}/accept`);
            if (kind === 'counter') {
                if (!(Number(price) > 0)) { toast.error('Enter your counter price.'); setBusy(null); return; }
                await axios.post(`/bookings/${b._id}/negotiate`, { price: Number(price), message: `Counter offer of ${formatCurrency(Number(price))}` });
            }
            toast.success(kind === 'accept' ? 'Accepted. The booking is confirmed.' : 'Counter offer sent.');
            setPrice('');
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'That did not work.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <Row b={b} role={role} right={<Badge tone={myTurn ? 'warning' : 'neutral'}>{myTurn ? 'Your turn' : 'Waiting'}</Badge>}>
            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-surface border border-border rounded-xl py-1.5">
                    <p className="text-[10px] text-muted font-bold uppercase">Your offer</p>
                    <p className="text-sm font-black text-fg">{mine ? formatCurrency(mine.price) : '—'}</p>
                </div>
                <div className="bg-surface border border-border rounded-xl py-1.5">
                    <p className="text-[10px] text-muted font-bold uppercase">Their price</p>
                    <p className="text-sm font-black text-fg">{theirs ? formatCurrency(theirs.price) : 'No reply yet'}</p>
                </div>
            </div>
            {myTurn ? (
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => act('accept')} disabled={!!busy} className="flex-1 min-w-[120px] bg-success hover:opacity-90 text-white text-xs font-bold rounded-xl py-2 disabled:opacity-50">
                        {busy === 'accept' ? 'Accepting…' : `Accept ${formatCurrency(last.price)}`}
                    </button>
                    <label htmlFor={`ct-${b._id}`} className="sr-only">Counter price</label>
                    <input id={`ct-${b._id}`} type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Counter price"
                        className="w-28 bg-surface border border-border rounded-xl px-2.5 text-xs text-fg" />
                    <button onClick={() => act('counter')} disabled={!!busy} className="border border-border text-fg hover:bg-fg/5 text-xs font-bold rounded-xl px-3 py-2 disabled:opacity-50">
                        {busy === 'counter' ? 'Sending…' : 'Counter'}
                    </button>
                </div>
            ) : (
                <p className="text-[11px] text-muted flex items-center gap-1"><Clock size={11} aria-hidden="true" />Waiting for {otherOf(b, role)?.name || 'the other side'} to reply. <Link to={`/negotiate/${b._id}`} className="text-brand font-bold">Open the thread</Link></p>
            )}
        </Row>
    );
}

function Confirmed({ b, onChanged, role }) {
    const navigate = useNavigate();
    const d = daysUntil(b.eventDetails?.date);
    const [busy, setBusy] = useState(false);
    const complete = async () => {
        setBusy(true);
        try {
            await axios.put(`/bookings/${b._id}/complete`);
            toast.success('Marked complete. Payment released to the vendor.');
            onChanged();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not complete.');
        } finally {
            setBusy(false);
        }
    };
    return (
        <Row b={b} role={role} right={
            <span className="text-center shrink-0">
                <span className={`block text-lg font-black leading-none ${d < 0 ? 'text-warning' : 'text-fg'}`}>{d < 0 ? 'Done?' : d}</span>
                <span className="block text-[10px] text-muted font-bold uppercase">{d < 0 ? 'event passed' : d === 1 ? 'day left' : 'days left'}</span>
            </span>
        }>
            <p className="text-[11px] text-muted">
                {formatCurrency(b.offerPrice)} · {b.escrow?.status === 'held' ? (role === 'provider' ? 'held in escrow, released when the organizer marks it complete' : 'held in escrow until you mark it complete') : 'agreed'} · {b.eventDetails?.location}
            </p>
            <div className="flex flex-wrap gap-2">
                {d < 0 && role !== 'provider' && <button onClick={complete} disabled={busy} className="bg-success hover:opacity-90 text-white text-xs font-bold rounded-xl px-3 py-2 disabled:opacity-50">{busy ? 'Completing…' : 'Mark complete'}</button>}
                <button onClick={() => navigate(`/negotiate/${b._id}?view=design`)} className="inline-flex items-center gap-1 border border-border text-fg hover:bg-fg/5 text-xs font-bold rounded-xl px-3 py-2"><Palette size={12} aria-hidden="true" />Design Studio</button>
                {role !== 'provider' && <button onClick={() => navigate('/tickets')} className="inline-flex items-center gap-1 border border-border text-fg hover:bg-fg/5 text-xs font-bold rounded-xl px-3 py-2"><Ticket size={12} aria-hidden="true" />Entry pass</button>}
                <button onClick={() => navigate(`/negotiate/${b._id}`)} className="inline-flex items-center gap-1 text-brand text-xs font-bold px-2 py-2">Open<ArrowRight size={12} aria-hidden="true" /></button>
            </div>
        </Row>
    );
}

/**
 * The detail behind one dashboard number, opened in place: an overview at the
 * top, then the bookings it counts with the actions that move them forward.
 */
export default function BookingInsight({ kind, bookings, myId, onClose, onChanged, role = 'customer' }) {
    const navigate = useNavigate();
    const [pick, setPick] = useState(null);
    useEffect(() => {
        const key = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);

    const { icon: Icon, tone } = META[kind];
    const title = role === 'provider' && kind === 'committed' ? 'Revenue' : role === 'provider' && kind === 'all' ? 'All jobs' : META[kind].title;

    const view = useMemo(() => {
        const by = (statuses) => bookings.filter((b) => statuses.includes(b.status));
        if (kind === 'all') {
            const order = ['pending', 'negotiating', 'confirmed', 'completed', 'disputed', 'cancelled', 'rejected'];
            const rows = order.map((s) => ({ key: s, label: BOOKING_STATUS[s]?.label || s, value: by([s]).length }))
                .filter((r) => r.value > 0);
            const list = pick ? by([pick]) : bookings;
            return {
                summary: [[role === 'provider' ? 'Jobs' : 'Bookings', bookings.length], [role === 'provider' ? 'Organizers' : 'Vendors', new Set(bookings.map((b) => String(otherOf(b, role)?._id || otherOf(b, role)))).size], ['Value', formatCurrency(bookings.reduce((t, b) => t + (b.offerPrice || 0), 0))]],
                bars: rows, list,
            };
        }
        if (kind === 'negotiating') {
            const list = by(['pending', 'negotiating']);
            const yourTurn = list.filter((b) => { const l = lastMove(b); return l && !isMine(l, myId); });
            return {
                summary: [['Open offers', list.length], ['Your turn', yourTurn.length], [role === 'provider' ? 'Waiting on organizer' : 'Waiting on vendor', list.length - yourTurn.length]],
                list: [...yourTurn, ...list.filter((b) => !yourTurn.includes(b))],
            };
        }
        if (kind === 'confirmed') {
            const list = by(['confirmed']).sort((a, b) => new Date(a.eventDetails?.date) - new Date(b.eventDetails?.date));
            const soon = list.filter((b) => { const d = daysUntil(b.eventDetails?.date); return d >= 0 && d <= 30; }).length;
            return {
                summary: [['Confirmed', list.length], ['In the next 30 days', soon], ['Held in escrow', formatCurrency(list.filter((b) => b.escrow?.status === 'held').reduce((t, b) => t + (b.offerPrice || 0), 0))]],
                list,
            };
        }
        // committed
        const list = by(['confirmed', 'completed']);
        const sum = (f) => list.filter(f).reduce((t, b) => t + (b.offerPrice || 0), 0);
        const vendors = {};
        list.forEach((b) => { const n = otherOf(b, role)?.name || (role === 'provider' ? 'Organizer' : 'Vendor'); vendors[n] = (vendors[n] || 0) + (b.offerPrice || 0); });
        return {
            summary: [['Total', formatCurrency(sum(() => true))], ['Held in escrow', formatCurrency(sum((b) => b.escrow?.status === 'held'))], ['Released', formatCurrency(sum((b) => b.escrow?.status === 'released' || b.status === 'completed'))]],
            bars: Object.entries(vendors).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: k, value: v, display: formatCurrency(v), color: 'bg-success' })),
            list,
        };
    }, [kind, bookings, myId, pick, role]);

    const link = role === 'provider'
        ? { all: '/leads', negotiating: '/leads', confirmed: '/leads', committed: '/revenue' }[kind]
        : { all: '/bookings', negotiating: '/bookings?status=negotiating', confirmed: '/bookings?status=confirmed', committed: '/me?tab=spending' }[kind];

    return createPortal(
        // Centred over the dashboard (a sheet from the bottom on phones). It used to be
        // pinned to the right edge, which on wide screens put it far from the content.
        <div className="fixed inset-0 z-[95] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6" onClick={onClose}>
            <aside role="dialog" aria-modal="true" aria-labelledby="insight-h" onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] bg-bg border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-[insight-in_160ms_ease-out]">
                <header className="flex items-center justify-between gap-3 p-5 border-b border-border bg-surface">
                    <h2 id="insight-h" className="text-base font-black text-fg flex items-center gap-2">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon size={17} aria-hidden="true" /></span>{title}
                    </h2>
                    <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg"><X size={20} /></button>
                </header>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <dl className="grid grid-cols-3 gap-2">
                        {view.summary.map(([k, v]) => (
                            <div key={k} className="bg-surface border border-border rounded-2xl p-3 text-center">
                                <dt className="text-[10px] text-muted font-bold uppercase leading-tight">{k}</dt>
                                <dd className="text-base font-black text-fg mt-1 truncate">{v}</dd>
                            </div>
                        ))}
                    </dl>

                    {view.bars?.length > 0 && (
                        <section className="bg-surface border border-border rounded-2xl p-3">
                            <h3 className="text-xs font-black text-fg uppercase tracking-wider px-2 mb-1">{kind === 'committed' ? (role === 'provider' ? 'By organizer' : 'By vendor') : 'By status'}{kind === 'all' && <span className="text-muted font-semibold normal-case tracking-normal"> · tap to filter</span>}</h3>
                            <Bars rows={view.bars} active={pick} onPick={kind === 'all' ? (k) => setPick((p) => (p === k ? null : k)) : undefined} />
                        </section>
                    )}

                    {view.list.length === 0 ? (
                        <div className="text-center py-8 space-y-3">
                            <p className="text-sm text-muted">Nothing here yet.</p>
                            <button onClick={() => navigate(role === 'provider' ? '/services' : kind === 'negotiating' || kind === 'all' ? '/events' : '/planner')} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2">
                                {role === 'provider' ? 'Manage packages' : kind === 'negotiating' || kind === 'all' ? 'Browse events' : 'Start a plan'}
                            </button>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {view.list.map((b) => {
                                if (kind === 'negotiating') return <Negotiation key={b._id} b={b} myId={myId} onChanged={onChanged} role={role} />;
                                if (kind === 'confirmed') return <Confirmed key={b._id} b={b} onChanged={onChanged} role={role} />;
                                const st = BOOKING_STATUS[b.status] || { label: b.status, tone: 'neutral' };
                                return (
                                    <Row key={b._id} b={b} role={role} right={
                                        <span className="text-right shrink-0 space-y-1">
                                            <span className="block text-sm font-black text-success">{formatCurrency(b.offerPrice)}</span>
                                            {kind === 'committed'
                                                ? <span className="block text-[10px] text-muted font-bold">{b.escrow?.status === 'held' ? 'In escrow' : 'Released'}</span>
                                                : <Badge tone={st.tone}>{st.label}</Badge>}
                                        </span>
                                    } />
                                );
                            })}
                        </ul>
                    )}
                </div>

                <footer className="p-4 border-t border-border bg-surface">
                    <Link to={link} className="block text-center bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl py-2.5">Open the full list</Link>
                </footer>
            </aside>
        </div>,
        document.body,
    );
}
