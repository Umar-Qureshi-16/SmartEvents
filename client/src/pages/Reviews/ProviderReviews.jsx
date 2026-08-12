import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Star, MessageSquare, Calendar, User, ArrowLeft } from 'lucide-react';

export default function ProviderReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try {
            const res = await axios.get('/reviews/provider');
            if (res.data.success) {
                setReviews(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load reviews.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const getAverageRating = () => {
        if (reviews.length === 0) return 0;
        return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR PERFORMANCE</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Client Reviews & Feedback
                    </h1>
                    <p className="text-xs text-muted font-medium">Read testimonials, ratings, and feedback left on your completed events.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="adyen-card p-6 bg-surface border border-border rounded-3xl flex justify-between items-center shadow-sm">
                    <div>
                        <span className="text-[10px] font-mono text-muted uppercase font-bold block">AVERAGE RATING</span>
                        <span className="text-3xl font-black text-fg">{getAverageRating()} ★</span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={20} fill={i < Math.round(getAverageRating()) ? 'currentColor' : 'none'} />
                        ))}
                    </div>
                </div>

                <div className="adyen-card p-6 bg-surface border border-border rounded-3xl flex justify-between items-center shadow-sm">
                    <div>
                        <span className="text-[10px] font-mono text-muted uppercase font-bold block">TOTAL REVIEWS</span>
                        <span className="text-3xl font-black text-success">{reviews.length} Feedbacks</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center text-success">
                        <MessageSquare size={20} />
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="max-w-3xl space-y-4">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-24 bg-surface border border-border rounded-3xl"></div>
                        <div className="h-24 bg-surface border border-border rounded-3xl"></div>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="adyen-card p-12 text-center text-muted bg-surface border border-border">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20 text-muted" />
                        <h3 className="text-base font-bold text-fg">No reviews yet</h3>
                        <p className="text-xs text-muted font-semibold mt-1">Once clients complete bookings, their reviews will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map(r => (
                            <div key={r._id} className="adyen-card p-6 bg-surface border border-border rounded-3xl space-y-3 hover:border-success transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted shrink-0">
                                            <User size={14} />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-fg">{r.user?.name}</h4>
                                            <span className="text-[9px] text-muted font-mono font-bold block">{new Date(r.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={12} fill={i < r.rating ? 'currentColor' : 'none'} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-muted leading-relaxed font-medium">"{r.comment}"</p>
                                <div className="pt-2 border-t border-border flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-wider font-mono">
                                    <Calendar size={12} />
                                    <span>Event: {r.event?.title || 'Custom booking'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
