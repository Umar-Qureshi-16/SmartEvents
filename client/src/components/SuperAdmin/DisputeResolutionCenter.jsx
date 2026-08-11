import React from 'react';
import { motion } from 'framer-motion';
import { Gavel, MessageSquare, Image as ImageIcon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const DisputeResolutionCenter = ({ disputes = [] }) => {
    return (
        <div className="glass p-8 rounded-3xl border-white/5 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Gavel className="text-amber-400" size={20} /> Resolution Hub
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Mediation portal for high-stakes service conflicts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {disputes.length === 0 ? (
                    <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 opacity-30">
                        <CheckCircle size={48} className="mx-auto mb-4" />
                        <h4 className="text-white font-bold">No Active Escalations</h4>
                        <p className="text-xs">System entropy is minimal at this node.</p>
                    </div>
                ) : (
                    disputes.map((d, i) => (
                        <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-white/10 transition-all">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white uppercase tracking-tight">{d.reason || 'Service Non-compliance'}</h4>
                                    <p className="text-xs text-muted-foreground">Case ID: {d._id || 'D-900'} • Level: {d.severity || 'Medium'}</p>
                                    <div className="flex gap-2 mt-3">
                                        <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 hover:text-white transition-all border border-white/5">
                                            <MessageSquare size={10} /> Chat History
                                        </button>
                                        <button className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-[9px] font-bold text-slate-400 hover:text-white transition-all border border-white/5">
                                            <ImageIcon size={10} /> Evidence
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button className="flex-1 md:flex-none p-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all border border-rose-500/20">
                                    <XCircle size={20} />
                                </button>
                                <button className="flex-1 md:flex-none p-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                                    Resolve Case
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DisputeResolutionCenter;
