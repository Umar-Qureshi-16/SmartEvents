import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import { Heart, Star, MapPin, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Favorites() {
    const navigate = useNavigate();
    const [savedVendors, setSavedVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = async () => {
        try {
            const res = await axios.get('/auth/favorites');
            if (res.data.success) {
                setSavedVendors(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load wishlist.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, []);

    const removeFavorite = async (vendorId) => {
        try {
            const res = await axios.delete(`/auth/favorites/${vendorId}`);
            if (res.data.success) {
                toast.success('Removed from wishlist');
                fetchFavorites();
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to remove from wishlist.');
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">USER WISHLIST</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Saved Event Providers
                    </h1>
                    <p className="text-xs text-muted font-medium">Quick access to vendors you have shortlisted for upcoming proposals.</p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                    <div className="h-44 bg-surface border border-border rounded-3xl"></div>
                    <div className="h-44 bg-surface border border-border rounded-3xl"></div>
                </div>
            ) : savedVendors.length === 0 ? (
                <div className="adyen-card p-12 text-center text-muted bg-surface border border-border max-w-md">
                    <Heart size={48} className="mx-auto mb-4 text-muted animate-pulse" />
                    <h3 className="text-base font-bold text-fg">Your wishlist is empty</h3>
                    <p className="text-xs text-muted font-semibold mt-1">Shortlist vendors from the marketplace to keep track of their catalogs.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {savedVendors.map(vendor => {
                        const targetId = vendor.userId?._id || vendor.userId;
                        return (
                            <div
                                key={vendor._id}
                                className="adyen-card bg-surface border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-success transition-all"
                            >
                                <div className="p-5 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <span className="adyen-badge bg-success/10 text-success border-none font-bold capitalize">{vendor.category}</span>
                                        <button onClick={() => removeFavorite(targetId)} className="text-rose-500 hover:text-rose-700">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <h4 className="text-base font-bold text-fg">{vendor.businessName}</h4>
                                    <div className="flex items-center justify-between text-xs font-semibold text-muted">
                                        <div className="flex items-center gap-1">
                                            <MapPin size={13} className="text-success" />
                                            <span>{vendor.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Star size={13} className="text-amber-500 fill-amber-500" />
                                            <span>{vendor.rating || 5.0} ★</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 border-t border-border flex justify-end">
                                    <button
                                        onClick={() => navigate(`/vendor/${targetId}`)}
                                        className="btn-adyen-primary text-[10px] px-4 py-2 font-bold shadow-glow flex items-center gap-1"
                                    >
                                        <span>View Catalog</span>
                                        <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
