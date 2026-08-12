import React, { useEffect, useRef, useState } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Sparkles, Send, FileText, Calendar, DollarSign, ArrowRight, Bot, User, Cpu, Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { parseAssistantReply, describeAction, buildEventPayload, ACTION_TYPES } from '../../utils/aiActions';

export default function AIConcierge() {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const canCreateServices = ['provider', 'admin'].includes(user?.role);
    const [activeTab, setActiveTab] = useState('chat');
    const [loading, setLoading] = useState(false);

    // AI Chat state
    const [chatQuery, setChatQuery] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'bot', text: 'Hello! I am Smartie, your AI Concierge. How can I help you plan, structure or budget your event today?' }
    ]);
    const [actionBusy, setActionBusy] = useState(null);
    const chatEndRef = useRef(null);

    // Keep the newest message in view as the thread grows.
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [chatHistory, loading]);

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
            // Strip the machine-readable [ACTION_*] block out of the visible
            // text and surface it as a confirmation card instead.
            const { text, action } = parseAssistantReply(res.data?.data?.reply || '');

            // Creating a service requires the provider role; offering the
            // button to a customer would only produce a 403.
            const allowed = action?.type === ACTION_TYPES.EVENT_CREATE ? canCreateServices : Boolean(action);
            const keptAction = allowed ? action : null;

            // A reply that was ONLY an action block leaves empty text once the
            // block is stripped, which rendered a blank bubble — Smartie
            // appeared to vanish. Never append an empty message.
            const safeText = text?.trim()
                ? text
                : keptAction
                    ? 'I can set that up for you — confirm below.'
                    : 'Sorry, I did not catch that. Could you rephrase?';

            setChatHistory(prev => [...prev, { role: 'bot', text: safeText, action: keptAction }]);
        } catch (err) {
            const message = err.response?.data?.message || 'Smartie is unavailable right now. Please try again.';
            toast.error(message);
            // Keep the thread coherent instead of leaving the user's question
            // hanging with no response at all.
            setChatHistory(prev => [...prev, { role: 'bot', text: message, isError: true }]);
        } finally {
            setLoading(false);
        }
    };

    /** Carries out an action the assistant proposed, once the user confirms. */
    const runAction = async (action, msgIndex) => {
        setActionBusy(msgIndex);
        try {
            if (action.type === ACTION_TYPES.EVENT_CREATE) {
                const res = await axios.post('/events', buildEventPayload(action.payload));
                toast.success(`Created "${res.data.data.title}".`);
                setChatHistory(prev => prev.map((m, i) =>
                    i === msgIndex ? { ...m, action: null, actionResult: 'Service created.' } : m
                ));
            } else if (action.type === ACTION_TYPES.REPORT_GENERATE) {
                const res = await axios.post('/ai/query', {
                    query: `Generate a ${action.payload.timeframe || 'monthly'} performance report covering ${(action.payload.metrics || ['revenue', 'bookings']).join(', ')}.`
                });
                const { text } = parseAssistantReply(res.data.data.reply || '');
                setChatHistory(prev => [
                    ...prev.map((m, i) => (i === msgIndex ? { ...m, action: null } : m)),
                    { role: 'bot', text },
                ]);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not complete that action.');
        } finally {
            setActionBusy(null);
        }
    };

    const dismissAction = (msgIndex) => {
        setChatHistory(prev => prev.map((m, i) => (i === msgIndex ? { ...m, action: null } : m)));
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
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">SMARTIE AI CONCIERGE WORKSPACE</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        AI Event Planner Workspace
                    </h1>
                    <p className="text-xs text-muted font-medium">Use advanced RAG models to research requirements, build specifications, and plan schedules.</p>
                </div>

                <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-full text-xs font-bold uppercase shrink-0">
                    <button onClick={() => setActiveTab('chat')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'chat' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>Chatbot</button>
                    <button onClick={() => setActiveTab('rfp')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'rfp' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>RFP Builder</button>
                    <button onClick={() => setActiveTab('timeline')} className={`px-4 py-2 rounded-full transition-all ${activeTab === 'timeline' ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}>Timeline Plan</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Action area */}
                <div className="lg:col-span-8 space-y-6">
                    {/* TAB 1: RAG CHAT */}
                    {activeTab === 'chat' && (
                        <div className="adyen-card bg-surface border border-border rounded-3xl overflow-hidden flex flex-col h-[550px] shadow-sm">
                            <div className="p-4 bg-surface-2 border-b border-border flex items-center gap-2">
                                <Bot size={16} className="text-success" />
                                <span className="text-xs font-bold text-fg">Conversational Concierge Chat</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-semibold">
                                {chatHistory.map((msg, idx) => {
                                    const described = describeAction(msg.action);
                                    return (
                                        <div key={idx} className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}>
                                            <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand/10 text-brand' : 'bg-success/15 text-success'}`}>
                                                    {msg.role === 'user' ? <User size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
                                                </div>
                                                <div className={`p-3.5 rounded-2xl border leading-relaxed whitespace-pre-wrap ${
                                                    msg.role === 'user'
                                                        ? 'bg-brand/5 border-brand/20 text-fg'
                                                        : msg.isError
                                                            ? 'bg-danger/5 border-danger/25 text-danger'
                                                            : 'bg-surface-2 border-border text-fg'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                            </div>

                                            {msg.actionResult && (
                                                <p className="ml-11 text-[11px] font-bold text-success flex items-center gap-1">
                                                    <Check size={12} aria-hidden="true" /> {msg.actionResult}
                                                </p>
                                            )}

                                            {/* Smartie proposed a concrete action — require explicit confirmation
                                                before it touches the user's data. */}
                                            {described && (
                                                <div className="ml-11 p-4 rounded-2xl bg-brand/5 border border-brand/25 space-y-3 w-full">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                                                            {described.heading}
                                                        </p>
                                                        <p className="text-sm font-bold text-fg mt-1">{described.summary}</p>
                                                        {described.details.map((d) => (
                                                            <p key={d} className="text-[11px] text-muted">{d}</p>
                                                        ))}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={actionBusy === idx}
                                                            onClick={() => runAction(msg.action, idx)}
                                                            className="px-3 py-2 rounded-lg bg-brand text-white text-[11px] font-black flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            {actionBusy === idx
                                                                ? <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                                                                : <Check size={12} aria-hidden="true" />}
                                                            {described.confirmLabel}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => dismissAction(idx)}
                                                            className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-[11px] font-bold text-muted hover:text-fg flex items-center gap-1.5"
                                                        >
                                                            <X size={12} aria-hidden="true" /> Not now
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {loading && (
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                                            <Bot size={14} aria-hidden="true" />
                                        </div>
                                        <div className="p-3.5 rounded-2xl border border-border bg-surface-2 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '120ms' }} />
                                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '240ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            <form onSubmit={handleChatSubmit} className="p-4 border-t border-border flex gap-2">
                                <input
                                    type="text"
                                    required
                                    disabled={loading}
                                    placeholder="Ask anything about event setup, budgets, or security..."
                                    value={chatQuery}
                                    onChange={(e) => setChatQuery(e.target.value)}
                                    className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 outline-none focus:border-success text-xs"
                                />
                                <button type="submit" disabled={loading} className="btn-adyen-primary p-3 rounded-xl shadow-glow"
                                aria-label="Send message">
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB 2: RFP GENERATOR */}
                    {activeTab === 'rfp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Describe Event Scope</h3>
                                <form onSubmit={handleRfpSubmit} className="space-y-4 text-xs font-semibold">
                                    <textarea
                                        rows="4"
                                        required
                                        placeholder="e.g. Wedding banquet in Chicago with 150 guests, looking for premium decoration and catering..."
                                        value={rfpQuery}
                                        onChange={(e) => setRfpQuery(e.target.value)}
                                        className="w-full bg-bg border border-border rounded-xl p-3 outline-none focus:border-success"
                                    />
                                    <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-glow">
                                        <Sparkles size={16} />
                                        <span>{loading ? 'Structuring RFP...' : 'Generate Spec Outline'}</span>
                                    </button>
                                </form>
                            </div>

                            <div className="adyen-card p-6 bg-surface border border-border rounded-3xl min-h-[300px] flex flex-col justify-between">
                                {!rfpResult ? (
                                    <div className="text-center text-muted my-auto">
                                        <FileText size={40} className="mx-auto opacity-15 mb-2" />
                                        <p className="text-xs font-semibold">No spec blueprint generated yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 text-xs font-semibold">
                                        <span className="adyen-badge bg-success/15 text-success border-none font-bold uppercase">{rfpResult.category}</span>
                                        <h4 className="text-sm font-bold text-fg">{rfpResult.title}</h4>
                                        <p className="text-muted leading-relaxed font-medium">{rfpResult.description}</p>
                                        <div className="pt-3 border-t border-border space-y-2">
                                            <span className="text-[10px] font-mono text-muted block uppercase font-bold">RFP requirements</span>
                                            <ul className="list-disc list-inside space-y-1 text-muted font-medium">
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
                            <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Configure Timeline Parameters</h3>
                                <form onSubmit={handleTimelineSubmit} className="space-y-4 text-xs font-semibold">
                                    <div>
                                        <label className="text-muted block mb-1">Target Event Date</label>
                                        <input
                                            type="date"
                                            required
                                            value={timelineDetails.date}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, date: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-muted block mb-1">Event Category</label>
                                        <select
                                            value={timelineDetails.eventType}
                                            onChange={(e) => setTimelineDetails({ ...timelineDetails, eventType: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        >
                                            <option value="Wedding">Wedding</option>
                                            <option value="Concert">Concert</option>
                                            <option value="Corporate">Corporate Conference</option>
                                        </select>
                                    </div>
                                    <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full justify-center shadow-glow">
                                        <Sparkles size={16} />
                                        <span>{loading ? 'Building Timeline...' : 'Generate Roadmap'}</span>
                                    </button>
                                </form>
                            </div>

                            <div className="adyen-card p-6 bg-surface border border-border rounded-3xl min-h-[300px] flex flex-col justify-between">
                                {/* Guard the shape: the API used to hand back a plain
                                    object, and calling .map on it threw, which took the
                                    whole page down through the error boundary. */}
                                {!Array.isArray(timelineResult) || timelineResult.length === 0 ? (
                                    <div className="text-center text-muted my-auto">
                                        <Calendar size={40} className="mx-auto opacity-30 mb-2" />
                                        <p className="text-xs font-semibold">
                                            {timelineResult ? 'No milestones came back — try again.' : 'No timeline generated yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-fg">Milestone checklist</h4>
                                        <div className="space-y-4 overflow-y-auto max-h-72 pr-1">
                                            {timelineResult.map((m, idx) => (
                                                <div key={`${m.milestone}-${idx}`} className="flex gap-3 text-xs font-semibold border-l-2 border-success/30 pl-3 relative">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-success absolute -left-[6px] top-1" />
                                                    <div className="space-y-0.5">
                                                        <span className="text-[10px] font-mono text-muted block uppercase font-bold">
                                                            {m.daysBefore} days before
                                                        </span>
                                                        <h5 className="font-bold text-fg">{m.milestone}</h5>
                                                        <p className="text-muted leading-relaxed font-medium">{m.description}</p>
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
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">AI Operations</h3>
                        <p className="text-xs text-muted leading-relaxed font-medium">
                            Smartie uses Vector Search (RAG) context retrievals to audit and constraints match event specifications.
                        </p>

                        <div className="space-y-2 pt-2 text-xs font-bold">
                            <button
                                onClick={() => navigate('/budget-tracker')}
                                className="w-full flex items-center justify-between p-3 rounded-2xl bg-surface-2 border border-border hover:border-success text-fg hover:text-success transition-all"
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
