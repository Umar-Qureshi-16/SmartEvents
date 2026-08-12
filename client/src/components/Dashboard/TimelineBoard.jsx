import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';

/**
 * AI-generated planning milestones for an upcoming event, via POST /ai/timeline.
 *
 * Previously called fetch() directly with a hand-built Authorization header,
 * bypassing the axios refresh-token handling, and swallowed every failure into
 * console.error so the panel just sat empty with no explanation.
 */
const TimelineBoard = ({ eventDetails }) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTimeline = useCallback(async () => {
        if (!eventDetails?.date) return;
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post('/ai/timeline', { eventDetails });
            const data = res.data.data;
            setMilestones(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not build a timeline right now.');
        } finally {
            setLoading(false);
        }
    }, [eventDetails]);

    useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

    return (
        <div className="bg-surface border border-border rounded-3xl shadow-card p-6 md:p-8 h-full flex flex-col">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <Clock size={24} aria-hidden="true" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-fg">Planning timeline</h3>
                    <p className="text-muted text-xs">
                        {eventDetails?.title ? `For ${eventDetails.title}` : 'Milestones before your event'}
                    </p>
                </div>
            </div>

            <div className="flex-1 relative overflow-y-auto pr-1 min-h-[220px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted">
                        <div className="w-9 h-9 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                        <p className="text-sm font-medium">Planning your milestones…</p>
                    </div>
                ) : error ? (
                    <div role="alert" className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                        <AlertTriangle size={36} className="text-danger" aria-hidden="true" />
                        <p className="text-sm font-bold text-fg">{error}</p>
                        <button onClick={fetchTimeline} className="text-xs font-bold text-brand hover:underline">
                            Try again
                        </button>
                    </div>
                ) : milestones.length > 0 ? (
                    <ol className="space-y-6 relative">
                        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" aria-hidden="true" />
                        {milestones.map((m, i) => (
                            <motion.li
                                key={`${m.milestone}-${i}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(i * 0.06, 0.4) }}
                                className="flex gap-5 relative"
                            >
                                <span
                                    className={`z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                        i === 0 ? 'bg-brand text-white' : 'bg-surface-2 border border-border'
                                    }`}
                                    aria-hidden="true"
                                >
                                    {i === 0 ? <CheckCircle2 size={12} /> : <Circle size={8} className="text-muted" />}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 mb-1">
                                        <h4 className="font-bold text-fg text-sm">{m.milestone || m.title}</h4>
                                        <span className="text-[10px] font-extrabold text-muted bg-surface-2 border border-border px-2 py-0.5 rounded-full shrink-0">
                                            {m.daysBefore != null ? `${m.daysBefore} days before` : 'TBD'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted leading-relaxed">{m.description || m.task}</p>
                                </div>
                            </motion.li>
                        ))}
                    </ol>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-muted px-4">
                        <Clock size={40} className="opacity-30" aria-hidden="true" />
                        <p className="text-sm font-bold text-fg">No timeline yet</p>
                        <p className="text-xs">Confirm a booking with a date and your milestones will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineBoard;
