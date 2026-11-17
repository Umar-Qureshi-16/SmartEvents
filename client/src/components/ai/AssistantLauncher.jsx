import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, X, Maximize2 } from 'lucide-react';
import AgentChat from './AgentChat';

/**
 * "Ask Smartie" button on every page for signed-in users. Opens the task
 * assistant in a side panel so any role can act without leaving the page.
 */
export default function AssistantLauncher({ user }) {
    const location = useLocation();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    // The full-page assistant already has the chat.
    if (!user || location.pathname.startsWith('/ai-concierge')) return null;

    return (
        <>
            {open && (
                <div
                    role="dialog"
                    aria-label="Smartie AI assistant"
                    className="fixed z-[90] bottom-24 right-4 left-4 sm:left-auto sm:w-[420px] h-[min(600px,calc(100vh-8rem))] bg-surface border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2">
                        <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                                <Sparkles size={14} aria-hidden="true" />
                            </span>
                            <div>
                                <p className="text-xs font-black text-fg">Smartie AI assistant</p>
                                <p className="text-[10px] text-muted">Changes always ask you to confirm first</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Link to="/ai-concierge" onClick={() => setOpen(false)} className="p-2 rounded-lg text-muted hover:text-fg" aria-label="Open full assistant page">
                                <Maximize2 size={14} aria-hidden="true" />
                            </Link>
                            <button type="button" onClick={() => setOpen(false)} className="p-2 rounded-lg text-muted hover:text-fg" aria-label="Close assistant">
                                <X size={16} aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <AgentChat role={user.role} compact />
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label={open ? 'Close Smartie AI assistant' : 'Open Smartie AI assistant'}
                className="fixed z-[90] bottom-5 right-5 flex items-center gap-2 pl-4 pr-5 py-3 rounded-full btn-adyen-primary shadow-2xl text-sm"
            >
                {open ? <X size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
                <span>{open ? 'Close' : 'Ask Smartie'}</span>
            </button>
        </>
    );
}
