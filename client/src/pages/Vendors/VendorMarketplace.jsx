import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Search, Star, ShieldCheck, MapPin, Store, Heart, ArrowRight,
    ChevronLeft, ChevronRight, CheckCircle2
} from 'lucide-react';

import axios from '../../api/axios';
import {
    Button, Card, Badge, SkeletonList, EmptyState, ErrorState, formatCurrency
} from '../../components/ui';

// Must match the VendorProfile schema enum — the previous list used invented
// labels ("Stage & Lighting AV") that no record could ever match.
const CATEGORIES = ['All', 'venue', 'catering', 'decoration', 'photography', 'music', 'makeup'];

const LABELS = {
    venue: 'Venues', catering: 'Catering', decoration: 'Decoration',
    photography: 'Photography', music: 'Music & AV', makeup: 'Makeup',
};

const trustTone = (score) => (score >= 80 ? 'success' : score >= 55 ? 'warning' : 'danger');

export default function VendorMarketplace({ user }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [vendors, setVendors] = useState([]);
    const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [favorites, setFavorites] = useState([]);

    const category = searchParams.get('category') || 'All';
    const search = searchParams.get('search') || '';
    const location = searchParams.get('location') || '';
    const page = Number(searchParams.get('page') || 1);

    const [searchInput, setSearchInput] = useState(search);

    const setParam = useCallback((updates) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([k, v]) => {
            if (!v || v === 'All') next.delete(k);
            else next.set(k, String(v));
        });
        if (!('page' in updates)) next.delete('page');
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const fetchVendors = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { page, limit: 12 };
            if (category !== 'All') params.category = category;
            if (search) params.search = search;
            if (location) params.location = location;

            const res = await axios.get('/vendor/list', { params });
            setVendors(res.data.data || []);
            setMeta(res.data.meta || { total: 0, page: 1, totalPages: 1 });
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load the vendor directory.');
        } finally {
            setLoading(false);
        }
    }, [category, search, location, page]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);

    useEffect(() => {
        const id = setTimeout(() => {
            if (searchInput !== search) setParam({ search: searchInput });
        }, 400);
        return () => clearTimeout(id);
    }, [searchInput, search, setParam]);

    // Wishlist state, so the heart reflects reality rather than local guesswork.
    useEffect(() => {
        if (!user) return;
        axios.get('/auth/favorites')
            .then(res => setFavorites((res.data.data || []).map(p => p.userId?._id || p.userId)))
            .catch(() => { /* non-critical */ });
    }, [user]);

    const toggleFavorite = async (vendorUserId) => {
        if (!user) {
            toast.error('Please sign in to save providers.');
            return;
        }
        const isFav = favorites.includes(vendorUserId);
        setFavorites(prev => isFav ? prev.filter(id => id !== vendorUserId) : [...prev, vendorUserId]);
        try {
            if (isFav) await axios.delete(`/auth/favorites/${vendorUserId}`);
            else await axios.post('/auth/favorites', { vendorId: vendorUserId });
        } catch {
            setFavorites(prev => isFav ? [...prev, vendorUserId] : prev.filter(id => id !== vendorUserId));
            toast.error('Could not update your wishlist.');
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg p-6 max-w-[1280px] mx-auto space-y-8">
            <header className="space-y-3">
                <Badge tone="brand">Vendor directory</Badge>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                    {category === 'All' ? 'Find a provider' : LABELS[category]}
                </h1>
                <p className="text-sm text-muted max-w-2xl">
                    Browse verified providers, compare packages, and send an offer at your budget.
                    Trust scores are computed from completion rates, reviews and disputes.
                </p>
            </header>

            <Card className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} aria-hidden="true" />
                        <label htmlFor="vendor-search" className="sr-only">Search providers</label>
                        <input
                            id="vendor-search"
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by business name or description…"
                            className="w-full bg-surface-2 border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted outline-none focus:border-brand"
                        />
                    </div>
                    <div className="relative md:w-56">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden="true" />
                        <label htmlFor="vendor-location" className="sr-only">Filter by city</label>
                        <input
                            id="vendor-location"
                            defaultValue={location}
                            onBlur={(e) => setParam({ location: e.target.value })}
                            placeholder="City"
                            className="w-full bg-surface-2 border border-border rounded-full pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted outline-none focus:border-brand"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setParam({ category: cat })}
                            aria-pressed={category === cat}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border capitalize ${
                                category === cat
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-surface-2 text-muted hover:text-fg border-border'
                            }`}
                        >
                            {cat === 'All' ? 'All' : LABELS[cat]}
                        </button>
                    ))}
                </div>
            </Card>

            {!loading && !error && (
                <p className="text-xs text-muted" aria-live="polite">
                    {meta.total} provider{meta.total === 1 ? '' : 's'} found
                </p>
            )}

            {loading ? (
                <SkeletonList count={6} height="h-64" cols="md:grid-cols-2 xl:grid-cols-3" />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchVendors} />
            ) : vendors.length === 0 ? (
                <EmptyState
                    icon={Store}
                    title="No providers match your search"
                    description="Try another category or clear the location filter."
                    action={{ label: 'Clear filters', onClick: () => setSearchParams({}) }}
                />
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {vendors.map(v => {
                            const vendorUserId = v.userId?._id || v.userId;
                            const isFav = favorites.includes(vendorUserId);

                            return (
                                <Card key={v._id} className="p-6 flex flex-col justify-between gap-4 hover:border-brand/40 transition-colors">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-12 h-12 rounded-2xl grad-primary flex items-center justify-center text-white font-black text-lg shrink-0">
                                                    {v.businessName?.charAt(0) || '?'}
                                                </span>
                                                <div className="min-w-0">
                                                    <h2 className="font-bold truncate">{v.businessName}</h2>
                                                    <p className="text-xs text-muted capitalize">{LABELS[v.category] || v.category}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => toggleFavorite(vendorUserId)}
                                                aria-label={isFav ? `Remove ${v.businessName} from wishlist` : `Save ${v.businessName} to wishlist`}
                                                aria-pressed={isFav}
                                                className="p-2 rounded-lg hover:bg-fg/5 transition-colors shrink-0"
                                            >
                                                <Heart size={16} className={isFav ? 'fill-danger text-danger' : 'text-muted'} />
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {v.verified && (
                                                <Badge tone="success">
                                                    <CheckCircle2 size={10} aria-hidden="true" /> Verified
                                                </Badge>
                                            )}
                                            {v.trustScore != null && (
                                                <Badge tone={trustTone(v.trustScore)}>
                                                    <ShieldCheck size={10} aria-hidden="true" /> Trust {v.trustScore}
                                                </Badge>
                                            )}
                                            {v.reviewsCount > 0 && (
                                                <span className="flex items-center gap-1 text-xs text-muted font-semibold">
                                                    <Star size={12} className="fill-warning text-warning" aria-hidden="true" />
                                                    {v.rating?.toFixed(1)} ({v.reviewsCount})
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-muted line-clamp-2">{v.description}</p>

                                        <p className="flex items-center gap-1.5 text-xs text-muted">
                                            <MapPin size={12} className="text-brand" aria-hidden="true" /> {v.location}
                                            {v.completedEvents > 0 && <span className="ml-2">· {v.completedEvents} events completed</span>}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-border flex items-end justify-between gap-3">
                                        <div>
                                            <span className="text-[10px] font-mono text-muted block uppercase font-bold">
                                                {v.startingPrice ? 'Packages from' : 'Packages'}
                                            </span>
                                            <span className="text-lg font-black text-success">
                                                {v.startingPrice ? formatCurrency(v.startingPrice) : `${v.packages?.length || 0} available`}
                                            </span>
                                        </div>
                                        <Link to={`/vendor/${vendorUserId}`}>
                                            <Button size="sm">
                                                View profile <ArrowRight size={12} />
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {meta.totalPages > 1 && (
                        <nav className="flex items-center justify-center gap-3 pt-4" aria-label="Pagination">
                            <Button size="sm" variant="secondary" icon={ChevronLeft}
                                    disabled={page <= 1} onClick={() => setParam({ page: page - 1 })}>
                                Previous
                            </Button>
                            <span className="text-xs font-bold text-muted">Page {meta.page} of {meta.totalPages}</span>
                            <Button size="sm" variant="secondary"
                                    disabled={page >= meta.totalPages} onClick={() => setParam({ page: page + 1 })}>
                                Next <ChevronRight size={14} />
                            </Button>
                        </nav>
                    )}
                </>
            )}
        </div>
    );
}
