import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Calendar, DollarSign, MapPin, CheckCircle2, ArrowRight, MessageSquare, FileText,
    AlertTriangle, XCircle, Star, MoreHorizontal, FolderInput, CalendarCheck, Layers
} from 'lucide-react';

import axios from '../../api/axios';
import StatCard from '../../components/common/StatCard';
import {
    Button, Card, Badge, Textarea, Modal, useConfirm, SkeletonList, EmptyState, ErrorState,
    formatCurrency, formatDate, formatDateRange, BOOKING_STATUS
} from '../../components/ui';

const FILTERS = ['all', 'pending', 'negotiating', 'confirmed', 'completed', 'disputed', 'cancelled'];
const OPEN = ['pending', 'negotiating'];
const AGREED = ['confirmed', 'completed'];
const UNFILED = 'unfiled';

const serviceName = (b) => b.serviceId?.title
    ? `${b.serviceId.title}`
    : b.eventId?.title || b.designConcepts?.find((c) => c.selected)?.title || b.eventDetails?.eventType || 'Service';
const planOf = (b) => (b.planId && typeof b.planId === 'object' ? b.planId : null);

/** Small "⋯" menu for the less common actions of a booking row. */
function RowMenu({ label, items }) {
    const [open, setOpen] = useState(false);
    // Opens upwards near the bottom of the screen (clear of the Smartie button).
    const [up, setUp] = useState(false);
    const ref = useRef(null);
    const toggle = () => {
        const r = ref.current?.getBoundingClientRect();
        setUp(Boolean(r && window.innerHeight - r.bottom < 220));
        setOpen((o) => !o);
    };
    useEffect(() => {
        if (!open) return undefined;
        const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
    }, [open]);
    const shown = items.filter(Boolean);
    if (!shown.length) return null;
    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label={label}
                className="p-2 rounded-xl border border-border text-muted hover:text-fg hover:bg-fg/5">
                <MoreHorizontal size={16} aria-hidden="true" />
            </button>
            {open && (
                <div role="menu" className={`absolute right-0 ${up ? 'bottom-full mb-1' : 'top-full mt-1'} z-30 w-52 bg-surface border border-border rounded-2xl shadow-xl p-1.5`}>
                    {shown.map(({ label: l, icon: Icon, onClick, danger }) => (
                        <button key={l} type="button" role="menuitem" onClick={() => { setOpen(false); onClick(); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-left hover:bg-fg/5 ${danger ? 'text-danger' : 'text-fg'}`}>
                            <Icon size={14} aria-hidden="true" />{l}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** One service booked for an event: who, status, price and what to do next. */
function BookingRow({ booking, onOpen, onComplete, completing, menuItems }) {
    const status = BOOKING_STATUS[booking.status] || { label: booking.status, tone: 'neutral' };
    const canNegotiate = OPEN.includes(booking.status);
    const escrow = booking.escrow?.status && booking.escrow.status !== 'none'
        ? { held: 'Escrow held', released: 'Paid to vendor', refunded: 'Refunded' }[booking.escrow.status] : null;
    return (
        <li
            role="link" tabIndex={0}
            aria-label={`Open ${serviceName(booking)} with ${booking.vendorId?.name || 'the vendor'}`}
            onClick={(e) => { if (!e.target.closest('button, a, [role="menu"]')) onOpen(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(); }}
            className="grid grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_10rem_7rem_15rem] items-center gap-x-4 gap-y-2 px-4 sm:px-6 py-4 hover:bg-fg/[0.03] last:rounded-b-3xl cursor-pointer transition-colors"
        >
            <div className="min-w-0">
                <p className="text-sm font-bold text-fg truncate">{serviceName(booking)}</p>
                <p className="text-xs text-muted truncate">
                    {booking.vendorId?._id
                        ? <Link to={`/vendor/${booking.vendorId._id}`} className="font-bold text-brand hover:underline">{booking.vendorId.name}</Link>
                        : 'Vendor'}
                    {booking.serviceId?.category ? ` · ${booking.serviceId.category}` : ''}
                </p>
            </div>
            <div className="md:order-none order-3 col-span-2 md:col-span-1 flex flex-wrap items-center gap-1.5">
                <Badge tone={status.tone}>{status.label}</Badge>
                {escrow && <span className="text-[10px] font-bold text-muted">{escrow}</span>}
            </div>
            <div className="text-right md:text-left">
                <p className="text-base font-black text-success leading-tight">{formatCurrency(booking.offerPrice)}</p>
                <p className="text-[10px] text-muted">{canNegotiate ? 'current offer' : 'agreed'}</p>
            </div>
            <div className="order-4 col-span-2 md:col-span-1 flex items-center justify-end gap-2">
                {booking.status === 'confirmed' && (
                    <Button size="sm" variant="secondary" icon={CheckCircle2} loading={completing} onClick={onComplete}>Complete</Button>
                )}
                <Button size="sm" onClick={onOpen}>{canNegotiate ? 'Negotiate' : 'View'} <ArrowRight size={12} aria-hidden="true" /></Button>
                <RowMenu label={`More actions for ${serviceName(booking)}`} items={menuItems} />
            </div>
        </li>
    );
}

/** An event with all the services booked for it. */
function EventGroup({ group, children, onOpenPlan }) {
    const { plan, bookings } = group;
    const agreed = bookings.filter((b) => AGREED.includes(b.status));
    const open = bookings.filter((b) => OPEN.includes(b.status));
    const agreedValue = agreed.reduce((t, b) => t + (b.offerPrice || 0), 0);
    const pct = bookings.length ? Math.round((agreed.length / bookings.length) * 100) : 0;
    const first = bookings[0]?.eventDetails || {};
    const start = plan?.date || first.date;
    const end = plan ? plan.endDate : first.endDate;
    const title = plan?.title || 'Not linked to an event';
    return (
        <Card className="overflow-visible">
            <div className="p-5 sm:p-6 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-border">
                <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-fg truncate">{title}</h2>
                        {plan?.eventType && <Badge tone="brand">{plan.eventType}</Badge>}
                    </div>
                    {plan ? (
                        <p className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1"><Calendar size={13} className="text-brand" aria-hidden="true" />{formatDateRange(start, end)}</span>
                            {plan.location && <span className="inline-flex items-center gap-1"><MapPin size={13} className="text-brand" aria-hidden="true" />{plan.location}</span>}
                        </p>
                    ) : (
                        <p className="text-xs text-muted">Bookings you made without choosing an event. Use <span className="font-bold">⋯ → Move to an event</span> to file them.</p>
                    )}
                </div>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-4 shrink-0">
                    <div className="text-left md:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{bookings.length} {bookings.length === 1 ? 'service' : 'services'} · {agreed.length} agreed{open.length ? ` · ${open.length} open` : ''}</p>
                        <p className="text-xl font-black text-fg">{formatCurrency(agreedValue)}{plan?.budget ? <span className="text-xs font-bold text-muted"> of {formatCurrency(plan.budget)}</span> : null}</p>
                    </div>
                    {plan && <Button size="sm" variant="outline" icon={CalendarCheck} onClick={onOpenPlan}>Plan</Button>}
                </div>
            </div>
            {plan && (
                <div className="px-5 sm:px-6 pt-3">
                    <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${agreed.length} of ${bookings.length} services agreed`}>
                        <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                </div>
            )}
            <ul className="divide-y divide-border">{children}</ul>
        </Card>
    );
}

export default function Bookings({ user }) {
    const navigate = useNavigate();
    const confirm = useConfirm();
    // Filters live in the address (?status=confirmed, ?event=<plan id>), so the
    // dashboard, profile and planner can open the matching list directly.
    const [params, setParams] = useSearchParams();
    const filterStatus = FILTERS.includes(params.get('status')) ? params.get('status') : 'all';
    const eventFilter = params.get('event') || '';
    const setParam = (key, value) => {
        const next = new URLSearchParams(params);
        if (!value || value === 'all') next.delete(key); else next.set(key, value);
        setParams(next, { replace: true });
    };
    const setFilterStatus = (s) => setParam('status', s);
    const [bookings, setBookings] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [disputeTarget, setDisputeTarget] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [completing, setCompleting] = useState(null);
    const [moveTarget, setMoveTarget] = useState(null);
    const [movePlan, setMovePlan] = useState('');

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [res, planRes] = await Promise.all([
                axios.get('/bookings/my'),
                axios.get('/plans').catch(() => ({ data: { data: [] } })),
            ]);
            setBookings(res.data.data || []);
            setPlans(planRes.data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your bookings.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(); }, [fetchBookings]);

    const submitDispute = async () => {
        if (disputeReason.trim().length < 10) {
            toast.error('Please describe the issue in at least 10 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post(`/bookings/${disputeTarget._id}/dispute`, { reason: disputeReason.trim() });
            toast.success('Dispute raised. An administrator will review it.');
            setDisputeTarget(null);
            setDisputeReason('');
            await fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not raise the dispute.');
        } finally {
            setSubmitting(false);
        }
    };

    // Customer confirms delivery: the simulated escrow is released to the provider.
    const completeBooking = async (booking) => {
        if (!(await confirm({ title: 'Mark this booking complete?', message: 'Confirm the service was delivered. This releases the escrow payment to the vendor and opens reviews.', confirmLabel: 'Complete & release' }))) return;
        setCompleting(booking._id);
        try {
            await axios.put(`/bookings/${booking._id}/complete`);
            toast.success('Marked complete. Escrow released to the provider.');
            await fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not complete the booking.');
        } finally {
            setCompleting(null);
        }
    };

    const cancelBooking = async () => {
        setSubmitting(true);
        try {
            await axios.put(`/bookings/${cancelTarget._id}/cancel`);
            toast.success('Booking cancelled.');
            setCancelTarget(null);
            await fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not cancel the booking.');
        } finally {
            setSubmitting(false);
        }
    };

    const openMove = (booking) => { setMoveTarget(booking); setMovePlan(planOf(booking)?._id || ''); };
    const moveBooking = async () => {
        setSubmitting(true);
        try {
            const res = await axios.put(`/bookings/${moveTarget._id}/plan`, { planId: movePlan || null });
            const updated = res.data.data;
            setBookings((list) => list.map((b) => (b._id === moveTarget._id ? { ...b, planId: updated.planId || undefined } : b)));
            toast.success(movePlan ? `Moved to "${plans.find((p) => p._id === movePlan)?.title || 'the event'}".` : 'Removed from the event.');
            setMoveTarget(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not move the booking.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDownloadInvoice = (booking) => {
        const win = window.open('', '_blank');
        if (!win) {
            toast.error('Please allow pop-ups to download the invoice.');
            return;
        }
        win.document.write(invoiceHtml(booking, user));
        win.document.close();
    };

    const filtered = useMemo(
        // "In negotiation" covers both a fresh offer and a counter.
        () => (filterStatus === 'all' ? bookings
            : filterStatus === 'negotiating' ? bookings.filter(b => OPEN.includes(b.status))
            : bookings.filter(b => b.status === filterStatus)),
        [bookings, filterStatus]
    );

    // One group per event (soonest first); bookings with no event go last.
    const groups = useMemo(() => {
        const map = new Map();
        for (const b of filtered) {
            const plan = planOf(b);
            const key = plan?._id || UNFILED;
            if (!map.has(key)) map.set(key, { key, plan, bookings: [] });
            map.get(key).bookings.push(b);
        }
        const list = [...map.values()].filter((g) => !eventFilter || g.key === eventFilter);
        return list.sort((a, b) => {
            if (a.key === UNFILED) return 1;
            if (b.key === UNFILED) return -1;
            return new Date(a.plan.date) - new Date(b.plan.date);
        });
    }, [filtered, eventFilter]);

    const eventChips = useMemo(() => {
        const seen = new Map();
        for (const b of bookings) { const p = planOf(b); if (p && !seen.has(p._id)) seen.set(p._id, p); }
        return [...seen.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [bookings]);

    const totals = useMemo(() => ({
        all: bookings.length,
        events: eventChips.length,
        negotiating: bookings.filter(b => b.status === 'negotiating').length,
        confirmed: bookings.filter(b => AGREED.includes(b.status)).length,
        value: bookings.filter(b => AGREED.includes(b.status)).reduce((acc, b) => acc + (b.offerPrice || 0), 0),
    }), [bookings, eventChips]);

    const menuFor = (booking) => {
        const agreed = AGREED.includes(booking.status);
        return [
            { label: planOf(booking) ? 'Move to another event' : 'Move to an event', icon: FolderInput, onClick: () => openMove(booking) },
            agreed && { label: 'Invoice', icon: FileText, onClick: () => handleDownloadInvoice(booking) },
            agreed && { label: 'Rate & review', icon: Star, onClick: () => navigate(`/vendor/${booking.vendorId?._id || booking.vendorId}#reviews`) },
            agreed && { label: 'Raise a dispute', icon: AlertTriangle, onClick: () => setDisputeTarget(booking), danger: true },
            OPEN.includes(booking.status) && { label: 'Withdraw offer', icon: XCircle, onClick: () => setCancelTarget(booking), danger: true },
        ];
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-6 p-4 sm:p-6 pb-28 sm:pb-28 max-w-[1200px] mx-auto">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Badge tone="brand">My bookings</Badge>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Bookings by event</h1>
                    <p className="text-sm text-muted">Every service you booked, listed under the event it is for, with offers, agreed prices and next steps.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" icon={CalendarCheck} onClick={() => navigate('/planner')}>Plan an event</Button>
                    <Button variant="ghost" onClick={() => navigate('/events')}>Browse events</Button>
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="EVENTS" value={totals.events} icon={Layers} onClick={() => setParam('event', '')} />
                <StatCard label="IN NEGOTIATION" value={totals.negotiating} icon={MessageSquare} onClick={() => setFilterStatus('negotiating')} />
                <StatCard label="CONFIRMED" value={totals.confirmed} icon={CheckCircle2} onClick={() => setFilterStatus('confirmed')} />
                <StatCard label="AGREED VALUE" value={formatCurrency(totals.value)} icon={DollarSign} onClick={() => navigate('/me?tab=spending')} />
            </div>

            <div className="space-y-3">
                {eventChips.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Show one event">
                        <button onClick={() => setParam('event', '')} aria-pressed={!eventFilter}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${!eventFilter ? 'bg-fg text-bg border-fg' : 'bg-surface border-border text-muted hover:text-fg'}`}>
                            All events
                        </button>
                        {eventChips.map((p) => (
                            <button key={p._id} onClick={() => setParam('event', p._id)} aria-pressed={eventFilter === p._id}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${eventFilter === p._id ? 'bg-fg text-bg border-fg' : 'bg-surface border-border text-muted hover:text-fg'}`}>
                                {p.title} · {formatDate(p.date, { year: undefined })}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
                    {FILTERS.map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            aria-pressed={filterStatus === status}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap border ${
                                filterStatus === status
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-surface border-border text-muted hover:text-fg'
                            }`}
                        >
                            {status === 'all' ? 'All' : BOOKING_STATUS[status]?.label || status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <SkeletonList count={3} height="h-56" cols="" />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchBookings} />
            ) : groups.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title={bookings.length === 0 ? 'No bookings yet' : 'Nothing matches these filters'}
                    description={
                        bookings.length === 0
                            ? 'Plan an event, then book its venue, catering, decor and more. Each booking appears here under its event.'
                            : 'Try another status or event to see your other bookings.'
                    }
                    action={bookings.length === 0 ? { label: 'Plan an event', to: '/planner' } : undefined}
                />
            ) : (
                <div className="space-y-6">
                    {groups.map((g) => (
                        <EventGroup key={g.key} group={g} onOpenPlan={() => navigate(`/planner?plan=${g.plan._id}`)}>
                            {g.bookings.map((b) => (
                                <BookingRow
                                    key={b._id}
                                    booking={b}
                                    onOpen={() => navigate(`/negotiate/${b._id}`)}
                                    onComplete={() => completeBooking(b)}
                                    completing={completing === b._id}
                                    menuItems={menuFor(b)}
                                />
                            ))}
                        </EventGroup>
                    ))}
                </div>
            )}

            <Modal
                open={Boolean(moveTarget)}
                onClose={() => setMoveTarget(null)}
                title="Which event is this booking for?"
                description={moveTarget ? `${serviceName(moveTarget)} · ${moveTarget.vendorId?.name || 'vendor'}` : ''}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setMoveTarget(null)}>Cancel</Button>
                        <Button loading={submitting} onClick={moveBooking}>Save</Button>
                    </>
                }
            >
                {plans.length === 0 ? (
                    <p className="text-sm text-muted">You have no events yet. <Link to="/planner" className="font-bold text-brand">Plan an event</Link> first, then file this booking under it.</p>
                ) : (
                    <div className="space-y-2">
                        <label htmlFor="move-plan" className="text-xs font-bold text-fg">Event</label>
                        <select id="move-plan" value={movePlan} onChange={(e) => setMovePlan(e.target.value)}
                            className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg">
                            <option value="">Not linked to an event</option>
                            {plans.map((p) => <option key={p._id} value={p._id}>{p.title} · {formatDateRange(p.date, p.endDate)}</option>)}
                        </select>
                        <p className="text-[11px] text-muted">Only where it is listed changes; the booking, its price and its dates stay the same.</p>
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(cancelTarget)}
                onClose={() => setCancelTarget(null)}
                title="Withdraw this offer?"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setCancelTarget(null)}>Keep it</Button>
                        <Button variant="danger" loading={submitting} onClick={cancelBooking}>Withdraw</Button>
                    </>
                }
            >
                <p className="text-sm text-muted">
                    Your offer on <strong className="text-fg">{cancelTarget ? serviceName(cancelTarget) : 'this booking'}</strong> will be cancelled and the provider notified. You can always make a new offer later.
                </p>
            </Modal>

            <Modal
                open={Boolean(disputeTarget)}
                onClose={() => { setDisputeTarget(null); setDisputeReason(''); }}
                title="Raise a dispute"
                description={disputeTarget ? `${serviceName(disputeTarget)} · ${formatCurrency(disputeTarget.offerPrice)}` : ''}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => { setDisputeTarget(null); setDisputeReason(''); }}>
                            Cancel
                        </Button>
                        <Button variant="danger" loading={submitting} onClick={submitDispute}>
                            Raise dispute
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        An administrator will review the booking and decide the outcome. Both you and the
                        other party will be notified once it is resolved.
                    </p>
                    <Textarea
                        label="What went wrong?"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Describe what happened, with dates and specifics where you can."
                        hint={`${disputeReason.trim().length}/10 characters minimum`}
                        maxLength={1000}
                    />
                </div>
            </Modal>
        </div>
    );
}

/** Printable invoice. Deliberately avoids escrow language — no payment
 *  processing exists in the system, so claiming funds are held would be false. */
function invoiceHtml(booking, user) {
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const price = formatCurrency(booking.offerPrice);
    const statusLabel = (BOOKING_STATUS[booking.status] || {}).label || booking.status;

    return `<!doctype html><html><head><meta charset="utf-8"><title>Booking confirmation ${esc(booking._id)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:40px;color:#111827;max-width:800px;margin:0 auto}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #E5E7EB;padding-bottom:20px;margin-bottom:40px}
  .title{font-size:24px;font-weight:900;letter-spacing:-.05em;text-transform:uppercase}
  .badge{display:inline-block;background:#059669;color:#fff;padding:6px 12px;border-radius:9999px;font-size:10px;font-weight:800}
  .grid{display:flex;justify-content:space-between;gap:40px;margin-bottom:40px}
  .section-title{font-size:10px;font-weight:800;color:#9CA3AF;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px}
  th{font-size:10px;font-weight:800;color:#9CA3AF;text-transform:uppercase;border-bottom:1px solid #E5E7EB;padding:12px 8px;text-align:left}
  td{padding:16px 8px;border-bottom:1px solid #F3F4F6;font-size:13px;font-weight:600}
  .total{display:flex;justify-content:flex-end;gap:20px;font-size:18px;font-weight:900;align-items:center}
  .total b{font-size:24px;color:#059669}
  .footer{font-size:10px;color:#9CA3AF;text-align:center;margin-top:60px;border-top:1px dashed #E5E7EB;padding-top:20px}
</style></head><body>
  <div class="header">
    <div>
      <div class="title">SmartEvents</div>
      <div style="font-size:11px;color:#9CA3AF;font-family:monospace;font-weight:bold;margin-top:4px">
        BOOKING REF: ${esc(booking._id)}
      </div>
    </div>
    <div style="text-align:right">
      <span class="badge">${esc(statusLabel)}</span>
      <div style="font-size:11px;color:#6B7280;font-weight:600;margin-top:6px">
        Issued: ${formatDate(new Date())}
      </div>
    </div>
  </div>
  <div class="grid">
    <div>
      <div class="section-title">Customer</div>
      <div style="font-size:16px;font-weight:800">${esc(user?.name || 'Customer')}</div>
      <div style="font-size:13px;color:#6B7280">${esc(user?.email || '')}</div>
    </div>
    <div style="text-align:right">
      <div class="section-title">Provider</div>
      <div style="font-size:16px;font-weight:800">${esc(booking.vendorId?.name || 'Provider')}</div>
      <div style="font-size:13px;color:#6B7280">${esc(booking.vendorId?.email || '')}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Service</th><th style="text-align:right">Agreed price</th></tr></thead>
    <tbody><tr>
      <td>
        <div style="font-weight:800;font-size:14px">${esc(booking.eventId?.title || booking.eventDetails?.eventType || 'Event service')}</div>
        <div style="font-size:11px;color:#6B7280;margin-top:4px">
          ${formatDateRange(booking.eventDetails?.date, booking.eventDetails?.endDate)} &middot; ${esc(booking.eventDetails?.location || '')}
        </div>
      </td>
      <td style="text-align:right;font-size:16px;font-weight:800">${price}</td>
    </tr></tbody>
  </table>
  <div class="total"><span>TOTAL AGREED:</span><b>${price}</b></div>
  <div class="footer">
    <p>This document records a price agreed through the SmartEvents negotiation platform.
       It is not a payment receipt — settlement is arranged directly between the parties.</p>
  </div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
</body></html>`;
}
