import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Wallet, Sparkles, MapPin, Package } from 'lucide-react';
import axios from '../../api/axios';
import StarRating from '../reviews/StarRating';
import { formatCurrency } from '../ui';

const TYPES = ['Nikah', 'Wedding', 'Mehndi', 'Walima', 'Birthday', 'Corporate', 'Conference'];
const FIELD = { venue: 'Venue', catering: 'Catering', decoration: 'Decoration', photography: 'Photography', music: 'Music & sound', makeup: 'Makeup' };
const field = 'w-full bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-fg placeholder:text-muted';

/**
 * "I have 1,500 for my nikah": Smartie spreads the budget over real vendor
 * packages (best-rated that fit each share), lets you swap any pick for an
 * alternative, and sends all the offers in one go.
 */
export default function BudgetPlanner({ compact = false }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ budget: '', eventType: 'Nikah', city: '', date: '', days: '1', title: '' });
    const [result, setResult] = useState(null);
    const [choice, setChoice] = useState({}); // field -> package id ('' = skip)
    const [busy, setBusy] = useState(null);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const plan = async (e) => {
        e.preventDefault();
        if (!(Number(form.budget) > 0)) { toast.error('Enter your total budget.'); return; }
        setBusy('plan');
        try {
            const res = await axios.post('/plans/budget', { budget: Number(form.budget), eventType: form.eventType, city: form.city || undefined });
            setResult(res.data.data);
            setChoice(Object.fromEntries(res.data.data.items.map((i) => [i.field, i.package?._id || ''])));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not plan the budget.');
        } finally {
            setBusy(null);
        }
    };

    const options = (i) => [i.package, ...i.alternatives].filter(Boolean);
    const chosen = useMemo(() => (result ? result.items.map((i) => options(i).find((p) => p._id === choice[i.field])).filter(Boolean) : []), [result, choice]);
    const total = chosen.reduce((t, p) => t + p.price, 0);
    const budget = Number(result?.budget || 0);

    const book = async () => {
        if (!form.date) { toast.error('Add the event date to send the offers.'); return; }
        setBusy('book');
        try {
            const res = await axios.post('/plans/budget/book', {
                serviceIds: chosen.map((p) => p._id), title: form.title || `${form.eventType}${form.city ? ` in ${form.city}` : ''}`,
                eventType: form.eventType, date: form.date, days: Math.min(30, Math.max(1, Number(form.days) || 1)), city: form.city || undefined,
            });
            const { sent, failed, planId } = res.data.data;
            toast.success(`${sent.length} offer${sent.length === 1 ? '' : 's'} sent${failed.length ? `, ${failed.length} failed` : ''}. Your plan is ready.`);
            navigate(`/planner?plan=${planId}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send the offers.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <section className="bg-surface border border-border rounded-3xl shadow-card p-5 space-y-4" aria-labelledby="bp-h">
            <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl grad-primary text-white flex items-center justify-center shrink-0"><Wallet size={19} aria-hidden="true" /></span>
                <div>
                    <h2 id="bp-h" className="text-base font-black text-fg">AI budget planner</h2>
                    <p className="text-xs text-muted">Say what you want to spend. Smartie picks a vendor package for each part of the event that fits, and books them together. You can also ask the chat: “I have 1500 for my nikah in Lahore”.</p>
                </div>
            </div>

            <form onSubmit={plan} className={`grid gap-2.5 ${compact ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-7'} items-end`}>
                <div>
                    <label htmlFor="bp-budget" className="text-[11px] font-bold text-fg block mb-1">Total budget</label>
                    <input id="bp-budget" type="number" min="1" value={form.budget} onChange={set('budget')} placeholder="1500" className={field} />
                </div>
                <div>
                    <label htmlFor="bp-type" className="text-[11px] font-bold text-fg block mb-1">Event</label>
                    <select id="bp-type" value={form.eventType} onChange={set('eventType')} className={field}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
                <div>
                    <label htmlFor="bp-city" className="text-[11px] font-bold text-fg block mb-1">City</label>
                    <input id="bp-city" value={form.city} onChange={set('city')} placeholder="Lahore" className={field} />
                </div>
                <div>
                    <label htmlFor="bp-date" className="text-[11px] font-bold text-fg block mb-1">First day</label>
                    <input id="bp-date" type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={set('date')} className={field} />
                </div>
                <div>
                    <label htmlFor="bp-days" className="text-[11px] font-bold text-fg block mb-1">Days</label>
                    <input id="bp-days" type="number" min="1" max="30" value={form.days} onChange={set('days')} className={field} />
                </div>
                {!compact && (
                    <div>
                        <label htmlFor="bp-title" className="text-[11px] font-bold text-fg block mb-1">Name (optional)</label>
                        <input id="bp-title" value={form.title} onChange={set('title')} placeholder="Our nikah" className={field} />
                    </div>
                )}
                <button type="submit" disabled={busy === 'plan'} className="col-span-2 lg:col-span-1 inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2 disabled:opacity-50">
                    <Sparkles size={15} aria-hidden="true" />{busy === 'plan' ? 'Planning…' : 'Plan my budget'}
                </button>
            </form>

            {result && (
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs font-bold text-fg mb-1">
                            <span>{formatCurrency(total)} of {formatCurrency(budget)}</span>
                            <span className={total > budget ? 'text-danger' : 'text-success'}>{total > budget ? `${formatCurrency(total - budget)} over` : `${formatCurrency(budget - total)} left`}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className={`h-full rounded-full ${total > budget ? 'bg-danger' : 'bg-success'}`} style={{ width: `${Math.min(100, budget ? (total / budget) * 100 : 0)}%` }} /></div>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {result.items.map((i) => {
                            const opts = options(i);
                            const p = opts.find((x) => x._id === choice[i.field]);
                            return (
                                <li key={i.field} className="bg-surface-2 border border-border rounded-2xl p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-wider text-brand">{FIELD[i.field]}</span>
                                        <span className="text-[11px] text-muted">share {formatCurrency(i.allocation)}</span>
                                    </div>
                                    {opts.length === 0 ? <p className="text-xs text-muted">{i.note}</p> : (
                                        <>
                                            <label htmlFor={`bp-${i.field}`} className="sr-only">{FIELD[i.field]} package</label>
                                            <select id={`bp-${i.field}`} value={choice[i.field] || ''} onChange={(e) => setChoice((c) => ({ ...c, [i.field]: e.target.value }))} className={field}>
                                                <option value="">Skip {FIELD[i.field].toLowerCase()}</option>
                                                {opts.map((x) => <option key={x._id} value={x._id}>{x.title} · {x.vendor.businessName} · {formatCurrency(x.price)}</option>)}
                                            </select>
                                            {p ? (
                                                <div className="flex items-center justify-between gap-2 text-xs">
                                                    <Link to={`/vendor/${p.vendor.userId}`} className="min-w-0 font-bold text-fg hover:text-brand truncate"><Package size={12} className="inline mr-1" aria-hidden="true" />{p.vendor.businessName}</Link>
                                                    <span className="flex items-center gap-2 shrink-0">
                                                        <StarRating value={p.vendor.rating} size={10} />
                                                        {p.vendor.location && <span className="text-muted hidden sm:inline"><MapPin size={10} className="inline" aria-hidden="true" /> {p.vendor.location}</span>}
                                                        <span className="font-black text-success">{formatCurrency(p.price)}</span>
                                                    </span>
                                                </div>
                                            ) : !i.package && <p className="text-[11px] text-muted">{i.note}</p>}
                                        </>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-muted">Offers go out at each package price. Vendors can accept or counter, and you can negotiate each one.</p>
                        <button onClick={book} disabled={!chosen.length || busy === 'book'} className="bg-success hover:opacity-90 text-white text-sm font-bold rounded-xl px-4 py-2.5 disabled:opacity-50 shrink-0">
                            {busy === 'book' ? 'Sending…' : `Book ${chosen.length} package${chosen.length === 1 ? '' : 's'} · ${formatCurrency(total)}`}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
