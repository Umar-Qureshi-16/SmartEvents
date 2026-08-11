import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Fingerprint, Lock, Search, Filter } from 'lucide-react';

const FraudDetectionCenter = ({ risks = [] }) => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-8 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="text-rose-500" size={20} /> Fraud Governance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Autonomous identity verification and risk scoring</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                        <input placeholder="Filter by Node ID..." className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-[10px] text-white outline-none focus:ring-1 ring-rose-500/50" />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] uppercase tracking-widest text-muted-foreground font-black border-b border-white/5">
                            <th className="pb-4 px-2">Identity Node</th>
                            <th className="pb-4 px-2">Risk Vector</th>
                            <th className="pb-4 px-2">Trust Score</th>
                            <th className="pb-4 px-2 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {risks.map((risk, i) => (
                            <tr key={i} className="group hover:bg-white/5 transition-all">
                                <td className="py-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${getRiskBg(risk.classification)}`}>
                                            <Fingerprint size={18} />
                                        </div>
                                        <div>
                                            <span className="font-bold text-white text-sm block">{risk.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono">{risk.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-2">
                                    <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md border ${getRiskBorder(risk.classification)}`}>
                                        {risk.classification} RISK
                                    </span>
                                </td>
                                <td className="py-4 px-2">
                                    <div className="w-full max-w-[100px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${getScoreColor(risk.score)}`}
                                            style={{ width: `${risk.score}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground mt-1 block">{risk.score}/100</span>
                                </td>
                                <td className="py-4 px-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:text-amber-400 transition-all border border-white/5">
                                            <Lock size={14} />
                                        </button>
                                        <button className="p-2 rounded-lg grad-primary text-white shadow-lg shadow-indigo-500/10 active:scale-95 transition-all border border-indigo-500/20">
                                            Investigate
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
    return 'border-indigo-500/50 text-indigo-400 bg-indigo-500/10';
};

const getScoreColor = (score) => {
    if (score > 80) return 'bg-rose-500';
    if (score > 50) return 'bg-amber-500';
    return 'bg-indigo-500';
};

export default FraudDetectionCenter;
