import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Package } from 'lucide-react';
import axios from '../../api/axios';
import { Button, formatCurrency } from '../ui';
import StarRating from '../reviews/StarRating';

export const FIELD_LABELS = {
    venue: 'Venue', catering: 'Catering', decoration: 'Decoration', photography: 'Photography', music: 'Music & sound', makeup: 'Makeup',
};

/**
 * Packages vendors offer in one field, cheapest first. "Book for this plan"
 * sends an opening offer dated for the plan's event.
 */
export default function PackageList({ category, planId, maxPrice, location, onBooked }) {
    const navigate = useNavigate();
    const [items, setItems] = useState(null);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        let live = true;
        const params = { category };
        if (maxPrice) params.maxPrice = maxPrice;
        if (location) params.location = location;
        axios.get('/plans/packages', { params })
            .then((res) => live && setItems(res.data.data || []))
            .catch(() => live && setItems([]));
        return () => { live = false; };
    }, [category, maxPrice, location]);

    const book = async (pkg) => {
        setBusy(pkg._id);
        try {
            const res = await axios.post('/plans/book-package', { serviceId: pkg._id, planId });
            toast.success(`Offer sent to ${pkg.vendor.businessName}.`);
            onBooked?.();
            navigate(`/negotiate/${res.data.data.bookingId}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send the offer.');
        } finally {
            setBusy(null);
        }
    };

    if (!items) return <p className="text-xs text-muted py-3">Loading {FIELD_LABELS[category]?.toLowerCase()} packages…</p>;
    if (!items.length) {
        return (
            <p className="text-xs text-muted py-3">
                No {FIELD_LABELS[category]?.toLowerCase()} packages listed yet{location ? ` in ${location}` : ''}. <Link to="/vendors" className="text-brand font-bold">Browse all vendors</Link>.
            </p>
        );
    }
    return (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {items.map((p) => (
                <li key={p._id} className="bg-surface-2 border border-border rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-fg flex items-center gap-1.5"><Package size={14} className="text-brand shrink-0" aria-hidden="true" />{p.title}</p>
                            <Link to={`/vendor/${p.vendor.userId}`} className="text-xs font-bold text-brand hover:underline">{p.vendor.businessName}</Link>
                        </div>
                        <span className="text-sm font-black text-success shrink-0">{formatCurrency(p.price)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
                        <StarRating value={p.vendor.rating} size={12} showValue count={p.vendor.reviewsCount} />
                        {p.vendor.location && <span className="inline-flex items-center gap-1"><MapPin size={11} aria-hidden="true" />{p.vendor.location}</span>}
                    </div>
                    {p.description && <p className="text-xs text-muted leading-relaxed line-clamp-2">{p.description}</p>}
                    <div className="flex gap-2 mt-auto pt-1">
                        {planId && <Button size="sm" loading={busy === p._id} onClick={() => book(p)}>Book for this plan</Button>}
                        <Button size="sm" variant="outline" onClick={() => navigate(`/vendor/${p.vendor.userId}`)}>View vendor</Button>
                    </div>
                </li>
            ))}
        </ul>
    );
}
