import React, { useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { DollarSign, Sparkles, AlertTriangle, Plus, Trash2, PieChart as PieIcon, HelpCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function BudgetTracker() {
    const [totalBudget, setTotalBudget] = useState(5000);
    const [services, setServices] = useState([
        { name: 'Venue Rental', cost: 1500 },
        { name: 'Catering & Beverages', cost: 2000 }
    ]);
    const [newItem, setNewItem] = useState({ name: '', cost: '' });
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.cost) return;
        setServices([...services, { name: newItem.name, cost: Number(newItem.cost) }]);
        setNewItem({ name: '', cost: '' });
    };

    const handleDeleteItem = (idx) => {
        setServices(services.filter((_, i) => i !== idx));
    };

    const handleAnalyze = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/ai/budget/analyze', {
                totalBudget,
                services: services.map(s => `${s.name}: $${s.cost}`)
            });

            if (res.data.success) {
                setReport(res.data.data);
                toast.success('AI budget analysis complete!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to run AI budget audit.');
        } finally {
            setLoading(false);
        }
    };

    const currentSpent = services.reduce((acc, s) => acc + s.cost, 0);
    const COLORS = ['#0ABF53', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

    // Map breakdown keys to chart items
    const getPieData = () => {
        if (!report || !report.breakdown) return [];
        return Object.entries(report.breakdown).map(([key, val]) => ({
            name: key.toUpperCase(),
            value: Number(val)
        }));
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">SMARTIE AI BUDGETING</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Event Budget Analyzer
                    </h1>
                    <p className="text-xs text-muted font-medium">Audit allocation estimates, detect overspending patterns, and generate breakdowns.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Input parameters */}
                <div className="lg:col-span-6 space-y-6">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Configure Budget Boundaries</h3>

                        <div className="space-y-4 text-xs font-semibold">
                            <div>
                                <label className="text-muted block mb-1">Total Target Budget ($)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                                    <input
                                        type="number"
                                        value={totalBudget}
                                        onChange={(e) => setTotalBudget(Number(e.target.value))}
                                        className="w-full bg-bg border border-border rounded-xl pl-8 pr-3.5 py-2.5 outline-none focus:border-success font-mono text-sm font-bold"
                                    />
                                </div>
                            </div>

                            {/* Cost Tracker Status bar */}
                            <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                                <div className="flex justify-between font-mono font-bold text-[11px]">
                                    <span className="text-muted">Total Allocated:</span>
                                    <span className={currentSpent > totalBudget ? 'text-rose-600' : 'text-success'}>
                                        ${currentSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
                                    </span>
                                </div>
                                <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${Math.min(100, (currentSpent / totalBudget) * 100)}%` }}
                                        className={`h-full transition-all ${currentSpent > totalBudget ? 'bg-rose-500' : 'bg-success'}`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Services Line Items */}
                    <div className="adyen-card p-6 bg-surface border border-border rounded-3xl space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Line Item Estimates</h3>

                        <form onSubmit={handleAddItem} className="flex gap-2 text-xs font-semibold">
                            <input
                                type="text"
                                required
                                placeholder="Service description (e.g. Florals)"
                                value={newItem.name}
                                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                className="flex-1 bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                            />
                            <input
                                type="number"
                                required
                                placeholder="Cost ($)"
                                value={newItem.cost}
                                onChange={(e) => setNewItem({ ...newItem, cost: e.target.value })}
                                className="w-24 bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                            />
                            <button type="submit" className="p-2.5 bg-success text-white rounded-xl"
                                aria-label="Add budget item">
                                <Plus size={16} />
                            </button>
                        </form>

                        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                            {services.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2 text-xs font-semibold">
                                    <span className="text-fg">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-muted">${item.cost.toLocaleString()}</span>
                                        <button onClick={() => handleDeleteItem(idx)} className="text-rose-500 hover:text-rose-700">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAnalyze}
                            disabled={loading || services.length === 0}
                            className="w-full btn-adyen-primary py-3 rounded-full text-xs justify-center shadow-glow disabled:opacity-50"
                        >
                            <Sparkles size={16} />
                            <span>{loading ? 'Analyzing Budget...' : 'Audit Budget Allocation'}</span>
                        </button>
                    </div>
                </div>

                {/* Right: AI Report & Charts */}
                <div className="lg:col-span-6">
                    {!report ? (
                        <div className="h-full adyen-card p-12 bg-surface border border-border text-center flex flex-col justify-center items-center text-muted">
                            <PieIcon size={48} className="opacity-15 mb-3 text-muted animate-bounce" />
                            <h4 className="text-sm font-bold text-fg">Audit Report Pending</h4>
                            <p className="text-xs text-muted font-semibold max-w-xs mt-1">Configure your target budget parameters and run Smartie AI audit to display allocation charts.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles size={16} className="text-success" />
                                    <span>Smartie Audit Synthesis</span>
                                </h3>
                                <p className="text-xs text-muted leading-relaxed font-medium">
                                    {report.analysis}
                                </p>
                            </div>

                            {/* Warnings Alert */}
                            {report.warnings?.length > 0 && (
                                <div className="adyen-card p-6 bg-rose-50 border border-rose-100 space-y-3">
                                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertTriangle size={15} />
                                        <span>Warnings & Cost Adjustments</span>
                                    </h4>
                                    <ul className="list-disc list-inside space-y-1.5 text-xs text-rose-700 font-medium">
                                        {report.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                    </ul>
                                </div>
                            )}

                            {/* Allocation Chart */}
                            {report.breakdown && (
                                <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">Breakdown Percentage Allocation</h3>
                                    <div className="h-56 flex justify-center">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={getPieData()}
                                                    innerRadius={45}
                                                    outerRadius={65}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {getPieData().map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                        {getPieData().map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                <span>{item.name}: {item.value}%</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
