import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';

const ReviewCard = ({ review }) => {
    const { rating, comment, user, createdAt } = review;

    // Generate stars array
    const stars = Array.from({ length: 5 }, (_, i) => i + 1);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 glass rounded-2xl border-white/5 bg-white/[0.01] flex flex-col gap-3"
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {user?.avatar || user?.profileImage ? (
                        <img
                            src={user.avatar || user.profileImage}
                            alt={user.name || 'User'}
                            className="w-8 h-8 rounded-full border border-white/10 object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs uppercase">
                            {(user?.name || 'U').charAt(0)}
                        </div>
                    )}
                    <div>
                        <p className="text-sm font-bold text-white">{user?.name || 'Anonymous User'}</p>
                        <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
                            {new Date(createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {stars.map(star => (
                        <Star
                            key={star}
                            size={14}
                            className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                        />
                    ))}
                </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
                {comment}
            </p>
        </motion.div>
    );
};

export default ReviewCard;
