import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Zap, UserPlus, Gavel, Radio } from 'lucide-react';

/**
 * Live event stream. Combines the audit ledger with socket notifications
 * arriving in real time while the console is open.
 */
const PlatformPulseFeed = ({ events = [], connected = false }) => (
    <div className="glass p-6 rounded-3xl border-white/5 flex flex-col h-full overflow-hidden min-h-[400px]">
        <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Terminal className="text-indigo-400" size={18} /> Event Stream
            </h3>
            <span
                className={`text-[10px] font-mono flex items-center gap-1.5 ${
                    connected ? 'text-emerald-400' : 'text-slate-500'
                }`}
            >
                <Radio size={11} className={connected ? 'animate-pulse' : ''} aria-hidden="true" />
                {connected ? 'live' : 'offline'}
            </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {events.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 gap-3">
                    <Terminal size={36} className="opacity-30" />
                    <p className="text-xs">Platform activity will stream in here.</p>
                </div>
            ) : (
                <AnimatePresence initial={false}>
                    {events.map((ev) => (
                        <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4 hover:bg-white/10 transition-all"
                        >
                            <div className={`p-2 rounded-xl bg-white/5 shrink-0 ${severityTone(ev.severity)}`}>
                                {iconFor(ev.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-xs font-bold text-white uppercase tracking-tighter truncate">
                                        {String(ev.action || 'EVENT').replace(/_/g, ' ')}
                                    </p>
                                    <span className="text-[10px] text-slate-500 font-mono shrink-0">
                                        {ev.at ? new Date(ev.at).toLocaleTimeString() : 'now'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                    <span className="text-indigo-400 font-bold">{ev.actor || 'system'}</span>
                                    {' · '}
                                    <span className="text-slate-300">{ev.detail || ev.targetType || 'platform'}</span>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            )}
        </div>
    </div>
);

const severityTone = (sev) => {
    if (sev === 'critical') return 'text-rose-400';
    if (sev === 'warning') return 'text-amber-400';
    return 'text-emerald-400';
};

const iconFor = (action = '') => {
    if (action.includes('DISPUTE')) return <Gavel size={14} />;
    if (action.includes('USER') || action.includes('VENDOR')) return <UserPlus size={14} />;
    if (action.includes('BAN') || action.includes('RESTRICT')) return <Shield size={14} />;
    return <Zap size={14} />;
};

export default PlatformPulseFeed;
