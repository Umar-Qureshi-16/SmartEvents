import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertCircle, PieChart, CheckCircle2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const BudgetAnalyzer = ({ totalBudget, services }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (totalBudget && services?.length > 0) {
            analyze();
        }
    }, [totalBudget, services]);

    const analyze = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ai/budget/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ totalBudget, services })
            });
            const data = await res.json();
            if (data.success) setAnalysis(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (!totalBudget) return null;

    return (
        <div className="glass p-6 rounded-3xl border-white/5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <DollarSign size={20} />
                    </div>
                    <h3 className="font-bold text-white">Smart Budget</h3>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Total Allocated</p>
                    <p className="text-lg font-bold text-emerald-400">${(totalBudget ?? 0).toLocaleString()}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3 opacity-50">
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <p className="text-xs text-muted-foreground">Analyzing expenditures...</p>
                </div>
            ) : analysis ? (
                <div className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-muted-foreground">
                            <span>Spending Efficiency</span>
                            <span>{analysis.efficiency || '85%'}</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '85%' }}
                                className="h-full grad-primary"
                            />
                        </div>
                    </div>

                    {/* Warnings */}
                    {analysis?.warnings?.length > 0 && (
                        <div className="space-y-2">
                            {(analysis?.warnings || []).map((w, i) => (
                                <div key={i} className="flex gap-3 text-xs p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                    <AlertCircle size={14} className="shrink-0" />
                                    <span>{w}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(analysis?.breakdown || {}).map(([cat, val], i) => (
                            <div key={i} className="bg-white/5 p-3 rounded-2xl border border-white/5">
                                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-tighter mb-1">{cat}</p>
                                <p className="text-sm font-bold text-white">{val}%</p>
                            </div>
                        ))}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed italic border-t border-white/5 pt-4">
                        "{analysis?.analysis || ''}"
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                    <PieChart size={32} className="mb-2 opacity-20" />
                    <p className="text-xs">Add services to generate a smart budget breakdown.</p>
                </div>
            )}
        </div>
    );
};

export default BudgetAnalyzer;
