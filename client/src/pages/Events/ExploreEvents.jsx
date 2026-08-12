import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Search, Calendar, MapPin, Users, ArrowRight, SlidersHorizontal,
    CalendarX, ChevronLeft, ChevronRight
} from 'lucide-react';

import axios from '../../api/axios';
import {
    Button, Card, Badge, Input, Textarea, Modal, SkeletonList, EmptyState, ErrorState,
    formatCurrency, formatDate
} from '../../components/ui';

// Must match the Event schema enum — the previous list used invented labels
// ("Corporate Conferences", "Music Festivals") that no record could ever match.
const CATEGORIES = ['All', 'Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference', 'Exhibition'];

const SORTS = [
    { value: '', label: 'Newest first' },
    { value: 'date', label: 'Event date' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
];

const PLACEHOLDER = 'https://placehold.co/800x450/1e2130/94a3b8?text=SmartEvents';

export default function ExploreEvents({ user }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [events, setEvents] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Filters are mirrored into the URL so a filtered view can be shared.
    const category = searchParams.get('category') || 'All';
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const minPrice = searchParams.get('minPrice') || '';
    const maxPrice = searchParams.get('maxPrice') || '';
    const sortBy = searchParams.get('sortBy') || '';
    const page = Number(searchParams.get('page') || 1);

    const [searchInput, setSearchInput] = useState(search);

    // Offer dialog — this is the platform's core action, so it lives on the
    // listing rather than making the user click through first.
    const [offerTarget, setOfferTarget] = useState(null);
    const [offerPrice, setOfferPrice] = useState('');
    const [offerNote, setOfferNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const setParam = useCallback((updates) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([k, v]) => {
            if (v === '' || v == null || v === 'All') next.delete(k);
            else next.set(k, String(v));
        });
        // Any filter change resets pagination.
        if (!('page' in updates)) next.delete('page');
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { page, limit: 12 };
            if (category !== 'All') params.category = category;
            if (search) params.search = search;
            if (location) params.location = location;
            if (minPrice) params.minPrice = minPrice;
            if (maxPrice) params.maxPrice = maxPrice;
            if (sortBy) params.sortBy = sortBy;

            const res = await axios.get('/events', { params });
            setEvents(res.data.events || []);
            setMeta(res.data.meta || { total: 0, page: 1, totalPages: 1 });
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load events.');
        } finally {
            setLoading(false);
        }
    }, [category, search, location, minPrice, maxPrice, sortBy, page]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    // Debounce the search box so typing does not fire a request per keystroke.
    useEffect(() => {
        const id = setTimeout(() => {
            if (searchInput !== search) setParam({ search: searchInput });
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput, search, setParam]);

    const openOffer = (event) => {
        if (!user) {
            toast.error('Please sign in to make an offer.');
            navigate('/login');
            return;
        }
        if (user.role !== 'customer') {
            toast.error('Only customers can make offers.');
            return;
        }
        setOfferTarget(event);
        // Seed slightly below asking — the whole point is to negotiate.
        setOfferPrice(String(Math.round((event.price || 0) * 0.9)));
        setOfferNote('');
    };

    const submitOffer = async () => {
        const price = Number(offerPrice);
        if (!price || price <= 0) {
            toast.error('Enter an offer greater than zero.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await axios.post('/bookings', {
                eventId: offerTarget._id,
                offerPrice: price,
                message: offerNote.trim() || `Offer of ${formatCurrency(price)} for ${offerTarget.title}`,
            });
            toast.success('Offer sent. The provider will respond shortly.');
            setOfferTarget(null);
            navigate(`/negotiate/${res.data.data._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not send your offer.');
        } finally {
            setSubmitting(false);
        }
    };

    const activeFilterCount = useMemo(
        () => [location, minPrice, maxPrice, sortBy].filter(Boolean).length,
        [location, minPrice, maxPrice, sortBy]
    );

    return (
        <div className="min-h-screen bg-bg text-fg p-6 max-w-[1280px] mx-auto space-y-8">
            <header className="space-y-3">
                <Badge tone="brand">Event marketplace</Badge>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                    {category === 'All' ? 'Explore events' : `${category} events`}
                </h1>
                <p className="text-sm text-muted max-w-2xl">
                    Find an event, then offer the price that works for you. Providers can accept
                    your offer or counter it, and you negotiate from there.
                </p>
            </header>

            <Card className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} aria-hidden="true" />
                        <label htmlFor="event-search" className="sr-only">Search events</label>
                        <input
                            id="event-search"
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by title, description or venue…"
                            className="w-full bg-surface-2 border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted outline-none focus:border-brand"
                        />
                    </div>

                    <Button
                        variant={showFilters ? 'primary' : 'secondary'}
                        icon={SlidersHorizontal}
                        onClick={() => setShowFilters(v => !v)}
                        aria-expanded={showFilters}
                    >
                        Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setParam({ category: cat })}
                            aria-pressed={category === cat}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                category === cat
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-surface-2 text-muted hover:text-fg border-border'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-border">
                        <Input
                            label="Location"
                            defaultValue={location}
                            placeholder="e.g. Lahore"
                            onBlur={(e) => setParam({ location: e.target.value })}
                        />
                        <Input
                            label="Min price"
                            type="number"
                            min="0"
                            defaultValue={minPrice}
                            onBlur={(e) => setParam({ minPrice: e.target.value })}
                        />
                        <Input
                            label="Max price"
                            type="number"
                            min="0"
                            defaultValue={maxPrice}
                            onBlur={(e) => setParam({ maxPrice: e.target.value })}
                        />
                        <div className="space-y-1.5">
                            <label htmlFor="sort" className="block text-xs font-bold text-fg">Sort by</label>
                            <select
                                id="sort"
                                value={sortBy}
                                onChange={(e) => setParam({ sortBy: e.target.value })}
                                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-brand"
                            >
                                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        {activeFilterCount > 0 && (
                            <div className="sm:col-span-2 lg:col-span-4">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSearchParams(category !== 'All' ? { category } : {})}
                                >
                                    Clear filters
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            {!loading && !error && (
                <p className="text-xs text-muted" aria-live="polite">
                    {meta.total} event{meta.total === 1 ? '' : 's'} found
                </p>
            )}

            {loading ? (
                <SkeletonList count={4} height="h-80" />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchEvents} />
            ) : events.length === 0 ? (
                <EmptyState
                    icon={CalendarX}
                    title="No events match your search"
                    description="Try a different category, widen your price range, or clear the filters."
                    action={{ label: 'Clear filters', onClick: () => setSearchParams({}) }}
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {events.map(event => (
                            <Card key={event._id} className="overflow-hidden flex flex-col hover:border-brand/40 transition-colors">
                                <Link to={`/events/${event._id}`} className="relative h-48 overflow-hidden block bg-surface-2">
                                    <img
                                        src={event.image ? `${axios.defaults.baseURL.replace('/api/v1', '')}${event.image}` : PLACEHOLDER}
                                        alt={event.title}
                                        loading="lazy"
                                        onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
                                        className="w-full h-full object-cover"
                                    />
                                    <span className="absolute top-3 left-3">
                                        <Badge tone="brand" className="!bg-surface !text-fg shadow-md">{event.category}</Badge>
                                    </span>
                                </Link>

                                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <Link to={`/events/${event._id}`}>
                                            <h2 className="text-lg font-bold leading-snug hover:text-brand transition-colors line-clamp-2">
                                                {event.title}
                                            </h2>
                                        </Link>
                                        <div className="flex flex-wrap gap-3 text-xs font-medium text-muted">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={13} className="text-brand" aria-hidden="true" />
                                                {formatDate(event.date)}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <MapPin size={13} className="text-brand" aria-hidden="true" />
                                                {event.location}
                                            </span>
                                            {event.capacity > 0 && (
                                                <span className="flex items-center gap-1.5">
                                                    <Users size={13} className="text-brand" aria-hidden="true" />
                                                    {event.capacity}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-border flex items-end justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-mono text-muted block uppercase font-bold">
                                                Asking price
                                            </span>
                                            <span className="text-lg font-black text-success">
                                                {formatCurrency(event.price)}
                                            </span>
                                        </div>

                                        {user?.role === 'customer' ? (
                                            <Button size="sm" onClick={() => openOffer(event)}>
                                                Make an offer
                                            </Button>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => navigate(`/events/${event._id}`)}>
                                                View <ArrowRight size={12} />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {meta.totalPages > 1 && (
                        <nav className="flex items-center justify-center gap-3 pt-4" aria-label="Pagination">
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={ChevronLeft}
                                disabled={page <= 1}
                                onClick={() => setParam({ page: page - 1 })}
                            >
                                Previous
                            </Button>
                            <span className="text-xs font-bold text-muted">
                                Page {meta.page} of {meta.totalPages}
                            </span>
                            <Button
                                size="sm"
                                variant="secondary"
                                disabled={page >= meta.totalPages}
                                onClick={() => setParam({ page: page + 1 })}
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </nav>
                    )}
                </>
            )}

            <Modal
                open={Boolean(offerTarget)}
                onClose={() => setOfferTarget(null)}
                title="Make an offer"
                description={offerTarget ? `${offerTarget.title} · asking ${formatCurrency(offerTarget.price)}` : ''}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOfferTarget(null)}>Cancel</Button>
                        <Button loading={submitting} onClick={submitOffer}>Send offer</Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted">
                        Offer what the event is worth to you. The provider can accept it, decline,
                        or counter — and you can keep negotiating from there.
                    </p>
                    <Input
                        label="Your offer"
                        type="number"
                        min="1"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        hint={
                            offerTarget && Number(offerPrice) > 0
                                ? `${Math.round((1 - Number(offerPrice) / offerTarget.price) * 100)}% below the asking price`
                                : 'Enter an amount greater than zero'
                        }
                    />
                    <Textarea
                        label="Note to the provider (optional)"
                        value={offerNote}
                        onChange={(e) => setOfferNote(e.target.value)}
                        placeholder="Explain your budget, ask about a weekday rate, or mention what matters most to you."
                        maxLength={500}
                    />
                </div>
            </Modal>
        </div>
    );
}
