import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Palette, Sparkles, Save, Plus, Trash2, Check, Send, Loader2, Image as ImageIcon, Users, Wallet, PenTool } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import DesignGallery from './DesignGallery';
import { useWebSockets } from '../../context/WebSocketContext';
import { formatMoney, toBase, fromBase } from '../../utils/money';

const STYLES = ['Traditional', 'Modern', 'Minimal', 'Royal', 'Rustic', 'Floral', 'Boho', 'Glam'];
const TIER_TONE = {
    Essential: 'bg-success/10 text-success border-success/25',
    Signature: 'bg-brand/10 text-brand border-brand/25',
    Luxe: 'bg-warning/10 text-warning border-warning/25',
};
const money = (n) => (Number.isFinite(Number(n)) ? formatMoney(n) : '—');
const field = 'w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-muted outline-none focus:border-brand';

/**
 * Shared design space for a booking: the brief both sides edit, AI concepts at
 * three price points within the budget, and a decor discussion kept apart
 * from price offers. Updates arrive live through the booking's socket room.
 */
export default function DesignStudio({ bookingId, currentUserId }) {
    const { socket } = useWebSockets();
    const [design, setDesign] = useState(null);
    const [brief, setBrief] = useState({ theme: '', style: '', colors: [], budget: '', guestCount: '', notes: '', references: [] });
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [drafting, setDrafting] = useState(false);
    const [selecting, setSelecting] = useState(null);
    const [message, setMessage] = useState('');

    const apply = useCallback((data, keepEdits = false) => {
        setDesign(data);
        if (keepEdits) return;
        const b = data.brief || {};
        setBrief({
            theme: b.theme || '', style: b.style || '', colors: b.colors || [],
            budget: (b.budget ?? data.agreedPrice) != null ? fromBase(b.budget ?? data.agreedPrice) : '', guestCount: b.guestCount ?? '', notes: b.notes || '',
            references: (b.references || []).map((r) => ({ url: r.url, caption: r.caption || '' })),
        });
        setDirty(false);
    }, []);

    const load = useCallback(async (keepEdits = false) => {
        try {
            const res = await axios.get(`/bookings/${bookingId}/design`);
            apply(res.data.data, keepEdits);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load the design studio.');
        }
    }, [bookingId, apply]);

    useEffect(() => { load(); }, [load]);

    // The other party's changes arrive live; keep unsaved edits to the brief.
    useEffect(() => {
        if (!socket) return undefined;
        const onUpdate = (evt) => {
            if (String(evt.bookingId) !== String(bookingId) || String(evt.actorId) === String(currentUserId)) return;
            load(dirty && evt.kind !== 'brief');
            if (evt.kind === 'brief') toast('The design brief was updated.', { icon: '🎨' });
            if (evt.kind === 'concepts') toast('New design concepts are ready.', { icon: '✨' });
            if (evt.kind === 'selection') toast('A design concept was chosen.', { icon: '✅' });
        };
        socket.on('design-updated', onUpdate);
        return () => socket.off('design-updated', onUpdate);
    }, [socket, bookingId, currentUserId, load, dirty]);

    const edit = (patch) => { setBrief((b) => ({ ...b, ...patch })); setDirty(true); };

    const saveBrief = async () => {
        setSaving(true);
        try {
            const payload = {
                theme: brief.theme, style: brief.style, colors: brief.colors, notes: brief.notes,
                budget: brief.budget === '' ? undefined : toBase(brief.budget),
                guestCount: brief.guestCount === '' ? undefined : Number(brief.guestCount),
                references: brief.references.filter((r) => r.url.trim()),
            };
            const res = await axios.put(`/bookings/${bookingId}/design/brief`, payload);
            apply(res.data.data);
            toast.success('Design brief saved and shared.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save the brief.');
        } finally {
            setSaving(false);
        }
    };

    const draftConcepts = async () => {
        if (dirty) await saveBrief();
        setDrafting(true);
        try {
            const res = await axios.post(`/bookings/${bookingId}/design/concepts`);
            apply(res.data.data, true);
            toast.success('Three concepts drafted within your budget.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not draft concepts.');
        } finally {
            setDrafting(false);
        }
    };

    const choose = async (conceptId) => {
        setSelecting(conceptId);
        try {
            const res = await axios.put(`/bookings/${bookingId}/design/concepts/${conceptId}/select`);
            apply(res.data.data, true);
            toast.success('Concept chosen. Both of you will follow this design.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not choose that concept.');
        } finally {
            setSelecting(null);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        try {
            const res = await axios.post(`/bookings/${bookingId}/design/messages`, { text: message });
            setMessage('');
            apply(res.data.data, true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send your message.');
        }
    };

    if (!design) {
        return <div className="flex-1 flex items-center justify-center text-muted text-sm"><Loader2 className="animate-spin mr-2" size={16} /> Loading the design studio…</div>;
    }

    const budget = toBase(brief.budget) || design.agreedPrice || 0;

    return (
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
            {/* Design Lab: shared canvas for this booking, built from inspiration pictures. */}
            <section className="bg-gradient-to-r from-brand/15 via-brand/5 to-transparent border border-brand/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center gap-4" aria-label="Design Lab">
                <div className="w-11 h-11 rounded-2xl bg-brand text-white grid place-items-center shrink-0"><PenTool size={20} aria-hidden="true" /></div>
                <div className="flex-1 min-w-0">
                    <p className="font-black text-fg">Design Lab</p>
                    <p className="text-xs text-muted">Find real decor pictures for this event and its culture, pin the ones you like, cut out the pieces you want and build your own design on a canvas. Both of you can open and edit it.</p>
                </div>
                <Link to={`/design-lab/booking/${bookingId}?eventType=${encodeURIComponent(design.event?.category || '')}&theme=${encodeURIComponent(brief.theme || '')}`}
                    className="inline-flex items-center justify-center gap-1.5 bg-brand text-white hover:opacity-90 text-sm font-bold rounded-xl px-4 py-2.5 shrink-0">
                    <PenTool size={15} aria-hidden="true" />Open Design Lab
                </Link>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* ---------------- Brief ---------------- */}
                <section className="lg:col-span-2 bg-surface border border-border rounded-3xl p-5 space-y-4" aria-labelledby="brief-heading">
                    <div className="flex items-center justify-between">
                        <h3 id="brief-heading" className="text-sm font-black text-fg flex items-center gap-2"><Palette size={16} className="text-brand" aria-hidden="true" /> Design brief</h3>
                        {design.brief?.updatedAt && <span className="text-[10px] text-muted">Updated {new Date(design.brief.updatedAt).toLocaleString()}</span>}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="ds-theme" className="text-xs font-bold text-fg">Theme</label>
                        <input id="ds-theme" className={field} value={brief.theme} onChange={(e) => edit({ theme: e.target.value })} placeholder="e.g. Royal mehndi night, garden wedding" />
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-xs font-bold text-fg">Style</span>
                        <div className="flex flex-wrap gap-1.5">
                            {STYLES.map((s) => (
                                <button key={s} type="button" onClick={() => edit({ style: brief.style === s ? '' : s })}
                                    aria-pressed={brief.style === s}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${brief.style === s ? 'bg-brand text-white border-brand' : 'bg-surface-2 text-muted border-border hover:text-fg'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-xs font-bold text-fg">Colours</span>
                        <div className="flex flex-wrap items-center gap-2">
                            {brief.colors.map((c, i) => (
                                <div key={i} className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl pl-1 pr-1.5 py-1">
                                    <input type="color" value={c} aria-label={`Colour ${i + 1}`} onChange={(e) => edit({ colors: brief.colors.map((x, j) => (j === i ? e.target.value : x)) })} className="w-7 h-7 rounded-lg border-0 bg-transparent cursor-pointer" />
                                    <span className="text-[10px] font-mono text-muted">{c}</span>
                                    <button type="button" onClick={() => edit({ colors: brief.colors.filter((_, j) => j !== i) })} className="text-muted hover:text-danger" aria-label={`Remove colour ${c}`}><Trash2 size={12} aria-hidden="true" /></button>
                                </div>
                            ))}
                            {brief.colors.length < 8 && (
                                <button type="button" onClick={() => edit({ colors: [...brief.colors, '#c9a227'] })} className="px-2.5 py-1.5 rounded-xl border border-dashed border-border text-[11px] font-bold text-muted hover:text-fg flex items-center gap-1">
                                    <Plus size={12} aria-hidden="true" /> Add colour
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label htmlFor="ds-budget" className="text-xs font-bold text-fg flex items-center gap-1"><Wallet size={12} aria-hidden="true" /> Decor budget</label>
                            <input id="ds-budget" type="number" min="0" className={field} value={brief.budget} onChange={(e) => edit({ budget: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="ds-guests" className="text-xs font-bold text-fg flex items-center gap-1"><Users size={12} aria-hidden="true" /> Guests</label>
                            <input id="ds-guests" type="number" min="0" className={field} value={brief.guestCount} onChange={(e) => edit({ guestCount: e.target.value })} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="ds-notes" className="text-xs font-bold text-fg">Your own design idea</label>
                        <textarea id="ds-notes" rows={3} className={`${field} resize-y`} value={brief.notes} onChange={(e) => edit({ notes: e.target.value })} placeholder="e.g. Spider-Man theme: city skyline backdrop, web ceiling, red and blue balloon arch" />
                        <p className="text-[10px] text-muted">Smartie follows this idea in the three options and their pictures.</p>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-bold text-fg flex items-center gap-1"><ImageIcon size={12} aria-hidden="true" /> Reference images (links)</span>
                        {brief.references.map((r, i) => (
                            <div key={i} className="flex gap-2 items-start">
                                {/^https?:\/\//.test(r.url) && <img src={r.url} alt={r.caption || 'Reference'} className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                                <div className="flex-1 space-y-1">
                                    <input className={field} value={r.url} placeholder="https://… image link" aria-label={`Reference ${i + 1} link`} onChange={(e) => edit({ references: brief.references.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                                    <input className={field} value={r.caption} placeholder="What you like about it" aria-label={`Reference ${i + 1} caption`} onChange={(e) => edit({ references: brief.references.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })} />
                                </div>
                                <button type="button" onClick={() => edit({ references: brief.references.filter((_, j) => j !== i) })} className="p-2 text-muted hover:text-danger" aria-label={`Remove reference ${i + 1}`}><Trash2 size={14} aria-hidden="true" /></button>
                            </div>
                        ))}
                        {brief.references.length < 12 && (
                            <button type="button" onClick={() => edit({ references: [...brief.references, { url: '', caption: '' }] })} className="text-[11px] font-bold text-brand flex items-center gap-1"><Plus size={12} aria-hidden="true" /> Add a reference image</button>
                        )}
                    </div>

                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={saveBrief} disabled={saving || !dirty} className="flex-1 btn-adyen-outline py-2.5 text-xs disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />} Save brief
                        </button>
                        <button type="button" onClick={draftConcepts} disabled={drafting} className="flex-1 btn-adyen-primary py-2.5 text-xs disabled:opacity-60">
                            {drafting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />} {drafting ? 'Designing…' : 'Draft designs with AI'}
                        </button>
                    </div>
                </section>

                {/* ---------------- Concepts ---------------- */}
                <section className="lg:col-span-3 space-y-4" aria-labelledby="concepts-heading">
                    <h3 id="concepts-heading" className="text-sm font-black text-fg flex items-center gap-2"><Sparkles size={16} className="text-brand" aria-hidden="true" /> Design concepts</h3>
                    {design.concepts.length === 0 ? (
                        <div className="bg-surface border border-dashed border-border rounded-3xl p-8 text-center text-sm text-muted">
                            Fill in the brief and press <span className="font-bold text-fg">Draft designs with AI</span>. Smartie drafts three looks — Essential, Signature and Luxe — that stay within the decor budget.
                        </div>
                    ) : design.concepts.map((c) => {
                        const pct = budget ? Math.min(100, Math.round((c.totalCost / budget) * 100)) : 0;
                        return (
                            <article key={c._id} className={`bg-surface border rounded-3xl p-5 space-y-3 ${c.selected ? 'border-success ring-2 ring-success/30' : 'border-border'}`}>
                                <DesignGallery
                                    design={{ ...c, theme: design.brief?.theme, style: design.brief?.style }}
                                    path={(n) => `/designs/concepts/${bookingId}/${c._id}/image${n ? `?part=${n}` : ''}`}
                                    className="-mx-1"
                                    imageClassName="aspect-video rounded-2xl"
                                />
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${TIER_TONE[c.tier] || ''}`}>{c.tier}</span>
                                        <h4 className="text-base font-black text-fg mt-1.5">{c.title}</h4>
                                    </div>
                                    {c.selected ? (
                                        <span className="px-3 py-1.5 rounded-full bg-success/15 text-success text-[11px] font-black flex items-center gap-1 shrink-0"><Check size={12} aria-hidden="true" /> Chosen</span>
                                    ) : (
                                        <button type="button" onClick={() => choose(c._id)} disabled={selecting === c._id} className="px-3 py-1.5 rounded-full border border-border text-[11px] font-bold text-fg hover:border-brand shrink-0">
                                            {selecting === c._id ? 'Choosing…' : 'Choose this design'}
                                        </button>
                                    )}
                                </div>
                                {c.summary && <p className="text-sm text-muted leading-relaxed">{c.summary}</p>}
                                <div className="flex gap-1.5" aria-label="Colour palette">
                                    {c.palette.map((hex) => (
                                        <span key={hex} title={hex} className="w-8 h-8 rounded-lg border border-border" style={{ backgroundColor: hex }} />
                                    ))}
                                </div>
                                <table className="w-full text-xs">
                                    <tbody>
                                        {c.elements.map((el, i) => (
                                            <tr key={i} className="border-t border-border">
                                                <td className="py-1.5 pr-2 align-top">
                                                    <span className="font-bold text-fg">{el.item}</span>
                                                    {el.description && <span className="block text-muted">{el.description}</span>}
                                                </td>
                                                <td className="py-1.5 text-right font-mono font-bold text-fg align-top whitespace-nowrap">{money(el.cost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-fg">Total {money(c.totalCost)}</span>
                                        <span className="text-muted">{pct}% of {money(budget)} budget</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of budget">
                                        <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                                {c.source === 'template' && <p className="text-[10px] text-muted">Drafted from a budget template because the AI was unavailable.</p>}
                            </article>
                        );
                    })}
                </section>
            </div>

            {/* ---------------- Discussion ---------------- */}
            <section className="bg-surface border border-border rounded-3xl p-5 space-y-3" aria-labelledby="talk-heading">
                <h3 id="talk-heading" className="text-sm font-black text-fg">Decor discussion</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {design.messages.length === 0 && <p className="text-xs text-muted">Talk through decoration, theme and style here. Price offers stay in the negotiation thread.</p>}
                    {design.messages.map((m) => {
                        const mine = m.authorId === String(currentUserId);
                        return (
                            <div key={m._id} className={`max-w-[80%] p-3 rounded-2xl border text-sm ${mine ? 'ml-auto bg-brand/5 border-brand/20' : 'bg-surface-2 border-border'}`}>
                                <p className="text-[10px] font-black uppercase tracking-wider text-muted">{mine ? 'You' : m.author} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                <p className="text-fg whitespace-pre-wrap">{m.text}</p>
                            </div>
                        );
                    })}
                </div>
                <form onSubmit={sendMessage} className="flex gap-2">
                    <label htmlFor="ds-message" className="sr-only">Message about the decor</label>
                    <input id="ds-message" className={field} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Can we add a floral swing to the Signature look?" />
                    <button type="submit" disabled={!message.trim()} className="btn-adyen-primary px-4 rounded-xl disabled:opacity-50" aria-label="Send message"><Send size={16} aria-hidden="true" /></button>
                </form>
            </section>
        </div>
    );
}
