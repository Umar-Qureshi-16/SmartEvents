import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';

const ReviewForm = ({ eventId, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error("Please select a star rating.");
            return;
        }

        if (!comment.trim()) {
            toast.error("Please write a comment.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await axios.post('/reviews', {
                eventId,
                rating,
                comment
            });

            if (res.data.success) {
                toast.success("Review submitted successfully!");
                setRating(0);
                setComment('');
                if (onSuccess) onSuccess(res.data.data);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit review.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 glass rounded-2xl border-white/10 bg-white/[0.03] flex flex-col gap-5">
            <h4 className="text-sm font-black uppercase tracking-widest text-white">Leave a Review</h4>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Rate your experience</label>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            type="button"
                            key={star}
                            className="bg-transparent border-none outline-none focus:outline-none transition-transform hover:scale-110"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                        >
                            <Star
                                size={24}
                                className={`transition-colors ${(hover || rating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Your Comments</label>
                <textarea
                    rows="3"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-medium text-white outline-none focus:ring-2 ring-indigo-500/50 transition-all resize-none"
                    placeholder="Share details of your experience..."
                />
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="self-end bg-indigo-600 hover:bg-indigo-700 py-3 px-6 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>Submit <Send size={14} /></>
                )}
            </button>
        </form>
    );
};

export default ReviewForm;
