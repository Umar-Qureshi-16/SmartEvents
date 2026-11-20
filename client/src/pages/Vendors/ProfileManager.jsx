import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import {
    CalendarDays, Check, CheckCircle2, Circle, ExternalLink, Image as ImageIcon, Package, Plus, ShieldCheck, Star, Trash2, Users,
} from 'lucide-react';
import axios from '../../api/axios';
import VendorReviews from '../../components/reviews/VendorReviews';
import { FollowersList, DeliveredList, TrustBreakdown } from '../../components/vendor/ProfileDetails';
import { formatCurrency, formatDateRange } from '../../components/ui';

const CATEGORIES = [
    ['venue', 'Venue & hall'], ['catering', 'Catering'], ['decoration', 'Decoration & design'],
    ['photography', 'Photography & film'], ['music', 'Music & sound'], ['makeup', 'Makeup artist'],
];
const SECTIONS = [
    ['details', 'Details'], ['gallery', 'Gallery'], ['packages', 'Packages'], ['events', 'Events'],
    ['followers', 'Followers'], ['delivered', 'Delivered'], ['reviews', 'Reviews'], ['trust', 'Trust score'],
];
const isUrl = (u) => /^https?:\/\/\S+$/i.test(u);
const field = 'w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-muted';

function Stat({ icon: Icon, value, label, active, onClick }) {
    return (
        <button type="button" onClick={onClick} aria-pressed={active}
            className={`bg-surface border rounded-2xl px-4 py-3 flex items-center gap-3 min-w-0 text-left transition-all ${active ? 'border-brand shadow-card' : 'border-border hover:border-brand/50'}`}>
            <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Icon size={17} aria-hidden="true" /></span>
            <span className="min-w-0">
                <span className="block text-lg font-black text-fg leading-tight">{value}</span>
                <span className="block text-[11px] text-muted font-semibold truncate">{label}</span>
            </span>
        </button>
    );
}

export default function ProfileManager() {
    const me = useSelector((state) => state.auth.user);
    const myId = String(me?._id || me?.id || '');
    const [params, setParams] = useSearchParams();
    const section = params.get('section') || 'details';
    const go = (s) => setParams({ section: s });

    const [form, setForm] = useState(null);
    const [saved, setSaved] = useState(null);
    const [pub, setPub] = useState(null); // the public profile, for stats, events and packages
    const [saving, setSaving] = useState(false);
    const [newImage, setNewImage] = useState('');

    const loadPublic = useCallback(() => {
        if (!myId) return;
        axios.get(`/vendor/profile/${myId}`).then((res) => setPub(res.data)).catch(() => setPub(null));
    }, [myId]);

    useEffect(() => {
        axios.get('/vendor/profile').then((res) => {
            const p = res.data || {};
            const f = {
                businessName: p.businessName || me?.name || '',
                category: p.category || 'catering',
                location: p.location && p.location !== 'Not specified yet' ? p.location : '',
                tagline: p.tagline || '',
                description: p.description || '',
                coverImage: p.coverImage || '',
                portfolioImages: p.portfolioImages || [],
            };
            setForm(f); setSaved(f);
        }).catch(() => toast.error('Could not load your profile.'));
        loadPublic();
    }, [loadPublic, me?.name]);

    const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

    const save = async (next = form) => {
        if (!next.businessName.trim() || next.location.trim().length < 2) {
            toast.error('Add your business name and city first.');
            go('details');
            return;
        }
        setSaving(true);
        try {
            await axios.post('/vendor/profile', { ...next, coverImage: next.coverImage.trim() });
            setSaved(next); setForm(next);
            toast.success('Profile saved. Customers see it straight away.');
            loadPublic();
        } catch (err) {
            toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    const addImage = () => {
        const url = newImage.trim();
        if (!isUrl(url)) { toast.error('Paste a full image link starting with https://'); return; }
        if (form.portfolioImages.includes(url)) { toast.error('That photo is already in your gallery.'); return; }
        const next = { ...form, portfolioImages: [...form.portfolioImages, url] };
        setNewImage('');
        save(next);
    };
    const removeImage = (url) => save({ ...form, portfolioImages: form.portfolioImages.filter((u) => u !== url) });

    if (!form) return <div className="min-h-screen bg-bg p-6 max-w-6xl mx-auto"><div className="h-64 rounded-3xl bg-surface-2 animate-pulse" /></div>;

    const profile = pub?.profile;
    const stats = profile?.stats || {};
    const services = pub?.services || [];
    const events = pub?.events || [];
    const derivedPhotos = (profile?.gallery || []).filter((u) => !form.portfolioImages.includes(u));

    const checklist = [
        ['City', form.location.trim().length >= 2, 'details'],
        ['Tagline', !!form.tagline.trim(), 'details'],
        ['Description (40+ characters)', form.description.trim().length >= 40, 'details'],
        ['Cover photo', !!form.coverImage.trim() || (profile?.gallery || []).length > 0, 'details'],
        ['3 or more gallery photos', (profile?.gallery || []).length >= 3, 'gallery'],
        ['At least one package', services.length > 0, 'packages'],
        ['At least one event', events.length > 0, 'events'],
    ];
    const done = checklist.filter((c) => c[1]).length;
    const pct = Math.round((done / checklist.length) * 100);

    return (
        <div className="min-h-screen bg-bg text-fg p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-16">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-black text-fg">My public profile</h1>
                    <p className="text-sm text-muted">Everything customers see when they open your vendor page. Click any number to manage it.</p>
                </div>
                <div className="flex gap-2">
                    {myId && <Link to={`/vendor/${myId}`} className="inline-flex items-center gap-1.5 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5"><ExternalLink size={15} aria-hidden="true" />View as customer</Link>}
                    {dirty && <button onClick={() => save()} disabled={saving} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5 disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>}
                </div>
            </header>

            {/* Completeness */}
            <section className="bg-surface border border-border rounded-3xl p-5 space-y-3" aria-labelledby="complete-h">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="complete-h" className="text-sm font-black text-fg">Profile strength: {pct}%</h2>
                    <span className="text-xs text-muted">{done} of {checklist.length} done</span>
                </div>
                <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden"><div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                <ul className="flex flex-wrap gap-2">
                    {checklist.map(([label, ok, target]) => (
                        <li key={label}>
                            <button onClick={() => go(target)} className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border ${ok ? 'border-success/30 text-success bg-success/10' : 'border-border text-fg hover:border-brand/50'}`}>
                                {ok ? <CheckCircle2 size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />}{label}
                            </button>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Same numbers as the public page, each opening its section */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat icon={Users} value={stats.followers ?? 0} label="Followers" active={section === 'followers'} onClick={() => go('followers')} />
                <Stat icon={CalendarDays} value={stats.events ?? 0} label="Events offered" active={section === 'events'} onClick={() => go('events')} />
                <Stat icon={Package} value={stats.packages ?? 0} label="Packages" active={section === 'packages'} onClick={() => go('packages')} />
                <Stat icon={Check} value={stats.completedBookings ?? 0} label="Delivered" active={section === 'delivered'} onClick={() => go('delivered')} />
                <Stat icon={Star} value={profile?.reviewsCount ? profile.rating.toFixed(1) : 'New'} label={`${profile?.reviewsCount || 0} reviews`} active={section === 'reviews'} onClick={() => go('reviews')} />
                <Stat icon={ShieldCheck} value={`${profile?.trustScore ?? 70}%`} label="Trust score" active={section === 'trust'} onClick={() => go('trust')} />
            </div>

            <div className="border-b border-border" role="tablist" aria-label="Profile sections">
                <div className="flex gap-1 overflow-x-auto">
                    {SECTIONS.map(([key, label]) => (
                        <button key={key} role="tab" aria-selected={section === key} onClick={() => go(key)}
                            className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px ${section === key ? 'border-brand text-fg' : 'border-transparent text-muted hover:text-fg'}`}>{label}</button>
                    ))}
                </div>
            </div>

            <div role="tabpanel" className="bg-surface border border-border rounded-3xl p-5 md:p-6">
                {section === 'details' && (
                    <form onSubmit={(e) => { e.preventDefault(); save(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="pm-name" className="text-xs font-bold text-fg block mb-1">Business name</label>
                            <input id="pm-name" required value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className={field} />
                        </div>
                        <div>
                            <label htmlFor="pm-cat" className="text-xs font-bold text-fg block mb-1">Main field</label>
                            <select id="pm-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={field}>
                                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="pm-city" className="text-xs font-bold text-fg block mb-1">City / area</label>
                            <input id="pm-city" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Gulberg III, Lahore" className={field} />
                        </div>
                        <div>
                            <label htmlFor="pm-tag" className="text-xs font-bold text-fg block mb-1">Tagline <span className="text-muted font-normal">({form.tagline.length}/140)</span></label>
                            <input id="pm-tag" maxLength={140} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="e.g. Desi and continental menus for 50 to 800 guests" className={field} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="pm-desc" className="text-xs font-bold text-fg block mb-1">About your business</label>
                            <textarea id="pm-desc" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="What you do, your experience, what is included, the areas you cover…" className={field} />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label htmlFor="pm-cover" className="text-xs font-bold text-fg block">Cover photo link</label>
                            <input id="pm-cover" type="url" value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} placeholder="https://… a wide photo for the top of your page" className={field} />
                            {isUrl(form.coverImage)
                                ? <img src={form.coverImage} alt="Cover preview" className="h-40 w-full object-cover rounded-2xl border border-border" />
                                : <p className="text-[11px] text-muted">Empty: your first gallery or event photo is used.</p>}
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button type="submit" disabled={saving || !dirty} className="bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-5 py-2.5 disabled:opacity-50">{saving ? 'Saving…' : dirty ? 'Save details' : 'Saved'}</button>
                        </div>
                    </form>
                )}

                {section === 'gallery' && (
                    <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <label htmlFor="pm-img" className="sr-only">Photo link</label>
                            <input id="pm-img" type="url" value={newImage} onChange={(e) => setNewImage(e.target.value)} placeholder="Paste a photo link (https://…) of your past work" className={field} />
                            <button onClick={addImage} disabled={saving} className="inline-flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5 shrink-0 disabled:opacity-50"><Plus size={15} aria-hidden="true" />Add photo</button>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-fg mb-2">Your portfolio ({form.portfolioImages.length})</h3>
                            {form.portfolioImages.length === 0
                                ? <p className="text-sm text-muted">No portfolio photos yet. The first one also becomes your logo.</p>
                                : (
                                    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {form.portfolioImages.map((u, i) => (
                                            <li key={u} className="relative group aspect-square rounded-2xl overflow-hidden border border-border">
                                                <img src={u} alt={`Portfolio photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                                {i === 0 && <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold rounded-full px-2 py-0.5">Logo</span>}
                                                <button onClick={() => removeImage(u)} aria-label={`Remove photo ${i + 1}`} className="absolute top-2 right-2 bg-black/60 hover:bg-danger text-white rounded-full p-1.5"><Trash2 size={13} /></button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </div>
                        {derivedPhotos.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-fg mb-1">From your events and packages ({derivedPhotos.length})</h3>
                                <p className="text-xs text-muted mb-2">Shown in your gallery automatically. Change them on the event or package.</p>
                                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                    {derivedPhotos.map((u) => <li key={u} className="aspect-square rounded-xl overflow-hidden border border-border"><img src={u} alt="" className="w-full h-full object-cover" loading="lazy" /></li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {section === 'packages' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-muted">Packages appear on your profile and under the matching task in customers' event planners.</p>
                            <Link to="/services" className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5 shrink-0"><Plus size={15} aria-hidden="true" />Add or edit</Link>
                        </div>
                        {services.length === 0 ? <p className="text-sm text-muted">No packages yet.</p> : (
                            <ul className="divide-y divide-border">
                                {services.map((s) => (
                                    <li key={s._id} className="py-3 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-fg truncate">{s.title}</p>
                                            <p className="text-[11px] text-muted">{(CATEGORIES.find(([v]) => v === (s.category || form.category)) || [])[1]} · {s.eventType}</p>
                                        </div>
                                        <span className="text-sm font-black text-success shrink-0">{formatCurrency(s.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {section === 'events' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-muted">Events you publish show on your profile with their photos.</p>
                            <Link to="/my-events" className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5 shrink-0"><Plus size={15} aria-hidden="true" />Add or edit</Link>
                        </div>
                        {events.length === 0 ? <p className="text-sm text-muted">No events yet.</p> : (
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {events.map((ev) => (
                                    <li key={ev._id} className="flex items-center gap-3 bg-surface-2 border border-border rounded-2xl p-3">
                                        {ev.image ? <img src={ev.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" loading="lazy" /> : <span className="w-16 h-16 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><ImageIcon size={20} aria-hidden="true" /></span>}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-fg truncate">{ev.title}</p>
                                            <p className="text-[11px] text-muted">{formatDateRange(ev.date, ev.endDate)} · {ev.location || 'No location'}</p>
                                        </div>
                                        <span className="text-sm font-black text-success shrink-0">{formatCurrency(ev.price)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {section === 'followers' && myId && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted">Organizers who follow you. They keep you in their Favourites to book later.</p>
                        <FollowersList vendorId={myId} emptyText="No followers yet. Share your profile link with past customers." />
                    </div>
                )}
                {section === 'delivered' && myId && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted">Bookings marked complete. Each one raises your trust score.</p>
                        <DeliveredList vendorId={myId} emptyText="Nothing delivered yet. Completed bookings appear here." />
                    </div>
                )}
                {section === 'reviews' && myId && <VendorReviews vendorId={myId} />}
                {section === 'trust' && myId && <TrustBreakdown vendorId={myId} forOwner />}
            </div>
        </div>
    );
}
