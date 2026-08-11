import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Calendar, Users, MapPin, DollarSign, Brain, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import axios from '../../api/axios';

const CHECK_ICONS = {
    'Core Metadata': <Brain size={12} />,
    'Logistics Definition': <MapPin size={12} />,
    'Financial Guardrails': <DollarSign size={12} />,
    'Capacity Mapping': <Users size={12} />,
    'AI Optimization Depth': <ShieldCheck size={12} />,
};

const EventReadiness = ({ booking }) => {
    const [liveData, setLiveData] = useState(null);
    const [loading, setLoading] = useState(false);

    const eventId = booking?.eventId?._id || booking?.eventId;

    // Calculate a local score from booking data as fallback
    const calcLocalScore = () => {
        if (!booking) return 0;
        let score = 20;
        if (booking.status === 'confirmed' || booking.status === 'accepted') score += 30;
        if (booking.eventDetails?.location) score += 15;
        if (booking.eventDetails?.guests > 0) score += 15;
        if (booking.totalAmount > 0 || booking.eventDetails?.budget > 0) score += 20;
        return Math.min(score, 100);
    };

    useEffect(() => {
        if (eventId) fetchLiveScore();
    }, [eventId]);

    const fetchLiveScore = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/events/${eventId}/readiness`);
            if (res.data.success) setLiveData(res.data.data);
        } catch (err) {
            console.error('Readiness fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const score = liveData?.score ?? calcLocalScore();
    const checks = liveData?.checks ?? [
        { label: 'Date Secured', status: booking?.eventDetails?.date ? 'pass' : 'fail' },
        { label: 'Venue Locked', status: booking?.eventDetails?.location ? 'pass' : 'fail' },
        { label: 'Guest Count', status: booking?.eventDetails?.guests > 0 ? 'pass' : 'fail' },
        { label: 'Budget Set', status: (booking?.totalAmount > 0 || booking?.eventDetails?.budget > 0) ? 'pass' : 'fail' },
        { label: 'Status Active', status: ['confirmed', 'accepted', 'in_progress'].includes(booking?.status) ? 'pass' : 'fail' },
    ];

    const color = score >= 80 ? 'emerald' : score >= 50 ? 'indigo' : 'amber';
    const circumference = 2 * Math.PI * 58;

    return (
        <div className="glass p-6 rounded-3xl border-white/5 flex flex-col items-center text-center relative overflow-hidden h-full">
            <div className={`absolute inset-0 opacity-10 blur-3xl bg-${color}-500`} />

            <div className="relative z-10 w-full">
                <div className="flex items-center justify-between mb-6">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Event Readiness</p>
                    {loading
                        ? <Loader2 size={16} className="text-indigo-400 animate-spin" />
                        : <ShieldCheck size={18} className={`text-${color}-400`} />
                    }
                </div>

                {/* Circular Progress */}
                <div className="relative inline-flex items-center justify-center mb-6">
                    <svg className="w-32 h-32 -rotate-90">
                        <circle cx="64" cy="64" r="58" strokeWidth="8" fill="transparent" className="text-white/5" stroke="currentColor" />
                        <motion.circle
                            cx="64" cy="64" r="58" strokeWidth="8" fill="transparent"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: circumference - (circumference * score) / 100 }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            stroke={score >= 80 ? '#10b981' : score >= 50 ? '#6366f1' : '#f59e0b'}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-3xl font-extrabold text-white"
                        >
                            {score}%
                        </motion.span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            {score >= 80 ? 'Optimal' : score >= 50 ? 'In Progress' : 'Needs Attention'}
                        </span>
                    </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2 text-left w-full">
                    {checks.map((c, i) => (
                        <div key={i} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span className={c.status === 'pass' ? 'text-emerald-400' : 'text-slate-600'}>
                                    {CHECK_ICONS[c.label] || <Calendar size={12} />}
                                </span>
                                <span className="text-[11px] font-medium">{c.label}</span>
                            </div>
                            {c.status === 'pass'
                                ? <CheckCircle2 size={14} className="text-emerald-500" />
                                : <XCircle size={14} className="text-white/10" />
                            }
                        </div>
                    ))}
                </div>

                {liveData && (
                    <button
                        onClick={fetchLiveScore}
                        className="w-full mt-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all border border-white/5 flex items-center justify-center gap-2"
                    >
                        Refresh Score
                    </button>
                )}
            </div>
        </div>
    );
};

export default EventReadiness;
