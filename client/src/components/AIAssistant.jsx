import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, CheckCircle2, ChevronRight, MessageSquare, Activity, PackageSearch } from 'lucide-react';
import API_BASE_URL from '../apiConfig';

export default function AIAssistant({ user, refreshBookings }) {
    const [messages, setMessages] = useState([
        { role: 'ai', text: `Hi ${user.name}! I am your AI Event Assistant. How can I help you plan your perfect event today?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const messagesEndRef = useRef(null);

    const suggestions = [
        "Plan a birthday party for 50 people under $500",
        "Best corporate event package?",
        "Luxury wedding under $10,000"
    ];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const parseIntent = (text) => {
        const textLower = text.toLowerCase();
        let type = 'general';
        if (textLower.includes('birthday')) type = 'birthday';
        else if (textLower.includes('wedding')) type = 'wedding';
        else if (textLower.includes('corporate') || textLower.includes('meeting')) type = 'corporate';

        let budget = null;
        const match = textLower.match(/(\d+)(k|,000)?/);
        if (match) {
            budget = parseInt(match[1]);
            if (match[2] === 'k') budget *= 1000;
            else if (budget < 100 && match[2] === undefined && textLower.includes('thousand')) budget *= 1000;
        }
        return { type, budget: budget || 50000 };
    };

    const findMatchingEvent = async (intent) => {
        try {
            const res = await fetch(`${API_BASE_URL}/events`);
            const result = await res.json();
            const eventsArray = result.data || result || [];

            const matchingEvents = eventsArray.filter(e => e.type === intent.type && e.price <= intent.budget);
            if (matchingEvents.length > 0) return matchingEvents[0];

            const anyTypeEvents = eventsArray.filter(e => e.type === intent.type);
            if (anyTypeEvents.length > 0) return anyTypeEvents[0];

            return eventsArray.length > 0 ? eventsArray[0] : null;
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleBookWithAI = async (eventId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ eventId })
            });

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'ai', text: 'Success! Your event has been securely booked. You can view it in your My Bookings section.', isSuccess: true }]);
                if (refreshBookings) refreshBookings();
            } else {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', text: `Booking failed: ${data.message}`, isError: true }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Network error during booking.', isError: true }]);
        }
    };

    const handleCreateEventAI = async (eventData) => {
        setIsTyping(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...eventData,
                    date: new Date(Date.now() + 86400000 * 7).toISOString(), // Move to 7 days from now as default
                    capacity: 50,
                    location: 'To be determined'
                })
            });

            if (res.ok) {
                setMessages(prev => [...prev, { role: 'ai', text: `Amazing! I've successfully listed "${eventData.title}" on your dashboard for $${eventData.price}. It's now live and ready for bookings!`, isSuccess: true }]);
                if (refreshBookings) refreshBookings();
            } else {
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', text: `I couldn't create the event: ${data.message}`, isError: true }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Error communicating with the service processor.', isError: true }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleSend = async (textOverride) => {
        const userMsg = typeof textOverride === 'string' ? textOverride : input.trim();
        if (!userMsg) return;

        setShowSuggestions(false);
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setIsTyping(true);

        try {
            const token = localStorage.getItem('token');
            const historyPayload = messages.map(m => ({
                role: m.role === 'ai' ? 'assistant' : 'user',
                content: m.text
            }));

            const res = await fetch(`${API_BASE_URL}/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: userMsg, conversationHistory: historyPayload })
            });

            if (!res.ok) {
                if (res.status === 403 || res.status === 401) {
                    setMessages(prev => [...prev, { role: 'ai', text: 'Your session has expired or is invalid. Please log out and log back in to continue.', isError: true }]);
                } else {
                    setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, the AI engine is currently unavailable.', isError: true }]);
                }
            } else {
                const data = await res.json();
                const reply = data.reply;

                let cleanText = reply;
                let actionData = null;

                if (reply) {
                    const eventMatch = reply.match(/\[ACTION_EVENT_CREATE\]:\s*(\{.*?\})/);
                    const reportMatch = reply.match(/\[ACTION_REPORT_GENERATE\]:\s*(\{.*?\})/);

                    if (eventMatch || reportMatch) {
                        cleanText = reply.replace(/\[ACTION_.*?\]:\s*\{.*?\}/g, '').trim();
                        if (eventMatch) {
                            try { actionData = { type: 'create_event', data: JSON.parse(eventMatch[1]) }; } catch (e) { console.error("Parse error", e); }
                        } else if (reportMatch) {
                            try { actionData = { type: 'generate_report', data: JSON.parse(reportMatch[1]) }; } catch (e) { console.error("Parse error", e); }
                        }
                    }
                }

                setMessages(prev => [...prev, { role: 'ai', text: cleanText || "No response generated.", action: actionData || data.action }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: 'Network connection failed.', isError: true }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lift border border-indigo-50/50 flex flex-col h-[500px] overflow-hidden relative">

            {/* Header */}
            <div className="bg-emerald p-4 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <Sparkles className="text-white w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-white leading-tight">Smart AI Assistant</h3>
                    <p className="text-white/70 text-xs font-medium">Always active. Ready to match.</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                <AnimatePresence>
                    {messages.map((msg, index) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            key={index}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                                max-w-[85%] rounded-2xl p-3.5 text-sm shadow-sm
                                ${msg.role === 'user'
                                    ? 'bg-emerald text-white rounded-br-sm'
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'}
                                ${msg.isSuccess ? 'bg-emerald/10 border-emerald/30 text-emerald' : ''}
                                ${msg.isError ? 'bg-coral/10 border-coral/30 text-coral' : ''}
                            `}>
                                {msg.role === 'ai' && !msg.isSuccess && !msg.isError && <Sparkles className="w-4 h-4 text-emerald mb-1 inline-block mr-1" />}
                                {msg.isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald mb-1 inline-block mr-1" />}
                                {msg.text}

                                {msg.isPlan && msg.event && (
                                    <div className="mt-3 bg-emerald/5 rounded-xl p-3 border border-emerald/20">
                                        <div className="font-bold text-ink mb-2 truncate">🎉 {msg.event.title}</div>
                                        <div className="space-y-1 mb-3 text-xs text-slate-600 font-medium">
                                            <div className="flex justify-between"><span>Category:</span> <span className="capitalize text-emerald">{msg.event.type}</span></div>
                                            <div className="flex justify-between"><span>Estimated:</span> <span className="text-emerald font-mono">${msg.event.price}</span></div>
                                        </div>
                                        <button
                                            className="w-full py-2 bg-emerald hover:bg-emerald/90 text-white font-bold rounded-lg transition-all active:scale-95 flex justify-center items-center gap-2"
                                            onClick={() => handleBookWithAI(msg.event._id)}
                                        >
                                            Confirm Booking <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {msg.action && msg.action.type === 'create_event' && (
                                    <div className="mt-3 bg-fuchsia-50 border border-fuchsia-100 rounded-xl p-3 shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-fuchsia-100 flex items-center justify-center">
                                                <PackageSearch className="w-4 h-4 text-fuchsia-600" />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-fuchsia-500 font-bold uppercase tracking-wider">Proposal: New Listing</div>
                                                <div className="font-bold text-fuchsia-900 text-sm">{msg.action.data.title}</div>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-600 mb-3 italic">"{msg.action.data.description}"</p>
                                        <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-800">
                                            <span>Est. Price:</span>
                                            <span className="text-fuchsia-600">${msg.action.data.price}</span>
                                        </div>
                                        <button
                                            onClick={() => handleCreateEventAI(msg.action.data)}
                                            className="w-full py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            Confirm & Go Live <Sparkles className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {msg.action && msg.action.type === 'generate_report' && (
                                    <div className="mt-3 bg-white border border-indigo-100 rounded-2xl shadow-lift overflow-hidden">
                                        <div className="bg-emerald p-3 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-white" />
                                            <span className="text-white font-bold text-xs uppercase tracking-wider">Business Intelligence</span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <p className="text-xs text-slate-600 font-medium leading-relaxed">I've synthesized your performance data. Click below to view the full deep-dive analysis of your revenue and market position.</p>
                                            <button
                                                className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                                                onClick={() => handleSend("Give me the full textual breakdown of my performance metrics.")}
                                            >
                                                Deep Dive Analysis <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                            <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-sm p-3.5 text-sm shadow-sm flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 animate-pulse text-emerald" />
                                AI is analyzing your business...
                                <span className="flex gap-1 ml-1">
                                    <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                                    <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                                    <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-slate-400 rounded-full" />
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                {showSuggestions && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {suggestions.map((s, i) => (
                            <button key={i} onClick={() => handleSend(s)} className="text-xs bg-emerald/5 text-emerald border border-emerald/20 px-3 py-1.5 rounded-full hover:bg-emerald/10 transition-colors whitespace-nowrap">
                                {s}
                            </button>
                        ))}
                    </div>
                )}
                <form
                    className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:ring-2 ring-emerald transition-all"
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask AI for insights..."
                        className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm text-slate-700"
                    />
                    <button
                        type="submit"
                        disabled={isTyping || !input.trim()}
                        className="p-2 bg-emerald text-white rounded-lg hover:bg-emerald/90 disabled:opacity-50 disabled:hover:bg-emerald transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}
