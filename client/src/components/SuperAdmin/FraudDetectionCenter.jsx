import React, { useMemo, useState } from 'react';
import { ShieldAlert, Fingerprint, Lock, Search, Undo2, Loader2 } from 'lucide-react';

/**
 * Behavioural risk scoring across providers.
 * Data from GET /super-admin/fraud-risks; actions POST /super-admin/user-governance.
 */
const FraudDetectionCenter = ({ risks = [], onGovern, busyId }) => {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return risks;
        return risks.filter(r =>
            r.name?.toLowerCase().includes(q) ||
            r.email?.toLowerCase().includes(q) ||
            String(r.userId).includes(q)
        );
    }, [risks, query]);

    return (
        <div className="glass p-8 rounded-3xl border-border space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-fg flex items-center gap-2">
                        <ShieldAlert className="text-rose-500" size={20} /> Fraud Governance
                    </h3>
                    <p className="text-xs text-muted mt-1">
                        Behavioural risk scoring from cancellation velocity, disputes, and no-shows
                    </p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                    <label htmlFor="fraud-filter" className="sr-only">Filter providers</label>
                    <input
                        id="fraud-filter"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter by name or email…"
                        className="bg-fg/5 border border-border rounded-xl pl-9 pr-4 py-2 text-xs text-fg outline-none focus:ring-1 ring-rose-500/50 w-full sm:w-64"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-border text-muted">
                    <ShieldAlert size={40} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-bold text-fg">
                        {risks.length === 0 ? 'No providers to score yet' : 'No providers match that filter'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-muted font-black border-b border-border">
                                <th scope="col" className="pb-4 px-2">Provider</th>
                                <th scope="col" className="pb-4 px-2">Risk</th>
                                <th scope="col" className="pb-4 px-2">Risk score</th>
                                <th scope="col" className="pb-4 px-2">Trust</th>
                                <th scope="col" className="pb-4 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((risk) => {
                                const isBusy = busyId === risk.userId;
                                const suspended = risk.status === 'banned' || risk.status === 'restricted';

                                return (
                                    <tr key={risk.userId} className="group hover:bg-surface/5 transition-all">
                                        <td className="py-4 px-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-fg shadow-lg ${getRiskBg(risk.classification)}`}>
                                                    <Fingerprint size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="font-bold text-fg text-sm block truncate">{risk.name}</span>
                                                    <span className="text-[10px] text-muted font-mono truncate block">{risk.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md border ${getRiskBorder(risk.classification)}`}>
                                                {risk.classification}
                                            </span>
                                            {suspended && (
                                                <span className="ml-2 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-rose-500/50 text-rose-400 bg-rose-500/10">
                                                    {risk.status}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-2">
                                            <div className="w-full max-w-[100px] h-1.5 bg-fg/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${getScoreColor(risk.score)}`} style={{ width: `${risk.score}%` }} />
                                            </div>
                                            <span className="text-[10px] font-mono text-muted mt-1 block">{risk.score}/100</span>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className="text-sm font-black text-fg">{risk.trustScore ?? '—'}</span>
                                        </td>
                                        <td className="py-4 px-2 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {suspended ? (
                                                    <button
                                                        type="button"
                                                        disabled={isBusy}
                                                        onClick={() => onGovern?.(risk.userId, 'reinstate', risk.name)}
                                                        aria-label={`Reinstate ${risk.name}`}
                                                        className="px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                                                    >
                                                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Reinstate
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => onGovern?.(risk.userId, 'restrict', risk.name)}
                                                            aria-label={`Restrict ${risk.name}`}
                                                            className="p-2 rounded-lg bg-fg/5 text-muted hover:text-amber-400 transition-all border border-border disabled:opacity-40"
                                                        >
                                                            <Lock size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => onGovern?.(risk.userId, 'ban', risk.name)}
                                                            className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-40"
                                                        >
                                                            {isBusy && <Loader2 size={12} className="animate-spin" />} Ban
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const getRiskBg = (cls) => {
    if (cls === 'CRITICAL') return 'bg-rose-600 shadow-rose-500/20';
    if (cls === 'HIGH') return 'bg-amber-600 shadow-amber-500/20';
    return 'bg-indigo-600 shadow-indigo-500/20';
};

const getRiskBorder = (cls) => {
    if (cls === 'CRITICAL') return 'border-rose-500/50 text-rose-400 bg-rose-500/10';
    if (cls === 'HIGH') return 'border-amber-500/50 text-amber-400 bg-amber-500/10';
    if (cls === 'MODERATE') return 'border-amber-400/40 text-amber-300 bg-amber-400/10';
    return 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10';
};

const getScoreColor = (score) => {
    if (score > 80) return 'bg-rose-500';
    if (score > 50) return 'bg-amber-500';
    return 'bg-emerald-500';
};

export default FraudDetectionCenter;
