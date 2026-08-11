import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
    { time: '10:00', latency: 42, cpu: 12 },
    { time: '10:05', latency: 45, cpu: 15 },
    { time: '10:10', latency: 38, cpu: 11 },
    { time: '10:15', latency: 55, cpu: 22 },
    { time: '10:20', latency: 40, cpu: 14 },
    { time: '10:25', latency: 35, cpu: 10 },
];

const SystemHealthMonitor = () => {
    return (
        <div className="glass p-6 rounded-3xl border-white/5 space-y-8 relative overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                        <Activity className="text-emerald-400" size={18} /> Operational Vitals
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1">Real-time telemetry across platform nodes</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20 animate-pulse">
                        LIVE_SYNC
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCard icon={<Zap size={14} />} label="API Latency" value="42ms" status="OPTIMAL" color="emerald" />
                <HealthCard icon={<Cpu size={14} />} label="CPU Usage" value="14%" status="HEALTHY" color="indigo" />
                <HealthCard icon={<Database size={14} />} label="DB Query" value="12ms" status="STABLE" color="indigo" />
            </div>

            <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                            itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="latency" stroke="#6366f1" fillOpacity={1} fill="url(#colorLatency)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const HealthCard = ({ icon, label, value, status, color }) => (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 group hover:border-white/10 transition-all">
        <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[10px] uppercase font-bold tracking-tighter flex items-center gap-1">
                {icon} {label}
            </span>
            <span className={`text-[8px] font-black text-${color}-400`}>{status}</span>
        </div>
        <div className="text-xl font-black text-white">{value}</div>
    </div>
);

export default SystemHealthMonitor;
