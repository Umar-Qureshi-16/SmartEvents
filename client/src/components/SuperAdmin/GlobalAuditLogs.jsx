import React, { useMemo, useState } from 'react';
import { Database, Clock, Filter } from 'lucide-react';

const SEVERITY_TONE = {
    critical: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
    warning: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
    info: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
};

/** Immutable governance trail from GET /super-admin/logs. */
const GlobalAuditLogs = ({ logs = [] }) => {
    const [severity, setSeverity] = useState('all');

    const filtered = useMemo(
        () => (severity === 'all' ? logs : logs.filter(l => (l.severity || 'info') === severity)),
        [logs, severity]
    );

    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="text-emerald-400" size={20} /> Audit Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Every governance action, with actor and timestamp
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-muted-foreground" />
                    <label htmlFor="audit-severity" className="sr-only">Filter by severity</label>
                    <select
                        id="audit-severity"
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:ring-1 ring-emerald-500/50"
                    >
                        <option value="all">All severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 text-slate-500">
                    <Database size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-white">
                        {logs.length === 0 ? 'No audit entries yet' : 'Nothing at this severity'}
                    </p>
                    <p className="text-xs mt-1">
                        Bans, role changes, verifications, and dispute rulings are recorded here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                    {filtered.map((log) => (
                        <div
                            key={log._id}
                            className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 hover:bg-white/10 transition-all"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_TONE[log.severity] || SEVERITY_TONE.info}`}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">
                                        {String(log.action).replace(/_/g, ' ')}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                                        {log.targetType}
                                        {log.metadata?.resolution ? ` · ${log.metadata.resolution}` : ''}
                                        {log.metadata?.newRole ? ` · ${log.metadata.newRole}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1 justify-end">
                                    <Clock size={10} aria-hidden="true" />
                                    {new Date(log.createdAt).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter mt-0.5">
                                    {log.actor?.name || 'System'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GlobalAuditLogs;
