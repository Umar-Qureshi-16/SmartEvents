import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Scissors, X, Copy } from 'lucide-react';
import { resolveSrc } from './labUtils';

/**
 * Cut a piece out of a picture: drag the box to move it, drag its corner to
 * resize. "Cut this layer" crops the picture in place; "Copy piece" adds the
 * piece as a new layer (e.g. take just the arch or the swing from a photo).
 * Crop values are in the picture's own pixels.
 */
export default function CropDialog({ layer, onApply, onCopy, onClose }) {
    const imgRef = useRef(null);
    const [box, setBox] = useState(null); // in displayed pixels
    const [shown, setShown] = useState(null); // { w, h, nw, nh }
    const drag = useRef(null);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const onLoad = () => {
        const el = imgRef.current;
        const s = { w: el.clientWidth, h: el.clientHeight, nw: el.naturalWidth, nh: el.naturalHeight };
        setShown(s);
        const k = s.w / s.nw;
        const c = layer.crop;
        setBox(c ? { x: c.x * k, y: c.y * k, w: c.width * k, h: c.height * k } : { x: s.w * 0.2, y: s.h * 0.2, w: s.w * 0.6, h: s.h * 0.6 });
    };

    const start = (mode) => (e) => {
        e.preventDefault();
        e.stopPropagation();
        drag.current = { mode, x: e.clientX, y: e.clientY, box: { ...box } };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
        const d = drag.current;
        if (!d || !shown) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (d.mode === 'move') {
            setBox({ ...d.box, x: Math.min(Math.max(0, d.box.x + dx), shown.w - d.box.w), y: Math.min(Math.max(0, d.box.y + dy), shown.h - d.box.h) });
        } else {
            setBox({ ...d.box, w: Math.min(Math.max(20, d.box.w + dx), shown.w - d.box.x), h: Math.min(Math.max(20, d.box.h + dy), shown.h - d.box.y) });
        }
    };
    const end = () => { drag.current = null; };

    const natural = () => {
        const k = shown.nw / shown.w;
        return { x: Math.round(box.x * k), y: Math.round(box.y * k), width: Math.round(box.w * k), height: Math.round(box.h * k) };
    };

    return createPortal(
        <div role="dialog" aria-modal="true" aria-label="Cut a piece from the picture" className="fixed inset-0 z-[1100] bg-black/80 flex items-center justify-center p-4" onPointerMove={move} onPointerUp={end}>
            <div className="bg-surface border border-border rounded-3xl p-4 sm:p-5 max-w-4xl w-full space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="font-black text-fg flex items-center gap-2"><Scissors size={16} aria-hidden="true" /> Cut a piece</p>
                        <p className="text-xs text-muted">Drag the box over the part you want (an arch, a swing, a flower wall). Drag the corner to resize.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded-full bg-surface-2 text-fg hover:bg-fg/10"><X size={16} /></button>
                </div>
                <div className="relative mx-auto w-fit select-none touch-none">
                    <img ref={imgRef} src={resolveSrc(layer.src)} crossOrigin="anonymous" alt="" onLoad={onLoad} className="max-h-[60vh] max-w-full block rounded-xl" draggable={false} />
                    {box && (
                        <>
                            <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ boxShadow: 'none' }} />
                            <div
                                onPointerDown={start('move')}
                                className="absolute border-2 border-white cursor-move"
                                style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
                            >
                                <span onPointerDown={start('resize')} className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-white border-2 border-brand cursor-se-resize" aria-hidden="true" />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-sm font-bold text-muted hover:text-fg">Cancel</button>
                    <button type="button" disabled={!box} onClick={() => onCopy(natural())} className="px-4 py-2 rounded-xl border border-brand text-brand text-sm font-bold flex items-center gap-1.5 hover:bg-brand/10"><Copy size={14} aria-hidden="true" /> Copy piece as new layer</button>
                    <button type="button" disabled={!box} onClick={() => onApply(natural())} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-bold flex items-center gap-1.5 hover:opacity-90"><Scissors size={14} aria-hidden="true" /> Cut this layer</button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
