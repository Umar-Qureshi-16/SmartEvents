import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, Send, Plus, DollarSign, Clock, Check, X } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import AnimatedPrice from '../../components/AnimatedPrice';
import { useWebSockets } from '../../context/WebSocketContext';
import { useSelector } from 'react-redux';

const NegotiationPage = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [counterPrice, setCounterPrice] = useState('');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    }, [booking?.negotiationHistory]);

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
                toast.success(`Action '${actionType}' successful.`);
                setBooking(res.data.data);
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
            <button onClick={() => navigate(-1)} className="text-indigo-400 hover:text-indigo-300">Go Back</button>
        </div>
    );

    const isCustomer = user?.role === 'customer';
    const isVendor = user?.role === 'provider' || user?.role === 'vendor';
    const canAction = ['pending', 'negotiating'].includes(booking.status);

    // Determine whose turn it is
    // If the last actor was customer, it's vendor's turn, and vice versa.
    const lastHistoryItem = booking.negotiationHistory && booking.negotiationHistory.length > 0
        ? booking.negotiationHistory[booking.negotiationHistory.length - 1]
        : null;

    let isMyTurn = true;
    const customerIdStr = (booking.customerId?._id || booking.customerId)?.toString();
    if (lastHistoryItem) {
        const lastOfferedById = lastHistoryItem.offeredBy?._id || lastHistoryItem.offeredBy;
        const lastActorWasCustomer = lastOfferedById?.toString() === customerIdStr;
        if (isCustomer && lastActorWasCustomer) isMyTurn = false;
        if (isVendor && !lastActorWasCustomer) isMyTurn = false;
    } else {
        // If no history, typically customer creates it, so it's vendor's turn.
        isMyTurn = isVendor;
    }

    const isCompleted = ['accepted', 'confirmed', 'rejected', 'cancelled'].includes(booking.status);

    return (
        <div className="min-h-screen bg-ink text-fg pt-24 pb-20 px-6">
            <div className="max-w-4xl mx-auto space-y-8 flex flex-col h-[calc(100vh-140px)]">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border flex-shrink-0">
                    <div>
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted hover:text-fg transition-colors group mb-4">
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                        </button>
                        <h2 className="text-3xl font-extrabold text-fg tracking-tight flex items-center gap-3">
                            Negotiation Thread
                            <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-widest font-bold ${['accepted', 'confirmed'].includes(booking.status) ? 'bg-emerald/20 text-emerald' :
                                booking.status === 'rejected' ? 'bg-red/20 text-red' :
                                    'bg-coral/20 text-coral'
                                }`}>
                                {booking.status === 'confirmed' ? 'accepted' : booking.status}
                            </span>
                        </h2>
                        <p className="text-muted mt-2">
                            Event: <span className="text-fg font-medium">{booking.eventId?.title || 'Unknown Event'}</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-muted tracking-widest">Current Offer</p>
                        <AnimatedPrice price={booking.offerPrice || booking.totalAmount} className="text-4xl font-black text-emerald" />
                        <p className="text-[10px] font-bold text-muted uppercase mt-1">Base: ${booking.eventId?.price || booking.totalAmount}</p>
                    </div>
                </div>

                {isCompleted && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-xl flex items-center justify-center gap-3 font-bold text-sm tracking-widest uppercase flex-shrink-0 ${['accepted', 'confirmed'].includes(booking.status) ? 'bg-emerald/20 text-emerald' : 'bg-red/20 text-red'
                        }`}>
                        {['accepted', 'confirmed'].includes(booking.status) ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        Negotiation {booking.status === 'confirmed' ? 'accepted' : booking.status}
                    </motion.div>
                )}

                {/* Chat Section */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 glass rounded-[32px] border-border p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-white/10"
                >
                    {(!booking.negotiationHistory || booking.negotiationHistory.length === 0) ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted space-y-4">
                            <Clock size={48} className="opacity-20" />
                            <p className="text-sm font-bold tracking-widest uppercase">Waiting for negotiation history...</p>
                        </div>
                    ) : (
                        booking.negotiationHistory.map((item, index) => {
                            const offeredById = (item.offeredBy?._id || item.offeredBy)?.toString();
                            const currentUserId = (user?._id || user?.id)?.toString();
                            const customerIdStr = (booking.customerId?._id || booking.customerId)?.toString();

                            const isMyMessage = offeredById === currentUserId;
                            const isCustomerMsg = offeredById === customerIdStr;

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`flex w-full ${isCustomerMsg ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] md:max-w-[60%] flex flex-col ${isCustomerMsg ? 'items-end' : 'items-start'}`}>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2 ${isCustomerMsg ? 'text-indigo-400' : 'text-muted'}`}>
                                            {isCustomerMsg ? 'Customer' : 'Provider'}
                                            <span className="text-muted font-normal">
                                                {new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div className={`p-5 rounded-3xl space-y-3 shadow-xl ${isCustomerMsg
                                            ? 'bg-indigo-600/20 border border-indigo-500/30 rounded-tr-sm'
                                            : 'bg-fg/5 border border-border rounded-tl-sm'
                                            }`}>
                                            <div className="flex items-center gap-3 border-b border-border pb-3">
                                                <div className="flex bg-fg/40 px-3 py-1.5 rounded-xl items-center gap-1.5">
                                                    <DollarSign size={14} className={isCustomerMsg ? "text-indigo-400" : "text-white"} />
                                                    <span className="text-lg font-black">{item.price}</span>
                                                </div>
                                                <span className={`text-[9px] px-2 py-1 rounded-md uppercase font-bold tracking-widest ${item.action === 'accepted' ? 'bg-emerald/20 text-emerald' :
                                                    item.action === 'rejected' ? 'bg-red/20 text-red' :
                                                        item.action === 'counter' ? 'bg-slate/10 text-slate' :
                                                            'bg-gold/20 text-gold'
                                                    }`}>
                                                    {item.action || 'proposed'}
                                                </span>
                                            </div>
                                            {(item.message || item.note) && (
                                                <p className="text-sm font-medium text-muted leading-relaxed">
                                                    {item.message || item.note}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>

                {/* Action Panel */}
                {canAction && isMyTurn && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-shrink-0 glass rounded-3xl border-indigo-500/20 bg-indigo-500/[0.03] p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1 space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest ml-1">Counter Price</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" />
                                    <input
                                        type="number"
                                        value={counterPrice}
                                        onChange={(e) => setCounterPrice(e.target.value)}
                                        className="w-full bg-fg/40 border border-border rounded-2xl py-3 pl-12 pr-4 font-black outline-none focus:ring-2 ring-indigo-500/30 transition-all text-lg"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest ml-1">Additional Note</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Explain your counter offer or ask a question..."
                                    className="w-full bg-fg/40 border border-border rounded-2xl py-3 px-4 font-medium outline-none focus:ring-2 ring-indigo-500/30 transition-all text-sm h-[52px]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => handleAction('reject')}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            >
                                <X size={14} /> Reject
                            </button>
                            <button
                                onClick={() => handleAction('counter')}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs bg-fg/5 border border-border hover:bg-surface/10 transition-all disabled:opacity-50"
                            >
                                <Send size={14} /> Counter Offer
                            </button>
                            <button
                                onClick={() => handleAction('accept')}
                                disabled={isSubmitting}
                                className="px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 active:scale-95"
                            >
                                <Check size={14} /> Accept Offer
                            </button>
                        </div>
                    </motion.div>
                )}

                {canAction && !isMyTurn && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-shrink-0 text-center py-6 text-muted flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        Waiting for other party to respond
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default NegotiationPage;
