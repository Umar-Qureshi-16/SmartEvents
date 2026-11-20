import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Download, ImagePlus, Loader2, Maximize2, PenTool, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DesignPicture, { resolveImage } from './DesignPicture';
import API_BASE_URL from '../../apiConfig';

const MAX_PARTS = 4; // the whole setup + its three main decor pieces (matches the server)
const HD = { width: 1920, height: 1080 };

const slug = (t) => String(t || 'design').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'design';

function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/** Saves the 2D drawing as a 1920 x 1080 PNG. */
function save2d(svg, name) {
    return new Promise((resolve, reject) => {
        if (!svg) { reject(new Error('no drawing')); return; }
        const xml = new XMLSerializer().serializeToString(svg);
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = HD.width; c.height = HD.height;
            c.getContext('2d').drawImage(img, 0, 0, HD.width, HD.height);
            c.toBlob((b) => { if (b) { saveBlob(b, name); resolve(); } else reject(new Error('export failed')); }, 'image/png');
        };
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
    });
}

function ViewSwitch({ view, setView, state, dark = true }) {
    const btn = (v, Icon, text) => (
        <button
            type="button"
            role="radio"
            aria-checked={view === v}
            onClick={(e) => { e.stopPropagation(); setView(v); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black transition-colors ${view === v ? 'bg-white text-black shadow' : dark ? 'text-white/85 hover:text-white' : 'text-muted hover:text-fg'}`}
        >
            <Icon size={13} aria-hidden="true" />{text}
            {v === '3d' && state === 'loading' && <Loader2 size={11} className="animate-spin" aria-label="rendering" />}
        </button>
    );
    return (
        <div role="radiogroup" aria-label="Picture view" className="inline-flex items-center gap-0.5 rounded-full bg-black/55 backdrop-blur-md p-1 border border-white/15">
            {btn('3d', Box, '3D render')}
            {btn('2d', PenTool, '2D animated')}
        </div>
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

/** Full-screen viewer: large picture, both views, every part, HD download and "add to gallery". */
function Viewer({ design, parts, part, setPart, view, setView, pathOf, srcOf, onClose, onAddToGallery }) {
    const closeRef = useRef(null);
    const svgRef = useRef(null);
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

    const name = `${slug(design?.title)}-${slug(parts[part]?.label)}`;
    const download = async () => {
        setBusy(true);
        try {
            if (view === '2d') {
                await save2d(svgRef.current, `${name}-2d-hd.png`);
            } else {
                const url = resolveImage(srcOf(part) || `${API_BASE_URL}${pathOf(part)}`);
                const res = await fetch(url);
                if (!res.ok) throw new Error('not ready');
                saveBlob(await res.blob(), `${name}-3d-hd.jpg`);
            }
            toast.success('Full HD picture saved.');
        } catch {
            toast.error(view === '3d' ? 'The 3D picture is still being made. Try again in a minute.' : 'Could not save the picture.');
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
                    <p className="text-white/55 text-xs">{parts[part]?.label} · {view === '3d' ? '3D render, 1920 × 1080' : '2D animated'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <ViewSwitch view={view} setView={setView} state={state} />
                    <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="relative flex-1 min-h-0 px-2 sm:px-6">
                <div className="h-full w-full grid place-items-center">
                    <DesignPicture
                        key={`${part}-${view}`}
                        design={design}
                        src={srcOf(part)}
                        path={pathOf(part)}
                        view={view}
                        fit="contain"
                        motion={false}
                        svgRef={svgRef}
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
                <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={download} disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black text-xs font-black px-4 py-2.5 hover:bg-white/90 disabled:opacity-60">
                        <Download size={14} aria-hidden="true" />Download HD
                    </button>
                    {onAddToGallery && view === '3d' && (
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
 * Pictures of one design: the whole setup first, then one per decor item
 * (backdrop, entrance, cake table...), each as a full HD 3D render or a 2D
 * animated drawing. Each 3D render is made the first time it is opened, so
 * only the ones someone looks at are generated.
 *
 * `path(part)` gives the API path of a picture; `src` is an optional stored
 * photo for the whole setup. `onAddToGallery(part)` (the vendor's own designs)
 * adds a picture to the vendor's profile gallery.
 */
export default function DesignGallery({ design, path, src, className = '', imageClassName = 'aspect-video', onAddToGallery }) {
    const items = (design?.elements || []).filter((e) => e?.item).slice(0, MAX_PARTS - 1);
    const parts = [{ label: 'Full setup' }, ...items.map((e) => ({ label: e.item }))];
    const [part, setPart] = useState(0);
    const [view, setView] = useState('3d');
    const [state, setState] = useState('loading');
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
                    view={view}
                    onState={setState}
                    alt={`${parts[part]?.label || 'Picture'} of ${design?.title || 'the design'}`}
                    className={imageClassName}
                />
                <div className="absolute inset-x-0 bottom-0 p-2.5 flex items-end justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-b-2xl">
                    <div className="pointer-events-auto"><ViewSwitch view={view} setView={setView} state={state} /></div>
                    <button type="button" onClick={() => setOpen(true)} aria-label="Open full screen"
                        className="pointer-events-auto w-9 h-9 grid place-items-center rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/75">
                        <Maximize2 size={15} aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="pt-2"><PartChips parts={parts} part={part} setPart={setPart} /></div>
            {open && (
                <Viewer design={design} parts={parts} part={part} setPart={setPart} view={view} setView={setView}
                    pathOf={path} srcOf={srcOf} onClose={close} onAddToGallery={onAddToGallery} />
            )}
        </div>
    );
}
