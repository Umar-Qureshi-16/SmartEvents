import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Check, Loader2, Info } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

const HeroAIMatchmaker = ({ onRFPGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/ai/rfp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ query: prompt })
            });
            const data = await res.json();
            if (data.success) {
                setResult(data.data);
                if (onRFPGenerated) onRFPGenerated(data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="relative group">
            {/* Animated Glow Background */}
            <div className="absolute -inset-1 grad-primary rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative glass p-8 rounded-3xl border-white/5 overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 grad-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Sparkles className="text-white" size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">AI Event Matchmaker</h2>
                        <p className="text-muted-foreground text-sm">Natural language orchestration for your dream event.</p>
                    </div>
                </div>

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="I want to plan a corporate gala for 200 people in NY with a sustainable theme..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder:text-muted-foreground focus:ring-2 ring-indigo-500/50 outline-none transition-all resize-none h-32 text-lg leading-relaxed"
                            required
                        />
                        <div className="absolute bottom-4 right-4 flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={isGenerating}
                                className="grad-primary text-white font-bold px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Send size={18} />}
                                {isGenerating ? 'Analyzing...' : 'Generate Plan'}
                            </button>
                        </div>
                    </div>
                </form>

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-8 pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div className="col-span-2 flex items-center gap-2 mb-2 text-emerald-400 font-semibold">
                                <Check size={18} /> Plan Synthesized Successfully
                            </div>

                            <RFPDetailCard label="Proposed Event" value={result?.title} />
                            <RFPDetailCard label="Creative Theme" value={result?.theme} />
                            <RFPDetailCard label="Estimated Feasibility" value={result?.estimatedFeasibility || 'Optimal'} highlight />
                            <RFPDetailCard label="Budget Range" value={`$${(result?.budget ?? 0).toLocaleString()}`} />

                            <div className="col-span-2 glass p-4 rounded-xl border-white/5 mt-2">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                    <Info size={10} /> AI Recommendations
                                </p>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    {(result?.recommendations || []).map((rec, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-indigo-500" /> {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const RFPDetailCard = ({ label, value, highlight }) => (
    <div className="glass p-4 rounded-2xl border-white/5 group hover:border-white/10 transition-all">
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-indigo-400' : 'text-slate-200'}`}>{value || 'N/A'}</p>
    </div>
);

export default HeroAIMatchmaker;
