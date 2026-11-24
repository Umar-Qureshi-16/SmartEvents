import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Download, Banknote, TrendingUp, Calendar, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '../../utils/money';

export default function Revenue({ user }) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRevenueData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/bookings/organizer');
            if (res.data.success) {
                setBookings(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load financial records.');
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
        const price = booking.offerPrice;
        const status = { held: 'HELD IN ESCROW (SIMULATED)', released: 'RELEASED & SETTLED', refunded: 'REFUNDED TO CUSTOMER' }[booking.escrow?.status] || 'PENDING SETTLEMENT';

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
                                <td style="text-align: right; font-size: 16px; font-weight: 800; color: #111827;">${formatMoney(price)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="total-box">
                        <span>LOCKED ESCROW AMOUNT:</span>
                        <span class="total-val">${formatMoney(price)}</span>
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
        fetchRevenueData();
    }, []);

    // Escrow ledger calculations
    const ledgerRows = bookings.filter(b => b.escrow?.status && b.escrow.status !== 'none');
    
    // Ledger from the escrow state recorded on each booking (simulated escrow).
    const amountOf = (b) => b.escrow?.amount ?? b.offerPrice;
    const heldBookings = bookings.filter(b => b.escrow?.status === 'held');
    const releasedBookings = bookings.filter(b => b.escrow?.status === 'released');
    const pendingEscrow = heldBookings.reduce((acc, b) => acc + amountOf(b), 0);
    const paidOut = releasedBookings.reduce((acc, b) => acc + amountOf(b), 0);
    const totalVolume = pendingEscrow + paidOut;

    // Released earnings per month for the last six months. Real data only:
    // this used to invent figures for June and July so the chart looked busy.
    const getChartData = () => {
        const now = new Date();
        const buckets = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            return { key: `${d.getFullYear()}-${d.getMonth()}`, name: d.toLocaleString('en', { month: 'short' }), earnings: 0 };
        });
        releasedBookings.forEach(b => {
            const d = new Date(b.escrow?.settledAt || b.updatedAt);
            const bucket = buckets.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
            if (bucket) bucket.earnings += amountOf(b);
        });
        return buckets.map(({ name, earnings }) => ({ name, earnings }));
    };

    const exportLedger = () => {
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const rows = [['Booking', 'Event date', 'Customer', 'Booking status', 'Escrow status', 'Amount'],
            ...bookings.map(b => [b._id, b.eventDetails?.date ? new Date(b.eventDetails.date).toISOString().slice(0, 10) : '',
                b.customerId?.name || '', b.status, b.escrow?.status || 'none', amountOf(b)])];
        const url = URL.createObjectURL(new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'escrow-ledger.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1440px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">REVENUE & ESCROW LEDGER</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Earnings & Payment Settlements
                    </h1>
                    <p className="text-xs text-muted font-medium">Track escrow held for your bookings and the funds released to you (simulated escrow).</p>
                </div>

                <button
                    onClick={exportLedger}
                    className="btn-adyen-outline text-xs px-5 py-2.5 font-bold"
                >
                    <Download size={15} />
                    <span>Export CSV Ledger</span>
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="adyen-card p-6 space-y-2 bg-surface border border-border shadow-sm">
                    <span className="text-[10px] font-mono text-muted uppercase font-bold">TOTAL ESCROW VOLUME</span>
                    <div className="text-3xl font-black text-success">{formatMoney(totalVolume)}</div>
                </div>

                <div className="adyen-card p-6 space-y-2 bg-surface border border-border shadow-sm">
                    <span className="text-[10px] font-mono text-muted uppercase font-bold">HELD IN ESCROW (PENDING)</span>
                    <div className="text-3xl font-black text-fg">{formatMoney(pendingEscrow)}</div>
                </div>

                <div className="adyen-card p-6 space-y-2 bg-surface border border-border shadow-sm">
                    <span className="text-[10px] font-mono text-muted uppercase font-bold">RELEASED TO YOU</span>
                    <div className="text-3xl font-black text-cyan-600">{formatMoney(paidOut)}</div>
                </div>
            </div>

            {/* Analytics Breakdown chart */}
            <div className="adyen-card p-6 bg-surface border border-border rounded-3xl shadow-sm space-y-4">
                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Earnings Performance Metrics</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getChartData()}>
                            <defs>
                                <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ABF53" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#0ABF53" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                            <YAxis stroke="#94a3b8" fontSize={11} />
                            <Tooltip />
                            <Area type="monotone" dataKey="earnings" stroke="#0ABF53" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="adyen-card rounded-3xl overflow-hidden border border-border bg-surface shadow-sm">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-bold text-fg">Escrow Transaction History</h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-muted font-mono text-[10px] uppercase font-bold animate-pulse">
                        Loading financial transaction ledger...
                    </div>
                ) : ledgerRows.length === 0 ? (
                    <div className="p-12 text-center text-muted font-mono text-[10px] uppercase font-bold">
                        No transactions registered.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs font-semibold">
                            <thead>
                                <tr className="bg-surface-2 text-muted font-mono text-[10px] uppercase border-b border-border">
                                    <th className="p-4">Transaction ID</th>
                                    <th className="p-4">Client</th>
                                    <th className="p-4">Amount ($)</th>
                                    <th className="p-4">Settlement Status</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Invoice</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB]">
                                {ledgerRows.map(tx => (
                                    <tr key={tx._id} className="hover:bg-surface-2 transition-colors">
                                        <td className="p-4 font-mono font-bold text-muted">{`TX-${tx._id.substring(18).toUpperCase()}`}</td>
                                        <td className="p-4 font-bold text-fg">{tx.customerId?.name || 'Client'}</td>
                                        <td className="p-4 font-black font-mono text-success">{formatMoney((tx.escrow.amount ?? tx.offerPrice))}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${tx.escrow.status === 'released' ? 'bg-emerald-100 text-emerald-700' : tx.escrow.status === 'held' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {{ held: 'Held in Escrow', released: 'Released Payout', refunded: 'Refunded' }[tx.escrow.status]}
                                            </span>
                                        </td>
                                        <td className="p-4 text-muted">{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <button onClick={() => handleDownloadInvoice(tx)} className="btn-adyen-outline text-[10px] px-3 py-1.5 font-bold inline-flex items-center gap-1">
                                                <Download size={12} /> Invoice
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
