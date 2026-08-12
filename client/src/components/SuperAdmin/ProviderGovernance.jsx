import React from 'react';
import { Users, Star, Lock, Undo2, Loader2 } from 'lucide-react';

const trustTone = (score) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 55) return 'text-amber-400';
    return 'text-rose-400';
};

/** Provider roster with trust standing, from GET /super-admin/providers. */
const ProviderGovernance = ({ providers = [], onGovern, busyId }) => (
    <div className="glass p-8 rounded-3xl border-white/5 space-y-8 h-full">
        <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-indigo-400" size={20} /> Provider Oversight
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
                Ranked by trust score — computed from completion rate, ratings, disputes and no-shows
            </p>
        </div>

        {providers.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 text-slate-500">
                <Users size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold text-white">No providers registered yet</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {providers.map((p) => {
                    const isBusy = busyId === p._id;
                    const suspended = p.status === 'banned' || p.status === 'restricted';

                    return (
                        <div
                            key={p._id}
                            className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4 hover:bg-white/10 transition-all"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 shrink-0 rounded-xl grad-primary flex items-center justify-center font-bold text-white uppercase">
                                        {p.name?.charAt(0) || '?'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                                        <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className={`flex items-center gap-1 ${trustTone(p.trustScore ?? 0)}`}>
                                        <Star size={12} fill="currentColor" aria-hidden="true" />
                                        <span className="text-xs font-black">{p.trustScore ?? '—'}</span>
                                    </div>
                                    <p className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter mt-0.5">
                                        Trust
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 text-[10px] text-muted-foreground">
                                <span>{p.analytics?.completedEvents ?? 0} completed</span>
                                <span>
                                    {p.analytics?.averageRating ? `${p.analytics.averageRating}★ avg` : 'unrated'}
                                </span>
                                {suspended && (
                                    <span className="text-rose-400 font-bold uppercase">{p.status}</span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {suspended ? (
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => onGovern?.(p._id, 'reinstate', p.name)}
                                        className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                                    >
                                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Reinstate
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => onGovern?.(p._id, 'restrict', p.name)}
                                        className="flex-1 py-2 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                                    >
                                        {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />} Restrict
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

export default ProviderGovernance;
