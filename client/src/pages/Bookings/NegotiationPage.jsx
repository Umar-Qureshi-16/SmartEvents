import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Send, DollarSign, Clock, Check, X, MessageSquare } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import AnimatedPrice from '../../components/AnimatedPrice';
import { useWebSockets } from '../../context/WebSocketContext';
import { useSelector } from 'react-redux';
import DesignStudio from '../../components/design/DesignStudio';

const NegotiationPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterPrice, setCounterPrice] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // 'offers' shows the price negotiation; 'design' the shared Design Studio.
    const [searchParams] = useSearchParams();
    const [view, setView] = useState(searchParams.get('view') === 'design' ? 'design' : 'offers');

    const { user } = useSelector((state) => state.auth);
    const { socket } = useWebSockets();
    const chatContainerRef = useRef(null);

    useEffect(() => {
        fetchBooking();
    }, [bookingId]);

    useEffect(() => {
        if (!socket || !bookingId) return;

        socket.emit('join-negotiation', bookingId);

        const currentUserIdStr = (user?._id || user?.id)?.toString();

        const handleCountered = (data) => {
            const senderIdStr = (data.offeredBy?._id || data.offeredBy)?.toString();
            if (senderIdStr !== currentUserIdStr) {
                toast.success(`Counter-offer received: $${data.price}`, { icon: '💬' });
                fetchBooking();
            }
        };

        const handleAccepted = (data) => {
            const actorIdStr = data.actorId?.toString();
            if (actorIdStr !== currentUserIdStr) {
                toast.success("The counterpart accepted the offer!", { icon: '✅' });
                fetchBooking();
            }
        };

        const handleRejected = (data) => {
            const actorIdStr = data.actorId?.toString();
            if (actorIdStr !== currentUserIdStr) {
                toast.error("The counterpart rejected the offer.", { icon: '❌' });
                fetchBooking();
            }
        };

        socket.on('offer-countered', handleCountered);
        socket.on('offer-accepted', handleAccepted);
        socket.on('offer-rejected', handleRejected);

        return () => {
            socket.emit('leave-negotiation', bookingId);
            socket.off('offer-countered', handleCountered);
            socket.off('offer-accepted', handleAccepted);
            socket.off('offer-rejected', handleRejected);
        };
    }, [socket, bookingId, user]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [booking?.negotiationHistory, view]);

    const fetchBooking = async () => {
        try {
            const res = await axios.get(`/bookings/${bookingId}`);
            if (res.data.success) {
                setBooking(res.data.data);
                setCounterPrice(res.data.data.offerPrice || res.data.data.totalAmount);
            }
        } catch (err) {
            toast.error("Failed to fetch negotiation data.");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (actionType) => {
        setIsSubmitting(true);
        const originalBooking = { ...booking };

        // Create optimistic state update
        let optimisticBooking = { ...booking };
        if (actionType === 'accept') {
            optimisticBooking.status = 'confirmed';
        } else if (actionType === 'reject') {
            optimisticBooking.status = 'rejected';
        } else if (actionType === 'counter') {
            optimisticBooking.status = 'negotiating';
            optimisticBooking.offerPrice = Number(counterPrice);
            
            // Add optimistic history item. The field must be `message` to
            // match what the server stores, otherwise the note vanishes the
            // moment the real booking is refetched.
            const newHistoryItem = {
                price: Number(counterPrice),
                message: note,
                offeredBy: user?._id || user?.id,
                timestamp: new Date().toISOString()
            };
            optimisticBooking.negotiationHistory = [
                ...(booking.negotiationHistory || []),
                newHistoryItem
            ];
        }

        // Apply optimistic update immediately
        setBooking(optimisticBooking);
        const previousNote = note;
        if (actionType === 'counter') setNote('');

        try {
            let res;
            if (actionType === 'counter') {
                res = await axios.post(`/bookings/${bookingId}/negotiate`, {
                    price: Number(counterPrice),
                    message: previousNote
                });
            } else if (actionType === 'accept') {
                res = await axios.put(`/bookings/${bookingId}/accept`);
            } else if (actionType === 'reject') {
                res = await axios.put(`/bookings/${bookingId}/reject`);
            }

            if (res.data.success) {
                toast.success({ accept: 'Offer accepted. The booking is confirmed.', counter: 'Counter offer sent.', reject: 'Offer declined.' }[actionType] || 'Done.');
                // The reply lacks the populated event and people; reload the full booking.
                await fetchBooking();
            } else {
                throw new Error("Action not marked successful");
            }
        } catch (err) {
            // Rollback optimistic update
            setBooking(originalBooking);
            if (actionType === 'counter') setNote(previousNote);
            toast.error(err.response?.data?.message || `Action '${actionType}' failed.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-ink pt-24 pb-20 px-6 animate-pulse">
            <div className="max-w-4xl mx-auto space-y-8 flex flex-col h-[calc(100vh-140px)]">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border flex-shrink-0">
                    <div>
                        <div className="w-16 h-4 bg-fg/5 rounded-md mb-4"></div>
                        <div className="w-64 h-10 bg-fg/5 rounded-xl"></div>
                        <div className="w-40 h-4 bg-fg/5 rounded-md mt-2"></div>
                    </div>
                    <div className="text-right">
                        <div className="w-24 h-3 bg-fg/5 rounded-md mb-1 ml-auto"></div>
                        <div className="w-32 h-10 bg-fg/5 rounded-xl ml-auto"></div>
                        <div className="w-20 h-3 bg-fg/5 rounded-md mt-1 ml-auto"></div>
                    </div>
                </div>
                <div className="flex-1 bg-fg/5 rounded-[32px] border border-border"></div>
                <div className="h-32 bg-fg/5 rounded-3xl border border-border flex-shrink-0"></div>
            </div>
        </div>
    );

    if (!booking) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ink text-fg">
            <h2 className="text-2xl font-bold mb-4">Booking not found</h2>
            <button onClick={() => navigate(-1)} className="text-brand hover:text-indigo-300">Go Back</button>
        </div>
    );

    const myIdStr = (user?._id || user?.id)?.toString();
    const vendorIdStr = (booking.vendorId?._id || booking.vendorId)?.toString();
    const customerIdStr = (booking.customerId?._id || booking.customerId)?.toString();
    const iAmVendor = vendorIdStr === myIdStr;
    const other = iAmVendor ? booking.customerId : booking.vendorId;
    const otherName = other?.name || (iAmVendor ? 'The organizer' : 'The vendor');
    const history = booking.negotiationHistory || [];
    const canAction = ['pending', 'negotiating'].includes(booking.status);
    const accepted = ['accepted', 'confirmed', 'completed'].includes(booking.status);
    const isCompleted = !canAction;
    const currentPrice = booking.offerPrice || booking.totalAmount;

    // Whose turn: the side that did NOT make the last offer. With no history
    // the customer opened the booking, so the vendor answers first.
    const last = history[history.length - 1];
    const lastBy = (last?.offeredBy?._id || last?.offeredBy)?.toString();
    const isMyTurn = last ? lastBy !== myIdStr : iAmVendor;

    const eventName = booking.eventId?.title
        || (booking.serviceId?.title ? `${booking.serviceId.title} package` : null)
        || booking.designConcepts?.find((c) => c.selected)?.title
        || booking.eventDetails?.eventType
        || 'Custom booking';

    const statusStyle = accepted ? 'bg-emerald-500/15 text-success'
        : ['rejected', 'cancelled'].includes(booking.status) ? 'bg-rose-500/15 text-rose-500'
            : 'bg-amber-500/15 text-amber-500';
    const statusLabel = booking.status === 'confirmed' ? 'accepted' : booking.status;

    const money = (n) => `$${Number(n || 0).toLocaleString()}`;
    const dayLabel = (d) => new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const timeLabel = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const actionLabel = { offer: 'Opening offer', counter: 'Counter-offer', accepted: 'Accepted', rejected: 'Declined' };

    const sendCounter = (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        if (!(Number(counterPrice) > 0)) {
            toast.error('Enter a price greater than zero.');
            return;
        }
        handleAction('counter');
    };

    return (
        <div className="min-h-screen bg-ink text-fg pt-24 pb-16 px-4 sm:px-6">
            <div className={`${view === 'design' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto space-y-5`}>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="min-w-0">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-fg transition-colors group mb-3">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                        </button>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">{eventName}</h2>
                        {other?._id && (
                            <p className="text-muted text-sm mt-1">
                                Negotiating with{' '}
                                <button type="button" onClick={() => navigate(iAmVendor ? `/organizer/${other._id}` : `/vendor/${other._id}`)}
                                    className="text-brand font-bold hover:underline">{other.name}</button>
                                <span className="text-xs"> ({iAmVendor ? 'organizer' : 'vendor'})</span>
                            </p>
                        )}
                    </div>
                    <div className="sm:text-right flex-shrink-0">
                        <p className="text-[10px] font-black uppercase text-muted tracking-widest">Current offer</p>
                        <AnimatedPrice price={currentPrice} className="text-3xl sm:text-4xl font-black text-emerald" />
                        <p className="text-[10px] font-bold text-muted uppercase mt-1">Listed at ${booking.eventId?.price || booking.serviceId?.price || booking.totalAmount || booking.offerPrice}</p>
                    </div>
                </div>

                <div role="tablist" aria-label="Booking workspace" className="flex gap-1 bg-surface-2 p-1 rounded-full w-fit">
                    {[['offers', 'Price negotiation'], ['design', 'Design Studio']].map(([key, label]) => (
                        <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => setView(key)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${view === key ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-fg'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {view === 'design' && <DesignStudio bookingId={bookingId} currentUserId={user?._id || user?.id} />}

                {view === 'offers' && (
                    <section aria-label="Price negotiation" className="bg-surface border border-border rounded-3xl shadow-xl overflow-hidden flex flex-col h-[min(72vh,680px)] min-h-[440px]">
                        {/* Box header: who you are talking to */}
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-2/60">
                            <div className="w-10 h-10 rounded-full bg-brand/15 text-brand flex items-center justify-center font-black text-sm flex-shrink-0" aria-hidden="true">
                                {otherName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm truncate">{otherName}</p>
                                <p className="text-[11px] text-muted">{iAmVendor ? 'Organizer' : 'Vendor'} · {history.length} {history.length === 1 ? 'message' : 'messages'}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black ${statusStyle}`}>{statusLabel}</span>
                        </div>

                        {/* Messages */}
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 bg-bg/40">
                            {history.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted gap-3 text-center">
                                    <MessageSquare size={40} className="opacity-30" aria-hidden="true" />
                                    <p className="text-sm font-semibold">No offers yet</p>
                                    <p className="text-xs max-w-xs">Offers and counter-offers will appear here as messages.</p>
                                </div>
                            ) : history.map((item, index) => {
                                const by = (item.offeredBy?._id || item.offeredBy)?.toString();
                                const mine = by === myIdStr;
                                const when = item.timestamp || Date.now();
                                const prev = history[index - 1];
                                const newDay = !prev || dayLabel(prev.timestamp || Date.now()) !== dayLabel(when);
                                const senderName = mine ? 'You' : ((by === customerIdStr ? booking.customerId?.name : booking.vendorId?.name) || otherName);
                                const text = item.message || item.note;
                                const isFinal = item.action === 'accepted' || item.action === 'rejected';

                                return (
                                    <React.Fragment key={item._id || index}>
                                        {newDay && (
                                            <div className="flex items-center gap-3 py-1" aria-hidden="true">
                                                <div className="flex-1 h-px bg-border" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{dayLabel(when)}</span>
                                                <div className="flex-1 h-px bg-border" />
                                            </div>
                                        )}
                                        {isFinal ? (
                                            <div className="flex justify-center">
                                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold ${item.action === 'accepted' ? 'bg-emerald-500/15 text-success' : 'bg-rose-500/15 text-rose-500'}`}>
                                                    {item.action === 'accepted' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                    {senderName} {item.action === 'accepted' ? 'accepted' : 'declined'} {money(item.price)} · {timeLabel(when)}
                                                </span>
                                            </div>
                                        ) : (
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {!mine && (
                                                    <div className="w-7 h-7 rounded-full bg-surface-2 border border-border text-muted flex items-center justify-center text-[11px] font-black flex-shrink-0" aria-hidden="true">
                                                        {senderName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className={`max-w-[85%] sm:max-w-[65%] rounded-2xl px-4 py-3 shadow-sm ${mine
                                                    ? 'bg-brand text-white rounded-br-md'
                                                    : 'bg-surface border border-border rounded-bl-md'}`}>
                                                    <div className={`flex items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-widest ${mine ? 'text-white/75' : 'text-muted'}`}>
                                                        <span>{senderName}</span>
                                                        <span>{actionLabel[item.action] || 'Offer'}</span>
                                                    </div>
                                                    <p className="text-2xl font-black mt-1">{money(item.price)}</p>
                                                    {text && <p className={`text-sm mt-1 leading-relaxed whitespace-pre-wrap break-words ${mine ? 'text-white/90' : 'text-fg/80'}`}>{text}</p>}
                                                    <p className={`text-[10px] mt-2 text-right ${mine ? 'text-white/60' : 'text-muted'}`}>{timeLabel(when)}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Reply bar */}
                        <div className="border-t border-border bg-surface px-4 sm:px-5 py-4">
                            {canAction && isMyTurn && (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-xs text-muted mr-auto">
                                            {last ? <>{otherName} offered <span className="font-black text-fg">{money(currentPrice)}</span>. Accept it, decline, or reply with a counter-offer.</>
                                                : <>Offer on the table: <span className="font-black text-fg">{money(currentPrice)}</span>.</>}
                                        </p>
                                        <button type="button" onClick={() => handleAction('reject')} disabled={isSubmitting}
                                            className="px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-50">
                                            <X size={14} /> Decline
                                        </button>
                                        <button type="button" onClick={() => handleAction('accept')} disabled={isSubmitting}
                                            className="px-4 py-2 rounded-xl flex items-center gap-1.5 font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-50 active:scale-95">
                                            <Check size={14} /> Accept {money(currentPrice)}
                                        </button>
                                    </div>
                                    <form onSubmit={sendCounter} className="flex items-end gap-2">
                                        <label className="relative w-28 sm:w-36 flex-shrink-0">
                                            <span className="sr-only">Counter price</span>
                                            <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" aria-hidden="true" />
                                            <input
                                                type="number"
                                                min="1"
                                                value={counterPrice}
                                                onChange={(e) => setCounterPrice(e.target.value)}
                                                className="w-full bg-bg text-fg border border-border rounded-2xl py-3 pl-8 pr-2 font-black outline-none focus:border-brand transition-all"
                                            />
                                        </label>
                                        <label className="flex-1 min-w-0">
                                            <span className="sr-only">Message</span>
                                            <textarea
                                                rows={1}
                                                value={note}
                                                maxLength={500}
                                                onChange={(e) => setNote(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendCounter(e); }}
                                                placeholder="Write a message with your counter-offer..."
                                                className="block w-full resize-none bg-bg text-fg placeholder:text-muted border border-border rounded-2xl py-3 px-4 text-sm outline-none focus:border-brand transition-all max-h-32"
                                            />
                                        </label>
                                        <button type="submit" disabled={isSubmitting} aria-label="Send counter-offer"
                                            className="h-[46px] px-4 rounded-2xl bg-brand text-white flex items-center gap-2 font-bold text-xs hover:opacity-90 transition-all disabled:opacity-50 flex-shrink-0">
                                            <Send size={15} aria-hidden="true" /> <span className="hidden sm:inline">Counter</span>
                                        </button>
                                    </form>
                                </div>
                            )}

                            {canAction && !isMyTurn && (
                                <div className="flex flex-wrap items-center justify-center gap-2 py-2 text-sm text-muted text-center">
                                    <Clock size={16} aria-hidden="true" />
                                    Waiting for {otherName} to reply to your offer of <span className="font-black text-fg">{money(currentPrice)}</span>
                                </div>
                            )}

                            {isCompleted && (
                                <div className={`flex items-center justify-center gap-2 py-2 text-sm font-bold ${accepted ? 'text-success' : 'text-rose-500'}`}>
                                    {accepted ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                                    {accepted
                                        ? `Agreed at ${money(currentPrice)}. This negotiation is closed.`
                                        : `This negotiation was ${statusLabel}.`}
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default NegotiationPage;
