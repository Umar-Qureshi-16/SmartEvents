import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, ImagePlus, Maximize2, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DesignPicture, { resolveImage } from './DesignPicture';
import API_BASE_URL from '../../apiConfig';

const MAX_PARTS = 4; // the whole setup + its three main decor pieces (matches the server)

const slug = (t) => String(t || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'design';

/**
 * A Google Images search for real setups like this picture, e.g.
 * "Batman birthday balloon arch decoration". Opens in a new tab: the photos
 * stay on Google, they are never copied into the app.
 */
export function googleExamples(design, label) {
    const piece = !label || label === 'Full setup' ? 'stage decoration setup' : `${label} decoration`;
    const q = [design?.theme, design?.eventType, piece].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
}

function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function ExamplesLink({ design, label, dark = true, compact = false }) {
    return (
        <a
            href={googleExamples(design, label)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1.5 rounded-full font-black transition-colors ${compact ? 'text-[11px] px-3 py-1.5' : 'text-xs px-4 py-2.5'} ${dark
                ? 'bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/75'
                : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
            <Search size={compact ? 12 : 14} aria-hidden="true" />Real examples on Google
        </a>
    );
}

function PartChips({ parts, part, setPart, dark = false }) {
    if (parts.length < 2) return null;
    return (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]" role="tablist" aria-label="Pictures of this design">
            {parts.map((p, i) => (
                <button
                    key={`${i}-${p.label}`}
                    type="button"
                    role="tab"
                    aria-selected={part === i}
                    onClick={() => setPart(i)}
                    className={`shrink-0 max-w-[12rem] truncate px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${part === i
                        ? 'bg-brand text-white border-brand'
                        : dark ? 'border-white/20 text-white/75 hover:text-white hover:border-white/50' : 'border-border text-muted hover:text-fg hover:border-brand/50'}`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );
}

/** Full-screen viewer: large picture, every part, HD download, real examples and "add to gallery". */
function Viewer({ design, parts, part, setPart, pathOf, srcOf, onClose, onAddToGallery }) {
    const closeRef = useRef(null);
    const [state, setState] = useState('loading');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const prev = document.activeElement;
        const { overflow } = document.body.style;
        document.body.style.overflow = 'hidden';
        closeRef.current?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') setPart((p) => (p + 1) % parts.length);
            if (e.key === 'ArrowLeft') setPart((p) => (p - 1 + parts.length) % parts.length);
        };
        window.addEventListener('keydown', onKey);
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
    }, [onClose, setPart, parts.length]);

    const download = async () => {
        setBusy(true);
        try {
            const res = await fetch(resolveImage(srcOf(part) || `${API_BASE_URL}${pathOf(part)}`));
            if (!res.ok) throw new Error('not ready');
            saveBlob(await res.blob(), `${slug(design?.title)}-${slug(parts[part]?.label)}-hd.jpg`);
            toast.success('Full HD picture saved.');
        } catch {
            toast.error('The picture is still being made. Try again in a minute.');
        } finally { setBusy(false); }
    };
    const addToGallery = async () => {
        setBusy(true);
        try { await onAddToGallery(part); } finally { setBusy(false); }
    };

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label={`${design?.title || 'Design'} pictures`} className="fixed inset-0 z-[1000] bg-[#050507] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
                <div className="min-w-0">
                    <p className="text-white font-black text-base sm:text-lg truncate">{design?.title}</p>
                    <p className="text-white/55 text-xs">{parts[part]?.label} · 1920 × 1080</p>
                </div>
                <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 shrink-0">
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <div className="relative flex-1 min-h-0 px-2 sm:px-6">
                <div className="h-full w-full grid place-items-center">
                    <DesignPicture
                        key={part}
                        design={design}
                        src={srcOf(part)}
                        path={pathOf(part)}
                        fit="contain"
                        motion={false}
                        onState={setState}
                        alt={`${parts[part]?.label} of ${design?.title}`}
                        className="w-full max-h-full aspect-video rounded-2xl"
                    />
                </div>
                {parts.length > 1 && (
                    <>
                        <button type="button" aria-label="Previous picture" onClick={() => setPart((p) => (p - 1 + parts.length) % parts.length)}
                            className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-black/50 text-white hover:bg-black/75"><ChevronLeft size={20} aria-hidden="true" /></button>
                        <button type="button" aria-label="Next picture" onClick={() => setPart((p) => (p + 1) % parts.length)}
                            className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-black/50 text-white hover:bg-black/75"><ChevronRight size={20} aria-hidden="true" /></button>
                    </>
                )}
            </div>

            <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <PartChips parts={parts} part={part} setPart={setPart} dark />
                <div className="flex flex-wrap gap-2 shrink-0">
                    <ExamplesLink design={design} label={parts[part]?.label} dark={false} />
                    <button type="button" onClick={download} disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-xs font-black px-4 py-2.5 hover:bg-white/90 disabled:opacity-60">
                        <Download size={14} aria-hidden="true" />Download HD
                    </button>
                    {onAddToGallery && (
                        <button type="button" onClick={addToGallery} disabled={busy || state !== 'ready'}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white text-xs font-black px-4 py-2.5 hover:opacity-90 disabled:opacity-50">
                            <ImagePlus size={14} aria-hidden="true" />Add to my gallery
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * Pictures of one design: the whole setup first, then its three main decor
 * pieces (backdrop, entrance, cake table...), each a full HD render. Each one
 * links to real examples of that piece on Google Images.
 *
 * `path(part)` gives the API path of a picture; `src` is an optional stored
 * photo for the whole setup. `onAddToGallery(part)` (the vendor's own designs)
 * adds a picture to the vendor's profile gallery.
 */
export default function DesignGallery({ design, path, src, className = '', imageClassName = 'aspect-video', onAddToGallery }) {
    const items = (design?.elements || []).filter((e) => e?.item).slice(0, MAX_PARTS - 1);
    const parts = [{ label: 'Full setup' }, ...items.map((e) => ({ label: e.item }))];
    const [part, setPart] = useState(0);
    const [open, setOpen] = useState(false);
    const srcOf = useCallback((n) => (n === 0 ? src : undefined), [src]);
    const close = useCallback(() => setOpen(false), []);

    return (
        <div className={className}>
            <div className="relative group">
                <DesignPicture
                    design={design}
                    src={srcOf(part)}
                    path={path(part)}
                    alt={`${parts[part]?.label || 'Picture'} of ${design?.title || 'the design'}`}
                    className={imageClassName}
                />
                <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-b-2xl">
                    <div className="pointer-events-auto"><ExamplesLink design={design} label={parts[part]?.label} compact /></div>
                    <button type="button" onClick={() => setOpen(true)} aria-label="Open full screen"
                        className="pointer-events-auto w-9 h-9 grid place-items-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/75">
                        <Maximize2 size={15} aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="pt-2"><PartChips parts={parts} part={part} setPart={setPart} /></div>
            {open && (
                <Viewer design={design} parts={parts} part={part} setPart={setPart}
                    pathOf={path} srcOf={srcOf} onClose={close} onAddToGallery={onAddToGallery} />
            )}
        </div>
    );
}
