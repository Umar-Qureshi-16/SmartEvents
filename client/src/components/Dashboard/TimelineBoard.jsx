import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const TimelineBoard = ({ eventDetails }) => {
    const [milestones, setMilestones] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (eventDetails) fetchTimeline();
    }, [eventDetails]);

    const fetchTimeline = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ai/timeline`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ eventDetails })
            });
            const data = await res.json();
            if (data.success) setMilestones(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass p-8 rounded-3xl border-white/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Clock size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Event Timeline</h3>
                        <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">Planned Milestones</p>
                    </div>
                </div>
                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                    Manage Board <ChevronRight size={14} />
                </button>
            </div>

            <div className="flex-1 relative space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-white/5" />

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                        <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-sm font-medium">Predicting event lifecycle...</p>
                    </div>
                ) : milestones.length > 0 ? (
                    milestones.map((m, i) => (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            key={i}
                            className="flex gap-6 relative group"
                        >
                            <div className={`z-10 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center transition-all ${i === 0 ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`}>
                                {i === 0 ? <CheckCircle2 size={12} className="text-white" /> : <Circle size={8} className="text-slate-500" />}
                            </div>
                            <div className="flex-1 pb-4">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{m.milestone}</h4>
                                    <span className="text-[10px] font-extrabold text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                        T-{m.daysBefore} Days
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed max-w-[90%]">{m.description}</p>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 mt-10">
                        <Clock size={48} className="mb-4" />
                        <p className="text-sm font-bold">Timeline Generation Pending</p>
                        <p className="text-xs">Create a plan to see your milestones.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineBoard;
