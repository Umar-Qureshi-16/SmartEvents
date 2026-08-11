import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, ShieldCheck, MapPin, Award, CheckCircle2, MessageSquare, ArrowRight, X, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function VendorMarketplace({ user }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryParam = searchParams.get('category') || 'All';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categoryParam);
    const [selectedCompare, setSelectedCompare] = useState([]);
    const [compareModalOpen, setCompareModalOpen] = useState(false);

    useEffect(() => {
        if (categoryParam) {
            setSelectedCategory(categoryParam);
        }
    }, [categoryParam]);

    const mockVendors = [
        {
            id: 'ven-1',
            name: 'Apex Stage & Lighting AV',
            category: 'Stage & Lighting AV',
            rating: 4.9,
            reviewsCount: 142,
            location: 'New York, NY',
            bio: 'Premier stage design, concert sound systems, and intelligent LED lighting production.',
            completedJobs: 98,
            startingPrice: '$2,500',
            trustScore: 96,
            inclusions: ['4K dual LED screens', 'Concert sound kit', 'Stage setup team'],
            image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'ven-2',
            name: 'Gourmet Royale Catering & Dining',
            category: 'Catering & Dining',
            rating: 4.95,
            reviewsCount: 210,
            location: 'Miami, FL',
            bio: '5-star executive dining, luxury buffet setups, and custom wedding banquet menus.',
            completedJobs: 185,
            startingPrice: '$3,500',
            trustScore: 99,
            inclusions: ['3-course table dining', 'Custom bar setup', 'Eco-safe clean crew'],
            image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'ven-3',
            name: 'Lumina Cinema & Drone Videography',
            category: 'Photography & Cinema',
            rating: 4.88,
            reviewsCount: 89,
            location: 'Los Angeles, CA',
            bio: '4K multi-cam event recording, live streaming, and aerial 4K drone cinematography.',
            completedJobs: 72,
            startingPrice: '$1,800',
            trustScore: 92,
            inclusions: ['Multi-cam coverage', 'Aerial drone clips', 'Raw digital rushes'],
            image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'
        },
        {
            id: 'ven-4',
            name: 'The Grand Ballroom & Pavilion',
            category: 'Venues & Ballrooms',
            rating: 4.92,
            reviewsCount: 164,
            location: 'Chicago, IL',
            bio: 'Indoor/outdoor venue hosting up to 2,000 guests with parking & full AV infrastructure.',
            completedJobs: 130,
            startingPrice: '$5,000',
            trustScore: 97,
            inclusions: ['Capacity to 2000 guests', 'Secured parking', 'In-house stage rig'],
            image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&q=80'
        }
    ];

    const filteredVendors = mockVendors.filter(v => {
        const matchesCat = selectedCategory === 'All' || v.category === selectedCategory;
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    const handleCategoryClick = (cat) => {
        setSelectedCategory(cat);
        if (cat === 'All') {
            setSearchParams({});
        } else {
            setSearchParams({ category: cat });
        }
    };

    const toggleCompare = (vendor) => {
        const exists = selectedCompare.find(v => v.id === vendor.id);
        if (exists) {
            setSelectedCompare(selectedCompare.filter(v => v.id !== vendor.id));
        } else {
            if (selectedCompare.length >= 3) {
                toast.error('You can compare a maximum of 3 vendors side-by-side.');
                return;
            }
            setSelectedCompare([...selectedCompare, vendor]);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] p-6 max-w-[1280px] mx-auto space-y-8 pt-6 relative">
            {/* Header */}
            <div className="space-y-3">
                <span className="adyen-badge uppercase tracking-wider">SEGREGATED VENDOR DIRECTORY</span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#111827]">
                    {selectedCategory === 'All' ? 'Vendor Directory & Marketplace' : `${selectedCategory} Directory`}
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl font-medium">
                    Select vendors to compare starting rates, inclusions, ratings, and trust scores side-by-side.
                </p>
            </div>

            {/* Search & Categories */}
            <div className="adyen-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search vendor name, category, or city..."
                        className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {['All', 'Catering & Dining', 'Stage & Lighting AV', 'Photography & Cinema', 'Venues & Ballrooms'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategoryClick(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${selectedCategory === cat
                                    ? 'bg-[#0ABF53] text-white shadow-adyen-glow'
                                    : 'bg-[#F8F9FA] text-slate-600 hover:text-[#111827] border border-[#E5E7EB]'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Vendor Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredVendors.length === 0 ? (
                    <div className="col-span-2 adyen-card p-12 text-center space-y-3">
                        <h3 className="text-lg font-bold text-[#111827]">No vendors found for category "{selectedCategory}"</h3>
                        <p className="text-xs text-slate-500">Try selecting another category pill above.</p>
                    </div>
                ) : (
                    filteredVendors.map(vendor => (
                        <div key={vendor.id} className="adyen-card rounded-3xl overflow-hidden flex flex-col justify-between hover:border-[#0ABF53] relative">
                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-start gap-4">
                                        <img src={vendor.image} alt={vendor.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200" />
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-[#111827]">{vendor.name}</h3>
                                                <ShieldCheck size={16} className="text-[#0ABF53]" />
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                                                <span className="flex items-center gap-1 text-amber-500 font-bold">
                                                    <Star size={14} className="fill-amber-500" /> {vendor.rating} ({vendor.reviewsCount})
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={14} /> {vendor.location}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compare Checkbox */}
                                    <label className="flex items-center gap-1.5 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full select-none hover:bg-slate-200">
                                        <input
                                            type="checkbox"
                                            checked={!!selectedCompare.find(v => v.id === vendor.id)}
                                            onChange={() => toggleCompare(vendor)}
                                            className="rounded accent-[#0ABF53]"
                                        />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">Compare</span>
                                    </label>
                                </div>

                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    {vendor.bio}
                                </p>

                                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-2 border-t border-[#E5E7EB]">
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-mono">COMPLETED JOBS</span>
                                        <span className="font-bold text-[#111827]">{vendor.completedJobs} Events</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-mono">STARTING FROM</span>
                                        <span className="font-black text-[#0ABF53]">{vendor.startingPrice}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 block font-mono">TRUST SCORE</span>
                                        <span className="font-bold text-emerald-600">{vendor.trustScore}%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-[#E5E7EB] flex items-center justify-between">
                                <span className="text-xs font-bold text-[#111827]">{vendor.category}</span>
                                <button
                                    onClick={() => {
                                        navigate(`/vendor/${vendor.id}`);
                                    }}
                                    className="btn-adyen-primary py-2 px-5 text-xs shadow-adyen-glow"
                                >
                                    Request Quote
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Floating Comparison Tray */}
            {selectedCompare.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-white/10 backdrop-blur-md">
                    <span className="text-xs font-bold uppercase tracking-wider">{selectedCompare.length} Vendor Shortlisted</span>
                    <div className="flex items-center gap-2">
                        {selectedCompare.map(v => (
                            <span key={v.id} className="text-[10px] font-bold bg-[#0ABF53]/15 text-[#0ABF53] border border-[#0ABF53]/25 px-2.5 py-0.5 rounded-full">{v.name.substring(0, 12)}...</span>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCompareModalOpen(true)}
                            className="bg-[#0ABF53] hover:bg-[#0ABF53]/90 text-white font-bold text-xs px-5 py-2.5 rounded-full shadow-adyen-glow uppercase"
                        >
                            Compare side-by-side
                        </button>
                        <button onClick={() => setSelectedCompare([])} className="text-slate-400 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Comparison Grid Modal */}
            {compareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-5xl bg-white border border-[#E5E7EB] p-8 rounded-[40px] shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setCompareModalOpen(false)}
                            className="absolute top-6 right-6 text-slate-400 hover:text-[#111827]"
                        >
                            <X size={24} />
                        </button>

                        <div className="space-y-2 mb-6">
                            <span className="adyen-badge">VENDOR COMPARISON GRID</span>
                            <h3 className="text-2xl font-black text-[#111827]">Comparison Matrix</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                            {/* Matrix Labels Column */}
                            <div className="bg-slate-50 p-6 flex flex-col justify-between font-mono text-[10px] uppercase font-bold text-slate-400 divide-y divide-slate-100">
                                <div className="pb-4 h-24 flex items-end">Vendor Name</div>
                                <div className="py-4">Starting Rate</div>
                                <div className="py-4">Rating Index</div>
                                <div className="py-4">Trust Score</div>
                                <div className="py-4">Location</div>
                                <div className="py-4">Package Inclusions</div>
                            </div>

                            {/* Vendor Comparison Cards */}
                            {selectedCompare.map(v => (
                                <div key={v.id} className="p-6 bg-white flex flex-col justify-between text-xs font-semibold text-slate-700 divide-y divide-slate-100 text-center">
                                    <div className="pb-4 h-24 flex flex-col items-center justify-center gap-2">
                                        <img src={v.image} alt={v.name} className="w-10 h-10 rounded-xl object-cover" />
                                        <h4 className="font-bold text-sm text-[#111827]">{v.name}</h4>
                                    </div>
                                    <div className="py-4 text-[#0ABF53] font-black text-sm">{v.startingPrice}</div>
                                    <div className="py-4 flex items-center justify-center gap-1">
                                        <Star size={13} className="text-amber-500 fill-amber-500" />
                                        <span>{v.rating} ({v.reviewsCount} reviews)</span>
                                    </div>
                                    <div className="py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] border border-current font-mono font-bold ${v.trustScore >= 80 ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                                            {v.trustScore}% Trust
                                        </span>
                                    </div>
                                    <div className="py-4">{v.location}</div>
                                    <div className="py-4 space-y-1 text-slate-500 font-medium">
                                        {v.inclusions.map((inc, i) => (
                                            <p key={i}>• {inc}</p>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Empty filler cards */}
                            {[...Array(3 - selectedCompare.length)].map((_, i) => (
                                <div key={i} className="p-6 bg-slate-50/50 flex items-center justify-center border-l border-slate-100 text-slate-400 font-mono text-[10px] uppercase font-bold text-center">
                                    Slot {selectedCompare.length + i + 1} Empty
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
