import React, { useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Sparkles, Send, FileText, Calendar, DollarSign, ArrowRight, Bot, User, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AIConcierge() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chat');
    const [loading, setLoading] = useState(false);

    // AI Chat state
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'bot', text: 'Hello! I am Smartie, your AI Concierge. How can I help you plan, structure or budget your event today?' }
    ]);

    // RFP state
    const [rfpQuery, setRfpQuery] = useState('');
    const [rfpResult, setRfpResult] = useState(null);

    // Timeline state
    const [timelineDetails, setTimelineDetails] = useState({ date: '', eventType: 'Wedding' });
    const [timelineResult, setTimelineResult] = useState(null);

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatQuery.trim()) return;

        const userMsg = { role: 'user', text: chatQuery };
        setChatHistory(prev => [...prev, userMsg]);
        setChatQuery('');
        setLoading(true);

        try {
            const res = await axios.post('/ai/query', { query: userMsg.text });
            if (res.data.success) {
                setChatHistory(prev => [...prev, { role: 'bot', text: res.data.data.reply }]);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to query AI Concierge.');
        } finally {
            setLoading(false);
        }
    };

    const handleRfpSubmit = async (e) => {
        e.preventDefault();
        if (!rfpQuery.trim()) return;
        setLoading(true);

        try {
            const res = await axios.post('/ai/rfp', { query: rfpQuery });
            if (res.data.success) {
                setRfpResult(res.data.data);
                toast.success('Event RFP generated!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate RFP.');
        } finally {
            setLoading(false);
        }
    };

    const handleTimelineSubmit = async (e) => {
        e.preventDefault();
        if (!timelineDetails.date) {
            toast.error('Please specify event date.');
            return;
        }
        setLoading(true);

        try {
            const res = await axios.post('/ai/timeline', {
                eventDetails: {
                    date: new Date(timelineDetails.date),
                    eventType: timelineDetails.eventType
                }
            });
            if (res.data.success) {
                setTimelineResult(res.data.data);
                toast.success('Timeline generated!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to plan timeline.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">SMARTIE AI CONCIERGE WORKSPACE</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        AI Event Planner Workspace
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">Use advanced RAG models to research requirements, build specifications, and plan schedules.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-200 p-1 rounded-full text-xs font-bold uppercase shrink-0">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'chat' ? 'bg-[#0ABF53] text-white shadow-sm' : 'text-slate-600 hover:text-[#111827]'}`}>Chatbot</button>
                    <button onClick={() => setActiveTab('rfp')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'rfp' ? 'bg-[#0ABF53] text-white shadow-sm' : 'text-slate-600 hover:text-[#111827]'}`}>RFP Builder</button>
                    <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'timeline' ? 'bg-[#0ABF53] text-white shadow-sm' : 'text-slate-600 hover:text-[#111827]'}`}>Timeline Plan</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Action area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* TAB 1: RAG CHAT */}
                    {activeTab === 'chat' && (
                        <div className="adyen-card bg-white border border-[#E5E7EB] rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-sm">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                                <Bot size={16} className="text-[#0ABF53]" />
                                <span className="text-xs font-bold text-[#111827]">Conversational Concierge Chat</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-semibold">
                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-[#0ABF53]/15 text-[#0ABF53]'}`}>
                                            {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                        </div>
                                        <div className={`p-3.5 rounded-2xl border leading-relaxed ${msg.role === 'user' ? 'bg-indigo-50/20 border-indigo-100 text-indigo-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={handleChatSubmit} className="p-4 border-t border-slate-100 flex gap-2">
                                <input
                                    type="text"
                                    required
                                    disabled={loading}
                                    placeholder="Ask anything about event setup, budgets, or security..."
                                    value={chatQuery}
                                    onChange={(e) => setChatQuery(e.target.value)}
                                    className="flex-1 bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-4 py-3 outline-none focus:border-[#0ABF53] text-xs"
                                />
                                <button type="submit" disabled={loading} className="btn-adyen-primary p-3 rounded-xl shadow-adyen-glow">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 2: RFP GENERATOR */}
                    {activeTab === 'rfp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4">
                                <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Describe Event Scope</h3>
                                <form onSubmit={handleRfpSubmit} className="space-y-4 text-xs font-semibold">
                                    <textarea
                                        rows="4"
                                        required
                                        placeholder="e.g. Wedding banquet in Chicago with 150 guests, looking for premium decoration and catering..."
                                        value={rfpQuery}
                                        onChange={(e) => setRfpQuery(e.target.value)}
                                        className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl p-3 outline-none focus:border-[#0ABF53]"
                                    />
                                    <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-adyen-glow">
                                        <Sparkles size={16} />
                                        <span>{loading ? 'Structuring RFP...' : 'Generate Spec Outline'}</span>
                                    </button>
                                </form>
                            </div>

                            <div className="adyen-card p-6 bg-white border border-slate-200 rounded-3xl min-h-[300px] flex flex-col justify-between">
                                {!rfpResult ? (
                                    <div className="text-center text-slate-400 my-auto">
                                        <FileText size={40} className="mx-auto opacity-15 mb-2" />
                                        <p className="text-xs font-semibold">No spec blueprint generated yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-xs font-semibold">
                                        <span className="adyen-badge bg-[#0ABF53]/15 text-[#0ABF53] border-none font-bold uppercase">{rfpResult.category}</span>
                                        <h4 className="text-sm font-bold text-[#111827]">{rfpResult.title}</h4>
                                        <p className="text-slate-600 leading-relaxed font-medium">{rfpResult.description}</p>
                                        <div className="pt-3 border-t border-slate-100 space-y-2">
                                            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">RFP requirements</span>
                                            <ul className="list-disc list-inside space-y-1 text-slate-500 font-medium">
                                                {rfpResult.requirements?.map((req, idx) => <li key={idx}>{req}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 3: TIMELINE GENERATOR */}
                    {activeTab === 'timeline' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4">
                                <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">Configure Timeline Parameters</h3>
                                <form onSubmit={handleTimelineSubmit} className="space-y-4 text-xs font-semibold">
                                    <div>
                                        <label className="text-slate-600 block mb-1">Target Event Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={timelineDetails.date}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, date: e.target.value })}
                                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-slate-600 block mb-1">Event Category</label>
                                        <select
                                            value={timelineDetails.eventType}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, eventType: e.target.value })}
                                            className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0ABF53]"
                                        >
                                            <option value="Wedding">Wedding</option>
                                            <option value="Concert">Concert</option>
                                            <option value="Corporate">Corporate Conference</option>
                                        </select>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-adyen-glow">
                                        <Sparkles size={16} />
                                        <span>{loading ? 'Building Timeline...' : 'Generate Roadmap'}</span>
                                    </button>
                                </form>
                            </div>

                            <div className="adyen-card p-6 bg-white border border-slate-200 rounded-3xl min-h-[300px] flex flex-col justify-between">
                                {!timelineResult ? (
                                    <div className="text-center text-slate-400 my-auto">
                                        <Calendar size={40} className="mx-auto opacity-15 mb-2" />
                                        <p className="text-xs font-semibold">No timeline generated yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-[#111827]">Milestone Checklist</h4>
                                        <div className="space-y-4 overflow-y-auto max-h-72 pr-1">
                                            {timelineResult.map((milestone, idx) => (
                                                <div key={idx} className="flex gap-3 text-xs font-semibold border-l-2 border-[#0ABF53]/30 pl-3 relative">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-[#0ABF53] absolute -left-[6px] top-1" />
                                                    <div className="space-y-0.5">
                                                        <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">L-{milestone.daysBefore} Days</span>
                                                        <h5 className="font-bold text-[#111827]">{milestone.title}</h5>
                                                        <p className="text-slate-500 leading-relaxed font-medium">{milestone.task}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Quick Links / AI Specs */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4">
                        <h3 className="text-sm font-black text-[#111827] uppercase tracking-wider">AI Operations</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            Smartie uses Vector Search (RAG) context retrievals to audit and constraints match event specifications.
                        </p>

                        <div className="space-y-2 pt-2 text-xs font-bold">
                            <button
                                onClick={() => navigate('/budget-tracker')}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-[#0ABF53] text-[#111827] hover:text-[#0ABF53] transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <DollarSign size={16} />
                                    <span>Event Budget Analyzer</span>
                                </div>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
