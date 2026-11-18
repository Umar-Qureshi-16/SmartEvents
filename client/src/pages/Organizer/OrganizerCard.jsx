import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronLeft, Percent, Star, XCircle } from 'lucide-react';
import axios from '../../api/axios';
import ProfileHeader, { StatButton } from '../../components/organizer/ProfileHeader';
import StarRating from '../../components/reviews/StarRating';
import { formatDate } from '../../components/ui';

/** The organizer as a vendor sees them when deciding on an offer. */
export default function OrganizerCard() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get(`/organizers/${id}`)
            .then((res) => setData(res.data.data))
            .catch((err) => setError(err.response?.data?.message || 'Could not load this organizer.'));
    }, [id]);

    if (error) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center p-6">
                <div className="text-center space-y-3">
                    <p className="text-sm text-fg font-bold">{error}</p>
                    <button onClick={() => navigate(-1)} className="text-sm font-bold text-brand">Go back</button>
                </div>
            </div>
        );
    }
    if (!data) return <div className="min-h-screen bg-bg max-w-6xl mx-auto p-6"><div className="h-56 rounded-3xl bg-surface-2 animate-pulse" /></div>;
    const { user, stats, reviews } = data;

    return (
        <div className="min-h-screen bg-bg text-fg pb-16">
            <ProfileHeader user={user} actions={(
                <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5"><ChevronLeft size={15} aria-hidden="true" />Back to the offer</button>
            )} />
            <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6 mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatButton icon={CalendarDays} value={stats.bookings} label="Bookings made" onClick={() => navigate('/leads')} />
                    <StatButton icon={CheckCircle2} value={stats.completed} label="Completed" tone="success" />
                    <StatButton icon={XCircle} value={stats.cancelled} label="Cancelled or declined" tone="warning" />
                    <StatButton icon={Percent} value={stats.completionRate == null ? 'New' : `${stats.completionRate}%`} label="Completion rate" tone="success" />
                    <StatButton icon={Star} value={stats.reviews ? stats.averageGiven : '—'} label={`Avg. stars given (${stats.reviews})`} />
                </div>
                <section className="space-y-3" aria-labelledby="org-reviews">
                    <h2 id="org-reviews" className="text-lg font-black text-fg">Reviews they have written</h2>
                    {reviews.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : (
                        <ul className="space-y-3">
                            {reviews.map((r) => (
                                <li key={r._id} className="bg-surface border border-border rounded-2xl p-4 space-y-1">
                                    <div className="flex justify-between gap-2"><span className="text-sm font-bold text-fg">{r.event || 'Event'}</span><StarRating value={r.rating} size={12} /></div>
                                    <p className="text-sm text-fg/80">{r.comment}</p>
                                    <p className="text-[10px] text-muted">{formatDate(r.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <p className="text-xs text-muted">Contact details stay private. Reply through the negotiation thread. <Link to="/leads" className="text-brand font-bold">Back to leads</Link></p>
            </div>
        </div>
    );
}
