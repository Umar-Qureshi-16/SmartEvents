import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Stage, Layer, Rect, Ellipse, Text, Image as KImage, Group, Line, Star, Transformer } from 'react-konva';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft, Undo2, Redo2, Copy, ClipboardPaste, CopyPlus, Trash2, ChevronUp, ChevronDown, Scissors, Download,
    Save, Loader2, ZoomIn, ZoomOut, Square, Circle, Type, Minus, Star as StarIcon, Eye, EyeOff, Lock, Unlock,
    Image as ImageIcon, Layers as LayersIcon, Shapes, Search, Check, Maximize,
} from 'lucide-react';
import axios from '../../api/axios';
import InspirationPanel from '../../components/lab/InspirationPanel';
import CropDialog from '../../components/lab/CropDialog';
import { loadImage, uid, ARTBOARDS, FONTS } from '../../components/lab/labUtils';

const STICKERS = ['🌸', '🌼', '🌹', '💐', '🪷', '🌿', '🎈', '🎀', '✨', '🕯️', '🪔', '🏮', '🌙', '⭐', '💍', '🎂', '🪑', '🎉'];
const SWATCHES = ['#7a1f2b', '#c0392b', '#e67e22', '#f2c94c', '#d4af37', '#0f7b4b', '#2e5aac', '#1f2a44', '#6a3d9a', '#f4a6c0', '#f5e6c8', '#ffffff', '#111111'];
const EMPTY = { artboard: 'stage', width: 1920, height: 1080, background: '#f5efe6', layers: [] };

/* ---------------------------------------------------------------- shapes */

/** A sticker is a short emoji-only text layer (also ones saved before the "sticker" flag existed). */
const isSticker = (l) => l.type === 'text' && (l.sticker || (String(l.text || '').length <= 4 && /^\p{Extended_Pictographic}/u.test(String(l.text || ''))));

function LabImage({ layer, ...rest }) {
    const [img, setImg] = useState(null);
    useEffect(() => {
        let live = true;
        loadImage(layer.src).then((i) => live && setImg(i)).catch(() => live && setImg(null));
        return () => { live = false; };
    }, [layer.src]);
    if (!img) return <Rect width={layer.width} height={layer.height} fill="#e5e7eb" stroke="#cbd5e1" dash={[8, 6]} {...rest} />;
    return <KImage image={img} width={layer.width} height={layer.height} crop={layer.crop || undefined} cornerRadius={layer.cornerRadius || 0} {...rest} />;
}

function Body({ layer }) {
    const common = { opacity: 1 };
    switch (layer.type) {
        case 'image': return <LabImage layer={layer} {...common} />;
        case 'rect': return <Rect width={layer.width} height={layer.height} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth || 0} cornerRadius={layer.cornerRadius || 0} />;
        case 'arch': return <Rect width={layer.width} height={layer.height} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth || 0} cornerRadius={[layer.width / 2, layer.width / 2, 0, 0]} />;
        case 'ellipse': return <Ellipse x={layer.width / 2} y={layer.height / 2} radiusX={layer.width / 2} radiusY={layer.height / 2} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth || 0} />;
        case 'star': return <Star x={layer.width / 2} y={layer.height / 2} numPoints={5} innerRadius={Math.min(layer.width, layer.height) / 4.5} outerRadius={Math.min(layer.width, layer.height) / 2} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth || 0} />;
        case 'line': return <Line points={[0, layer.height / 2, layer.width, layer.height / 2]} stroke={layer.stroke || layer.fill} strokeWidth={layer.strokeWidth || 6} lineCap="round" hitStrokeWidth={24} />;
        case 'text': return (
            // Stickers (a single emoji) size to their glyph: a fixed width makes the canvas drop the emoji.
            <Text text={layer.text} width={isSticker(layer) ? undefined : layer.width} fontSize={layer.fontSize} fontFamily={layer.fontFamily} fontStyle={layer.fontStyle || 'normal'}
                align={layer.align || 'left'} fill={layer.fill} lineHeight={1.15} stroke={layer.stroke} strokeWidth={layer.strokeWidth || 0} />
        );
        default: return null;
    }
}

/* ---------------------------------------------------------------- page */

export default function DesignLab() {
    const { kind, id } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const stageRef = useRef(null);
    const trRef = useRef(null);
    const wrapRef = useRef(null);

    const [title, setTitle] = useState('Design lab');
    const [doc, setDoc] = useState(null);
    const [pins, setPins] = useState([]);
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState('ideas');
    const [zoom, setZoom] = useState(0.4);
    const [saveState, setSaveState] = useState('saved');
    const [cropping, setCropping] = useState(null);
    const history = useRef({ past: [], future: [] });
    const clipboard = useRef(null);
    const loaded = useRef(false);
    // The current document is mirrored in a ref so quick successive changes
    // build on each other and the undo history stays outside React updaters.
    const docRef = useRef(null);

    // Load the board.
    useEffect(() => {
        axios.get(`/designs/boards/${kind}/${id}`).then((res) => {
            const b = res.data.data;
            setTitle(b.title || 'Design lab');
            setPins(b.pins || []);
            const start = b.canvas && Array.isArray(b.canvas.layers) ? { ...EMPTY, ...b.canvas } : EMPTY;
            docRef.current = start;
            setDoc(start);
            loaded.current = true;
        }).catch((err) => {
            toast.error(err.response?.data?.message || 'Could not open this board.');
            docRef.current = EMPTY;
            setDoc(EMPTY);
        });
    }, [kind, id]);

    // Fit the artboard into the window.
    const fit = useCallback(() => {
        const el = wrapRef.current;
        if (!el || !doc) return;
        const k = Math.min((el.clientWidth - 48) / doc.width, (el.clientHeight - 48) / doc.height);
        setZoom(Math.max(0.1, Math.min(2, Math.round(k * 100) / 100)));
    }, [doc]);
    useEffect(() => { if (doc) fit(); }, [doc?.width, doc?.height]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [fit]);

    // Changes go through commit(): one undo step each, then autosave.
    const lastEdit = useRef({ key: null, at: 0 });
    const [canUndo, setCanUndo] = useState({ past: 0, future: 0 });
    const show = (value) => {
        docRef.current = value;
        setDoc(value);
        setCanUndo({ past: history.current.past.length, future: history.current.future.length });
    };
    const commit = useCallback((next, { coalesce } = {}) => {
        const prev = docRef.current;
        if (!prev) return;
        // Typing in a field or dragging a slider is one undo step, not one per keystroke.
        const now = Date.now();
        const record = !(coalesce && lastEdit.current.key === coalesce && now - lastEdit.current.at < 800);
        lastEdit.current = { key: coalesce || null, at: now };
        const value = typeof next === 'function' ? next(prev) : next;
        if (record) {
            history.current.past = [...history.current.past.slice(-60), prev];
            history.current.future = [];
        }
        show(value);
        setSaveState('dirty');
    }, []);
    const undo = () => {
        const h = history.current;
        if (!h.past.length) return;
        h.future = [docRef.current, ...h.future];
        show(h.past.pop());
        setSaveState('dirty');
    };
    const redo = () => {
        const h = history.current;
        if (!h.future.length) return;
        h.past = [...h.past, docRef.current];
        show(h.future.shift());
        setSaveState('dirty');
    };

    // Autosave a moment after the last change.
    useEffect(() => {
        if (!loaded.current || saveState !== 'dirty' || !doc) return undefined;
        const t = setTimeout(async () => {
            setSaveState('saving');
            try {
                await axios.put(`/designs/boards/${kind}/${id}`, { canvas: doc });
                setSaveState('saved');
            } catch (err) {
                setSaveState('error');
                toast.error(err.response?.data?.message || 'Could not save the design.');
            }
        }, 1200);
        return () => clearTimeout(t);
    }, [doc, saveState, kind, id]);

    const savePins = async (next) => {
        setPins(next);
        try { await axios.put(`/designs/boards/${kind}/${id}`, { pins: next }); } catch { toast.error('Could not save the pinned pictures.'); }
    };

    const layers = useMemo(() => doc?.layers || [], [doc]);
    const sel = layers.find((l) => l.id === selected) || null;
    const update = (patch, opts) => commit((d) => ({ ...d, layers: d.layers.map((l) => (l.id === selected ? { ...l, ...patch } : l)) }), opts);
    const add = (layer) => {
        const l = { id: uid(), x: doc.width / 2 - (layer.width || 300) / 2, y: doc.height / 2 - (layer.height || 200) / 2, rotation: 0, opacity: 1, visible: true, locked: false, ...layer };
        commit((d) => ({ ...d, layers: [...d.layers, l] }));
        setSelected(l.id);
        return l;
    };

    const addPicture = (r, at) => {
        const w = Math.min(700, doc.width * 0.45);
        const ratio = r.width && r.height ? r.height / r.width : 0.75;
        const layer = { type: 'image', name: r.title?.slice(0, 40) || 'Picture', src: r.full, width: w, height: Math.round(w * ratio), credit: `${r.creator} (${r.license})` };
        if (at) { layer.x = at.x - w / 2; layer.y = at.y - (w * ratio) / 2; }
        add(layer);
    };

    const addShape = (type) => {
        const base = { fill: '#d4af37', stroke: '#7a1f2b', strokeWidth: 0 };
        const map = {
            rect: { name: 'Panel', width: 420, height: 260, cornerRadius: 12 },
            arch: { name: 'Arch', width: 360, height: 520, fill: '#7a1f2b' },
            ellipse: { name: 'Circle', width: 300, height: 300, fill: '#f4a6c0' },
            star: { name: 'Star', width: 220, height: 220, fill: '#f2c94c' },
            line: { name: 'Line', width: 500, height: 20, stroke: '#d4af37', strokeWidth: 8 },
        };
        add({ type, ...base, ...map[type] });
    };
    const addText = (preset) => {
        const p = {
            heading: { text: 'Mehndi Night', fontSize: 120, fontFamily: 'Georgia', fontStyle: 'bold', width: 900 },
            sub: { text: 'Ayesha & Ali · 12 December', fontSize: 56, fontFamily: 'Palatino Linotype', width: 900 },
            body: { text: 'Add your note here', fontSize: 40, fontFamily: 'Arial', width: 700 },
            script: { text: 'Welcome', fontSize: 140, fontFamily: 'Brush Script MT', width: 700 },
        }[preset];
        add({ type: 'text', name: p.text.slice(0, 24), fill: '#1f2a44', align: 'center', height: p.fontSize * 1.3, ...p });
    };
    const addSticker = (s) => add({ type: 'text', sticker: true, name: `Sticker ${s}`, text: s, fontSize: 160, fontFamily: 'Arial', width: 200, height: 200, align: 'center', fill: '#000000' });

    // Clipboard and arrangement.
    const copy = () => { if (sel) { clipboard.current = { ...sel }; toast.success('Copied'); } };
    const paste = () => {
        const c = clipboard.current;
        if (!c) return;
        const l = { ...c, id: uid(), x: c.x + 40, y: c.y + 40, locked: false };
        clipboard.current = l;
        commit((d) => ({ ...d, layers: [...d.layers, l] }));
        setSelected(l.id);
    };
    const duplicate = () => { if (sel) { clipboard.current = sel; paste(); } };
    const remove = () => { if (sel) { commit((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== sel.id) })); setSelected(null); } };
    const move = (dir) => {
        if (!sel) return;
        commit((d) => {
            const i = d.layers.findIndex((l) => l.id === sel.id);
            const j = dir === 'up' ? Math.min(d.layers.length - 1, i + 1) : dir === 'down' ? Math.max(0, i - 1) : dir === 'top' ? d.layers.length - 1 : 0;
            const list = [...d.layers];
            const [it] = list.splice(i, 1);
            list.splice(j, 0, it);
            return { ...d, layers: list };
        });
    };

    // Keyboard shortcuts (not while typing in a field).
    useEffect(() => {
        const onKey = (e) => {
            if (/input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable || cropping) return;
            const mod = e.ctrlKey || e.metaKey;
            if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
            else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
            else if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); copy(); }
            else if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); }
            else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
            else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); remove(); }
            else if (e.key === 'Escape') setSelected(null);
            else if (sel && !sel.locked && e.key.startsWith('Arrow')) {
                e.preventDefault();
                const step = e.shiftKey ? 20 : 2;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                update({ x: sel.x + dx, y: sel.y + dy });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // Attach the resize/rotate handles to the selected layer.
    useEffect(() => {
        const tr = trRef.current;
        const stage = stageRef.current;
        if (!tr || !stage) return;
        const node = sel && !sel.locked && sel.visible !== false ? stage.findOne(`#${sel.id}`) : null;
        tr.nodes(node ? [node] : []);
        tr.getLayer()?.batchDraw();
    }, [sel, layers]);

    const onTransformEnd = (layer) => (e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        const patch = { x: node.x(), y: node.y(), rotation: node.rotation(), width: Math.max(10, layer.width * sx), height: Math.max(10, layer.height * sy) };
        if (layer.type === 'text') patch.fontSize = Math.max(8, Math.round(layer.fontSize * (isSticker(layer) ? Math.max(sx, sy) : sy)));
        commit((d) => ({ ...d, layers: d.layers.map((l) => (l.id === layer.id ? { ...l, ...patch } : l)) }));
    };

    // Drop a picture from the ideas panel onto the canvas.
    const onDrop = (e) => {
        e.preventDefault();
        const raw = e.dataTransfer.getData('application/x-lab-picture');
        if (!raw) return;
        const stage = stageRef.current;
        stage.setPointersPositions(e);
        const p = stage.getPointerPosition();
        addPicture(JSON.parse(raw), { x: p.x / zoom, y: p.y / zoom });
    };

    const exportPng = async (mode) => {
        const stage = stageRef.current;
        setSelected(null);
        trRef.current?.nodes([]);
        await new Promise((r) => setTimeout(r, 50));
        let url;
        try {
            url = stage.toDataURL({ pixelRatio: 1 / zoom, mimeType: mode === 'save' ? 'image/jpeg' : 'image/png', quality: 0.9 });
        } catch {
            toast.error('One of the pictures does not allow export. Remove it and try again.');
            return;
        }
        if (mode === 'download') {
            const a = document.createElement('a');
            a.href = url;
            a.download = `${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'design'}.png`;
            a.click();
            return;
        }
        try {
            const res = await axios.put(`/designs/boards/${kind}/${id}/preview`, { dataUrl: url });
            toast.success(res.data.data.designPicture ? 'Saved as the design\'s picture.' : 'Saved as the board picture.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save the picture.');
        }
    };

    const setArtboard = (aid) => {
        const a = ARTBOARDS.find((x) => x.id === aid);
        commit((d) => ({ ...d, artboard: a.id, width: a.width, height: a.height }));
    };

    const credits = useMemo(() => [...new Set(layers.filter((l) => l.type === 'image' && l.credit).map((l) => l.credit))], [layers]);

    if (!doc) {
        return <div className="min-h-screen bg-bg pt-24 grid place-items-center text-muted"><Loader2 className="animate-spin" aria-hidden="true" /><span className="sr-only">Loading</span></div>;
    }

    const field = 'w-full bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-fg outline-none focus:border-brand';
    const tool = 'w-8 h-8 grid place-items-center rounded-lg text-muted hover:text-fg hover:bg-fg/5 disabled:opacity-40 disabled:hover:bg-transparent';

    return (
        <div className="h-screen bg-bg text-fg pt-20 flex flex-col">
            {/* Toolbar */}
            <header className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-surface">
                <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-fg pr-2"><ArrowLeft size={15} aria-hidden="true" /> Back</button>
                <div className="min-w-0 mr-auto">
                    <h1 className="text-sm font-black truncate">{title}</h1>
                    <p className="text-[10px] text-muted">Design Lab · {saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved changes' : saveState === 'error' ? 'Not saved' : 'All changes saved'}</p>
                </div>
                <select value={doc.artboard} onChange={(e) => setArtboard(e.target.value)} aria-label="Canvas size" className="bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs">
                    {ARTBOARDS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
                <label className="flex items-center gap-1 text-[10px] font-bold text-muted">Background
                    <input type="color" value={doc.background} onChange={(e) => commit((d) => ({ ...d, background: e.target.value }), { coalesce: 'edit' })} className="w-7 h-7 rounded border border-border bg-transparent" />
                </label>
                <span className="w-px h-6 bg-border" aria-hidden="true" />
                <button type="button" className={tool} onClick={undo} disabled={!canUndo.past} aria-label="Undo (Ctrl+Z)" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
                <button type="button" className={tool} onClick={redo} disabled={!canUndo.future} aria-label="Redo (Ctrl+Y)" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
                <button type="button" className={tool} onClick={copy} disabled={!sel} aria-label="Copy (Ctrl+C)" title="Copy (Ctrl+C)"><Copy size={16} /></button>
                <button type="button" className={tool} onClick={paste} aria-label="Paste (Ctrl+V)" title="Paste (Ctrl+V)"><ClipboardPaste size={16} /></button>
                <button type="button" className={tool} onClick={duplicate} disabled={!sel} aria-label="Duplicate (Ctrl+D)" title="Duplicate (Ctrl+D)"><CopyPlus size={16} /></button>
                <button type="button" className={tool} onClick={() => sel && setCropping(sel)} disabled={sel?.type !== 'image'} aria-label="Cut a piece from the picture" title="Cut a piece from the picture"><Scissors size={16} /></button>
                <button type="button" className={tool} onClick={() => move('up')} disabled={!sel} aria-label="Bring forward" title="Bring forward"><ChevronUp size={16} /></button>
                <button type="button" className={tool} onClick={() => move('down')} disabled={!sel} aria-label="Send backward" title="Send backward"><ChevronDown size={16} /></button>
                <button type="button" className={tool} onClick={remove} disabled={!sel} aria-label="Delete (Del)" title="Delete (Del)"><Trash2 size={16} /></button>
                <span className="w-px h-6 bg-border" aria-hidden="true" />
                <button type="button" className={tool} onClick={() => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 10) / 10))} aria-label="Zoom out"><ZoomOut size={16} /></button>
                <span className="text-[11px] font-bold w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
                <button type="button" className={tool} onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))} aria-label="Zoom in"><ZoomIn size={16} /></button>
                <button type="button" className={tool} onClick={fit} aria-label="Fit to screen" title="Fit to screen"><Maximize size={16} /></button>
                <span className="w-px h-6 bg-border" aria-hidden="true" />
                <button type="button" onClick={() => exportPng('download')} className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold flex items-center gap-1.5 hover:border-brand"><Download size={14} aria-hidden="true" /> PNG</button>
                <button type="button" onClick={() => exportPng('save')} className="px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90">
                    {kind === 'design' ? <Check size={14} aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}{kind === 'design' ? 'Use as design picture' : 'Save picture'}
                </button>
            </header>

            <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                {/* Left: ideas, elements, layers */}
                <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-border bg-surface flex flex-col min-h-0 max-h-[45vh] lg:max-h-none">
                    <div role="tablist" aria-label="Lab panels" className="flex gap-1 p-2 border-b border-border">
                        {[['ideas', 'Ideas', Search], ['elements', 'Elements', Shapes], ['layers', 'Layers', LayersIcon]].map(([k, label, Icon]) => (
                            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${tab === k ? 'bg-brand text-white' : 'text-muted hover:text-fg'}`}>
                                <Icon size={13} aria-hidden="true" />{label}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 min-h-0 p-3 overflow-hidden">
                        {tab === 'ideas' && (
                            <InspirationPanel initial={{ eventType: params.get('eventType'), theme: params.get('theme') }} pins={pins} onPinsChange={savePins} onAdd={(r) => addPicture(r)} />
                        )}
                        {tab === 'elements' && (
                            <div className="h-full overflow-y-auto space-y-4 pr-1">
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Shapes</p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[['rect', Square, 'Panel'], ['arch', ArchIcon, 'Arch'], ['ellipse', Circle, 'Circle'], ['star', StarIcon, 'Star'], ['line', Minus, 'Line']].map(([t, Icon, label]) => (
                                            <button key={t} type="button" onClick={() => addShape(t)} title={label} aria-label={`Add ${label}`} className="aspect-square rounded-xl border border-border grid place-items-center text-muted hover:text-brand hover:border-brand"><Icon size={18} /></button>
                                        ))}
                                    </div>
                                </section>
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Text</p>
                                    <div className="space-y-1.5">
                                        <button type="button" onClick={() => addText('heading')} className="w-full text-left px-3 py-2 rounded-xl border border-border hover:border-brand text-base font-black" style={{ fontFamily: 'Georgia' }}><Type size={13} className="inline mr-1" aria-hidden="true" />Heading</button>
                                        <button type="button" onClick={() => addText('sub')} className="w-full text-left px-3 py-2 rounded-xl border border-border hover:border-brand text-sm" style={{ fontFamily: 'Palatino Linotype' }}>Subheading</button>
                                        <button type="button" onClick={() => addText('script')} className="w-full text-left px-3 py-2 rounded-xl border border-border hover:border-brand text-xl" style={{ fontFamily: 'Brush Script MT' }}>Script welcome</button>
                                        <button type="button" onClick={() => addText('body')} className="w-full text-left px-3 py-2 rounded-xl border border-border hover:border-brand text-xs">Body text</button>
                                    </div>
                                </section>
                                <section>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-2">Decor stickers</p>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {STICKERS.map((s) => <button key={s} type="button" onClick={() => addSticker(s)} aria-label={`Add ${s}`} className="aspect-square rounded-lg border border-border text-xl hover:border-brand">{s}</button>)}
                                    </div>
                                </section>
                                <p className="text-[10px] text-muted leading-snug">Tip: in Ideas, drag any picture onto the canvas, then use <Scissors size={10} className="inline" aria-hidden="true" /> to cut out the piece you like (an arch, a swing, a flower wall) and copy it into your own design.</p>
                            </div>
                        )}
                        {tab === 'layers' && (
                            <div className="h-full overflow-y-auto space-y-1 pr-1">
                                {layers.length === 0 && <p className="text-xs text-muted text-center py-6">No layers yet. Add pictures, shapes or text.</p>}
                                {[...layers].reverse().map((l) => (
                                    <div key={l.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${selected === l.id ? 'border-brand bg-brand/10' : 'border-transparent hover:bg-fg/5'}`}>
                                        <button type="button" onClick={() => setSelected(l.id)} className="flex-1 min-w-0 text-left text-xs truncate flex items-center gap-1.5">
                                            {l.type === 'image' ? <ImageIcon size={12} aria-hidden="true" /> : l.type === 'text' ? <Type size={12} aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
                                            <span className="truncate">{l.name || l.type}</span>
                                        </button>
                                        <button type="button" onClick={() => commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? { ...x, visible: x.visible === false } : x)) }))} aria-label={l.visible === false ? 'Show' : 'Hide'} className="text-muted hover:text-fg">{l.visible === false ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                                        <button type="button" onClick={() => commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? { ...x, locked: !x.locked } : x)) }))} aria-label={l.locked ? 'Unlock' : 'Lock'} className="text-muted hover:text-fg">{l.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Canvas */}
                <main ref={wrapRef} className="flex-1 min-h-[50vh] overflow-auto bg-surface-2/60 relative"
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={onDrop}
                    style={{ backgroundImage: 'radial-gradient(rgba(127,127,127,.18) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
                    <div className="min-w-full min-h-full w-max h-max p-6 grid place-items-center">
                        <div className="shadow-2xl rounded-sm" style={{ width: doc.width * zoom, height: doc.height * zoom }}>
                            <Stage ref={stageRef} width={doc.width * zoom} height={doc.height * zoom} scaleX={zoom} scaleY={zoom}
                                onMouseDown={(e) => { if (e.target === e.target.getStage() || e.target.name() === 'artboard') setSelected(null); }}
                                onTouchStart={(e) => { if (e.target === e.target.getStage() || e.target.name() === 'artboard') setSelected(null); }}>
                                <Layer>
                                    <Rect name="artboard" x={0} y={0} width={doc.width} height={doc.height} fill={doc.background} />
                                    {layers.filter((l) => l.visible !== false).map((l) => (
                                        <Group key={l.id} id={l.id} x={l.x} y={l.y} rotation={l.rotation || 0} opacity={l.opacity ?? 1}
                                            draggable={!l.locked}
                                            onMouseDown={() => setSelected(l.id)} onTap={() => setSelected(l.id)}
                                            onDblClick={() => { setSelected(l.id); if (l.type === 'image') setCropping(l); }}
                                            onDragEnd={(e) => commit((d) => ({ ...d, layers: d.layers.map((x) => (x.id === l.id ? { ...x, x: e.target.x(), y: e.target.y() } : x)) }))}
                                            onTransformEnd={onTransformEnd(l)}>
                                            <Body layer={l} />
                                        </Group>
                                    ))}
                                    <Transformer ref={trRef} rotateEnabled keepRatio={false} anchorSize={10} borderStroke="#6366f1" anchorStroke="#6366f1"
                                        boundBoxFunc={(o, n) => (n.width < 10 || n.height < 10 ? o : n)} />
                                </Layer>
                            </Stage>
                        </div>
                    </div>
                    {layers.length === 0 && (
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <p className="text-sm text-muted bg-surface/90 border border-border rounded-2xl px-4 py-3 text-center max-w-xs">Drag a picture from <b>Ideas</b>, or add shapes, text and stickers from <b>Elements</b>.</p>
                        </div>
                    )}
                </main>

                {/* Right: properties */}
                <aside className="lg:w-64 border-t lg:border-t-0 lg:border-l border-border bg-surface p-3 overflow-y-auto max-h-[40vh] lg:max-h-none space-y-3" aria-label="Properties">
                    {!sel ? (
                        <div className="text-xs text-muted space-y-2">
                            <p className="font-bold text-fg">Nothing selected</p>
                            <p>Click a layer to move, resize, rotate or restyle it.</p>
                            <p className="pt-2 font-bold text-fg">Shortcuts</p>
                            <p>Ctrl+C / Ctrl+V copy and paste · Ctrl+D duplicate · Ctrl+Z / Ctrl+Y undo and redo · Del delete · arrows nudge (Shift for more) · double-click a picture to cut a piece.</p>
                            {credits.length > 0 && <><p className="pt-2 font-bold text-fg">Picture credits</p>{credits.map((c) => <p key={c}>{c}</p>)}</>}
                        </div>
                    ) : (
                        <>
                            <label className="block">
                                <span className="text-[10px] font-bold text-muted">Layer name</span>
                                <input value={sel.name || ''} onChange={(e) => update({ name: e.target.value }, { coalesce: 'edit' })} className={field} />
                            </label>
                            {sel.type === 'text' && (
                                <>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-muted">Text</span>
                                        <textarea rows={3} value={sel.text} onChange={(e) => update({ text: e.target.value }, { coalesce: 'edit' })} className={`${field} resize-y`} />
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block col-span-2">
                                            <span className="text-[10px] font-bold text-muted">Font</span>
                                            <select value={sel.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })} className={field}>{FONTS.map((f) => <option key={f} style={{ fontFamily: f }}>{f}</option>)}</select>
                                        </label>
                                        <NumField sel={sel} update={update} field={field} label="Size" k="fontSize" min={6} />
                                        <label className="block">
                                            <span className="text-[10px] font-bold text-muted">Style</span>
                                            <select value={sel.fontStyle || 'normal'} onChange={(e) => update({ fontStyle: e.target.value })} className={field}>
                                                <option value="normal">Regular</option><option value="bold">Bold</option><option value="italic">Italic</option><option value="italic bold">Bold italic</option>
                                            </select>
                                        </label>
                                        <label className="block col-span-2">
                                            <span className="text-[10px] font-bold text-muted">Align</span>
                                            <select value={sel.align || 'left'} onChange={(e) => update({ align: e.target.value })} className={field}><option>left</option><option>center</option><option>right</option></select>
                                        </label>
                                    </div>
                                </>
                            )}
                            {sel.type !== 'image' && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-muted">{sel.type === 'line' ? 'Colour' : 'Fill'}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {SWATCHES.map((c) => <button key={c} type="button" onClick={() => update(sel.type === 'line' ? { stroke: c } : { fill: c })} aria-label={`Colour ${c}`} className="w-5 h-5 rounded-full border border-border" style={{ background: c }} />)}
                                        <input type="color" value={(sel.type === 'line' ? sel.stroke : sel.fill) || '#000000'} onChange={(e) => update(sel.type === 'line' ? { stroke: e.target.value } : { fill: e.target.value }, { coalesce: 'edit' })} aria-label="Custom colour" className="w-6 h-6 rounded border border-border bg-transparent" />
                                    </div>
                                    {sel.type !== 'line' && (
                                        <div className="grid grid-cols-2 gap-2 items-end">
                                            <label className="block">
                                                <span className="text-[10px] font-bold text-muted">Outline</span>
                                                <input type="color" value={sel.stroke || '#000000'} onChange={(e) => update({ stroke: e.target.value }, { coalesce: 'edit' })} className="w-full h-8 rounded border border-border bg-transparent" />
                                            </label>
                                            <NumField sel={sel} update={update} field={field} label="Outline width" k="strokeWidth" min={0} />
                                        </div>
                                    )}
                                    {sel.type === 'line' && <NumField sel={sel} update={update} field={field} label="Thickness" k="strokeWidth" min={1} />}
                                </div>
                            )}
                            {(sel.type === 'rect' || sel.type === 'image') && <NumField sel={sel} update={update} field={field} label="Corner radius" k="cornerRadius" min={0} />}
                            {sel.type === 'image' && (
                                <div className="space-y-2">
                                    <button type="button" onClick={() => setCropping(sel)} className="w-full py-2 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1.5 hover:border-brand"><Scissors size={13} aria-hidden="true" /> Cut a piece</button>
                                    {sel.crop && <button type="button" onClick={() => update({ crop: null })} className="w-full py-1.5 rounded-lg text-xs text-muted hover:text-fg">Show the whole picture</button>}
                                    {sel.credit && <p className="text-[10px] text-muted">Photo: {sel.credit}</p>}
                                </div>
                            )}
                            <label className="block">
                                <span className="text-[10px] font-bold text-muted">Opacity {Math.round((sel.opacity ?? 1) * 100)}%</span>
                                <input type="range" min={0.05} max={1} step={0.05} value={sel.opacity ?? 1} onChange={(e) => update({ opacity: Number(e.target.value) }, { coalesce: 'edit' })} className="w-full accent-[var(--color-brand,#6366f1)]" />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <NumField sel={sel} update={update} field={field} label="X" k="x" /><NumField sel={sel} update={update} field={field} label="Y" k="y" />
                                <NumField sel={sel} update={update} field={field} label="Width" k="width" min={10} /><NumField sel={sel} update={update} field={field} label="Height" k="height" min={10} />
                                <NumField sel={sel} update={update} field={field} label="Rotation" k="rotation" />
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button type="button" onClick={() => move('top')} className="py-1.5 rounded-lg border border-border text-[11px] font-bold hover:border-brand">To front</button>
                                <button type="button" onClick={() => move('bottom')} className="py-1.5 rounded-lg border border-border text-[11px] font-bold hover:border-brand">To back</button>
                                <button type="button" onClick={duplicate} className="py-1.5 rounded-lg border border-border text-[11px] font-bold hover:border-brand">Duplicate</button>
                                <button type="button" onClick={remove} className="py-1.5 rounded-lg border border-rose-500/40 text-rose-500 text-[11px] font-bold hover:bg-rose-500/10">Delete</button>
                            </div>
                        </>
                    )}
                </aside>
            </div>

            {cropping && (
                <CropDialog
                    layer={cropping}
                    onClose={() => setCropping(null)}
                    onApply={(crop) => {
                        commit((d) => ({ ...d, layers: d.layers.map((l) => (l.id === cropping.id ? { ...l, crop, height: Math.round((crop.height / crop.width) * l.width) } : l)) }));
                        setCropping(null);
                    }}
                    onCopy={(crop) => {
                        const w = Math.min(500, crop.width);
                        add({ type: 'image', name: `Piece of ${cropping.name || 'picture'}`.slice(0, 40), src: cropping.src, credit: cropping.credit, crop, width: w, height: Math.round((crop.height / crop.width) * w), x: cropping.x + 60, y: cropping.y + 60 });
                        setCropping(null);
                        toast.success('Piece added as a new layer. Drag it where you want it.');
                    }}
                />
            )}
        </div>
    );
}

/** A number field bound to one property of the selected layer (kept outside render so typing keeps focus). */
function NumField({ label, k, step = 1, min, sel, update, field }) {
    return (
        <label className="block">
            <span className="text-[10px] font-bold text-muted">{label}</span>
            <input type="number" step={step} min={min} value={Math.round((sel[k] ?? 0) * 100) / 100}
                onChange={(e) => update({ [k]: Number(e.target.value) }, { coalesce: `num-${k}` })} className={field} />
        </label>
    );
}

function ArchIcon({ size = 18 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 21V11a7 7 0 0 1 14 0v10" />
        </svg>
    );
}
