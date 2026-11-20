import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Heart, Gem, Flower2, Crown, Cake, Briefcase, Presentation, RefreshCw, ArrowRight, Check, Loader2, Users, Wallet, Pencil, Wand2,
} from 'lucide-react';
import axios from '../../api/axios';
import { formatCurrency } from '../ui';

const EVENTS = [
    { name: 'Wedding', Icon: Heart }, { name: 'Nikah', Icon: Gem }, { name: 'Mehndi', Icon: Flower2 }, { name: 'Walima', Icon: Crown },
    { name: 'Birthday', Icon: Cake }, { name: 'Corporate', Icon: Briefcase }, { name: 'Conference', Icon: Presentation },
];
const BUDGETS = [500, 1000, 2500, 5000, 10000];
const GUESTS = [50, 100, 150, 250, 400, 600];
const BUILD_STEPS = ['Laying out the full setup', 'Choosing and pricing the decor pieces', 'Rendering 4 full HD pictures'];

const field = 'w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/40';
const chip = (on) => `inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-all ${on
    ? 'bg-brand text-white border-brand shadow-lg shadow-brand/25'
    : 'bg-surface-2 border-border text-fg hover:border-brand/60 hover:-translate-y-0.5'}`;

function Smartie({ children }) {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-2xl bg-gradient-to-br from-brand to-fuchsia-500 grid place-items-center text-white shadow-lg shadow-brand/30" aria-hidden="true">
                <Sparkles size={16} />
            </span>
            <div className="bg-surface-2 border border-border rounded-2xl rounded-tl-md px-4 py-2.5 text-sm text-fg max-w-xl">{children}</div>
        </motion.div>
    );
}

function Answer({ children, onEdit }) {
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
            <div className="group inline-flex items-center gap-2 bg-brand/15 border border-brand/30 text-fg rounded-2xl rounded-tr-md px-4 py-2 text-sm font-bold">
                {children}
                {onEdit && (
                    <button type="button" onClick={onEdit} className="text-muted hover:text-fg" aria-label="Change this answer"><Pencil size={13} aria-hidden="true" /></button>
                )}
            </div>
        </motion.div>
    );
}

const Swatches = ({ palette, size = 'h-2.5' }) => (
    <div className={`flex w-full overflow-hidden rounded-full ${size}`} aria-label="Colours">
        {(palette || []).map((c) => <span key={c} className="flex-1" style={{ background: c }} title={c} />)}
    </div>
);

/**
 * Creating a design with Smartie, one question at a time: the occasion, a
 * theme (Smartie suggests four, each with its own colours), the decor budget
 * and the guest count. Smartie then makes ONE design with four full HD
 * pictures: the whole setup and its three main pieces.
 */
export default function DesignWizard({ onCreated }) {
    const [step, setStep] = useState(0);
    const [eventType, setEventType] = useState('');
    const [idea, setIdea] = useState('');
    const [themes, setThemes] = useState(null);
    const [loadingThemes, setLoadingThemes] = useState(false);
    const [theme, setTheme] = useState(null);
    const [ownTheme, setOwnTheme] = useState('');
    const [budget, setBudget] = useState(1000);
    const [guests, setGuests] = useState(150);
    const [building, setBuilding] = useState(-1);
    const endRef = useRef(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [step, themes, building]);

    const loadThemes = async (type = eventType) => {
        setLoadingThemes(true);
        setThemes(null);
        try {
            const r = await axios.post('/designs/themes', { eventType: type, idea });
            setThemes(r.data.data.themes);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not get theme ideas.');
        } finally { setLoadingThemes(false); }
    };

    const pickEvent = (name) => { setEventType(name); setTheme(null); setStep(1); loadThemes(name); };
    const pickTheme = (t) => { setTheme(t); setStep(2); };
    const applyOwnTheme = async () => {
        const name = ownTheme.trim();
        if (!name) return;
        // Smartie still picks the colours: it asks for ideas around the vendor's own theme and takes the closest.
        setLoadingThemes(true);
        try {
            const r = await axios.post('/designs/themes', { eventType, idea: `${name}. ${idea}`.trim() });
            const best = r.data.data.themes?.[0];
            pickTheme({ name, mood: best?.mood || '', style: best?.style || '', palette: best?.palette || [] });
        } catch {
            pickTheme({ name, mood: '', style: '', palette: [] });
        } finally { setLoadingThemes(false); }
    };

    const reset = () => { setStep(0); setEventType(''); setIdea(''); setThemes(null); setTheme(null); setOwnTheme(''); setBuilding(-1); };

    const create = async () => {
        setBuilding(0);
        const ticker = setInterval(() => setBuilding((b) => (b < BUILD_STEPS.length - 1 ? b + 1 : b)), 2500);
        try {
            const r = await axios.post('/designs/generate', {
                eventType, theme: theme.name, style: theme.style, idea: [theme.mood, idea].filter(Boolean).join(' '),
                budget, guests, colors: theme.palette, count: 1,
            });
            const made = Array.isArray(r.data.data) ? r.data.data : [r.data.data];
            clearInterval(ticker);
            setBuilding(BUILD_STEPS.length);
            toast.success('Your design is ready. Its 4 full HD pictures appear one by one.');
            onCreated?.(made);
            setTimeout(reset, 900);
        } catch (err) {
            clearInterval(ticker);
            setBuilding(-1);
            toast.error(err.response?.data?.message || 'Could not create the design.');
        }
    };

    return (
        <section className="relative overflow-hidden bg-surface border border-border rounded-3xl" aria-label="Create a design with Smartie">
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand/20 blur-3xl pointer-events-none" aria-hidden="true" />
            <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="relative px-5 md:px-7 pt-5 pb-3 flex items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <Wand2 className="text-brand" size={20} aria-hidden="true" />
                    <div>
                        <h2 className="text-base md:text-lg font-black text-fg leading-tight">Design with Smartie</h2>
                        <p className="text-[11px] text-muted">Theme, budget and guests. Smartie picks the colours and makes one design with 4 full HD pictures.</p>
                    </div>
                </div>
                <ol className="hidden sm:flex items-center gap-1.5" aria-label="Progress">
                    {['Occasion', 'Theme', 'Budget', 'Guests', 'Create'].map((s, i) => (
                        <li key={s} className={`text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 ${i < step ? 'bg-success/15 text-success' : i === step ? 'bg-brand text-white' : 'bg-surface-2 text-muted'}`}>{s}</li>
                    ))}
                </ol>
            </div>

            <div className="relative px-5 md:px-7 py-5 space-y-4">
                <Smartie>Hi! Let's design something beautiful. <b>What are we decorating?</b></Smartie>
                {step === 0 ? (
                    <div className="pl-12 space-y-3">
                        <label htmlFor="wz-idea" className="sr-only">Your idea (optional)</label>
                        <input id="wz-idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={300} className={`${field} max-w-xl`}
                            placeholder="Optional: an idea in mind? Type it first, e.g. Batman party for a 6-year-old" />
                        <div className="flex flex-wrap gap-2">
                            {EVENTS.map(({ name, Icon }) => (
                                <button key={name} type="button" onClick={() => pickEvent(name)} className={chip(eventType === name)}>
                                    <Icon size={16} aria-hidden="true" />{name}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <Answer onEdit={() => setStep(0)}>{eventType}{idea ? ` · ${idea}` : ''}</Answer>
                )}

                {step >= 1 && (
                    <>
                        <Smartie>Lovely. Here are four themes for your {eventType.toLowerCase()}, each with colours that suit it. <b>Pick one</b> or name your own.</Smartie>
                        {step === 1 ? (
                            <div className="pl-12 space-y-3">
                                {loadingThemes || !themes ? (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface-2 animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-3">
                                        {themes.map((t) => (
                                            <button key={t.name} type="button" onClick={() => pickTheme(t)}
                                                className="group text-left rounded-2xl border border-border bg-surface-2 hover:border-brand/60 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/10 transition-all overflow-hidden">
                                                <div className="h-14 relative" style={{ background: `linear-gradient(120deg, ${t.palette.join(', ')})` }}>
                                                    <span className="absolute bottom-2 right-2 text-[10px] font-black uppercase tracking-wider bg-black/45 text-white rounded-full px-2 py-0.5">{t.style}</span>
                                                </div>
                                                <div className="p-3.5 space-y-1.5">
                                                    <p className="font-black text-fg flex items-center justify-between gap-2">{t.name}<ArrowRight size={15} className="text-muted group-hover:text-brand transition-colors" aria-hidden="true" /></p>
                                                    <p className="text-xs text-muted leading-relaxed">{t.mood}</p>
                                                    <Swatches palette={t.palette} />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
                                    <label htmlFor="wz-own" className="sr-only">Your own theme</label>
                                    <input id="wz-own" value={ownTheme} onChange={(e) => setOwnTheme(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applyOwnTheme(); }}
                                        placeholder="Or type your own theme, e.g. Royal Batman" className={field} />
                                    <button type="button" onClick={applyOwnTheme} disabled={!ownTheme.trim() || loadingThemes}
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-fg text-bg text-sm font-bold px-4 py-2.5 disabled:opacity-40">Use this theme</button>
                                    <button type="button" onClick={() => loadThemes()} disabled={loadingThemes}
                                        className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border text-fg text-sm font-bold px-4 py-2.5 hover:bg-fg/5 disabled:opacity-40">
                                        <RefreshCw size={14} className={loadingThemes ? 'animate-spin' : ''} aria-hidden="true" />New ideas
                                    </button>
                                </div>
                            </div>
                        ) : theme && (
                            <Answer onEdit={() => setStep(1)}>
                                <span className="inline-flex items-center gap-2">{theme.name}<span className="w-16"><Swatches palette={theme.palette} size="h-2" /></span></span>
                            </Answer>
                        )}
                    </>
                )}

                {step >= 2 && (
                    <>
                        <Smartie>Great choice! <b>What is the budget for the whole decor?</b></Smartie>
                        {step === 2 ? (
                            <div className="pl-12 space-y-3 max-w-xl">
                                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-muted inline-flex items-center gap-1.5"><Wallet size={14} aria-hidden="true" />Decor budget</span>
                                        <span className="text-2xl font-black text-fg tabular-nums">{formatCurrency(budget)}</span>
                                    </div>
                                    <label htmlFor="wz-budget" className="sr-only">Decor budget</label>
                                    <input id="wz-budget" type="range" min="100" max="20000" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="w-full mt-3 accent-[var(--color-brand,#7c3aed)]" />
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {BUDGETS.map((b) => <button key={b} type="button" onClick={() => setBudget(b)} className={`rounded-full px-3 py-1 text-xs font-bold border ${budget === b ? 'bg-brand text-white border-brand' : 'border-border text-muted hover:text-fg'}`}>{formatCurrency(b)}</button>)}
                                        <input type="number" min="100" value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} aria-label="Exact budget"
                                            className="w-28 bg-surface border border-border rounded-full px-3 py-1 text-xs text-fg" />
                                    </div>
                                </div>
                                <button type="button" onClick={() => setStep(3)} disabled={!(budget >= 100)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white text-sm font-bold px-5 py-2.5 hover:opacity-90 disabled:opacity-40">
                                    Next<ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </div>
                        ) : <Answer onEdit={() => setStep(2)}>{formatCurrency(budget)} for the decor</Answer>}
                    </>
                )}

                {step >= 3 && (
                    <>
                        <Smartie><b>About how many guests?</b> I'll size the seating, tables and centrepieces for them.</Smartie>
                        {step === 3 ? (
                            <div className="pl-12 space-y-3 max-w-xl">
                                <div className="flex flex-wrap gap-2">
                                    {GUESTS.map((g) => (
                                        <button key={g} type="button" onClick={() => setGuests(g)} className={chip(guests === g)}><Users size={15} aria-hidden="true" />{g}</button>
                                    ))}
                                    <input type="number" min="1" max="5000" value={guests} onChange={(e) => setGuests(Math.max(0, Number(e.target.value) || 0))} aria-label="Exact number of guests"
                                        className="w-28 bg-surface-2 border border-border rounded-2xl px-3 py-2.5 text-sm text-fg" />
                                </div>
                                <button type="button" onClick={() => setStep(4)} disabled={!(guests > 0)} className="inline-flex items-center gap-1.5 rounded-xl bg-brand text-white text-sm font-bold px-5 py-2.5 hover:opacity-90 disabled:opacity-40">
                                    Next<ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </div>
                        ) : <Answer onEdit={() => setStep(3)}>{guests} guests</Answer>}
                    </>
                )}

                {step >= 4 && theme && (
                    <>
                        <Smartie>Here's the plan. I picked the colours for <b>{theme.name}</b>. Ready?</Smartie>
                        <div className="pl-12">
                            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden max-w-xl">
                                <div className="h-20" style={{ background: theme.palette.length ? `linear-gradient(120deg, ${theme.palette.join(', ')})` : undefined }} />
                                <div className="p-4 grid grid-cols-2 gap-3 text-sm">
                                    <div><p className="text-[11px] text-muted font-bold">Occasion</p><p className="font-black text-fg">{eventType}</p></div>
                                    <div><p className="text-[11px] text-muted font-bold">Theme</p><p className="font-black text-fg">{theme.name}</p></div>
                                    <div><p className="text-[11px] text-muted font-bold">Decor budget</p><p className="font-black text-fg">{formatCurrency(budget)}</p></div>
                                    <div><p className="text-[11px] text-muted font-bold">Guests</p><p className="font-black text-fg">{guests}</p></div>
                                    <div className="col-span-2">
                                        <p className="text-[11px] text-muted font-bold mb-1.5">Colours picked by Smartie</p>
                                        <div className="flex gap-1.5">{theme.palette.length ? theme.palette.map((c) => <span key={c} className="w-8 h-8 rounded-xl border border-border shadow-inner" style={{ background: c }} title={c} />) : <span className="text-xs text-muted">Smartie will choose them while designing.</span>}</div>
                                    </div>
                                </div>
                                <div className="px-4 pb-4">
                                    <AnimatePresence mode="wait">
                                        {building < 0 ? (
                                            <motion.button key="go" type="button" onClick={create} exit={{ opacity: 0 }}
                                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-fuchsia-500 text-white text-sm font-black px-5 py-3 shadow-lg shadow-brand/30 hover:opacity-95">
                                                <Sparkles size={16} aria-hidden="true" />Create my design
                                            </motion.button>
                                        ) : (
                                            <motion.ul key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2" aria-live="polite">
                                                {BUILD_STEPS.map((s, i) => (
                                                    <li key={s} className={`flex items-center gap-2 text-sm ${i <= building ? 'text-fg' : 'text-muted'}`}>
                                                        {i < building ? <Check size={15} className="text-success" aria-hidden="true" /> : i === building ? <Loader2 size={15} className="animate-spin text-brand" aria-hidden="true" /> : <span className="w-[15px] h-[15px] rounded-full border border-border" aria-hidden="true" />}
                                                        {s}
                                                    </li>
                                                ))}
                                            </motion.ul>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </>
                )}
                <div ref={endRef} />
            </div>
        </section>
    );
}
