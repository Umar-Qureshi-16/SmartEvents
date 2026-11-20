import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft, CheckCircle2, XCircle, Send, DollarSign, Clock, Check, X, MessageSquare,
    Pencil, TrendingDown, TrendingUp, Minus, Handshake, ShieldCheck, Loader2,
} from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import AnimatedPrice from '../../components/AnimatedPrice';
import { useWebSockets } from '../../context/WebSocketContext';
import { useSelector } from 'react-redux';
import DesignStudio from '../../components/design/DesignStudio';
import { useConfirm } from '../../components/ui';

const money = (n) => `$${Number(n || 0).toLocaleString()}`;
const idOf = (x) => (x?._id || x)?.toString();
const dayLabel = (d) => new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const timeLabel = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const ACTION_LABEL = { offer: 'Opening offer', counter: 'Counter-offer', accepted: 'Accepted', rejected: 'Declined' };

const QUICK_REPLIES = {
    customer: ['Is this date available?', 'What exactly is included?', 'Can you share photos of past setups?', 'Is there any flexibility on price?'],
    vendor: ['Yes, the date is available.', 'Everything in the package is included.', 'I can share photos of past setups.', 'This is my best price for the date.'],
};

/** Who said what, in time order: offers (with their price) and chat messages. */
function buildTimeline(booking) {
    const offers = (booking.negotiationHistory || []).map((h, i) => ({ kind: 'offer', key: `o-${h._id || i}`, at: h.timestamp || booking.createdAt, by: idOf(h.offeredBy), entry: h, index: i }));
    const chats = (booking.chatMessages || []).map((m, i) => ({ kind: 'chat', key: `c-${m._id || i}`, at: m.createdAt, by: idOf(m.author), text: m.text }));
    return [...offers, ...chats].sort((a, b) => new Date(a.at) - new Date(b.at));
}

const NegotiationPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const confirm = useConfirm();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterPrice, setCounterPrice] = useState('');
    const [note, setNote] = useState('');
    const [editing, setEditing] = useState(false);
    const [chatText, setChatText] = useState('');
    const [sending, setSending] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // 'offers' shows the price negotiation; 'design' the shared Design Studio.
    const [searchParams] = useSearchParams();
    const [view, setView] = useState(searchParams.get('view') === 'design' ? 'design' : 'offers');

    const { user } = useSelector((state) => state.auth);
    const { socket } = useWebSockets();
    const chatContainerRef = useRef(null);
    const myId = idOf(user);

    const fetchBooking = useCallback(async () => {
        try {
            const res = await axios.get(`/bookings/${bookingId}`);
            if (res.data.success) {
                setBooking(res.data.data);
                setCounterPrice(res.data.data.offerPrice || res.data.data.totalAmount);
            }
        } catch {
            toast.error('Could not load this negotiation.');
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => { fetchBooking(); }, [fetchBooking]);

    // Live updates from the other side.
    useEffect(() => {
        if (!socket || !bookingId) return undefined;
        socket.emit('join-negotiation', bookingId);
        const fromOther = (id) => idOf(id) && idOf(id) !== myId;

        const onCounter = (d) => { if (fromOther(d.offeredBy)) { toast(`New offer: ${money(d.price)}`, { icon: '💬' }); fetchBooking(); } };
        const onRevised = (d) => { if (fromOther(d.actorId)) { toast(`Offer changed to ${money(d.price)}`, { icon: '✏️' }); fetchBooking(); } };
        const onAccepted = (d) => { if (fromOther(d.actorId)) { toast.success('The offer was accepted.'); fetchBooking(); } };
        const onRejected = (d) => { if (fromOther(d.actorId)) { toast.error('The offer was declined.'); fetchBooking(); } };
        const onMessage = (d) => {
            if (!fromOther(d.actorId) || !d.message) return;
            setBooking((b) => (b && !(b.chatMessages || []).some((m) => idOf(m) === idOf(d.message))
                ? { ...b, chatMessages: [...(b.chatMessages || []), d.message] } : b));
        };

        socket.on('offer-countered', onCounter);
        socket.on('offer-revised', onRevised);
        socket.on('offer-accepted', onAccepted);
        socket.on('offer-rejected', onRejected);
        socket.on('negotiation-message', onMessage);
        return () => {
            socket.emit('leave-negotiation', bookingId);
            socket.off('offer-countered', onCounter);
            socket.off('offer-revised', onRevised);
            socket.off('offer-accepted', onAccepted);
            socket.off('offer-rejected', onRejected);
            socket.off('negotiation-message', onMessage);
        };
    }, [socket, bookingId, myId, fetchBooking]);

    const timeline = useMemo(() => (booking ? buildTimeline(booking) : []), [booking]);

    // Keep the newest message in view.
    useEffect(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [timeline.length, view]);

    const run = async (fn, okMessage) => {
        setIsSubmitting(true);
        try {
            await fn();
            if (okMessage) toast.success(okMessage);
            await fetchBooking();
            return true;
        } catch (err) {
            toast.error(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'That did not go through. Try again.');
            await fetchBooking();
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    const validPrice = () => {
        if (!(Number(counterPrice) > 0)) { toast.error('Enter a price greater than zero.'); return false; }
        return true;
    };

    const sendCounter = async (e) => {
        e?.preventDefault();
        if (isSubmitting || !validPrice()) return;
        const ok = await run(() => axios.post(`/bookings/${bookingId}/negotiate`, { price: Number(counterPrice), message: note.trim() || undefined }), 'Counter-offer sent.');
        if (ok) setNote('');
    };

    const saveRevision = async (e) => {
        e?.preventDefault();
        if (isSubmitting || !validPrice()) return;
        const ok = await run(() => axios.put(`/bookings/${bookingId}/offer`, { price: Number(counterPrice), message: note.trim() || undefined }), 'Your offer was updated.');
        if (ok) { setEditing(false); setNote(''); }
    };

    const accept = async () => {
        if (!(await confirm({ title: `Accept ${money(booking.offerPrice)}?`, message: 'The booking is confirmed at this price and the amount is held in escrow until the event is delivered.', confirmLabel: 'Accept offer' }))) return;
        run(() => axios.put(`/bookings/${bookingId}/accept`), 'Offer accepted. The booking is confirmed.');
    };

    const decline = async () => {
        if (!(await confirm({ title: 'Decline this offer?', message: 'This closes the negotiation. You can still message the other side.', confirmLabel: 'Decline', tone: 'danger' }))) return;
        run(() => axios.put(`/bookings/${bookingId}/reject`), 'Offer declined.');
    };

    const sendChat = async (text) => {
        const clean = String(text ?? chatText).trim();
        if (!clean || sending) return;
        setSending(true);
        try {
            const res = await axios.post(`/bookings/${bookingId}/messages`, { text: clean });
            setBooking((b) => ({ ...b, chatMessages: [...(b.chatMessages || []), res.data.data] }));
            if (text === undefined) setChatText('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Message not sent. Try again.');
        } finally {
            setSending(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-ink pt-24 pb-20 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
                <div className="h-16 w-2/3 bg-fg/5 rounded-2xl" />
                <div className="grid lg:grid-cols-[1fr_340px] gap-5">
                    <div className="h-[520px] bg-fg/5 rounded-3xl" />
                    <div className="h-[420px] bg-fg/5 rounded-3xl" />
                </div>
            </div>
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ink text-fg gap-3">
            <h2 className="text-2xl font-bold">Booking not found</h2>
            <button onClick={() => navigate(-1)} className="text-brand font-bold hover:underline">Go back</button>
        </div>
    );

    const vendorId = idOf(booking.vendorId);
    const customerId = idOf(booking.customerId);
    const iAmVendor = vendorId === myId;
    const other = iAmVendor ? booking.customerId : booking.vendorId;
    const otherName = other?.name || (iAmVendor ? 'The organizer' : 'The vendor');
    const nameOf = (id) => (id === myId ? 'You' : (id === customerId ? booking.customerId?.name : booking.vendorId?.name) || otherName);

    const history = booking.negotiationHistory || [];
    const open = ['pending', 'negotiating'].includes(booking.status);
    const accepted = ['accepted', 'confirmed', 'completed'].includes(booking.status);
    const current = booking.offerPrice || booking.totalAmount;
    const listed = booking.eventId?.price || booking.serviceId?.price || history[0]?.price || current;
    const last = history[history.length - 1];
    const lastIsMine = last ? idOf(last.offeredBy) === myId : !iAmVendor;
    const myTurn = open && !lastIsMine;
    const diff = listed ? Math.round(((current - listed) / listed) * 100) : 0;
    const offers = history.filter((h) => ['offer', 'counter'].includes(h.action || 'counter'));

    const eventName = booking.eventId?.title
        || (booking.serviceId?.title ? `${booking.serviceId.title} package` : null)
        || booking.designConcepts?.find((c) => c.selected)?.title
        || booking.eventDetails?.eventType
        || 'Custom booking';
    const statusLabel = booking.status === 'confirmed' ? 'accepted' : booking.status;
    const statusStyle = accepted ? 'bg-emerald-500/15 text-success'
        : ['rejected', 'cancelled'].includes(booking.status) ? 'bg-rose-500/15 text-rose-500'
            : 'bg-amber-500/15 text-amber-500';
    const field = 'w-full bg-bg text-fg placeholder:text-muted border border-border rounded-xl outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition';

    return (
        <div className="min-h-screen bg-ink text-fg pt-24 pb-16 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="min-w-0">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-fg transition-colors group mb-3">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
                            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                        </button>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{eventName}</h1>
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black ${statusStyle}`}>{statusLabel}</span>
                        </div>
                        {other?._id && (
                            <p className="text-muted text-sm mt-1">
                                With{' '}
                                <button type="button" onClick={() => navigate(iAmVendor ? `/organizer/${other._id}` : `/vendor/${other._id}`)} className="text-brand font-bold hover:underline">{other.name}</button>
                                <span className="text-xs"> ({iAmVendor ? 'organizer' : 'vendor'})</span>
                            </p>
                        )}
                    </div>
                    <div role="tablist" aria-label="Booking workspace" className="flex gap-1 bg-surface-2 p-1 rounded-full w-fit">
                        {[['offers', 'Negotiation'], ['design', 'Design Studio']].map(([key, label]) => (
                            <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === key ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-fg'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {view === 'design' && <DesignStudio bookingId={bookingId} currentUserId={myId} />}

                {view === 'offers' && (
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">

                        {/* Deal panel (first on phones) */}
                        <aside className="lg:order-2 lg:sticky lg:top-24 space-y-4">
                            <section className="bg-surface border border-border rounded-3xl p-5 shadow-xl space-y-4" aria-label="Current deal">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-muted tracking-widest">{accepted ? 'Agreed price' : 'Offer on the table'}</p>
                                        <AnimatedPrice price={current} className="text-4xl font-black text-emerald" />
                                        <p className="text-[11px] text-muted mt-1">
                                            {last && !accepted ? <>by <span className="font-bold text-fg">{nameOf(idOf(last.offeredBy))}</span> · </> : null}
                                            Listed at {money(listed)}
                                        </p>
                                    </div>
                                    {diff !== 0 && (
                                        <span className={`inline-flex items-center gap-1 text-[11px] font-black rounded-full px-2 py-1 ${diff < 0 ? 'bg-emerald-500/15 text-success' : 'bg-amber-500/15 text-amber-500'}`}>
                                            {diff < 0 ? <TrendingDown size={12} aria-hidden="true" /> : <TrendingUp size={12} aria-hidden="true" />}{Math.abs(diff)}%
                                        </span>
                                    )}
                                </div>

                                {/* Whose turn */}
                                <div className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs font-bold ${accepted ? 'bg-emerald-500/10 text-success' : !open ? 'bg-rose-500/10 text-rose-500' : myTurn ? 'bg-brand/10 text-brand' : 'bg-surface-2 text-muted'}`}>
                                    {accepted ? <Handshake size={15} aria-hidden="true" /> : !open ? <XCircle size={15} aria-hidden="true" /> : myTurn ? <Clock size={15} aria-hidden="true" /> : <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                                    {accepted ? 'Deal agreed. Escrow holds the amount until delivery.'
                                        : !open ? `This negotiation was ${statusLabel}.`
                                            : myTurn ? 'Your turn: accept, decline or counter.'
                                                : `Waiting for ${otherName}. You can still change your offer or send a message.`}
                                </div>

                                {/* Actions */}
                                {open && myTurn && !editing && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={decline} disabled={isSubmitting}
                                                className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition disabled:opacity-50">
                                                <X size={14} aria-hidden="true" /> Decline
                                            </button>
                                            <button type="button" onClick={accept} disabled={isSubmitting}
                                                className="py-2.5 rounded-xl flex items-center justify-center gap-1.5 font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50 active:scale-95">
                                                <Check size={14} aria-hidden="true" /> Accept {money(current)}
                                            </button>
                                        </div>
                                        <form onSubmit={sendCounter} className="space-y-2 pt-1 border-t border-border">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted pt-2">Or counter</p>
                                            <label className="relative block">
                                                <span className="sr-only">Your price</span>
                                                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true" />
                                                <input type="number" min="1" value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} className={`${field} py-2.5 pl-8 pr-3 font-black`} />
                                            </label>
                                            <label className="block">
                                                <span className="sr-only">Note with your offer</span>
                                                <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this price? (optional)" className={`${field} py-2 px-3 text-sm resize-none`} />
                                            </label>
                                            <button type="submit" disabled={isSubmitting} className="w-full py-2.5 rounded-xl bg-brand text-white flex items-center justify-center gap-1.5 font-bold text-xs hover:opacity-90 transition disabled:opacity-50">
                                                <Send size={14} aria-hidden="true" /> Send counter-offer
                                            </button>
                                        </form>
                                    </div>
                                )}

                                {open && !myTurn && last && !editing && (
                                    <button type="button" onClick={() => { setEditing(true); setCounterPrice(last.price); setNote(last.message || ''); }}
                                        className="w-full py-2.5 rounded-xl border border-border text-fg hover:border-brand hover:text-brand flex items-center justify-center gap-1.5 font-bold text-xs transition">
                                        <Pencil size={14} aria-hidden="true" /> Change my offer
                                    </button>
                                )}

                                {open && editing && (
                                    <form onSubmit={saveRevision} className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Change your offer of {money(last?.price)}</p>
                                        <label className="relative block">
                                            <span className="sr-only">New price</span>
                                            <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true" />
                                            <input type="number" min="1" autoFocus value={counterPrice} onChange={(e) => setCounterPrice(e.target.value)} className={`${field} py-2.5 pl-8 pr-3 font-black`} />
                                        </label>
                                        <label className="block">
                                            <span className="sr-only">Note</span>
                                            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note with your offer (optional)" className={`${field} py-2 px-3 text-sm resize-none`} />
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => { setEditing(false); setNote(''); }} className="py-2.5 rounded-xl border border-border text-muted hover:text-fg font-bold text-xs">Cancel</button>
                                            <button type="submit" disabled={isSubmitting} className="py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:opacity-90 disabled:opacity-50">Save offer</button>
                                        </div>
                                        <p className="text-[10px] text-muted">{otherName} sees the new price straight away. You can change it until they answer.</p>
                                    </form>
                                )}
                            </section>

                            {/* Price trail */}
                            {offers.length > 0 && (
                                <section className="bg-surface border border-border rounded-3xl p-5 space-y-3" aria-label="Price trail">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Price trail · {offers.length} {offers.length === 1 ? 'round' : 'rounds'}</p>
                                    <ol className="space-y-2">
                                        {offers.map((h, i) => {
                                            const prev = offers[i - 1]?.price;
                                            const Trend = prev === undefined ? Minus : h.price < prev ? TrendingDown : h.price > prev ? TrendingUp : Minus;
                                            const isLast = i === offers.length - 1;
                                            return (
                                                <li key={h._id || i} className="flex items-center gap-3 text-xs">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isLast ? 'bg-brand text-white' : 'bg-surface-2 text-muted'}`}>{i + 1}</span>
                                                    <span className="flex-1 text-muted truncate">{nameOf(idOf(h.offeredBy))}{h.editedAt ? ' · edited' : ''}</span>
                                                    <Trend size={12} className="text-muted" aria-hidden="true" />
                                                    <span className={`font-black ${isLast ? 'text-fg' : 'text-muted'}`}>{money(h.price)}</span>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                </section>
                            )}

                            <p className="flex items-start gap-2 text-[11px] text-muted px-2">
                                <ShieldCheck size={14} className="shrink-0 mt-px text-success" aria-hidden="true" />
                                Every offer is recorded. Once accepted, the amount is held in escrow until the event is delivered.
                            </p>
                        </aside>

                        {/* Conversation */}
                        <section aria-label="Conversation" className="lg:order-1 bg-surface border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col h-[min(76vh,720px)] min-h-[460px]">
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-2/60">
                                <div className="w-10 h-10 rounded-full bg-brand/15 text-brand flex items-center justify-center font-black text-sm shrink-0" aria-hidden="true">{otherName.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-sm truncate">{otherName}</p>
                                    <p className="text-[11px] text-muted">{iAmVendor ? 'Organizer' : 'Vendor'} · offers and messages</p>
                                </div>
                                <MessageSquare size={18} className="text-muted" aria-hidden="true" />
                            </div>

                            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 bg-bg/40" aria-live="polite">
                                {timeline.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-muted gap-3 text-center">
                                        <MessageSquare size={40} className="opacity-30" aria-hidden="true" />
                                        <p className="text-sm font-semibold">No messages yet</p>
                                        <p className="text-xs max-w-xs">Say hello or ask a question below.</p>
                                    </div>
                                ) : timeline.map((t, i) => {
                                    const mine = t.by === myId;
                                    const prev = timeline[i - 1];
                                    const newDay = !prev || dayLabel(prev.at) !== dayLabel(t.at);
                                    const groupStart = !prev || newDay || prev.by !== t.by || prev.kind !== t.kind;
                                    const final = t.kind === 'offer' && ['accepted', 'rejected'].includes(t.entry.action);
                                    return (
                                        <React.Fragment key={t.key}>
                                            {newDay && (
                                                <div className="flex items-center gap-3 py-1" aria-hidden="true">
                                                    <div className="flex-1 h-px bg-border" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{dayLabel(t.at)}</span>
                                                    <div className="flex-1 h-px bg-border" />
                                                </div>
                                            )}
                                            {final ? (
                                                <div className="flex justify-center py-1">
                                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${t.entry.action === 'accepted' ? 'bg-emerald-500/15 text-success' : 'bg-rose-500/15 text-rose-500'}`}>
                                                        {t.entry.action === 'accepted' ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
                                                        {nameOf(t.by)} {t.entry.action === 'accepted' ? 'accepted' : 'declined'} {money(t.entry.price)} · {timeLabel(t.at)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                                    className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${groupStart ? 'pt-2' : ''}`}>
                                                    {!mine && (
                                                        <div className={`w-7 h-7 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${groupStart ? 'bg-surface-2 border border-border text-muted' : 'invisible'}`} aria-hidden="true">
                                                            {nameOf(t.by).charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    {t.kind === 'offer' ? (
                                                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl overflow-hidden shadow-sm border ${mine ? 'border-brand/40 rounded-br-md' : 'border-border rounded-bl-md'}`}>
                                                            <div className={`px-4 py-2 flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest ${mine ? 'bg-brand text-white' : 'bg-surface-2 text-muted'}`}>
                                                                <span className="flex items-center gap-1.5"><DollarSign size={11} aria-hidden="true" />{ACTION_LABEL[t.entry.action] || 'Offer'}</span>
                                                                <span>{nameOf(t.by)}</span>
                                                            </div>
                                                            <div className="px-4 py-3 bg-surface">
                                                                <p className="text-2xl font-black text-fg">{money(t.entry.price)}</p>
                                                                {t.entry.previousPrice !== undefined && t.entry.previousPrice !== t.entry.price && (
                                                                    <p className="text-[11px] text-muted"><span className="line-through">{money(t.entry.previousPrice)}</span> · changed {timeLabel(t.entry.editedAt)}</p>
                                                                )}
                                                                {t.entry.message && <p className="text-sm text-fg/80 mt-1 leading-relaxed whitespace-pre-wrap break-words">{t.entry.message}</p>}
                                                                <p className="text-[10px] text-muted mt-2 text-right">{timeLabel(t.at)}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${mine ? 'bg-brand text-white rounded-br-md' : 'bg-surface border border-border rounded-bl-md'}`}>
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{t.text}</p>
                                                            <p className={`text-[10px] mt-1 text-right ${mine ? 'text-white/70' : 'text-muted'}`}>{timeLabel(t.at)}</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            {/* Message composer: always available */}
                            <div className="border-t border-border bg-surface px-4 sm:px-5 py-3 space-y-2">
                                <div className="flex gap-1.5 overflow-x-auto pb-0.5" aria-label="Quick replies">
                                    {QUICK_REPLIES[iAmVendor ? 'vendor' : 'customer'].map((q) => (
                                        <button key={q} type="button" onClick={() => sendChat(q)} disabled={sending}
                                            className="shrink-0 px-3 py-1 rounded-full border border-border text-[11px] font-semibold text-muted hover:text-fg hover:border-brand/50 transition disabled:opacity-50">
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <form onSubmit={(e) => { e.preventDefault(); sendChat(); }} className="flex items-end gap-2">
                                    <label className="flex-1 min-w-0">
                                        <span className="sr-only">Message {otherName}</span>
                                        <textarea rows={1} maxLength={1000} value={chatText} onChange={(e) => setChatText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                                            placeholder={`Message ${otherName}…`}
                                            className={`${field} block resize-none py-3 px-4 text-sm max-h-32`} />
                                    </label>
                                    <button type="submit" disabled={sending || !chatText.trim()} aria-label="Send message"
                                        className="h-[46px] w-[46px] rounded-2xl bg-brand text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 shrink-0">
                                        {sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                                    </button>
                                </form>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NegotiationPage;
