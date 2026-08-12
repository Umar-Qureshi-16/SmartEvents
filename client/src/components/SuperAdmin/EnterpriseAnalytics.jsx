import React from 'react';
import { BarChart3, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const money = (n) => `$${Number(n || 0).toLocaleString()}`;

/**
 * Platform revenue pipeline.
 * Previously shipped with a hardcoded six-month array; now driven by
 * GET /super-admin/revenue-series and GET /super-admin/stats.
 */
const EnterpriseAnalytics = ({ series = [], stats = {}, onExport }) => {
    const hasData = series.some(d => d.revenue > 0 || d.bookings > 0);

    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-indigo-400" size={20} /> Revenue Pipeline
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                        Confirmed and completed bookings over the last six months
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onExport?.(series)}
                    disabled={!hasData}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Download size={12} /> Export CSV
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <MiniStat label="Gross Volume" value={money(stats.revenue)} />
                <MiniStat label="Registered Users" value={(stats.totalUsers ?? 0).toLocaleString()} />
                <MiniStat label="Closed Deals" value={(stats.closedDeals ?? 0).toLocaleString()} />
                <MiniStat label="Avg. Deal Value" value={money(stats.averageDealValue)} />
            </div>

            <div className="h-[300px] w-full pt-6">
                {!hasData ? (
                    <div className="h-full flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-white/10 gap-3">
                        <BarChart3 size={40} className="text-slate-600" />
                        <div>
                            <p className="text-sm font-bold text-white">No confirmed revenue yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Revenue appears here once bookings are accepted.
                            </p>
                        </div>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px'
                                }}
                                formatter={(value, name) => [name === 'revenue' ? money(value) : value, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                            <Bar dataKey="bookings" name="Bookings" fill="#10B981" radius={[6, 6, 0, 0]} barSize={32} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const MiniStat = ({ label, value }) => (
    <div className="space-y-1">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{label}</p>
        <span className="text-2xl font-black text-white">{value}</span>
    </div>
);

export default EnterpriseAnalytics;
