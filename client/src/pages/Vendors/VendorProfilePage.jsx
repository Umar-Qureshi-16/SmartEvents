import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowRight, BadgeCheck, CalendarDays, Camera, Check, ChevronLeft, ChevronRight, Heart, Images, MapPin,
    MessageSquare, Package, Pencil, Plus, Share2, ShieldCheck, Sparkles, Star, Users, X,
} from 'lucide-react';
import axios from '../../api/axios';
import VendorReviews from '../../components/reviews/VendorReviews';
import StarRating from '../../components/reviews/StarRating';
import { formatCurrency } from '../../components/ui';
import { DetailModal } from '../../components/vendor/ProfileDetails';

const FIELD = {
    venue: 'Venue & hall', catering: 'Catering', decoration: 'Decoration & design',
    photography: 'Photography & film', music: 'Music & sound', makeup: 'Makeup artist',
};

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'V';

function Stat({ icon: Icon, value, label, onClick }) {
    return (
        <button type="button" onClick={onClick} title={`Open ${label.toLowerCase()}`}
            className="bg-surface border border-border rounded-2xl px-4 py-3 flex items-center gap-3 min-w-0 text-left hover:border-brand/50 hover:shadow-card transition-all">
            <span className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0"><Icon size={17} aria-hidden="true" /></span>
            <div className="min-w-0">
                <p className="text-lg font-black text-fg leading-tight truncate">{value}</p>
                <p className="text-[11px] text-muted font-semibold truncate">{label}</p>
            </div>
        </button>
    );
}

function PackageCard({ pkg, onBook }) {
    return (
        <article className="bg-surface border border-border rounded-3xl overflow-hidden flex flex-col hover:border-brand/50 hover:shadow-card transition-all">
            {pkg.images?.[0] && <img src={pkg.images[0]} alt="" className="h-36 w-full object-cover" loading="lazy" />}
            <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold text-fg leading-snug">{pkg.title}</h3>
                    {pkg.category && <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 rounded-full px-2 py-0.5 shrink-0">{FIELD[pkg.category]?.split(' ')[0] || pkg.category}</span>}
                </div>
                <p className="text-sm text-muted leading-relaxed flex-1">{pkg.description}</p>
                <div className="flex items-end justify-between gap-3 pt-3 border-t border-border">
                    <div>
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider">From</p>
                        <p className="text-xl font-black text-success">{formatCurrency(pkg.price)}</p>
                    </div>
                    <button onClick={() => onBook(pkg)} className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-xl px-4 py-2.5">
                        Book &amp; negotiate <ArrowRight size={13} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </article>
    );
}

function EventCard({ ev }) {
    const d = new Date(ev.date);
    const past = d.getTime() < new Date().setHours(0, 0, 0, 0);
    return (
        <Link to={`/events/${ev._id}`} className="group bg-surface border border-border rounded-3xl overflow-hidden flex flex-col hover:border-brand/50 hover:shadow-card transition-all">
            <div className="relative h-40 bg-surface-2">
                {ev.image
                    ? <img src={ev.image} alt="" className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                    : <div className="h-full w-full flex items-center justify-center text-muted"><CalendarDays size={32} aria-hidden="true" /></div>}
                <span className="absolute top-3 left-3 bg-bg/90 text-fg rounded-xl px-2.5 py-1 text-center leading-tight shadow">
                    <span className="block text-[10px] font-bold uppercase text-brand">{d.toLocaleString('en', { month: 'short' })}</span>
                    <span className="block text-base font-black">{d.getDate()}</span>
                </span>
                {past && <span className="absolute top-3 right-3 bg-bg/90 text-muted text-[10px] font-bold uppercase rounded-full px-2 py-0.5">Past</span>}
            </div>
            <div className="p-4 space-y-1.5 flex-1 flex flex-col">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">{ev.category}</p>
                <h3 className="text-sm font-bold text-fg leading-snug flex-1">{ev.title}</h3>
                <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-muted inline-flex items-center gap-1 truncate"><MapPin size={12} aria-hidden="true" />{ev.location || 'Location on request'}</span>
                    <span className="font-black text-success shrink-0">{formatCurrency(ev.price)}</span>
                </div>
            </div>
        </Link>
    );
}

function Lightbox({ images, index, onClose, onMove }) {
    useEffect(() => {
        const key = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') onMove(1);
            if (e.key === 'ArrowLeft') onMove(-1);
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onClose, onMove]);
    return createPortal(
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Close" onClick={onClose}><X size={28} /></button>
            {images.length > 1 && <button className="absolute left-3 text-white/80 hover:text-white" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); onMove(-1); }}><ChevronLeft size={36} /></button>}
            <img src={images[index]} alt={`Photo ${index + 1} of ${images.length}`} className="max-h-[85vh] max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
            {images.length > 1 && <button className="absolute right-3 text-white/80 hover:text-white" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); onMove(1); }}><ChevronRight size={36} /></button>}
            <p className="absolute bottom-4 text-white/70 text-xs">{index + 1} / {images.length}</p>
        </div>,
        document.body,
    );
}

export default function VendorProfilePage({ user }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(location.hash === '#reviews' ? 'reviews' : 'overview');
    const [following, setFollowing] = useState(false);
    const [followers, setFollowers] = useState(0);
    const [photo, setPhoto] = useState(null);
    const [detail, setDetail] = useState(null); // 'followers' | 'delivered' | 'trust'

    const [modal, setModal] = useState(null); // { service } or { service: null } for a custom quote
    const [offer, setOffer] = useState({ offerPrice: '', date: '', location: '', eventType: 'Wedding', message: '' });
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let live = true;
        setLoading(true);
        axios.get(`/vendor/profile/${id}`)
            .then((res) => {
                if (!live) return;
                setData(res.data);
                setFollowers(res.data.profile?.stats?.followers || 0);
            })
            .catch(() => live && setData(null))
            .finally(() => live && setLoading(false));
        return () => { live = false; };
    }, [id]);

    const profile = data?.profile;
    const vendorUserId = String(profile?.userId?._id || profile?.userId || '');
    const myId = String(user?._id || user?.id || '');
    const isOwner = !!myId && myId === vendorUserId;

    useEffect(() => {
        if (!user || user.role !== 'customer' || !vendorUserId) return;
        axios.get('/auth/favorites')
            .then((res) => setFollowing((res.data.data || []).some((p) => String(p.userId?._id || p.userId) === vendorUserId)))
            .catch(() => {});
    }, [user, vendorUserId]);

    const toggleFollow = async () => {
        if (!user) { toast.error('Sign in to follow vendors.'); navigate('/login'); return; }
        if (user.role !== 'customer') { toast.error('Only organizer accounts can follow vendors.'); return; }
        try {
            if (following) {
                await axios.delete(`/auth/favorites/${vendorUserId}`);
                setFollowing(false); setFollowers((n) => Math.max(0, n - 1));
            } else {
                await axios.post('/auth/favorites', { vendorId: vendorUserId });
                setFollowing(true); setFollowers((n) => n + 1);
                toast.success(`You follow ${profile.businessName}. Find them under Favourites.`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update.');
        }
    };

    const share = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href.split('#')[0]);
            toast.success('Profile link copied.');
        } catch {
            toast.error('Copy the address from the browser bar.');
        }
    };

    const openOffer = (service) => {
        if (!user) { toast.error('Sign in as an organizer to send an offer.'); navigate('/login'); return; }
        if (user.role !== 'customer') { toast.error('Only organizer accounts can book vendors.'); return; }
        setOffer({
            offerPrice: service?.price || '',
            date: '',
            location: profile.location || '',
            eventType: service?.eventType && service.eventType !== 'general' ? service.eventType : 'Wedding',
            message: service ? `Hello! I would like to book "${service.title}".` : 'Hello! Could you quote for my event?',
        });
        setModal({ service: service || null });
    };

    const sendOffer = async (e) => {
        e.preventDefault();
        if (!offer.offerPrice || !offer.date) { toast.error('Add your budget and the event date.'); return; }
        setSending(true);
        try {
            const res = await axios.post('/bookings', {
                vendorId: vendorUserId,
                ...(modal.service ? { serviceId: modal.service._id } : {}),
                offerPrice: Number(offer.offerPrice),
                eventDetails: { eventType: offer.eventType || 'Event', date: offer.date, location: offer.location || profile.location, message: offer.message },
                message: offer.message,
            });
            toast.success('Offer sent. Opening the negotiation…');
            setModal(null);
            navigate(`/negotiate/${res.data.booking?._id || res.data.data?._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send the offer.');
        } finally {
            setSending(false);
        }
    };

    const moveLightbox = useCallback((step) => setPhoto((i) => {
        const n = profile?.gallery?.length || 1;
        return (i + step + n) % n;
    }), [profile?.gallery?.length]);

    const events = useMemo(() => data?.events || [], [data]);
    const services = useMemo(() => data?.services || [], [data]);
    const upcoming = useMemo(() => {
        const today = new Date().setHours(0, 0, 0, 0);
        return events.filter((e) => new Date(e.date).getTime() >= today);
    }, [events]);

    if (loading) {
        return (
            <div className="min-h-screen bg-bg max-w-6xl mx-auto p-6 space-y-4" aria-busy="true">
                <div className="h-56 rounded-3xl bg-surface-2 animate-pulse" />
                <div className="h-24 rounded-3xl bg-surface-2 animate-pulse" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-surface-2 animate-pulse" />)}</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg p-6">
                <div className="text-center space-y-3">
                    <h1 className="text-lg font-bold text-fg">Vendor not found</h1>
                    <Link to="/vendors" className="text-sm font-bold text-brand">Browse all vendors</Link>
                </div>
            </div>
        );
    }

    const { stats = {}, gallery = [] } = profile;
    const cover = profile.coverImage || gallery[0];
    const trust = profile.trustScore ?? profile.userId?.trustScore ?? 70;
    const verified = trust >= 80;
    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'packages', label: 'Packages', count: services.length },
        { key: 'events', label: 'Events', count: events.length },
        { key: 'gallery', label: 'Gallery', count: gallery.length },
        { key: 'reviews', label: 'Reviews', count: profile.reviewsCount },
    ];

    return (
        <div className="min-h-screen bg-bg text-fg pb-16">
            {/* Cover */}
            <div className="relative h-56 md:h-72 max-w-6xl mx-auto md:mt-4 md:rounded-3xl overflow-hidden bg-gradient-to-br from-brand/40 via-brand/10 to-success/30">
                {cover && <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <button onClick={() => navigate(-1)} className="absolute top-4 left-4 inline-flex items-center gap-1 bg-black/40 hover:bg-black/60 text-white text-xs font-bold rounded-full px-3 py-1.5 backdrop-blur">
                    <ChevronLeft size={14} aria-hidden="true" /> Back
                </button>
                {gallery.length > 0 && (
                    <button onClick={() => setTab('gallery')} className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-bold rounded-full px-3 py-1.5 backdrop-blur">
                        <Images size={14} aria-hidden="true" /> {gallery.length} photos
                    </button>
                )}
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6">
                {/* Identity */}
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 -mt-14 md:-mt-16 relative">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-surface border-4 border-bg shadow-card flex items-center justify-center text-3xl font-black text-brand shrink-0 overflow-hidden">
                        {profile.portfolioImages?.[0]
                            ? <img src={profile.portfolioImages[0]} alt="" className="w-full h-full object-cover" />
                            : initials(profile.businessName)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 md:pt-[4.5rem]">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-fg">{profile.businessName}</h1>
                            {verified && <BadgeCheck size={22} className="text-brand" aria-label="Trusted vendor" />}
                        </div>
                        {profile.tagline && <p className="text-sm text-fg/80 font-medium">{profile.tagline}</p>}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted font-semibold">
                            <span className="text-brand bg-brand/10 rounded-full px-2.5 py-0.5 font-bold">{FIELD[profile.category] || profile.category}</span>
                            <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{profile.location}</span>
                            <button onClick={() => setTab('reviews')} className="inline-flex items-center hover:text-fg">
                                <StarRating value={profile.rating} size={13} showValue count={profile.reviewsCount || 0} />
                            </button>
                            {stats.memberSince && <span>On SmartEvents since {new Date(stats.memberSince).getFullYear()}</span>}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 md:pt-[4.5rem]">
                        {isOwner ? (
                            <>
                                <Link to="/my-profile" className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5"><Pencil size={15} aria-hidden="true" />Manage profile</Link>
                                <Link to="/services" className="inline-flex items-center gap-1.5 border border-border text-fg hover:bg-fg/5 text-sm font-bold rounded-xl px-4 py-2.5"><Plus size={15} aria-hidden="true" />Add package</Link>
                            </>
                        ) : (
                            <>
                                <button onClick={toggleFollow} aria-pressed={following}
                                    className={`inline-flex items-center gap-1.5 text-sm font-bold rounded-xl px-4 py-2.5 border ${following ? 'bg-surface-2 border-border text-fg' : 'border-brand text-brand hover:bg-brand/10'}`}>
                                    {following ? <Check size={15} aria-hidden="true" /> : <Heart size={15} aria-hidden="true" />}
                                    {following ? 'Following' : 'Follow'}
                                </button>
                                <button onClick={() => openOffer(null)} disabled={profile.available === false}
                                    className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl px-4 py-2.5 disabled:opacity-50">
                                    <MessageSquare size={15} aria-hidden="true" />Request a quote
                                </button>
                            </>
                        )}
                        <button onClick={share} aria-label="Copy profile link" className="inline-flex items-center justify-center border border-border text-fg hover:bg-fg/5 rounded-xl w-11"><Share2 size={16} /></button>
                    </div>
                </div>

                {profile.available === false && (
                    <p role="status" className="mt-4 text-sm font-semibold text-warning bg-warning/10 border border-warning/20 rounded-2xl px-4 py-3">This vendor is not taking new bookings right now.</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
                    <Stat icon={Users} value={followers} label={followers === 1 ? 'Follower' : 'Followers'} onClick={() => setDetail('followers')} />
                    <Stat icon={CalendarDays} value={stats.events ?? events.length} label="Events offered" onClick={() => setTab('events')} />
                    <Stat icon={Package} value={stats.packages ?? services.length} label="Packages" onClick={() => setTab('packages')} />
                    <Stat icon={Check} value={stats.completedBookings ?? 0} label="Delivered" onClick={() => setDetail('delivered')} />
                    <Stat icon={Star} value={profile.reviewsCount ? profile.rating.toFixed(1) : 'New'} label={profile.reviewsCount === 1 ? '1 review' : `${profile.reviewsCount || 0} reviews`} onClick={() => setTab('reviews')} />
                    <Stat icon={ShieldCheck} value={`${trust}%`} label="Trust score" onClick={() => setDetail('trust')} />
                </div>

                {/* Tabs */}
                <div className="sticky top-20 z-20 bg-bg/95 backdrop-blur mt-6 border-b border-border" role="tablist" aria-label="Vendor profile sections">
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map((t) => (
                            <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                                className={`px-4 py-3 text-sm font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-brand text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
                                {t.label}{t.count != null && <span className="ml-1.5 text-xs text-muted">{t.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6" role="tabpanel">
                    {tab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-8">
                                <section className="space-y-3">
                                    <h2 className="text-lg font-black text-fg">About</h2>
                                    <p className="text-sm text-fg/80 leading-relaxed whitespace-pre-line">
                                        {profile.description || `${profile.businessName} offers ${(FIELD[profile.category] || 'event').toLowerCase()} services in ${profile.location}.`}
                                    </p>
                                </section>

                                {services.length > 0 && (
                                    <section className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-black text-fg">Popular packages</h2>
                                            {services.length > 2 && <button onClick={() => setTab('packages')} className="text-xs font-bold text-brand">See all {services.length}</button>}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {services.slice(0, 2).map((s) => <PackageCard key={s._id} pkg={s} onBook={openOffer} />)}
                                        </div>
                                    </section>
                                )}

                                {events.length > 0 && (
                                    <section className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-black text-fg">{upcoming.length ? 'Upcoming events' : 'Events'}</h2>
                                            {events.length > 3 && <button onClick={() => setTab('events')} className="text-xs font-bold text-brand">See all {events.length}</button>}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {(upcoming.length ? upcoming : events).slice(0, 3).map((ev) => <EventCard key={ev._id} ev={ev} />)}
                                        </div>
                                    </section>
                                )}
                            </div>

                            <aside className="space-y-6">
                                <div className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                                    <h2 className="text-sm font-black text-fg uppercase tracking-wider">Why book them</h2>
                                    <ul className="space-y-2.5 text-sm text-fg/80">
                                        <li className="flex gap-2"><Sparkles size={16} className="text-brand shrink-0 mt-0.5" aria-hidden="true" /><span>{stats.startingPrice != null ? <>Packages from <b className="text-fg">{formatCurrency(stats.startingPrice)}</b>, open to negotiation</> : 'Send an offer at your budget and negotiate'}</span></li>
                                        <li className="flex gap-2"><Star size={16} className="text-amber-500 shrink-0 mt-0.5" aria-hidden="true" /><span>{profile.reviewsCount ? <>Rated <b className="text-fg">{profile.rating.toFixed(1)}/5</b> by {profile.reviewsCount} customer{profile.reviewsCount === 1 ? '' : 's'}</> : 'New on SmartEvents, be among the first to review'}</span></li>
                                        <li className="flex gap-2"><ShieldCheck size={16} className="text-success shrink-0 mt-0.5" aria-hidden="true" /><span>Trust score {trust}%, from completed bookings, ratings and disputes</span></li>
                                        <li className="flex gap-2"><CalendarDays size={16} className="text-brand shrink-0 mt-0.5" aria-hidden="true" /><span>{stats.upcomingEvents || 0} upcoming event{stats.upcomingEvents === 1 ? '' : 's'}, {stats.activeBookings || 0} confirmed booking{stats.activeBookings === 1 ? '' : 's'}</span></li>
                                    </ul>
                                    {!isOwner && (
                                        <button onClick={() => openOffer(null)} disabled={profile.available === false} className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl py-2.5 disabled:opacity-50">Request a quote</button>
                                    )}
                                </div>

                                {gallery.length > 0 && (
                                    <div className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-black text-fg uppercase tracking-wider">Their work</h2>
                                            <button onClick={() => setTab('gallery')} className="text-xs font-bold text-brand">View all</button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {gallery.slice(0, 6).map((src, i) => (
                                                <button key={src} onClick={() => setPhoto(i)} className="aspect-square rounded-xl overflow-hidden" aria-label={`Open photo ${i + 1}`}>
                                                    <img src={src} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </aside>
                        </div>
                    )}

                    {tab === 'packages' && (
                        services.length
                            ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{services.map((s) => <PackageCard key={s._id} pkg={s} onBook={openOffer} />)}</div>
                            : <p className="text-sm text-muted py-10 text-center">No packages listed yet. You can still request a quote.</p>
                    )}

                    {tab === 'events' && (
                        events.length
                            ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{events.map((ev) => <EventCard key={ev._id} ev={ev} />)}</div>
                            : <p className="text-sm text-muted py-10 text-center">No events published yet.</p>
                    )}

                    {tab === 'gallery' && (
                        gallery.length
                            ? (
                                <div className="columns-2 md:columns-3 gap-3 [&>*]:mb-3">
                                    {gallery.map((src, i) => (
                                        <button key={src} onClick={() => setPhoto(i)} className="block w-full rounded-2xl overflow-hidden break-inside-avoid" aria-label={`Open photo ${i + 1}`}>
                                            <img src={src} alt="" className="w-full object-cover hover:opacity-90 transition-opacity" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            )
                            : <p className="text-sm text-muted py-10 text-center inline-flex items-center gap-2 w-full justify-center"><Camera size={16} aria-hidden="true" />No photos yet.</p>
                    )}

                    {tab === 'reviews' && <VendorReviews vendorId={vendorUserId || id} />}
                </div>
            </div>

            {detail && <DetailModal kind={detail} vendorId={vendorUserId} onClose={() => setDetail(null)} />}

            {photo != null && gallery.length > 0 && <Lightbox images={gallery} index={photo} onClose={() => setPhoto(null)} onMove={moveLightbox} />}

            {modal && createPortal(
                <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="offer-title">
                    <form onSubmit={sendOffer} className="max-w-md w-full bg-surface p-6 border border-border rounded-3xl space-y-4 shadow-2xl">
                        <div>
                            <h2 id="offer-title" className="text-lg font-bold text-fg">{modal.service ? 'Book this package' : `Request a quote from ${profile.businessName}`}</h2>
                            {modal.service && <p className="text-xs text-muted">{modal.service.title} · listed at {formatCurrency(modal.service.price)}</p>}
                        </div>
                        <div>
                            <label htmlFor="offer-price" className="text-xs font-bold text-fg block mb-1">Your budget</label>
                            <input id="offer-price" type="number" min="1" required value={offer.offerPrice} onChange={(e) => setOffer({ ...offer, offerPrice: e.target.value })}
                                className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-fg" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="offer-date" className="text-xs font-bold text-fg block mb-1">Event date</label>
                                <input id="offer-date" type="date" required min={new Date().toISOString().slice(0, 10)} value={offer.date} onChange={(e) => setOffer({ ...offer, date: e.target.value })}
                                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg" />
                            </div>
                            <div>
                                <label htmlFor="offer-type" className="text-xs font-bold text-fg block mb-1">Event type</label>
                                <input id="offer-type" required value={offer.eventType} onChange={(e) => setOffer({ ...offer, eventType: e.target.value })}
                                    className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="offer-location" className="text-xs font-bold text-fg block mb-1">Location</label>
                            <input id="offer-location" required value={offer.location} onChange={(e) => setOffer({ ...offer, location: e.target.value })}
                                className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg" />
                        </div>
                        <div>
                            <label htmlFor="offer-note" className="text-xs font-bold text-fg block mb-1">Note to the vendor</label>
                            <textarea id="offer-note" rows="3" maxLength={500} value={offer.message} onChange={(e) => setOffer({ ...offer, message: e.target.value })}
                                className="w-full bg-surface-2 border border-border rounded-xl p-3 text-sm text-fg" />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setModal(null)} className="flex-1 border border-border text-fg hover:bg-fg/5 rounded-xl py-2.5 text-sm font-bold">Cancel</button>
                            <button type="submit" disabled={sending} className="flex-1 bg-brand hover:bg-brand-hover text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">{sending ? 'Sending…' : 'Send offer'}</button>
                        </div>
                    </form>
                </div>,
                document.body,
            )}
        </div>
    );
}
