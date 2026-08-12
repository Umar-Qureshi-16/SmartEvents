import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Calendar, DollarSign, MapPin, CheckCircle2, ArrowRight,
    MessageSquare, FileText, AlertTriangle, XCircle
} from 'lucide-react';

import axios from '../../api/axios';
import StatCard from '../../components/common/StatCard';
import {
    Button, Card, Badge, Textarea, Modal, SkeletonList, EmptyState, ErrorState,
    formatCurrency, formatDate, BOOKING_STATUS
} from '../../components/ui';

const FILTERS = ['all', 'pending', 'negotiating', 'confirmed', 'completed', 'disputed', 'cancelled'];

export default function Bookings({ user }) {
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState('all');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [disputeTarget, setDisputeTarget] = useState(null);
    const [disputeReason, setDisputeReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [cancelTarget, setCancelTarget] = useState(null);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/bookings/my');
            setBookings(res.data.data || []);
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

    // PUT /bookings/:id/cancel existed but nothing on the client called it,
    // so a customer could never withdraw an offer they had made.
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
        () => (filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus)),
        [bookings, filterStatus]
    );

    const totals = useMemo(() => ({
        all: bookings.length,
        negotiating: bookings.filter(b => b.status === 'negotiating').length,
        confirmed: bookings.filter(b => ['confirmed', 'completed'].includes(b.status)).length,
        value: bookings
            .filter(b => ['confirmed', 'completed'].includes(b.status))
            .reduce((acc, b) => acc + (b.offerPrice || 0), 0),
    }), [bookings]);

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Badge tone="brand">My bookings</Badge>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Bookings &amp; negotiations</h1>
                    <p className="text-sm text-muted">
                        Track your offers, counter-offers, and confirmed bookings with providers.
                    </p>
                </div>
                <Button variant="secondary" onClick={() => navigate('/events')}>Browse events</Button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="TOTAL BOOKINGS" value={totals.all} icon={Calendar} />
                <StatCard label="IN NEGOTIATION" value={totals.negotiating} icon={MessageSquare} />
                <StatCard label="CONFIRMED" value={totals.confirmed} icon={CheckCircle2} />
                <StatCard label="AGREED VALUE" value={formatCurrency(totals.value)} icon={DollarSign} />
            </div>

            <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
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

            {loading ? (
                <SkeletonList count={4} height="h-48" />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchBookings} />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title={filterStatus === 'all' ? 'No bookings yet' : `No ${BOOKING_STATUS[filterStatus]?.label.toLowerCase()} bookings`}
                    description={
                        filterStatus === 'all'
                            ? 'When you make an offer on an event or a provider, it will appear here.'
                            : 'Try a different filter to see your other bookings.'
                    }
                    action={filterStatus === 'all' ? { label: 'Explore events', to: '/events' } : undefined}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map(booking => {
                        const status = BOOKING_STATUS[booking.status] || { label: booking.status, tone: 'neutral' };
                        const canDispute = ['confirmed', 'completed'].includes(booking.status);
                        const canNegotiate = ['pending', 'negotiating'].includes(booking.status);

                        return (
                            <Card key={booking._id} className="p-6 flex flex-col justify-between gap-4 hover:border-brand/40 transition-colors">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge tone="brand">{booking.eventDetails?.eventType || 'Custom request'}</Badge>
                                        <Badge tone={status.tone}>{status.label}</Badge>
                                    </div>

                                    <h2 className="text-lg font-bold truncate">
                                        {booking.eventId?.title || `Booking with ${booking.vendorId?.name || 'provider'}`}
                                    </h2>

                                    <div className="space-y-1.5 text-xs text-muted font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={13} className="text-brand" aria-hidden="true" />
                                            <span>{formatDate(booking.eventDetails?.date)}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={13} className="text-brand" aria-hidden="true" />
                                            <span>{booking.eventDetails?.location || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-border flex flex-wrap items-end justify-between gap-3">
                                    <div>
                                        <span className="text-[10px] font-mono text-muted block uppercase font-bold">
                                            {canNegotiate ? 'Current offer' : 'Agreed price'}
                                        </span>
                                        <span className="text-xl font-black text-success">
                                            {formatCurrency(booking.offerPrice)}
                                        </span>
                                        {booking.lastPrice > 0 && booking.lastPrice !== booking.offerPrice && (
                                            <span className="text-[10px] text-muted ml-2 line-through">
                                                {formatCurrency(booking.lastPrice)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canDispute && (
                                            <>
                                                <Button size="sm" variant="ghost" icon={FileText}
                                                        onClick={() => handleDownloadInvoice(booking)}>
                                                    Invoice
                                                </Button>
                                                <Button size="sm" variant="outline" icon={AlertTriangle}
                                                        onClick={() => setDisputeTarget(booking)}>
                                                    Dispute
                                                </Button>
                                            </>
                                        )}
                                        {canNegotiate && (
                                            <Button size="sm" variant="ghost" icon={XCircle}
                                                    onClick={() => setCancelTarget(booking)}
                                                    className="!text-danger hover:!bg-danger/10">
                                                Withdraw
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={() => navigate(`/negotiate/${booking._id}`)}>
                                            {canNegotiate ? 'Negotiate' : 'View'} <ArrowRight size={12} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

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
                    Your offer on <strong className="text-fg">
                        {cancelTarget?.eventId?.title || cancelTarget?.eventDetails?.eventType || 'this booking'}
                    </strong> will be cancelled and the provider notified. You can always make a new offer later.
                </p>
            </Modal>

            <Modal
                open={Boolean(disputeTarget)}
                onClose={() => { setDisputeTarget(null); setDisputeReason(''); }}
                title="Raise a dispute"
                description={
                    disputeTarget
                        ? `${disputeTarget.eventId?.title || 'This booking'} · ${formatCurrency(disputeTarget.offerPrice)}`
                        : ''
                }
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
          ${formatDate(booking.eventDetails?.date)} &middot; ${esc(booking.eventDetails?.location || '')}
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
