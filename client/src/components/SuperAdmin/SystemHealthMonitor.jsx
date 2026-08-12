import React from 'react';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const formatUptime = (s = 0) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s % 60}s`;
    return `${s}s`;
};

/**
 * Live operational vitals.
 * Previously shipped with a hardcoded latency array; now driven by
 * GET /health, polled by the parent, with measured round-trip latency.
 */
const SystemHealthMonitor = ({ health = {}, samples = [] }) => {
    const dbUp = health.database === 'connected';
    const healthy = health.status === 'healthy';

    return (
        <div className="glass p-6 rounded-3xl border-border space-y-8 relative overflow-hidden">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-fg uppercase tracking-widest flex items-center gap-2">
                        <Activity className="text-emerald-400" size={18} /> Operational Vitals
                    </h3>
                    <p className="text-[10px] text-muted mt-1">
                        {health.environment ? `${health.environment} · Node ${health.nodeVersion}` : 'Awaiting first sample…'}
                    </p>
                </div>
                <span
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                        healthy
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                >
                    {(health.status || 'unknown').toUpperCase()}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <HealthCard
                    icon={<Zap size={14} />}
                    label="API Latency"
                    value={health.latencyMs != null ? `${health.latencyMs}ms` : '—'}
                    status={health.latencyMs == null ? 'UNKNOWN' : health.latencyMs < 150 ? 'OPTIMAL' : 'SLOW'}
                    tone={health.latencyMs != null && health.latencyMs < 150 ? 'text-emerald-400' : 'text-amber-400'}
                />
                <HealthCard
                    icon={<Cpu size={14} />}
                    label="Heap Used"
                    value={health.memory ? `${health.memory.heapUsedMb} MB` : '—'}
                    status={health.memory ? `OF ${health.memory.heapTotalMb} MB` : 'UNKNOWN'}
                    tone="text-indigo-400"
                />
                <HealthCard
                    icon={<Database size={14} />}
                    label="Database"
                    value={dbUp ? 'Connected' : (health.database || 'Unknown')}
                    status={`UP ${formatUptime(health.uptimeSeconds)}`}
                    tone={dbUp ? 'text-emerald-400' : 'text-rose-400'}
                />
            </div>

            <div className="h-[200px] w-full">
                {samples.length < 2 ? (
                    <div className="h-full flex items-center justify-center text-xs text-muted rounded-2xl border border-dashed border-border">
                        Sampling latency…
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={samples}>
                            <defs>
                                <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} unit="ms" />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    fontSize: '10px'
                                }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(v) => [`${v}ms`, 'Latency']}
                            />
                            <Area type="monotone" dataKey="latency" stroke="#6366f1" fillOpacity={1} fill="url(#colorLatency)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

const HealthCard = ({ icon, label, value, status, tone }) => (
    <div className="p-4 rounded-2xl bg-fg/5 border border-border space-y-2 group hover:border-border transition-all">
        <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] uppercase font-bold tracking-tighter flex items-center gap-1">
                {icon} {label}
            </span>
            <span className={`text-[8px] font-black ${tone}`}>{status}</span>
        </div>
        <div className="text-xl font-black text-fg">{value}</div>
    </div>
);

export default SystemHealthMonitor;
