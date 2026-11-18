import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';

/**
 * A vendor's reputation: average stars (5 is best), how the ratings break
 * down, every review with the event it was for, and a form for customers who
 * have booked this vendor.
 */
export default function VendorReviews({ vendorId, onSummary }) {
    const { user } = useSelector((state) => state.auth);
    const [data, setData] = useState(null);
    const [eligible, setEligible] = useState([]);
    const [eventId, setEventId] = useState('');
    const [doneIds, setDoneIds] = useState([]); // events reviewed in this visit

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`/reviews/vendor/${vendorId}`);
            setData(res.data.data);
            onSummary?.(res.data.data.summary);
        } catch {
            setData({ summary: { average: 0, count: 0, distribution: {} }, reviews: [] });
        }
    }, [vendorId, onSummary]);

    useEffect(() => { load(); }, [load]);

    // Arriving from "Rate & review" (#reviews): bring the section into view.
    useEffect(() => {
        if (data && window.location.hash === '#reviews') {
            document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [data]);

    // Customers can review events they booked with this vendor (confirmed or completed).
    useEffect(() => {
        if (user?.role !== 'customer' || !data?.vendorUserId) return;
        axios.get('/bookings/my').then((res) => {
            const reviewed = new Set([...doneIds, ...(data.reviews || []).filter((r) => r.user?.name === user.name).map((r) => String(r.event?._id))]);
            const list = (res.data.data || [])
                .filter((b) => String(b.vendorId?._id || b.vendorId) === data.vendorUserId && ['confirmed', 'completed'].includes(b.status) && b.eventId?._id)
                .map((b) => ({ id: String(b.eventId._id), title: b.eventId.title }))
                .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i && !reviewed.has(e.id));
            setEligible(list);
            setEventId((cur) => cur || list[0]?.id || '');
        }).catch(() => setEligible([]));
    }, [user, data, doneIds]);

    if (!data) return <div className="text-sm text-muted">Loading reviews…</div>;
    const { summary, reviews } = data;
    const max = Math.max(1, ...Object.values(summary.distribution || {}));

    return (
        <section id="reviews" className="space-y-6" aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="text-xl font-black text-fg">Customer reviews</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-surface border border-border rounded-3xl p-6">
                <div className="flex flex-col items-center justify-center text-center gap-2">
                    <p className="text-5xl font-black text-fg">{summary.count ? summary.average.toFixed(1) : '—'}</p>
                    <StarRating value={summary.average} size={20} />
                    <p className="text-xs text-muted">{summary.count ? `${summary.count} review${summary.count === 1 ? '' : 's'}` : 'No reviews yet'}</p>
                </div>
                <div className="md:col-span-2 space-y-1.5" aria-label="Rating breakdown">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const n = summary.distribution?.[star] || 0;
                        return (
                            <div key={star} className="flex items-center gap-3 text-xs">
                                <span className="w-12 font-bold text-fg">{star} star</span>
                                <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(n / max) * 100}%` }} />
                                </div>
                                <span className="w-6 text-right text-muted">{n}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {user?.role === 'customer' && (
                eligible.length > 0 ? (
                    <div className="bg-surface border border-border rounded-3xl p-6 space-y-3">
                        <label htmlFor="review-event" className="text-sm font-bold text-fg block">Review your booking</label>
                        {eligible.length > 1 && (
                            <select id="review-event" value={eventId} onChange={(e) => setEventId(e.target.value)}
                                className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg">
                                {eligible.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                        )}
                        {eligible.length === 1 && <p className="text-xs text-muted">For: {eligible[0].title}</p>}
                        {eventId && <ReviewForm key={eventId} eventId={eventId} onSuccess={() => { setDoneIds((d) => [...d, eventId]); setEventId(''); load(); }} />}
                    </div>
                ) : (
                    <p className="text-xs text-muted">You can review this vendor once you have a confirmed booking with them. <Link to="/events" className="text-brand font-bold">Browse their events</Link>.</p>
                )
            )}

            <div className="space-y-3">
                {reviews.length === 0 && <p className="text-sm text-muted">Be the first to review this vendor after your event.</p>}
                {reviews.map((r) => (
                    <article key={r._id} className="bg-surface border border-border rounded-2xl p-4 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-brand/10 text-brand font-black text-xs flex items-center justify-center">{r.user.name.charAt(0).toUpperCase()}</span>
                                <div>
                                    <p className="text-sm font-bold text-fg">{r.user.name}</p>
                                    {r.event && <p className="text-[11px] text-muted">for {r.event.title}</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <StarRating value={r.rating} size={14} />
                                <p className="text-[10px] text-muted">{new Date(r.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <p className="text-sm text-fg leading-relaxed">{r.comment}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
