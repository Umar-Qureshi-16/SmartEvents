import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Send, Bot, User, Check, X, Loader2, Copy, ShieldCheck } from 'lucide-react';
import axios from '../../api/axios';

// What Smartie can do for each role. The server enforces the same limits.
export const ROLE_GUIDE = {
    superadmin: {
        greeting: 'Hello! I can find users, ban, restrict or reinstate accounts, create accounts of any role, change roles, resolve disputes, check guests in, delete events and summarise the platform. Tell me what you need.',
        examples: ['Show me the platform stats', 'List the open disputes', 'Find users named Ali', 'Create a customer account for Usman Ali, usman@example.com'],
    },
    admin: {
        greeting: 'Hello! I can find users, ban, restrict or reinstate customer and vendor accounts, create customer or vendor accounts, resolve disputes and summarise the platform. Tell me what you need.',
        examples: ['Show me the platform stats', 'List the open disputes', 'Find all banned users'],
    },
    provider: {
        greeting: 'Hello! I can answer offers (counter, accept or reject), publish and edit your events, add service packages, block or unblock dates, check guests in and summarise your revenue. Tell me what you need.',
        examples: ['Show my bookings', 'Summarise my revenue', 'Counter the newest offer at 5000', 'Block 24 December on my calendar'],
    },
    customer: {
        greeting: 'Hello! I can find events, make and negotiate offers, accept or cancel bookings, get entry passes, mark events complete, raise disputes and leave reviews. Tell me what you need.',
        examples: ['Find wedding events under 5000', 'Show my bookings', 'Show my passes', 'Suggest a budget split for a 200-guest wedding'],
    },
};

/**
 * The task assistant chat, shared by the AI page and the floating panel.
 * Look-ups run on the server straight away; changes come back as a proposal
 * and only run when the user presses Confirm.
 */
export default function AgentChat({ role, compact = false }) {
    const guide = ROLE_GUIDE[role] || ROLE_GUIDE.customer;
    const isAdmin = role === 'admin' || role === 'superadmin';
    const [history, setHistory] = useState([{ role: 'bot', text: guide.greeting }]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [busyIndex, setBusyIndex] = useState(null);
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [history, loading]);

    const toServer = (list) => list
        .filter((m) => !m.isError && m.text)
        .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));

    const send = async (text) => {
        if (!text.trim() || loading) return;
        const next = [...history, { role: 'user', text }];
        setHistory(next);
        setDraft('');
        setLoading(true);
        try {
            const res = await axios.post('/ai/agent', { messages: toServer(next) });
            const { reply, pendingAction } = res.data?.data || {};
            setHistory((prev) => [...prev, { role: 'bot', text: reply || 'Done.', action: pendingAction || null }]);
        } catch (err) {
            const message = err.response?.data?.message || 'Smartie is unavailable right now. Please try again.';
            setHistory((prev) => [...prev, { role: 'bot', text: message, isError: true }]);
        } finally {
            setLoading(false);
        }
    };

    const confirm = async (action, index) => {
        setBusyIndex(index);
        try {
            const res = await axios.post('/ai/agent/execute', { name: action.name, args: action.args });
            const result = res.data?.data || {};
            toast.success(result.message || 'Done.');
            setHistory((prev) => [
                ...prev.map((m, i) => (i === index ? { ...m, action: null, result: `Confirmed: ${action.summary}` } : m)),
                { role: 'bot', text: result.message || 'Done.', secret: result.temporaryPassword, note: result.note },
            ]);
        } catch (err) {
            const message = err.response?.data?.message || 'Could not complete that action.';
            toast.error(message);
            setHistory((prev) => [
                ...prev.map((m, i) => (i === index ? { ...m, action: null } : m)),
                { role: 'bot', text: message, isError: true },
            ]);
        } finally {
            setBusyIndex(null);
        }
    };

    const cancel = (index) => {
        setHistory((prev) => prev.map((m, i) => (i === index ? { ...m, action: null, result: 'Cancelled.' } : m)));
    };

    const copy = async (value) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success('Copied.');
        } catch {
            toast.error('Could not copy. Select the text instead.');
        }
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            <div className={`flex-1 overflow-y-auto ${compact ? 'p-4' : 'p-5'} space-y-4 text-xs font-semibold`}>
                {history.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-2 ${compact ? 'max-w-[92%]' : 'max-w-[85%]'} ${msg.role === 'user' ? 'ml-auto items-end' : ''}`}>
                        <div className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-brand/10 text-brand' : 'bg-success/15 text-success'}`}>
                                {msg.role === 'user' ? <User size={13} aria-hidden="true" /> : <Bot size={13} aria-hidden="true" />}
                            </div>
                            <div className={`p-3 rounded-2xl border leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-brand/5 border-brand/20 text-fg'
                                    : msg.isError ? 'bg-danger/5 border-danger/25 text-danger' : 'bg-surface-2 border-border text-fg'
                            }`}>
                                {msg.text}
                                {msg.secret && (
                                    <div className="mt-3 p-3 rounded-xl bg-bg border border-border space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Temporary password (shown once)</p>
                                        <div className="flex items-center gap-2">
                                            <code className="font-mono text-sm text-fg select-all">{msg.secret}</code>
                                            <button type="button" onClick={() => copy(msg.secret)} className="p-1.5 rounded-lg border border-border text-muted hover:text-fg" aria-label="Copy temporary password">
                                                <Copy size={12} aria-hidden="true" />
                                            </button>
                                        </div>
                                        {msg.note && <p className="text-[11px] text-muted">{msg.note}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {msg.result && (
                            <p className="ml-9 text-[11px] font-bold text-success flex items-center gap-1">
                                <Check size={12} aria-hidden="true" /> {msg.result}
                            </p>
                        )}

                        {msg.action && (
                            <div className="ml-9 p-3.5 rounded-2xl bg-brand/5 border border-brand/25 space-y-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-1">
                                        <ShieldCheck size={12} aria-hidden="true" /> Confirm this action
                                    </p>
                                    <p className="text-sm font-bold text-fg mt-1">{msg.action.summary}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" disabled={busyIndex === idx} onClick={() => confirm(msg.action, idx)}
                                        className="px-3 py-2 rounded-lg bg-brand text-white text-[11px] font-black flex items-center gap-1.5 disabled:opacity-50">
                                        {busyIndex === idx ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Check size={12} aria-hidden="true" />}
                                        Confirm
                                    </button>
                                    <button type="button" disabled={busyIndex === idx} onClick={() => cancel(idx)}
                                        className="px-3 py-2 rounded-lg bg-surface-2 border border-border text-[11px] font-bold text-muted hover:text-fg flex items-center gap-1.5">
                                        <X size={12} aria-hidden="true" /> Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {history.length === 1 && !loading && (
                    <div className="flex flex-wrap gap-2 ml-9">
                        {guide.examples.map((ex) => (
                            <button key={ex} type="button" onClick={() => send(ex)}
                                className="px-3 py-1.5 rounded-full border border-border bg-surface-2 text-[11px] font-semibold text-muted hover:text-fg hover:border-brand text-left">
                                {ex}
                            </button>
                        ))}
                    </div>
                )}

                {loading && (
                    <div className="flex gap-2.5" aria-live="polite">
                        <div className="w-7 h-7 rounded-full bg-success/15 text-success flex items-center justify-center shrink-0">
                            <Bot size={13} aria-hidden="true" />
                        </div>
                        <div className="p-3 rounded-2xl border border-border bg-surface-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '120ms' }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: '240ms' }} />
                            <span className="sr-only">Smartie is thinking</span>
                        </div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="p-3 border-t border-border flex gap-2">
                <label htmlFor={compact ? 'assistant-input-panel' : 'assistant-input-page'} className="sr-only">Message Smartie</label>
                <input
                    id={compact ? 'assistant-input-panel' : 'assistant-input-page'}
                    type="text"
                    disabled={loading}
                    placeholder={isAdmin ? 'e.g. Ban the user ali@example.com' : 'Ask a question or tell Smartie what to do...'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1 bg-bg border border-border rounded-xl px-4 py-3 outline-none focus:border-brand text-xs text-fg placeholder:text-muted"
                />
                <button type="submit" disabled={loading || !draft.trim()} className="btn-adyen-primary px-3.5 rounded-xl disabled:opacity-50" aria-label="Send message">
                    <Send size={16} aria-hidden="true" />
                </button>
            </form>
        </div>
    );
}
