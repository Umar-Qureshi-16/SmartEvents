import React from 'react';
import { motion } from 'framer-motion';
import { Users, Star, TrendingUp, AlertCircle } from 'lucide-react';

const ProviderGovernance = ({ providers = [] }) => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-8 h-full">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-indigo-400" size={20} /> Cluster Oversight
            </h3>

            <div className="grid grid-cols-1 gap-4">
                {providers.map((p, i) => (
                    <div key={i} className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4 group hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl grad-primary flex items-center justify-center font-bold text-white uppercase">
                                    {p.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{p.name}</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{p.role}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1 text-emerald-400">
                                    <Star size={12} fill="currentColor" />
                                    <span className="text-xs font-black">{p.trustScore || 100}</span>
                                </div>
                                <p className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter mt-0.5">Trust Score</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex-1 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-all">
                                Adjust Tier
                            </button>
                            <button className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                                <AlertCircle size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProviderGovernance;
