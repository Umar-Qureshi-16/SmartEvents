import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const data = [
    { name: 'Jan', revenue: 4000, bookings: 24 },
    { name: 'Feb', revenue: 3000, bookings: 18 },
    { name: 'Mar', revenue: 2000, bookings: 12 },
    { name: 'Apr', revenue: 2780, bookings: 20 },
    { name: 'May', revenue: 1890, bookings: 15 },
    { name: 'Jun', revenue: 2390, bookings: 17 },
];

const EnterpriseAnalytics = () => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <BarChart3 className="text-indigo-400" size={20} /> Revenue Pipeline
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Consolidated monthly yield across all service clusters</p>
                </div>
                <div className="flex gap-4">
                    <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest">
                        Export CSV
                    </button>
                    <button className="px-4 py-2 rounded-xl grad-primary text-[10px] font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all uppercase tracking-widest">
                        Download PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MiniStat label="Total Volume" value="$24,500" trend="+12.4%" />
                <MiniStat label="Active nodes" value="1,240" trend="+5.2%" />
                <MiniStat label="Retention" value="94.2%" trend="+0.8%" />
                <MiniStat label="Avg. Ticket" value="$1,200" trend="-2.1%" />
            </div>

            <div className="h-[300px] w-full pt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        />
                        <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const MiniStat = ({ label, value, trend }) => (
    <div className="space-y-1">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{value}</span>
            <span className={`text-[10px] font-bold ${trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                {trend}
            </span>
        </div>
    </div>
);

export default EnterpriseAnalytics;
