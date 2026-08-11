import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, FileText, RefreshCw, ShieldCheck, ArrowRight, CheckCircle2, Play, Sparkles, Sliders, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function HowItWorks() {
    const navigate = useNavigate();

    // INTERACTIVE BIDDING SIMULATOR STATE
    const [simStep, setSimStep] = useState(1);
    const [simBudgetMax, setSimBudgetMax] = useState(10000);
    const [simVendorQuote, setSimVendorQuote] = useState(8500);
    const [simCounterInput, setSimCounterInput] = useState(7800);
    const [simEscrowLocked, setSimEscrowLocked] = useState(false);

    const handleSendSimCounter = (e) => {
        e.preventDefault();
        toast.success(`Simulated counter-offer of $${Number(simCounterInput).toLocaleString()} sent to vendor!`);
        setSimStep(4);
    };

    const handleLockEscrow = () => {
        setSimEscrowLocked(true);
        toast.success('Escrow Funds Locked! Contract Formed Successfully.');
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] p-6 max-w-[1280px] mx-auto space-y-12 pt-6">
            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <span className="adyen-badge uppercase tracking-wider">INTERACTIVE BIDDING PLAYGROUND</span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111827]">
                    How Reverse Bidding Works
                </h1>
                <p className="text-base text-slate-600 font-medium">
                    A transparent 4-step counter-offer engine designed for event hosts to save budget and service vendors to win steady business. Try our interactive simulator below!
                </p>
            </div>

            {/* INTERACTIVE SIMULATOR PLAYGROUND */}
            <div className="adyen-card p-6 md:p-8 bg-white border border-[#E5E7EB] shadow-2xl space-y-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <span className="text-[10px] font-mono text-[#0ABF53] font-bold uppercase tracking-widest block">INTERACTIVE SIMULATOR</span>
                        <h3 className="text-xl font-bold text-[#111827]">Try the Live Counter-Offer Engine</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4].map(s => (
                            <button
                                key={s}
                                onClick={() => setSimStep(s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${simStep === s ? 'bg-[#0ABF53] text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}
                            >
                                Step {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SIMULATOR STEPS CONTENT */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left Step Explainer */}
                    <div className="lg:col-span-5 space-y-4">
                        {simStep === 1 && (
                            <div className="space-y-3">
                                <span className="adyen-badge">STEP 1 OF 4</span>
                                <h4 className="text-2xl font-bold text-[#111827]">Post Your Event & Target Budget</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Event hosts post their requirements (catering, AV, venue, stage) along with a min/max target budget. Adjust the slider to set a target budget.
                                </p>
                                <button onClick={() => setSimStep(2)} className="btn-adyen-primary text-xs py-2.5 px-6 shadow-adyen-glow">
                                    <span>Next: Receive Proposals</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}

                        {simStep === 2 && (
                            <div className="space-y-3">
                                <span className="adyen-badge">STEP 2 OF 4</span>
                                <h4 className="text-2xl font-bold text-[#111827]">Receive Competitive Vendor Quotes</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Verified vendors review your RFP and submit custom proposals specifying deliverables, timeline, and quote amounts.
                                </p>
                                <button onClick={() => setSimStep(3)} className="btn-adyen-primary text-xs py-2.5 px-6 shadow-adyen-glow">
                                    <span>Next: Try Counter-Offer</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        )}

                        {simStep === 3 && (
                            <div className="space-y-3">
                                <span className="adyen-badge">STEP 3 OF 4</span>
                                <h4 className="text-2xl font-bold text-[#111827]">2-Way Counter-Offer Negotiation</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Not satisfied with the initial quote? Submit a counter-offer amount and note. Vendors receive instant alerts to accept or counter back.
                                </p>
                            </div>
                        )}

                        {simStep === 4 && (
                            <div className="space-y-3">
                                <span className="adyen-badge">STEP 4 OF 4</span>
                                <h4 className="text-2xl font-bold text-[#111827]">Escrow Budget Protection</h4>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    Once agreed, funds are safely deposited into Stripe escrow. Payment is released to the vendor only after event completion.
                                </p>
                                <button onClick={() => { setSimStep(1); setSimEscrowLocked(false); }} className="btn-adyen-outline text-xs py-2 px-4">
                                    Restart Simulator
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right Interactive Simulator Widget */}
                    <div className="lg:col-span-7">
                        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
                            
                            {/* Step 1 Interactive Widget */}
                            {simStep === 1 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <span className="text-xs font-bold text-white uppercase">SIMULATED EVENT RFP POSTING</span>
                                        <span className="text-[10px] font-mono text-[#0ABF53]">ORGANIZER VIEW</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Target Max Budget ($)</label>
                                        <input
                                            type="range"
                                            min="3000"
                                            max="25000"
                                            step="500"
                                            value={simBudgetMax}
                                            onChange={(e) => setSimBudgetMax(Number(e.target.value))}
                                            className="w-full accent-[#0ABF53]"
                                        />
                                        <div className="flex justify-between text-xs font-mono mt-1">
                                            <span className="text-slate-400">Min: $2,500</span>
                                            <span className="text-[#0ABF53] font-bold font-mono text-base">${simBudgetMax.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
                                        RFP Created: "Corporate Tech Gala 2026" · Category: Stage & AV Catering
                                    </div>
                                </div>
                            )}

                            {/* Step 2 Interactive Widget */}
                            {simStep === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <span className="text-xs font-bold text-white uppercase">VENDOR PROPOSALS RECEIVED</span>
                                        <span className="text-[10px] font-mono text-[#0ABF53]">2 QUOTES INBOX</span>
                                    </div>
                                    <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-white">Apex Catering & Stages</span>
                                            <span className="text-sm font-black text-[#0ABF53]">${simVendorQuote.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300">Includes 3-course dinner, LED stage rig, and 4K audio sound setup.</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 3 Interactive Widget */}
                            {simStep === 3 && (
                                <form onSubmit={handleSendSimCounter} className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <span className="text-xs font-bold text-white uppercase">PROPOSE COUNTER-OFFER</span>
                                        <span className="text-[10px] font-mono text-[#0ABF53]">VENDOR QUOTE: ${simVendorQuote.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Enter Counter Amount ($)</label>
                                        <input
                                            type="number"
                                            value={simCounterInput}
                                            onChange={(e) => setSimCounterInput(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-base font-bold font-mono text-[#0ABF53] outline-none"
                                        />
                                    </div>
                                    <button type="submit" className="w-full btn-adyen-primary py-3 rounded-full text-xs justify-center shadow-adyen-glow">
                                        Submit Counter-Offer
                                    </button>
                                </form>
                            )}

                            {/* Step 4 Interactive Widget */}
                            {simStep === 4 && (
                                <div className="space-y-4 text-center py-2">
                                    <div className="w-12 h-12 rounded-full bg-[#0ABF53]/20 text-[#0ABF53] mx-auto flex items-center justify-center">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <h4 className="text-base font-bold text-white">
                                        {simEscrowLocked ? 'ESCROW LOCKED & CONTRACT CONFIRMED' : 'READY TO LOCK ESCROW'}
                                    </h4>
                                    <p className="text-xs text-slate-300 max-w-sm mx-auto">
                                        Agreed Amount: <strong className="text-[#0ABF53] font-mono">${Number(simCounterInput).toLocaleString()}</strong>. Held safely in Stripe escrow.
                                    </p>

                                    {!simEscrowLocked ? (
                                        <button onClick={handleLockEscrow} className="btn-adyen-primary text-xs py-3 px-8 shadow-adyen-glow">
                                            Lock Escrow Funds
                                        </button>
                                    ) : (
                                        <div className="p-3 rounded-xl bg-[#0ABF53]/20 border border-[#0ABF53]/40 text-[#0ABF53] text-xs font-bold font-mono">
                                            ✔ PAYMENT SECURED IN ESCROW
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </div>

            {/* USEFUL DEEP-DIVE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                <div className="adyen-card p-8 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0ABF53]/10 text-[#0ABF53] flex items-center justify-center font-bold">
                        <DollarSign size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-[#111827]">For Event Hosts & Organizers</h3>
                    <ul className="space-y-2 text-xs text-slate-600 font-medium">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Save 15%–30% on vendor budgets via counter-offer negotiations.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Zero risk: Funds are held in escrow and released only after the job is done.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Access 1,200+ verified catering, AV, venue, and video partners.</span>
                        </li>
                    </ul>
                </div>

                <div className="adyen-card p-8 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0ABF53]/10 text-[#0ABF53] flex items-center justify-center font-bold">
                        <ShieldCheck size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-[#111827]">For Vendors & Service Partners</h3>
                    <ul className="space-y-2 text-xs text-slate-600 font-medium">
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Browse high-budget open event RFPs and submit custom proposals.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Guaranteed payouts: Escrow secures your funds prior to event execution.</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-[#0ABF53]" />
                            <span>Build verified client reviews and increase platform ranking.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
