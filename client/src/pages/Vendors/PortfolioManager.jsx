import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Image as ImageIcon, Plus, Trash2, ShieldCheck, MapPin, Briefcase, ArrowLeft } from 'lucide-react';

export default function PortfolioManager() {
    const [profile, setProfile] = useState({
        businessName: '',
        category: 'catering',
        location: '',
        description: '',
        portfolioImages: []
    });
    const [loading, setLoading] = useState(true);
    const [newImageUrl, setNewImageUrl] = useState('');

    const fetchProfile = async () => {
        try {
            const res = await axios.get('/vendor/profile');
            if (res.data) {
                setProfile({
                    businessName: res.data.businessName || '',
                    category: res.data.category || 'catering',
                    location: res.data.location || '',
                    description: res.data.description || '',
                    portfolioImages: res.data.portfolioImages || []
                });
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load vendor profile.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post('/vendor/profile', profile);
            if (res.status === 200) {
                toast.success('Business profile updated successfully!');
                fetchProfile();
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update business profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddImage = (e) => {
        e.preventDefault();
        if (!newImageUrl.trim()) return;
        setProfile(prev => ({
            ...prev,
            portfolioImages: [...prev.portfolioImages, newImageUrl]
        }));
        setNewImageUrl('');
        toast.success('Image link staged. Save profile to apply changes.');
    };

    const handleDeleteImage = (idx) => {
        setProfile(prev => ({
            ...prev,
            portfolioImages: prev.portfolioImages.filter((_, i) => i !== idx)
        }));
        toast.success('Image link removed. Save profile to apply.');
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR BRANDING</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Portfolio & Profile Manager
                    </h1>
                    <p className="text-xs text-muted font-medium">Manage your public brand, location coverage, and image catalogs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Profile form */}
                <div className="lg:col-span-7">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-6 shadow-sm">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Public Brand Settings</h3>
                        
                        {loading && !profile.businessName ? (
                            <div className="space-y-4 animate-pulse">
                                <div className="h-10 bg-surface-2 rounded-xl"></div>
                                <div className="h-10 bg-surface-2 rounded-xl"></div>
                                <div className="h-24 bg-surface-2 rounded-xl"></div>
                            </div>
                        ) : (
                            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-fg block mb-1">Business Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={profile.businessName}
                                            onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-fg block mb-1">Category type</label>
                                        <select
                                            value={profile.category}
                                            onChange={(e) => setProfile({ ...profile, category: e.target.value })}
                                            className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                        >
                                            <option value="venue">Venue & Hall</option>
                                            <option value="catering">Catering & Dining</option>
                                            <option value="decoration">Decoration & Design</option>
                                            <option value="photography">Photography & Cinema</option>
                                            <option value="music">Music & Stage AV</option>
                                            <option value="makeup">Makeup Artist</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-fg block mb-1">Business Location / Region</label>
                                    <input
                                        type="text"
                                        required
                                        value={profile.location}
                                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                                        placeholder="e.g. Chicago, IL"
                                        className="w-full bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                                    />
                                </div>

                                <div>
                                    <label className="text-fg block mb-1">Brand Description</label>
                                    <textarea
                                        rows="4"
                                        value={profile.description}
                                        onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                                        placeholder="Introduce your business background and event highlights..."
                                        className="w-full bg-bg border border-border rounded-xl p-3 outline-none focus:border-success"
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="w-full btn-adyen-primary py-3 rounded-full text-xs justify-center shadow-glow">
                                    {loading ? 'Saving Profile...' : 'Save & Publish Profile'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Portfolio catalog */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                        <h3 className="text-sm font-black text-fg uppercase tracking-wider">Portfolio Image Link</h3>

                        <form onSubmit={handleAddImage} className="flex gap-2 text-xs font-semibold">
                            <input
                                type="url"
                                required
                                placeholder="Paste image URL..."
                                value={newImageUrl}
                                onChange={(e) => setNewImageUrl(e.target.value)}
                                className="flex-1 bg-bg border border-border rounded-xl px-3.5 py-2.5 outline-none focus:border-success"
                            />
                            <button type="submit" className="btn-adyen-primary p-2.5 rounded-xl shadow-glow"
                                aria-label="Add portfolio image">
                                <Plus size={16} />
                            </button>
                        </form>

                        <div className="space-y-3 pt-2">
                            {profile.portfolioImages.length === 0 ? (
                                <div className="p-8 text-center text-muted font-mono text-[10px] uppercase font-bold border-2 border-dashed border-border rounded-2xl">
                                    No showcase links staged.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                                    {profile.portfolioImages.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-border group">
                                            <img src={img} alt="Showcase" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => handleDeleteImage(idx)}
                                                className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
