import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Clock, ShieldCheck, User, DollarSign, Check, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSockets } from '../context/WebSocketContext';
import axios from '../api/axios';
import { toast } from 'react-hot-toast';
import AnimatedPrice from './AnimatedPrice';

export default function NegotiationEngine({ bookingId, currentUserRole, bookingData, onStatusUpdate }) {
    const { socket, connected } = useWebSockets();
    const [negotiation, setNegotiation] = useState(bookingData);
    const [messages, setMessages] = useState(bookingData.negotiationHistory || []);
    const [newMessage, setNewMessage] = useState('');
    const [offerPrice, setOfferPrice] = useState(bookingData.offerPrice);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef();

    useEffect(() => {
        if (socket && connected) {
            socket.emit('join-negotiation', bookingId);

            socket.on('offer-countered', (data) => {
                setMessages(prev => [...prev, data]);
                setNegotiation(prev => ({ ...prev, offerPrice: data.price, status: 'negotiating' }));
                toast.success(`New counter-offer: $${data.price}`);
            });

            socket.on('offer-accepted', () => {
                setNegotiation(prev => ({ ...prev, status: 'confirmed' }));
                toast.success('Offer Accepted!');
                if (onStatusUpdate) onStatusUpdate('confirmed');
            });

            socket.on('offer-rejected', () => {
                setNegotiation(prev => ({ ...prev, status: 'rejected' }));
                toast.error('Offer Rejected.');
                if (onStatusUpdate) onStatusUpdate('rejected');
            });
        }
        return () => {
            if (socket) {
                socket.emit('leave-negotiation', bookingId);
                socket.off('offer-countered');
                socket.off('offer-accepted');
                socket.off('offer-rejected');
            }
        };
    }, [socket, connected, bookingId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleNegotiate = async (e) => {
        e.preventDefault();
        if (!offerPrice || isNaN(offerPrice)) return;

        try {
            const res = await axios.post(`/bookings/${bookingId}/negotiate`, {
                price: Number(offerPrice),
                message: newMessage || 'Counter-offer submitted'
            });
            if (res.data.success) {
                setMessages(res.data.data.negotiationHistory);
                setNegotiation(res.data.data);
                setNewMessage('');
                toast.success('Counter-offer sent');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send offer');
        }
    };

    const handleStatusUpdate = async (status) => {
        try {
            const res = await axios.put(`/bookings/${bookingId}/${status}`);
            if (res.data.success) {
                setNegotiation(res.data.data);
                toast.success(`Booking ${status}`);
                if (onStatusUpdate) onStatusUpdate(status);
            }
        } catch (err) {
            toast.error(`Error: ${err.message}`);
        }
    };

    const isConfirmed = negotiation.status === 'confirmed';
    const isRejected = negotiation.status === 'rejected';
    const isCancelled = negotiation.status === 'cancelled';
    const isLocked = isConfirmed || isRejected || isCancelled;

    return (
        <div className="w-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${isOpen ? 'bg-emerald/10 border-emerald/30' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
                <div className="flex items-center gap-3">
                    <DollarSign size={18} className={isOpen ? 'text-emerald' : 'text-emerald'} />
                    <div className="text-left">
                        <span className={`text-sm font-bold block ${isOpen ? 'text-white' : 'text-slate-300'}`}>
                            Live Negotiation: <AnimatedPrice price={negotiation.offerPrice} className="font-mono text-emerald" />
                        </span>
                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{negotiation.status}</span>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isConfirmed ? 'bg-emerald/20 text-emerald' : isRejected ? 'bg-coral/20 text-coral' : 'bg-gold/20 text-gold'}`}>
                    {isOpen ? 'Close' : 'View Thread'}
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-4 glass rounded-2xl border-white/10 flex flex-col h-[500px] shadow-2xl relative">
                            {/* Negotiation Info */}
                            <div className="p-4 border-b border-white/5 grid grid-cols-2 gap-4 bg-white/[0.02]">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Active Offer</span>
                                    <AnimatedPrice price={negotiation.offerPrice} className="text-xl font-black text-emerald" />
                                </div>
                                <div className="space-y-1 text-right">
                                    <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Status</span>
                                    <div className={`text-xs font-black uppercase ${isConfirmed ? 'text-emerald' : 'text-gold'}`}>{negotiation.status}</div>
                                </div>
                            </div>

                            {/* Messages/History Area */}
                            <div
                                ref={scrollRef}
                                className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 custom-scrollbar"
                            >
                                {messages.map((m, idx) => {
                                    const offeredByMe = m.offeredBy === negotiation.customerId._id || m.offeredBy === negotiation.customerId;
                                    // In a real app, match with currentUser.id
                                    return (
                                        <div key={idx} className={`flex flex-col max-w-[85%] ${offeredByMe ? 'self-end items-end' : 'self-start items-start'}`}>
                                            <div className="px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-lg bg-white/5 border border-white/5 text-slate-200">
                                                <AnimatedPrice price={m.price} className="font-black text-gold mb-1 text-[11px]" />
                                                {m.message}
                                            </div>
                                            <span className="text-[8px] mt-1 text-slate-500 uppercase font-black px-1">{new Date(m.at || Date.now()).toLocaleTimeString()}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions / Input Area */}
                            {!isLocked && (
                                <div className="p-4 bg-white/[0.03] border-t border-white/5 space-y-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStatusUpdate('accept')}
                                            className="flex-1 bg-emerald/10 hover:bg-emerald/20 border border-emerald/20 text-emerald py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                        >
                                            <Check size={14} /> Accept Offer
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('reject')}
                                            className="flex-1 bg-coral/10 hover:bg-coral/20 border border-coral/20 text-coral py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                                        >
                                            <X size={14} /> Reject
                                        </button>
                                    </div>

                                    <form onSubmit={handleNegotiate} className="flex gap-3">
                                        <div className="w-32 relative">
                                            <DollarSign size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                type="number"
                                                value={offerPrice}
                                                onChange={(e) => setOfferPrice(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder:text-muted-foreground outline-none focus:ring-2 ring-emerald/50"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            placeholder="Message..."
                                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-5 py-3 text-sm text-white outline-none focus:ring-2 ring-emerald/50"
                                        />
                                        <button
                                            type="submit"
                                            className="grad-indigo p-3 rounded-xl hover:shadow-lg transition-all"
                                        >
                                            <Send size={18} className="text-white" />
                                        </button>
                                    </form>
                                </div>
                            )}

                            {isLocked && (
                                <div className="p-8 text-center bg-white/[0.03] border-t border-white/5">
                                    <div className="flex flex-col items-center gap-2 opacity-50">
                                        <AlertTriangle size={24} className="text-slate-500" />
                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest">
                                            Negotiation Closed Profile: {negotiation.status}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
