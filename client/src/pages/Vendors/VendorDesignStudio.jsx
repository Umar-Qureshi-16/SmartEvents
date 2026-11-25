import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Palette, Sparkles, Trash2, ExternalLink, Image as ImageIcon, PenTool } from 'lucide-react';
import axios from '../../api/axios';
import { formatCurrency, useConfirm } from '../../components/ui';
import DesignGallery from '../../components/design/DesignGallery';
import DesignWizard from '../../components/design/DesignWizard';
import { toBase, fromBase } from '../../utils/money';

const field = 'w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted';
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);

function DesignCard({ d, onChange, onDelete }) {
    const [edit, setEdit] = useState({ title: d.title, totalCost: fromBase(d.totalCost), image: d.image || '' });
    const [busy, setBusy] = useState(false);
    const addToGallery = async (part) => {
        try {
            await axios.post(`/designs/${d._id}/gallery`, { part });
            toast.success('Added to the gallery on your profile.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not add it to your gallery.');
        }
    };
    const dirty = edit.title !== d.title || Number(edit.totalCost) !== fromBase(d.totalCost) || (edit.image || '') !== (d.image || '');

    const save = async (extra = {}) => {
        if (edit.image && !isUrl(edit.image)) { toast.error('Photo must be a link starting with https://'); return; }
        setBusy(true);
        try {
            const res = await axios.put(`/designs/${d._id}`, { ...edit, totalCost: toBase(edit.totalCost), ...extra });
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
                <DesignGallery design={d} src={d.image} path={(n) => `/designs/${d._id}/image${n ? `?part=${n}` : ''}`} imageClassName="aspect-video rounded-2xl" onAddToGallery={addToGallery} />
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
                    <Link to={`/design-lab/design/${d._id}?eventType=${encodeURIComponent(d.eventType || '')}&theme=${encodeURIComponent(d.theme || '')}`}
                        className="inline-flex items-center gap-1 border border-border text-fg hover:border-brand hover:text-brand text-xs font-bold rounded-xl px-3 py-2">
                        <PenTool size={13} aria-hidden="true" />Design Lab
                    </Link>
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

    const load = useCallback(() => {
        axios.get('/designs/mine').then((r) => setDesigns(r.data.data)).catch(() => { setDesigns([]); toast.error('Could not load your designs.'); });
    }, []);
    useEffect(() => { load(); }, [load]);

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
                    <p className="text-sm text-muted">Smartie designs with you step by step: each design comes with 4 full HD pictures and links to real examples on Google. Set your price, publish it on your profile, and organizers can book it directly.</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                    <Link to="/design-lab/user/me" className="inline-flex items-center gap-1.5 bg-brand text-white hover:opacity-90 text-sm font-bold rounded-xl px-4 py-2.5"><PenTool size={15} aria-hidden="true" />Open Design Lab</Link>
                    {me && <Link to={`/vendor/${me._id || me.id}`} className="inline-flex items-center gap-1.5 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5"><ExternalLink size={15} aria-hidden="true" />See it on my profile ({published})</Link>}
                </div>
            </header>

            <DesignWizard onCreated={(made) => setDesigns((list) => [...made, ...(list || [])])} />

            {designs === null ? <div className="h-48 rounded-3xl bg-surface-2 animate-pulse" /> : designs.length === 0 ? (
                <p className="text-sm text-muted text-center py-10">No designs yet. Answer Smartie's questions above to create your first one.</p>
            ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {designs.map((d) => <DesignCard key={d._id} d={d} onDelete={del} onChange={(n) => setDesigns((list) => list.map((x) => (x._id === n._id ? n : x)))} />)}
                </ul>
            )}
        </div>
    );
}
