import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Check, Loader2, Info, AlertTriangle } from 'lucide-react';
import axios from '../../api/axios';
import { formatCurrency } from '../ui';

const EXAMPLES = [
    'A 200-guest corporate gala in Lahore with a sustainable theme, budget around PKR 800,000',
    'An outdoor wedding for 150 people in December, catering and photography included',
    'A two-day tech conference with AV, stage and catering for 300 attendees',
];

/**
 * Turns a plain-English event description into a structured RFP via
 * POST /ai/rfp.
 *
 * Previously called fetch() directly with a hand-built Authorization header,
 * bypassing the axios instance and therefore the refresh-token retry logic —
 * so it failed permanently once the access token expired.
 */
const HeroAIMatchmaker = ({ onRFPGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsGenerating(true);
        setError(null);
        try {
            const res = await axios.post('/ai/rfp', { query: prompt.trim() });
            setResult(res.data.data);
            onRFPGenerated?.(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Smartie could not draft a plan just now. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-surface border border-border rounded-3xl shadow-card p-6 md:p-8">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 grad-primary rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles className="text-white" size={24} aria-hidden="true" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-fg tracking-tight">AI event planner</h2>
                    <p className="text-muted text-sm">Describe your event and Smartie will draft a plan.</p>
                </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3">
                <label htmlFor="rfp-prompt" className="sr-only">Describe your event</label>
                <textarea
                    id="rfp-prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Tell me about your event — the occasion, guest count, location and rough budget."
                    className="w-full bg-surface-2 border border-border rounded-2xl p-4 text-fg placeholder:text-muted outline-none focus:border-brand transition-colors resize-none h-28 text-sm leading-relaxed"
                    required
                    maxLength={1000}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {EXAMPLES.slice(0, 2).map((ex) => (
                            <button
                                key={ex}
                                type="button"
                                onClick={() => setPrompt(ex)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-surface-2 border border-border text-muted hover:text-fg hover:border-brand/40 transition-colors max-w-[200px] truncate"
                                title={ex}
                            >
                                {ex}
                            </button>
                        ))}
                    </div>
                    <button
                        type="submit"
                        disabled={isGenerating || !prompt.trim()}
                        className="grad-primary text-white font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                    >
                        {isGenerating
                            ? <><Loader2 className="animate-spin w-4 h-4" aria-hidden="true" /> Thinking…</>
                            : <><Send size={16} aria-hidden="true" /> Draft a plan</>}
                    </button>
                </div>
            </form>

            {error && (
                <div role="alert" className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 flex items-center gap-2 text-xs text-danger font-medium">
                    <AlertTriangle size={14} aria-hidden="true" /> {error}
                </div>
            )}

            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                        <p className="sm:col-span-2 flex items-center gap-2 text-success font-semibold text-sm">
                            <Check size={16} aria-hidden="true" /> Here is a starting plan
                        </p>

                        <Detail label="Event" value={result?.title} />
                        <Detail label="Theme" value={result?.theme} />
                        <Detail label="Feasibility" value={result?.estimatedFeasibility} highlight />
                        <Detail label="Estimated budget" value={result?.budget ? formatCurrency(result.budget) : '—'} />

                        {result?.servicesRequired?.length > 0 && (
                            <div className="sm:col-span-2 p-4 rounded-xl bg-surface-2 border border-border">
                                <p className="text-[10px] uppercase font-bold text-muted mb-2 tracking-widest">Services needed</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.servicesRequired.map((s, i) => (
                                        <span key={i} className="px-2.5 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-bold">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {result?.recommendations?.length > 0 && (
                            <div className="sm:col-span-2 p-4 rounded-xl bg-surface-2 border border-border">
                                <p className="text-[10px] uppercase font-bold text-muted mb-2 flex items-center gap-1 tracking-widest">
                                    <Info size={10} aria-hidden="true" /> Recommendations
                                </p>
                                <ul className="text-sm text-fg space-y-1.5">
                                    {result.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="w-1 h-1 rounded-full bg-brand mt-2 shrink-0" aria-hidden="true" />
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <p className="sm:col-span-2 text-[11px] text-muted">
                            AI-generated estimates. Confirm details and pricing with providers before committing.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Detail = ({ label, value, highlight }) => (
    <div className="p-4 rounded-2xl bg-surface-2 border border-border">
        <p className="text-[10px] uppercase font-bold text-muted mb-1 tracking-widest">{label}</p>
        <p className={`text-sm font-semibold ${highlight ? 'text-brand' : 'text-fg'}`}>{value || '—'}</p>
    </div>
);

export default HeroAIMatchmaker;
