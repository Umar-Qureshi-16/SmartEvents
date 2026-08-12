import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Star, CheckCircle2, XCircle } from 'lucide-react';

const band = (score) => {
    if (score >= 85) return { label: 'Excellent', tone: 'text-success', bar: 'bg-success' };
    if (score >= 70) return { label: 'Good', tone: 'text-brand', bar: 'bg-brand' };
    if (score >= 50) return { label: 'Fair', tone: 'text-warning', bar: 'bg-warning' };
    return { label: 'Needs attention', tone: 'text-danger', bar: 'bg-danger' };
};

/**
 * Provider trust standing.
 *
 * Previously displayed invented figures — a "+2.4%" trend, "3 Enterprise
 * Certifications Active", and default fulfilment/response/satisfaction bars of
 * 99/94/97 that were not backed by any data. Now driven entirely by the
 * User.analytics fields that trustScoreService actually maintains.
 */
const TrustScoreWidget = ({ score = 70, analytics = {} }) => {
    const { label, tone, bar } = band(score);
    const completed = analytics.completedEvents ?? 0;
    const rating = analytics.averageRating ?? 0;
    const cancellationRate = analytics.cancellationRate ?? 0;

    return (
        <div className="bg-surface border border-border rounded-3xl shadow-card p-8 h-full">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-lg font-bold text-fg tracking-tight">Trust score</h3>
                    <p className="text-[10px] text-muted uppercase font-black tracking-widest mt-1">
                        Your standing with customers
                    </p>
                </div>
                <div className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-white" size={24} aria-hidden="true" />
                </div>
            </div>

            <div className="flex items-end gap-2 mb-3">
                <span className="text-6xl font-black text-fg tracking-tighter">{score}</span>
                <span className="text-muted font-bold text-xl mb-2">/ 100</span>
                <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full border mb-2 ${tone} border-current/20`}>
                    {label}
                </span>
            </div>

            <div className="h-2 w-full bg-fg/5 rounded-full overflow-hidden mb-8">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`h-full ${bar}`}
                />
            </div>

            <dl className="grid grid-cols-3 gap-4 pb-6 border-b border-border">
                <Metric icon={CheckCircle2} label="Completed" value={completed} />
                <Metric icon={Star} label="Avg rating" value={rating ? rating.toFixed(1) : '—'} />
                <Metric icon={XCircle} label="Cancelled" value={`${Math.round(cancellationRate * 100)}%`} />
            </dl>

            <p className="text-xs text-muted mt-5 leading-relaxed">
                Calculated from your completion rate, review ratings, disputes and no-shows.
                {completed < 3 && ' Complete at least three bookings for a fully weighted score.'}
            </p>
        </div>
    );
};

const Metric = ({ icon: Icon, label, value }) => (
    <div className="space-y-1">
        <dt className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted">
            <Icon size={11} aria-hidden="true" /> {label}
        </dt>
        <dd className="text-lg font-black text-fg">{value}</dd>
    </div>
);

export default TrustScoreWidget;
