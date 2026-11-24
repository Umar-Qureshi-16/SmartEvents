import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    CalendarCheck, CalendarDays, CheckCircle2, Circle, Banknote, Heart, MapPin, MessageSquare, Pencil, Sparkles, Star, Ticket, X,
} from 'lucide-react';
import axios from '../../api/axios';
import ProfileHeader, { StatButton } from '../../components/organizer/ProfileHeader';
import StarRating from '../../components/reviews/StarRating';
import { formatCurrency, formatDate, formatDateRange } from '../../components/ui';

const TABS = [['upcoming', 'Upcoming'], ['plans', 'Plans'], ['following', 'Following'], ['reviews', 'My reviews'], ['spending', 'Spending']];
const FIELD = { venue: 'Venue', catering: 'Catering', decoration: 'Decoration', photography: 'Photography', music: 'Music', makeup: 'Makeup' };
const SUGGESTED = ['Weddings', 'Mehndi', 'Walima', 'Birthdays', 'Corporate', 'Conferences', 'Concerts', 'Baby showers'];
const field = 'w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-muted';
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);

function EditProfile({ user, onClose, onSaved }) {
    const [f, setF] = useState({
        name: user.name || '', city: user.city || '', bio: user.bio || '',
        avatar: user.avatar || '', coverImage: user.coverImage || '', interests: user.interests || [],
    });
    const [busy, setBusy] = useState(false);
    const [tag, setTag] = useState('');

    useEffect(() => {
        const key = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose]);

    const toggle = (i) => setF((x) => ({ ...x, interests: x.interests.includes(i) ? x.interests.filter((y) => y !== i) : [...x.interests, i].slice(0, 10) }));
    const addTag = () => { const t = tag.trim(); if (t.length >= 2 && !f.interests.includes(t)) toggle(t); setTag(''); };

    const save = async (e) => {
        e.preventDefault();
        for (const k of ['avatar', 'coverImage']) {
            if (f[k] && !isUrl(f[k])) { toast.error('Photo links must start with https://'); return; }
        }
        setBusy(true);
        try {
            const res = await axios.put('/organizers/me', f);
            toast.success('Profile saved.');
            onSaved(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not save.');
        } finally {
            setBusy(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-h"
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-3xl p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 id="edit-h" className="text-lg font-black text-fg">Edit profile</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-fg"><X size={20} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="op-name" className="text-xs font-bold text-fg block mb-1">Name</label>
                        <input id="op-name" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} />
                    </div>
                    <div>
                        <label htmlFor="op-city" className="text-xs font-bold text-fg block mb-1">City</label>
                        <input id="op-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Lahore" className={field} />
                    </div>
                </div>
                <div>
                    <label htmlFor="op-bio" className="text-xs font-bold text-fg block mb-1">About you <span className="text-muted font-normal">({f.bio.length}/600)</span></label>
                    <textarea id="op-bio" rows={3} maxLength={600} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} placeholder="What you are planning, the kind of events you organise…" className={field} />
                </div>
                <div>
                    <label htmlFor="op-avatar" className="text-xs font-bold text-fg block mb-1">Profile photo link</label>
                    <input id="op-avatar" type="url" value={f.avatar} onChange={(e) => setF({ ...f, avatar: e.target.value })} placeholder="https://…" className={field} />
                </div>
                <div>
                    <label htmlFor="op-cover" className="text-xs font-bold text-fg block mb-1">Cover photo link</label>
                    <input id="op-cover" type="url" value={f.coverImage} onChange={(e) => setF({ ...f, coverImage: e.target.value })} placeholder="https://… a wide photo" className={field} />
                </div>
                <fieldset>
                    <legend className="text-xs font-bold text-fg mb-1.5">Events you organise</legend>
                    <div className="flex flex-wrap gap-1.5">
                        {[...new Set([...SUGGESTED, ...f.interests])].map((i) => (
                            <button type="button" key={i} onClick={() => toggle(i)} aria-pressed={f.interests.includes(i)}
                                className={`text-xs font-bold rounded-full px-3 py-1 border ${f.interests.includes(i) ? 'bg-brand text-white border-brand' : 'border-border text-fg hover:border-brand/50'}`}>{i}</button>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <label htmlFor="op-tag" className="sr-only">Add your own</label>
                        <input id="op-tag" value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add your own" className={field} />
                        <button type="button" onClick={addTag} className="border border-border rounded-xl px-3 text-sm font-bold text-fg hover:bg-fg/5">Add</button>
                    </div>
                </fieldset>
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 border border-border text-fg hover:bg-fg/5 rounded-xl py-2.5 text-sm font-bold">Cancel</button>
                    <button type="submit" disabled={busy} className="flex-1 bg-brand hover:bg-brand-hover text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save profile'}</button>
                </div>
            </form>
        </div>,
        document.body,
    );
}

export default function OrganizerProfile() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'upcoming';
    const [data, setData] = useState(null);
    const [editing, setEditing] = useState(false);

    const load = useCallback(() => {
        axios.get('/organizers/me').then((res) => setData(res.data.data)).catch(() => toast.error('Could not load your profile.'));
    }, []);
    useEffect(() => { load(); }, [load]);

    const unfollow = async (vendorId) => {
        try {
            await axios.delete(`/auth/favorites/${vendorId}`);
            setData((d) => ({ ...d, following: d.following.filter((v) => String(v.userId) !== String(vendorId)), stats: { ...d.stats, following: d.stats.following - 1 } }));
        } catch {
            toast.error('Could not unfollow.');
        }
    };

    if (!data) return <div className="min-h-screen bg-bg max-w-6xl mx-auto p-6"><div className="h-56 rounded-3xl bg-surface-2 animate-pulse" /></div>;
    const { user, stats } = data;
    const go = (t) => setParams({ tab: t });

    const checklist = [
        ['Profile photo', !!user.avatar], ['City', !!user.city], ['About you', (user.bio || '').length >= 20],
        ['Events you organise', (user.interests || []).length > 0], ['An event plan', stats.plans > 0], ['Follow a vendor', stats.following > 0],
    ];
    const done = checklist.filter((c) => c[1]).length;

    return (
        <div className="min-h-screen bg-bg text-fg pb-16">
            <ProfileHeader user={user} actions={(
                <>
                    <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5"><Pencil size={15} aria-hidden="true" />Edit profile</button>
                    <Link to="/planner" className="inline-flex items-center gap-1.5 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5"><Sparkles size={15} aria-hidden="true" />Plan an event</Link>
                </>
            )} />

            <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6 mt-6">
                {done < checklist.length && (
                    <section className="bg-surface border border-border rounded-3xl p-5 space-y-3" aria-labelledby="strength-h">
                        <div className="flex items-center justify-between">
                            <h2 id="strength-h" className="text-sm font-black text-fg">Profile {Math.round((done / checklist.length) * 100)}% complete</h2>
                            <span className="text-xs text-muted">Vendors see your photo, city and history when you send an offer</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-success rounded-full" style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
                        <ul className="flex flex-wrap gap-2">
                            {checklist.map(([label, ok]) => (
                                <li key={label}>
                                    <button onClick={() => (label === 'An event plan' ? navigate('/planner') : label === 'Follow a vendor' ? navigate('/vendors') : setEditing(true))}
                                        className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border ${ok ? 'border-success/30 text-success bg-success/10' : 'border-border text-fg hover:border-brand/50'}`}>
                                        {ok ? <CheckCircle2 size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}{label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatButton icon={CalendarDays} value={stats.bookings} label="All bookings" onClick={() => navigate('/bookings')} />
                    <StatButton icon={MessageSquare} value={stats.active} label="In negotiation" tone="warning" onClick={() => navigate('/bookings?status=negotiating')} />
                    <StatButton icon={CheckCircle2} value={stats.confirmed} label="Upcoming" tone="success" active={tab === 'upcoming'} onClick={() => go('upcoming')} />
                    <StatButton icon={Banknote} value={formatCurrency(stats.spent)} label="Committed" tone="success" active={tab === 'spending'} onClick={() => go('spending')} />
                    <StatButton icon={CalendarCheck} value={stats.plans} label="Event plans" active={tab === 'plans'} onClick={() => go('plans')} />
                    <StatButton icon={Heart} value={stats.following} label="Following" active={tab === 'following'} onClick={() => go('following')} />
                    <StatButton icon={Star} value={stats.reviews} label="Reviews written" active={tab === 'reviews'} onClick={() => go('reviews')} />
                    <StatButton icon={Ticket} value={stats.tickets} label="Tickets" onClick={() => navigate('/tickets')} />
                </div>

                <div className="border-b border-border" role="tablist" aria-label="Profile sections">
                    <div className="flex gap-1 overflow-x-auto">
                        {TABS.map(([k, l]) => (
                            <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k)}
                                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${tab === k ? 'border-brand text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{l}</button>
                        ))}
                    </div>
                </div>

                <div role="tabpanel">
                    {tab === 'upcoming' && (data.upcoming.length ? (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.upcoming.map((u) => (
                                <li key={u._id}>
                                    <Link to={`/negotiate/${u._id}`} className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-3 hover:border-brand/50 hover:shadow-card transition-all">
                                        {u.image ? <img src={u.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" /> : <span className="w-16 h-16 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><CalendarDays size={22} aria-hidden="true" /></span>}
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-fg truncate">{u.title}</span>
                                            <span className="block text-[11px] text-muted">{formatDate(u.date)} · {u.vendor}</span>
                                            {u.location && <span className="block text-[11px] text-muted truncate"><MapPin size={10} className="inline mr-1" aria-hidden="true" />{u.location}</span>}
                                        </span>
                                        <span className="text-sm font-black text-success shrink-0">{formatCurrency(u.price)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="No confirmed events coming up." action={['Browse events', '/events']} />)}

                    {tab === 'plans' && (data.plans.length ? (
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.plans.map((p) => (
                                <li key={p._id}>
                                    <Link to={`/planner?plan=${p._id}`} className="block bg-surface border border-border rounded-2xl p-4 hover:border-brand/50 hover:shadow-card transition-all space-y-2">
                                        <span className="flex justify-between gap-2"><span className="text-sm font-bold text-fg">{p.title}</span><span className="text-[11px] text-muted">{formatDateRange(p.date, p.endDate)}</span></span>
                                        <span className="block h-2 rounded-full bg-surface-2 overflow-hidden"><span className="block h-full bg-success rounded-full" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} /></span>
                                        <span className="block text-[11px] text-muted">{p.done} of {p.total} tasks done</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="No event plans yet." action={['Start a plan', '/planner']} />)}

                    {tab === 'following' && (data.following.length ? (
                        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data.following.map((v) => (
                                <li key={v.userId} className="bg-surface border border-border rounded-2xl p-4 flex gap-3">
                                    <Link to={`/vendor/${v.userId}`} className="w-14 h-14 rounded-xl bg-brand/10 text-brand font-black flex items-center justify-center shrink-0 overflow-hidden">
                                        {v.image ? <img src={v.image} alt="" className="w-full h-full object-cover" /> : v.businessName.charAt(0)}
                                    </Link>
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <Link to={`/vendor/${v.userId}`} className="block text-sm font-bold text-fg truncate hover:text-brand">{v.businessName}</Link>
                                        <p className="text-[11px] text-muted truncate">{FIELD[v.category] || v.category} · {v.location}</p>
                                        <StarRating value={v.rating} size={11} showValue count={v.reviewsCount} />
                                    </div>
                                    <button onClick={() => unfollow(v.userId)} className="self-start text-[11px] font-bold text-muted hover:text-danger">Unfollow</button>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="You are not following any vendors yet." action={['Find vendors', '/vendors']} />)}

                    {tab === 'reviews' && (data.reviews.length ? (
                        <ul className="space-y-3">
                            {data.reviews.map((r) => (
                                <li key={r._id} className="bg-surface border border-border rounded-2xl p-4 space-y-1.5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-bold text-fg">
                                            {r.vendor ? <Link to={`/vendor/${r.vendor._id}#reviews`} className="hover:text-brand">{r.vendor.name}</Link> : 'Vendor'}
                                            {r.event && <span className="text-muted font-normal"> · {r.event.title}</span>}
                                        </p>
                                        <StarRating value={r.rating} size={13} />
                                    </div>
                                    <p className="text-sm text-fg/80">{r.comment}</p>
                                    <p className="text-[10px] text-muted">{formatDate(r.createdAt)}</p>
                                </li>
                            ))}
                        </ul>
                    ) : <Empty text="You have not reviewed anyone yet. Reviews open after a confirmed booking." action={['My bookings', '/bookings?status=completed']} />)}

                    {tab === 'spending' && (data.spending.length ? (
                        <div className="bg-surface border border-border rounded-3xl overflow-hidden">
                            <table className="w-full text-sm">
                                <caption className="sr-only">Confirmed and completed bookings</caption>
                                <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
                                    <tr><th className="text-left p-3">Booking</th><th className="text-left p-3 hidden sm:table-cell">Date</th><th className="text-left p-3 hidden md:table-cell">Payment</th><th className="text-right p-3">Amount</th></tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {data.spending.map((s) => (
                                        <tr key={s._id} className="hover:bg-surface-2 cursor-pointer" onClick={() => navigate(`/negotiate/${s._id}`)}>
                                            <td className="p-3"><span className="font-bold text-fg">{s.title}</span><span className="block text-[11px] text-muted">{s.vendor}</span></td>
                                            <td className="p-3 hidden sm:table-cell text-muted">{formatDate(s.date)}</td>
                                            <td className="p-3 hidden md:table-cell text-muted">{s.escrow === 'released' ? 'Released to vendor' : s.escrow === 'held' ? 'Held in escrow' : s.escrow === 'refunded' ? 'Refunded' : s.status}</td>
                                            <td className="p-3 text-right font-black text-success">{formatCurrency(s.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr className="bg-surface-2"><td className="p-3 font-black text-fg" colSpan={3}>Total committed</td><td className="p-3 text-right font-black text-fg">{formatCurrency(stats.spent)}</td></tr></tfoot>
                            </table>
                        </div>
                    ) : <Empty text="Nothing booked yet." action={['Browse events', '/events']} />)}
                </div>
            </div>

            {editing && <EditProfile user={user} onClose={() => setEditing(false)} onSaved={(d) => { setData(d); setEditing(false); }} />}
        </div>
    );
}

function Empty({ text, action }) {
    return (
        <div className="bg-surface border border-dashed border-border rounded-3xl p-10 text-center space-y-3">
            <p className="text-sm text-muted">{text}</p>
            {action && <Link to={action[1]} className="inline-block bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2">{action[0]}</Link>}
        </div>
    );
}
