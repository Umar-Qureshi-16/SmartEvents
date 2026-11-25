import React, { useCallback, useEffect, useState } from 'react';
import { Search, Pin, PinOff, Plus, ExternalLink, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from '../../api/axios';
import { resolveSrc } from './labUtils';

const EVENTS = ['Mehndi', 'Nikah', 'Baraat', 'Walima', 'Wedding', 'Birthday', 'Engagement', 'Corporate', 'Conference'];

/** One inspiration picture: drag it onto the canvas, pin it, or add it. */
function PictureCard({ r, pinned, onPin, onAdd, onBroken }) {
    return (
        <div
            draggable
            onDragStart={(e) => { e.dataTransfer.setData('application/x-lab-picture', JSON.stringify(r)); e.dataTransfer.effectAllowed = 'copy'; }}
            className="group relative rounded-xl overflow-hidden bg-surface-2 border border-border aspect-[4/3] cursor-grab active:cursor-grabbing"
            title={`${r.title} · ${r.creator} · ${r.license}`}
        >
            <img src={resolveSrc(r.thumb)} alt={r.title} loading="lazy" className="w-full h-full object-cover" draggable={false} onError={() => onBroken(r.id)} />
            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-end justify-between gap-1">
                <span className="text-[9px] text-white/85 truncate">{r.creator} · {r.license}</span>
                <span className="flex gap-1 shrink-0">
                    {r.landing && <a href={r.landing} target="_blank" rel="noopener noreferrer" aria-label="Open the source page" className="w-6 h-6 grid place-items-center rounded-md bg-white/15 text-white hover:bg-white/30"><ExternalLink size={11} /></a>}
                    <button type="button" onClick={() => onPin(r)} aria-label={pinned ? 'Unpin' : 'Pin to board'} className="w-6 h-6 grid place-items-center rounded-md bg-white/15 text-white hover:bg-white/30">{pinned ? <PinOff size={11} /> : <Pin size={11} />}</button>
                    <button type="button" onClick={() => onAdd(r)} aria-label="Add to canvas" className="w-6 h-6 grid place-items-center rounded-md bg-brand text-white hover:opacity-90"><Plus size={12} /></button>
                </span>
            </div>
            {pinned && <span className="absolute top-1 left-1 w-5 h-5 grid place-items-center rounded-full bg-brand text-white" aria-label="Pinned"><Pin size={10} /></span>}
        </div>
    );
}

/**
 * Inspiration pictures for the event type and the user's culture (openly
 * licensed photos from Openverse), with the pinned ones on top. Drag a picture
 * onto the canvas, or press + to add it.
 */
export default function InspirationPanel({ initial, pins, onPinsChange, onAdd }) {
    const [eventType, setEventType] = useState(initial?.eventType || 'Mehndi');
    const [theme, setTheme] = useState(initial?.theme || '');
    const [q, setQ] = useState('');
    const [results, setResults] = useState(null);
    const [queries, setQueries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    // Pictures whose source no longer serves them are hidden.
    const [broken, setBroken] = useState(() => new Set());
    const markBroken = useCallback((pid) => setBroken((b) => new Set(b).add(pid)), []);

    const search = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const res = await axios.get('/designs/inspiration', { params: { eventType, theme: theme || undefined, q: q || undefined, page: p } });
            setQueries(res.data.data.queries);
            setResults((prev) => (p > 1 && prev ? [...prev, ...res.data.data.results.filter((r) => !prev.some((x) => x.id === r.id))] : res.data.data.results));
            setPage(p);
        } catch {
            toast.error('Could not search for pictures. Try again.');
        } finally {
            setLoading(false);
        }
    }, [eventType, theme, q]);

    // First search on open.
    useEffect(() => { search(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const pinned = (r) => pins.some((p) => p.id === r.id);
    const togglePin = (r) => onPinsChange(pinned(r) ? pins.filter((p) => p.id !== r.id) : [{ ...r }, ...pins]);
    const field = 'w-full bg-surface-2 border border-border rounded-lg px-2.5 py-1.5 text-xs text-fg placeholder:text-muted outline-none focus:border-brand';

    return (
        <div className="flex flex-col h-full min-h-0">
            <form onSubmit={(e) => { e.preventDefault(); search(1); }} className="space-y-2 pb-3 border-b border-border">
                <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                        <span className="text-[10px] font-bold text-muted">Event</span>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={field}>{EVENTS.map((x) => <option key={x}>{x}</option>)}</select>
                    </label>
                    <label className="block">
                        <span className="text-[10px] font-bold text-muted">Theme</span>
                        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g. marigold" className={field} />
                    </label>
                </div>
                <div className="flex gap-2">
                    <label className="flex-1">
                        <span className="sr-only">Your own words</span>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Your words: floral swing, phulkari…" className={field} />
                    </label>
                    <button type="submit" disabled={loading} className="px-3 rounded-lg bg-brand text-white text-xs font-bold flex items-center gap-1 disabled:opacity-60">
                        {loading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Search size={13} aria-hidden="true" />} Search
                    </button>
                </div>
                {queries.length > 0 && <p className="text-[10px] text-muted leading-snug">Searched: {queries.join(' · ')}</p>}
            </form>

            <div className="flex-1 min-h-0 overflow-y-auto pt-3 space-y-4 pr-1">
                {pins.length > 0 && (
                    <section aria-label="Pinned pictures">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Pinned ({pins.length})</p>
                        <div className="grid grid-cols-2 gap-2">{pins.map((r) => <PictureCard key={`p-${r.id}`} r={r} pinned onPin={togglePin} onAdd={onAdd} onBroken={markBroken} />)}</div>
                    </section>
                )}
                <section aria-label="Search results">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Ideas {results ? `(${results.filter((r) => !broken.has(r.id)).length})` : ''}</p>
                    {!results && loading && <div className="grid grid-cols-2 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[4/3] rounded-xl bg-surface-2 animate-pulse" />)}</div>}
                    {results && results.length === 0 && (
                        <p className="text-xs text-muted flex items-center gap-2 py-6 justify-center"><ImageIcon size={14} aria-hidden="true" /> No pictures found. Try other words.</p>
                    )}
                    {results && results.length > 0 && (
                        <>
                            <div className="grid grid-cols-2 gap-2">{results.filter((r) => !broken.has(r.id)).map((r) => <PictureCard key={r.id} r={r} pinned={pinned(r)} onPin={togglePin} onAdd={onAdd} onBroken={markBroken} />)}</div>
                            <button type="button" onClick={() => search(page + 1)} disabled={loading || page >= 10} className="w-full mt-3 py-2 rounded-lg border border-border text-xs font-bold text-muted hover:text-fg disabled:opacity-50">
                                {loading ? 'Loading…' : 'More ideas'}
                            </button>
                        </>
                    )}
                    <p className="text-[10px] text-muted mt-3 leading-snug">Pictures are openly licensed photos from Openverse; each shows its creator and licence. Credit them if you publish a design built from them.</p>
                </section>
            </div>
        </div>
    );
}
