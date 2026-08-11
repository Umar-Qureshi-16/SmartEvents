import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cpu, DollarSign, Users, ArrowRight, Zap, Target } from 'lucide-react';

export default function About() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-16 p-6 max-w-[1280px] mx-auto pt-12">
            {/* Hero / Intro */}
            <div className="text-center max-w-3xl mx-auto space-y-4">
                <span className="adyen-badge bg-[#0ABF53]/10 text-[#0ABF53] border-none font-bold mx-auto">ABOUT SMARTEVENTS</span>
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111827] leading-tight">
                    Redefining Event Planning and Booking
                </h1>
                <p className="text-base text-slate-600 font-medium leading-relaxed">
                    SmartEvents is an next-generation event management platform introducing InDrive-style real-time price negotiation and an AI Concierge workspace to maximize efficiency for hosts and vendors alike.
                </p>
            </div>

            {/* Core Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
                <div className="adyen-card p-8 bg-white border border-slate-200 rounded-3xl space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0ABF53]/10 border border-[#0ABF53]/20 flex items-center justify-center text-[#0ABF53]">
                        <DollarSign size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-[#111827]">Reverse-Bidding Engine</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Set your target budget and allow premium, verified providers to compete. Send counter-offers back and forth in real-time until a deal is locked.
                        </p>
                    </div>
                </div>

                <div className="adyen-card p-8 bg-white border border-slate-200 rounded-3xl space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0ABF53]/10 border border-[#0ABF53]/20 flex items-center justify-center text-[#0ABF53]">
                        <Cpu size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-[#111827]">AI Concierge ("Smartie")</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Driven by advanced RAG AI algorithms, our concierge analyzes budgets, generates detailed RFP parameters, and matches you with compatible service providers.
                        </p>
                    </div>
                </div>

                <div className="adyen-card p-8 bg-white border border-slate-200 rounded-3xl space-y-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#0ABF53]/10 border border-[#0ABF53]/20 flex items-center justify-center text-[#0ABF53]">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-[#111827]">Dynamic Gate QR Pass</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Ticket check-ins are secured with single-use encrypted QR codes. Gate terminals scan passes in real time to prevent duplicate entry fraud.
                        </p>
                    </div>
                </div>
            </div>

            {/* Vision Section */}
            <div className="adyen-card bg-[#111827] text-white p-8 md:p-12 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                    <span className="text-xs font-mono font-bold text-[#0ABF53] uppercase tracking-widest">OUR VISION</span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">Trust, Transparency, & Safety</h2>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        By integrating secure escrow payment ledgers and computing dynamic Trust Scores, we ensure every transaction is protected. Funds remain locked in escrow until check-in confirmation or successful event completion.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/signup')}
                    className="btn-adyen-primary text-xs px-8 py-3.5 font-bold shadow-adyen-glow shrink-0"
                >
                    <span>Get Started Today</span>
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
