import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Calendar, DollarSign, MessageSquare, CheckCircle2, ArrowRight, ShieldCheck, Clock, MapPin } from 'lucide-react';
import StatCard from '../../components/common/StatCard';

const STATUS_MAP = {
    pending: 'Pending Initial Quote',
    negotiating: 'In Negotiation',
    confirmed: 'Confirmed & Escrow Locked',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    disputed: 'Disputed Escrow',
    completed: 'Completed & Released'
};

export default function Leads({ user }) {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/bookings/organizer');
            if (res.data.success) {
                setLeads(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load incoming leads.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = (booking) => {
        const bookingId = booking._id.toUpperCase();
        const customerName = booking.customerId?.name || 'Valued Customer';
        const vendorName = user?.name || 'Verified Provider';
        const eventType = booking.eventDetails?.eventType || 'Event Service';
        const date = new Date(booking.eventDetails?.date || booking.createdAt).toLocaleDateString();
        const location = booking.eventDetails?.location || 'Main Ballroom';
        const price = booking.offerPrice.toLocaleString();
        const status = booking.status === 'confirmed' ? 'SECURED IN ESCROW' : booking.status === 'completed' ? 'RELEASED & SETTLED' : 'PENDING SETTLEMENT';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${bookingId}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111827; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #E5E7EB; padding-bottom: 20px; margin-bottom: 40px; }
                        .title { font-size: 24px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; }
                        .badge { display: inline-block; background: #0ABF53; color: white; padding: 6px 12px; border-radius: 9999px; font-size: 10px; font-weight: 800; font-family: monospace; }
                        .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                        .section-title { font-size: 10px; font-weight: 800; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; }
                        .info-val { font-size: 14px; font-weight: 600; color: #374151; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                        th { font-size: 10px; font-weight: 800; color: #9CA3AF; text-transform: uppercase; border-bottom: 1px solid #E5E7EB; padding: 12px 8px; text-align: left; }
                        td { padding: 16px 8px; border-bottom: 1px solid #F3F4F6; font-size: 13px; font-weight: 600; }
                        .total-box { display: flex; justify-content: flex-end; align-items: center; gap: 20px; font-size: 18px; font-weight: 900; }
                        .total-val { font-size: 24px; color: #0ABF53; }
                        .footer { font-size: 10px; color: #9CA3AF; text-align: center; margin-top: 80px; border-top: 1px dashed #E5E7EB; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="title">SmartEvents Invoice</div>
                            <div style="font-size: 11px; color: #9CA3AF; font-family: monospace; font-weight: bold; margin-top: 4px;">SERIAL ID: #${bookingId}</div>
                        </div>
                        <div style="text-align: right;">
                            <span class="badge">${status}</span>
                            <div style="font-size: 11px; color: #6B7280; font-weight: 600; margin-top: 6px;">Date: ${date}</div>
                        </div>
                    </div>
                    <div class="grid">
                        <div>
                            <div class="section-title">Billed To</div>
                            <div class="info-val" style="font-size: 16px; font-weight: 800; color: #111827;">${customerName}</div>
                            <div class="info-val">Event Organizer</div>
                        </div>
                        <div style="text-align: right;">
                            <div class="section-title">Issued By</div>
                            <div class="info-val" style="font-size: 16px; font-weight: 800; color: #111827;">${vendorName}</div>
                            <div class="info-val">Event Service Provider</div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Service Package Details</th>
                                <th style="text-align: right;">Agreed Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <div style="font-weight: 800; font-size: 14px; color: #111827;">${eventType}</div>
                                    <div style="font-size: 11px; color: #6B7280; font-weight: 500; margin-top: 4px;">Location: ${location}</div>
                                </td>
                                <td style="text-align: right; font-size: 16px; font-weight: 800; color: #111827;">$${price}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="total-box">
                        <span>LOCKED ESCROW AMOUNT:</span>
                        <span class="total-val">$${price} USD</span>
                    </div>
                    <div class="footer">
                        <p>Secured via SmartEvents Escrow Protocol. Payment is held in secure escrow vault until event completion verification.</p>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    const filteredLeads = leads.filter(l => {
        if (filterStatus === 'all') return true;
        if (filterStatus === 'active') return ['pending', 'negotiating'].includes(l.status);
        return l.status === filterStatus;
    });

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR NEGOTIATION CENTER</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Incoming Leads & Counter-Bids
                    </h1>
                    <p className="text-xs text-muted font-medium">Respond to organizer RFP proposals and exchange counter-offers in real-time.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="TOTAL PROPOSALS" value={leads.length} icon={MessageSquare} />
                <StatCard label="ACTIVE CHATS" value={leads.filter(l => ['pending', 'negotiating'].includes(l.status)).length} icon={Clock} />
                <StatCard label="LOCKED ESCROWS" value={leads.filter(l => l.status === 'confirmed').length} icon={CheckCircle2} />
                <StatCard label="POTENTIAL REVENUE" value={`$${leads.reduce((acc, l) => acc + l.offerPrice, 0).toLocaleString()}`} icon={DollarSign} />
            </div>

            {/* Status Filter Tab row */}
            <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
                {[
                    { label: 'All Proposals', value: 'all' },
                    { label: 'Active Negotiations', value: 'active' },
                    { label: 'Confirmed Deals', value: 'confirmed' },
                    { label: 'Cancelled Bids', value: 'cancelled' }
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilterStatus(tab.value)}
                        className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all whitespace-nowrap ${filterStatus === tab.value ? 'bg-success text-white shadow-sm' : 'bg-surface border border-border text-muted hover:text-fg'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Leads list grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                    <div className="h-44 bg-surface border border-border rounded-3xl"></div>
                    <div className="h-44 bg-surface border border-border rounded-3xl"></div>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="adyen-card p-12 text-center text-muted bg-surface border border-border max-w-xl">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-15 text-muted" />
                    <h3 className="text-base font-bold text-fg">No leads found</h3>
                    <p className="text-xs text-muted font-semibold mt-1">Once event organizers send you custom bids, they will show up in this center.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredLeads.map(lead => (
                        <div
                            key={lead._id}
                            className="adyen-card p-6 bg-surface border border-border rounded-3xl flex flex-col justify-between space-y-4 hover:border-success shadow-sm transition-all"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="adyen-badge bg-success/10 text-success border-none font-bold uppercase">
                                        {lead.eventDetails?.eventType || 'RFP Counter-offer'}
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                        lead.status === 'confirmed' || lead.status === 'completed'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-amber-100 text-amber-800'
                                    }`}>
                                        {STATUS_MAP[lead.status] || lead.status}
                                    </span>
                                </div>

                                <h3 className="text-lg font-bold text-fg truncate">
                                    Lead from {lead.customerId?.name || 'Verified Organizer'}
                                </h3>

                                <div className="space-y-1 text-xs text-muted font-semibold">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-success" />
                                        <span>{new Date(lead.eventDetails?.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-success" />
                                        <span>{lead.eventDetails?.location}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] font-mono text-muted block uppercase font-bold">PROPOSED PRICE</span>
                                    <span className="text-xl font-black text-success">${lead.offerPrice.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {['confirmed', 'completed'].includes(lead.status) && (
                                        <button
                                            onClick={() => handleDownloadInvoice(lead)}
                                            className="btn-adyen-outline text-[10px] px-3.5 py-2 font-bold flex items-center gap-1"
                                        >
                                            <span>Invoice</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigate(`/negotiate/${lead._id}`)}
                                        className="btn-adyen-primary text-[10px] px-4 py-2 font-bold shadow-glow flex items-center gap-1.5"
                                    >
                                        <span>Open Bid Negotiation</span>
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
