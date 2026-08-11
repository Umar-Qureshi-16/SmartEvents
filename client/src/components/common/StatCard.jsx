import React from 'react';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, trend, icon: Icon, color = 'text-[#0ABF53]', subtext }) {
    return (
        <div className="adyen-card p-6 bg-white border border-[#E5E7EB] shadow-sm flex flex-col justify-between space-y-4 hover:border-[#0ABF53] transition-all">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">{label}</span>
                {Icon && (
                    <div className="w-10 h-10 rounded-2xl bg-[#0ABF53]/10 flex items-center justify-center text-[#0ABF53]">
                        <Icon size={20} />
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="text-3xl font-black text-[#111827] tracking-tight">{value}</div>
                <div className="flex items-center justify-between text-xs font-semibold">
                    {subtext && <span className="text-slate-500">{subtext}</span>}
                    {trend && (
                        <span className="flex items-center text-[#0ABF53] font-mono text-[11px] font-bold">
                            <TrendingUp size={14} className="mr-0.5" /> {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
