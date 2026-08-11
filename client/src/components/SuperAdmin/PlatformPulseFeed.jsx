import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Shield, Zap, UserPlus, CreditCard } from 'lucide-react';

const PlatformPulseFeed = ({ logs = [] }) => {
    return (
        <div className="glass p-6 rounded-3xl border-white/5 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Terminal className="text-indigo-400" size={18} /> System Event Stream
                </h3>
                <span className="text-[10px] text-indigo-400 font-mono animate-pulse">listening_events...</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                    {logs.map((log, i) => (
                        <motion.div
                            key={log.id || i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-4 group hover:bg-white/10 transition-all"
                        >
                            <div className={`p-2 rounded-xl bg-white/5 ${getSeverityColor(log.severity)}`}>
                                {getIcon(log.action)}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold text-white uppercase tracking-tighter">{log.action.replace(/_/g, ' ')}</p>
                                    <span className="text-[10px] text-slate-500 font-mono">{log.time || 'JUST_NOW'}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                                    <span className="text-indigo-400 font-bold">{log.userEmail || 'system_node'}</span> performed orchestration on <span className="text-white">{log.targetType || 'global'}</span>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

const getSeverityColor = (sev) => {
    switch (sev) {
        case 'critical': return 'text-rose-400 shadow-lg shadow-rose-500/10';
        case 'warning': return 'text-amber-400';
        default: return 'text-emerald-400';
    }
};

const getIcon = (action) => {
    if (action.includes('USER')) return <UserPlus size={14} />;
    if (action.includes('PAYMENT')) return <CreditCard size={14} />;
    if (action.includes('SECURITY')) return <Shield size={14} />;
    return <Zap size={14} />;
};

export default PlatformPulseFeed;
