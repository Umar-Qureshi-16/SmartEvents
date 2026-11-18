import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, CheckCircle2, ShieldCheck, CalendarDays, MapPin } from 'lucide-react';
import axios from '../../api/axios';
import StarRating from '../reviews/StarRating';
import { formatDate } from '../ui';

/** Loads one of the public detail lists behind a vendor's profile numbers. */
function useDetail(vendorId, kind) {
    const [state, setState] = useState({ loading: true, data: null, error: false });
    useEffect(() => {
        let live = true;
        axios.get(`/vendor/profile/${vendorId}/${kind}`)
            .then((res) => live && setState({ loading: false, data: res.data.data, error: false }))
            .catch(() => live && setState({ loading: false, data: null, error: true }));
        return () => { live = false; };
    }, [vendorId, kind]);
    return state;
}

const Loading = () => <p className="text-sm text-muted py-6 text-center">Loading…</p>;
const Failed = () => <p className="text-sm text-danger py-6 text-center">Could not load this right now.</p>;

export function FollowersList({ vendorId, emptyText = 'No followers yet.' }) {
    const { loading, data, error } = useDetail(vendorId, 'followers');
    if (loading) return <Loading />;
    if (error) return <Failed />;
    if (!data.length) return <p className="text-sm text-muted py-6 text-center">{emptyText}</p>;
    return (
        <ul className="divide-y divide-border">
            {data.map((f) => (
                <li key={f._id} className="flex items-center gap-3 py-3">
                    <span className="w-9 h-9 rounded-full bg-brand/10 text-brand font-black text-sm flex items-center justify-center shrink-0">{f.name.charAt(0)}</span>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-fg">{f.name}</p>
                        <p className="text-[11px] text-muted">Organizer since {new Date(f.memberSince).getFullYear()}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

export function DeliveredList({ vendorId, emptyText = 'No completed events yet.' }) {
    const { loading, data, error } = useDetail(vendorId, 'delivered');
    if (loading) return <Loading />;
    if (error) return <Failed />;
    if (!data.length) return <p className="text-sm text-muted py-6 text-center">{emptyText}</p>;
    return (
        <ul className="space-y-3">
            {data.map((d) => (
                <li key={d._id} className="flex items-center gap-3 bg-surface-2 border border-border rounded-2xl p-3">
                    {d.image
                        ? <img src={d.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" loading="lazy" />
                        : <span className="w-14 h-14 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0"><CheckCircle2 size={22} aria-hidden="true" /></span>}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-fg truncate">{d.title}</p>
                        <p className="text-[11px] text-muted flex flex-wrap gap-x-3">
                            <span className="inline-flex items-center gap-1"><CalendarDays size={11} aria-hidden="true" />{d.date ? formatDate(d.date) : 'Date not set'}</span>
                            {d.location && <span className="inline-flex items-center gap-1"><MapPin size={11} aria-hidden="true" />{d.location}</span>}
                        </p>
                    </div>
                    {d.rating ? <StarRating value={d.rating} size={12} /> : <span className="text-[11px] text-muted shrink-0">Not rated</span>}
                </li>
            ))}
        </ul>
    );
}

function Bar({ label, value, max, tone = 'bg-brand' }) {
    return (
        <div>
            <div className="flex justify-between text-xs font-bold text-fg mb-1"><span>{label}</span><span>{value} / {max}</span></div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} /></div>
        </div>
    );
}

export function TrustBreakdown({ vendorId, forOwner = false }) {
    const { loading, data: t, error } = useDetail(vendorId, 'trust');
    if (loading) return <Loading />;
    if (error) return <Failed />;
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <span className="w-16 h-16 rounded-2xl bg-success/10 text-success flex items-center justify-center text-2xl font-black">{t.score}</span>
                <p className="text-sm text-fg/80 leading-relaxed">{t.explanation}</p>
            </div>
            {!t.baseline && t.points && (
                <div className="space-y-3">
                    <Bar label={`Completion (${t.completionRate}% of concluded bookings)`} value={t.points.completion} max={55} tone="bg-success" />
                    <Bar label={`Customer rating (${t.reviews ? `${t.averageRating}/5 from ${t.reviews}` : 'no reviews, counted as neutral'})`} value={t.points.rating} max={35} tone="bg-amber-500" />
                    <Bar label="Base" value={10} max={10} />
                    {t.points.penalties > 0 && <p className="text-xs font-bold text-danger">−{t.points.penalties} for lost disputes and no-shows</p>}
                </div>
            )}
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                {[
                    ['Completed', t.completed], ['Cancelled by vendor', t.cancelledByVendor], ['No-shows', t.noShows],
                    ['Disputes lost', t.lostDisputes], ['Reviews', t.reviews], ['Average stars', t.reviews ? t.averageRating : '—'],
                ].map(([k, v]) => (
                    <div key={k} className="bg-surface-2 border border-border rounded-xl py-2">
                        <dt className="text-[11px] text-muted font-semibold">{k}</dt>
                        <dd className="text-base font-black text-fg">{v}</dd>
                    </div>
                ))}
            </dl>
            {forOwner && (
                <ul className="text-xs text-muted space-y-1 list-disc pl-4">
                    <li>Mark events complete with your customers, so they count as delivered.</li>
                    <li>Ask happy customers to leave a review; ratings carry up to 35 points.</li>
                    <li>Avoid cancelling confirmed bookings, missing events or losing disputes.</li>
                </ul>
            )}
        </div>
    );
}

const TITLES = {
    followers: { title: 'Followers', icon: Users },
    delivered: { title: 'Events delivered', icon: CheckCircle2 },
    trust: { title: 'How the trust score is worked out', icon: ShieldCheck },
};

/** A dialog showing one detail list for the public profile. */
export function DetailModal({ kind, vendorId, onClose }) {
    useEffect(() => {
        const key = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);
    const { title, icon: Icon } = TITLES[kind];
    // Rendered on <body>: the page's <main> is its own layer under the navbar.
    return createPortal(
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg max-h-[85vh] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between gap-3 p-5 border-b border-border">
                    <h2 id="detail-title" className="text-base font-black text-fg flex items-center gap-2"><Icon size={18} className="text-brand" aria-hidden="true" />{title}</h2>
                    <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg"><X size={20} /></button>
                </div>
                <div className="p-5 overflow-y-auto">
                    {kind === 'followers' && <FollowersList vendorId={vendorId} />}
                    {kind === 'delivered' && <DeliveredList vendorId={vendorId} />}
                    {kind === 'trust' && <TrustBreakdown vendorId={vendorId} />}
                </div>
            </div>
        </div>,
        document.body,
    );
}
