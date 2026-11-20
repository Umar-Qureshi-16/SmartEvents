import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Palette, Sparkles, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import axios from '../../api/axios';
import { formatCurrency, useConfirm } from '../../components/ui';
import DesignGallery from '../../components/design/DesignGallery';

const TYPES = ['Wedding', 'Nikah', 'Mehndi', 'Walima', 'Birthday', 'Corporate', 'Conference'];
const field = 'w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted';
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);

function DesignCard({ d, onChange, onDelete }) {
    const [edit, setEdit] = useState({ title: d.title, totalCost: d.totalCost, image: d.image || '' });
    const [busy, setBusy] = useState(false);
    const dirty = edit.title !== d.title || Number(edit.totalCost) !== d.totalCost || (edit.image || '') !== (d.image || '');

    const save = async (extra = {}) => {
        if (edit.image && !isUrl(edit.image)) { toast.error('Photo must be a link starting with https://'); return; }
        setBusy(true);
        try {
            const res = await axios.put(`/designs/${d._id}`, { ...edit, totalCost: Number(edit.totalCost), ...extra });
            onChange(res.data.data);
            toast.success(extra.published === true ? 'Published on your profile.' : extra.published === false ? 'Hidden from your profile.' : 'Saved.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <li className="bg-surface border border-border rounded-3xl overflow-hidden flex flex-col">
            <div className="relative p-2 pb-0">
                <DesignGallery design={d} src={d.image} path={(n) => `/designs/${d._id}/image${n ? `?part=${n}` : ''}`} imageClassName="aspect-[16/10] rounded-2xl" />
                <span className={`absolute top-4 left-4 text-[10px] font-black uppercase rounded-full px-2 py-0.5 ${d.published ? 'bg-success text-white' : 'bg-black/60 text-white'}`}>{d.published ? 'Published' : 'Draft'}</span>
                {d.source === 'ai' && <span className="absolute top-4 right-4 text-[10px] font-black uppercase rounded-full px-2 py-0.5 bg-black/60 text-white">AI</span>}
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col">
                <label htmlFor={`t-${d._id}`} className="sr-only">Title</label>
                <input id={`t-${d._id}`} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={`${field} font-bold`} />
                {d.summary && <p className="text-xs text-muted leading-relaxed">{d.summary}</p>}
                {d.idea && <p className="text-[11px] text-muted"><span className="font-bold text-fg">Idea:</span> {d.idea}</p>}
                <div className="flex gap-1" aria-label="Colour palette">{(d.palette || []).map((c) => <span key={c} title={c} className="w-6 h-6 rounded-full border border-border" style={{ background: c }} />)}</div>
                <ul className="text-xs space-y-1">
                    {d.elements.map((e) => (
                        <li key={e.item} className="flex justify-between gap-2"><span className="text-fg"><b>{e.item}</b>{e.description ? <span className="text-muted"> · {e.description}</span> : null}</span><span className="text-muted shrink-0">{formatCurrency(e.cost)}</span></li>
                    ))}
                </ul>
                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <div>
                        <label htmlFor={`p-${d._id}`} className="text-[11px] font-bold text-fg block mb-0.5">Price</label>
                        <input id={`p-${d._id}`} type="number" min="1" value={edit.totalCost} onChange={(e) => setEdit({ ...edit, totalCost: e.target.value })} className={field} />
                    </div>
                    <div>
                        <label htmlFor={`i-${d._id}`} className="text-[11px] font-bold text-fg block mb-0.5">Photo link</label>
                        <input id={`i-${d._id}`} type="url" value={edit.image} onChange={(e) => setEdit({ ...edit, image: e.target.value })} placeholder="https://…" className={field} />
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {dirty && <button onClick={() => save()} disabled={busy} className="border border-border text-fg hover:bg-fg/5 text-xs font-bold rounded-xl px-3 py-2">Save</button>}
                    <button onClick={() => save({ published: !d.published })} disabled={busy}
                        className={`inline-flex items-center gap-1 text-xs font-bold rounded-xl px-3 py-2 ${d.published ? 'border border-border text-fg hover:bg-fg/5' : 'bg-success text-white hover:opacity-90'}`}>
                        {d.published ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}{d.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={async () => {
                        setBusy(true);
                        const wait = toast.loading('Creating a new picture of this design…');
                        try {
                            const r = await axios.post(`/designs/${d._id}/render`);
                            if (r.data.data.rendered) {
                                const n = r.data.data.design;
                                onChange(n);
                                setEdit((e) => ({ ...e, image: n.image || '' }));
                                toast.success('New picture created.', { id: wait });
                            } else toast.error('The image service is busy. Try again in a minute.', { id: wait });
                        } catch { toast.error('Could not create a picture.', { id: wait }); } finally { setBusy(false); }
                    }} disabled={busy} className="inline-flex items-center gap-1 border border-border text-fg hover:bg-fg/5 text-xs font-bold rounded-xl px-3 py-2">
                        <ImageIcon size={13} aria-hidden="true" />New picture
                    </button>
                    <button onClick={() => onDelete(d)} aria-label={`Delete ${d.title}`} className="ml-auto text-muted hover:text-danger p-2"><Trash2 size={15} /></button>
                </div>
            </div>
        </li>
    );
}

/** The vendor's own design library: AI drafts, edit, publish to profile. */
export default function VendorDesignStudio() {
    const confirm = useConfirm();
    const me = useSelector((s) => s.auth.user);
    const [designs, setDesigns] = useState(null);
    const [form, setForm] = useState({ theme: '', style: '', eventType: 'Wedding', budget: '', colors: '', idea: '' });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const load = useCallback(() => {
        axios.get('/designs/mine').then((r) => setDesigns(r.data.data)).catch(() => { setDesigns([]); toast.error('Could not load your designs.'); });
    }, []);
    useEffect(() => { load(); }, [load]);

    const generate = async (e) => {
        e.preventDefault();
        if (!(Number(form.budget) > 0)) { toast.error('Give the price the design should come to.'); return; }
        const colors = form.colors.split(/[\s,]+/).filter(Boolean);
        setBusy(true);
        try {
            const res = await axios.post('/designs/generate', { ...form, budget: Number(form.budget), colors, count: 3 });
            const made = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
            setDesigns((list) => [...made, ...(list || [])]);
            toast.success(`${made.length} design options drafted. Pictures appear one by one; publish the ones you like.`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not draft the design.');
        } finally {
            setBusy(false);
        }
    };

    const del = async (d) => {
        if (!(await confirm({ title: 'Delete this design?', message: `"${d.title}" will be removed from your studio and profile. This cannot be undone.`, confirmLabel: 'Delete', tone: 'danger' }))) return;
        try {
            await axios.delete(`/designs/${d._id}`);
            setDesigns((list) => list.filter((x) => x._id !== d._id));
        } catch {
            toast.error('Could not delete.');
        }
    };

    const published = (designs || []).filter((d) => d.published).length;

    return (
        <div className="min-h-screen bg-bg text-fg px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto space-y-6">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2"><Palette className="text-brand" aria-hidden="true" />Design studio</h1>
                    <p className="text-sm text-muted">Create designs with AI, set your price and publish them on your profile. Organizers can book a design directly. You can also ask the chat: “Create a royal Mughal mehndi design for 800”.</p>
                </div>
                {me && <Link to={`/vendor/${me._id || me.id}`} className="inline-flex items-center gap-1.5 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5 shrink-0"><ExternalLink size={15} aria-hidden="true" />See it on my profile ({published})</Link>}
            </header>

            <form onSubmit={generate} className="bg-surface border border-border rounded-3xl p-5 grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
                <div className="col-span-2">
                    <label htmlFor="ds-theme" className="text-[11px] font-bold text-fg block mb-1">Theme</label>
                    <input id="ds-theme" value={form.theme} onChange={set('theme')} placeholder="Mughal garden" className={field} />
                </div>
                <div>
                    <label htmlFor="ds-style" className="text-[11px] font-bold text-fg block mb-1">Style</label>
                    <input id="ds-style" value={form.style} onChange={set('style')} placeholder="Royal" className={field} />
                </div>
                <div>
                    <label htmlFor="ds-type" className="text-[11px] font-bold text-fg block mb-1">Event</label>
                    <select id="ds-type" value={form.eventType} onChange={set('eventType')} className={field}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
                <div>
                    <label htmlFor="ds-budget" className="text-[11px] font-bold text-fg block mb-1">Price</label>
                    <input id="ds-budget" type="number" min="1" value={form.budget} onChange={set('budget')} placeholder="800" className={field} />
                </div>
                <div>
                    <label htmlFor="ds-colors" className="text-[11px] font-bold text-fg block mb-1">Colours</label>
                    <input id="ds-colors" value={form.colors} onChange={set('colors')} placeholder="maroon, gold" className={field} />
                </div>
                <button type="submit" disabled={busy} className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2 disabled:opacity-50">
                    <Sparkles size={15} aria-hidden="true" />{busy ? 'Designing…' : 'Create 3 options'}
                </button>
                <div className="col-span-2 md:col-span-7">
                    <label htmlFor="ds-idea" className="text-[11px] font-bold text-fg block mb-1">Your own design idea <span className="font-normal text-muted">(optional)</span></label>
                    <textarea id="ds-idea" rows={2} maxLength={600} value={form.idea} onChange={set('idea')}
                        placeholder="e.g. Spider-Man birthday: city skyline backdrop, web ceiling, red and blue balloon arch, cake table with a Spider-Man topper"
                        className={`${field} resize-y`} />
                    <p className="text-[10px] text-muted mt-1">Smartie makes three different options for your theme and idea, each with pictures of the full setup and its main pieces.</p>
                </div>
            </form>

            {designs === null ? <div className="h-48 rounded-3xl bg-surface-2 animate-pulse" /> : designs.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">No designs yet. Describe a look above and Smartie drafts the first one.</p>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {designs.map((d) => <DesignCard key={d._id} d={d} onDelete={del} onChange={(n) => setDesigns((list) => list.map((x) => (x._id === n._id ? n : x)))} />)}
                </ul>
            )}
        </div>
    );
}
