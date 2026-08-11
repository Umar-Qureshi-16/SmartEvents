import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Star, Award } from 'lucide-react';

const TrustScoreWidget = ({ score = 98, analytics = {} }) => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 relative overflow-hidden h-full group">
            {/* Animated Background Aura */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-1000" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Enterprise Trust Score</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">Provider Rating Ledger</p>
                    </div>
                    <div className="w-12 h-12 grad-primary rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                </div>

                <div className="flex items-end gap-2 mb-8">
                    <span className="text-6xl font-black text-white tracking-tighter">{score}</span>
                    <span className="text-indigo-400 font-bold text-xl mb-2">/ 100</span>
                    <div className="ml-auto flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 mb-2">
                        <TrendingUp size={12} /> +2.4%
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 gap-4 mb-8">
                    <MetricBar label="Fulfillment Rate" value={analytics.fulfillment || 99} color="bg-indigo-500" />
                    <MetricBar label="Average Response" value={analytics.responseTime || 94} color="bg-purple-500" />
                    <MetricBar label="Customer Satisfaction" value={analytics.satisfaction || 97} color="bg-pink-500" />
                </div>

                <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                                <Award size={14} />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">3 Enterprise Certifications Active</p>
                </div>
            </div>
        </div>
    );
};

const MetricBar = ({ label, value, color }) => (
    <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-muted-foreground uppercase tracking-widest">{label}</span>
            <span className="text-white">{value}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className={`h-full ${color} shadow-[0_0_10px_rgba(99,102,241,0.2)]`}
            />
        </div>
    </div>
);

export default TrustScoreWidget;
