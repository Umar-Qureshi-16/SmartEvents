import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ label, value, trend, icon: Icon, subtext, tone = 'brand' }) {
    const tones = {
        brand: 'bg-brand/10 text-brand',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
    };
    const trendDown = typeof trend === 'string' && trend.trim().startsWith('-');

    return (
        <div className="bg-surface border border-border rounded-3xl shadow-card p-6 flex flex-col justify-between gap-4 hover:border-brand/40 transition-colors">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">{label}</span>
                {Icon && (
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
                        <Icon size={20} aria-hidden="true" />
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <div className="text-3xl font-black text-fg tracking-tight">{value}</div>
                <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    {subtext && <span className="text-muted">{subtext}</span>}
                    {trend && (
                        <span className={`flex items-center font-mono text-[11px] font-bold ${trendDown ? 'text-danger' : 'text-success'}`}>
                            {trendDown
                                ? <TrendingDown size={14} className="mr-0.5" aria-hidden="true" />
                                : <TrendingUp size={14} className="mr-0.5" aria-hidden="true" />}
                            {trend}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
