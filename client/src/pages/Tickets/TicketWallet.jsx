import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket as TicketIcon, QrCode, Calendar, MapPin, Download, Search, ShieldCheck, X, Sparkles } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';

export default function TicketWallet({ user }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/tickets/my');
            if (res.data.success) {
                setTickets(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load tickets.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    // The wallet previously fell back to two invented demo tickets when the
    // database returned nothing, so an empty wallet looked populated.
    const filteredTickets = tickets.filter(t =>
        t.event?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ticketNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">ATTENDEE PASS WALLET</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Digital Ticket Passes & QR Wallet
                    </h1>
                    <p className="text-xs text-muted font-medium">Scan your encrypted QR passes for staff gate entry.</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-3 text-muted" size={16} />
                    <input
                        type="text"
                        placeholder="Search passes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-full pl-10 pr-4 py-2.5 text-xs text-fg outline-none focus:border-success"
                    />
                </div>
            </div>

            {/* Passes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredTickets.map(ticket => (
                    <div
                        key={ticket._id}
                        className="adyen-card p-6 bg-surface border border-border rounded-3xl flex flex-col justify-between space-y-6 hover:border-success shadow-md cursor-pointer"
                        onClick={() => setSelectedTicket(ticket)}
                    >
                        <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <span className="adyen-badge bg-success/10 text-success border-none font-bold">
                                    {ticket.passTier || 'VIP Premium Pass'}
                                </span>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                    ticket.status === 'valid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                    {ticket.status}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-fg">{ticket.event?.title || 'Public Event'}</h3>

                            <div className="space-y-1 text-xs text-muted font-semibold pt-1">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-success" />
                                    <span>{new Date(ticket.event?.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-success" />
                                    <span>{ticket.event?.location || 'Main Arena'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-surface-2 border border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <QrCode size={28} className="text-success" />
                                <div>
                                    <span className="text-[10px] font-mono text-muted block uppercase font-bold">TICKET SERIAL</span>
                                    <span className="text-xs font-mono font-bold text-fg">{ticket.ticketNumber}</span>
                                </div>
                            </div>
                            <span className="text-xs text-success font-bold">View QR Pass →</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selected Ticket Drawer / Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="adyen-card max-w-sm w-full bg-surface p-6 border border-border rounded-3xl space-y-6 shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedTicket(null)}
                                className="absolute top-4 right-4 text-muted hover:text-fg"
                            >
                                <X size={20} />
                            </button>

                            <div className="text-center space-y-1">
                                <span className="adyen-badge bg-success/15 text-success border-none font-bold uppercase mx-auto">
                                    {selectedTicket.passTier || 'VIP Premium Pass'}
                                </span>
                                <h3 className="text-lg font-bold text-fg">{selectedTicket.event?.title || 'Public Event'}</h3>
                            </div>

                            <div className="bg-surface-2 p-6 rounded-2xl border border-border flex flex-col items-center justify-center space-y-4">
                                <img
                                    src={selectedTicket.qrCode}
                                    alt={`QR pass for ticket ${selectedTicket.ticketNumber}`}
                                    className="w-44 h-44 bg-surface p-2 rounded-xl shadow-sm border border-border"
                                />
                                <div className="text-center">
                                    <span className="text-[10px] font-mono text-muted block uppercase font-bold">PASS SERIAL NUMBER</span>
                                    <span className="text-xs font-mono font-bold text-fg">{selectedTicket.ticketNumber}</span>
                                </div>
                            </div>

                            <div className="text-xs font-semibold text-muted space-y-2 pt-2 border-t border-border">
                                <div className="flex justify-between">
                                    <span>Date:</span>
                                    <span className="text-fg">{new Date(selectedTicket.event?.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Venue:</span>
                                    <span className="text-fg truncate max-w-[200px]">{selectedTicket.event?.location}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Holder:</span>
                                    <span className="text-fg">{user?.name}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
