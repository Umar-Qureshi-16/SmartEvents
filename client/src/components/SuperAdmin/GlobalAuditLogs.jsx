import React from 'react';
import { motion } from 'framer-motion';
import { Terminal, Database, Clock, Filter } from 'lucide-react';

const GlobalAuditLogs = ({ logs = [] }) => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="text-emerald-400" size={20} /> Identity & Audit Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Immutable record of platform-wide orchestration</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-muted-foreground hover:text-white transition-all">
                        <Filter size={16} />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {logs.map((log, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <div>
                                <p className="text-xs font-bold text-white">{log.action}</p>
                                <p className="text-[10px] text-muted-foreground font-mono">{log.metadata?.ip || '127.0.0.1'} • {log.targetType}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1 justify-end">
                                <Clock size={10} /> {new Date(log.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter mt-0.5">{log.actor?.name || 'SYSTEM'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlobalAuditLogs;
