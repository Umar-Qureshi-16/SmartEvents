import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Calendar, MapPin, DollarSign, Users, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ExploreEvents({ user }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryParam = searchParams.get('category') || 'All';

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(categoryParam);

    // Sync state if URL query param changes
    useEffect(() => {
        if (categoryParam) {
            setSelectedCategory(categoryParam);
        }
    }, [categoryParam]);

    const mockEvents = [
        {
            id: 'ev-1',
            title: 'Global Tech Summit & Developer Expo 2026',
            category: 'Corporate Conferences',
            date: 'August 18, 2026',
            location: 'Javits Center, New York, NY',
            guestCount: 2500,
            budgetMin: 15000,
            budgetMax: 25000,
            bidsCount: 8,
            status: 'Open for Bids',
            image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'ev-2',
            title: 'Apex Summer EDM & Lights Music Festival',
            category: 'Music Festivals',
            date: 'September 5, 2026',
            location: 'Bayfront Park, Miami, FL',
            guestCount: 12000,
            budgetMin: 40000,
            budgetMax: 65000,
            bidsCount: 14,
            status: 'Open for Bids',
            image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'ev-3',
            title: 'Grand Botanical Gala & Luxury Wedding',
            category: 'Weddings & Galas',
            date: 'October 12, 2026',
            location: 'Biltmore Estate, Asheville, NC',
            guestCount: 350,
            budgetMin: 8000,
            budgetMax: 14000,
            bidsCount: 5,
            status: 'Live Bidding Events',
            image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'ev-4',
            title: 'Enterprise AI & Cloud Infrastructure Expo',
            category: 'Corporate Conferences',
            date: 'November 20, 2026',
            location: 'Moscone Center, San Francisco, CA',
            guestCount: 4500,
            budgetMin: 30000,
            budgetMax: 50000,
            bidsCount: 11,
            status: 'Live Bidding Events',
            image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80'
        },
        {
            id: 'ev-5',
            title: 'Electric Horizon Beach Music Fest',
            category: 'Music Festivals',
            date: 'December 10, 2026',
            location: 'Venice Beach, Los Angeles, CA',
            guestCount: 8500,
            budgetMin: 28000,
            budgetMax: 45000,
            bidsCount: 9,
            status: 'Live Bidding Events',
            image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'
        }
    ];

    const filteredEvents = mockEvents.filter(e => {
        const matchesCat = selectedCategory === 'All' || e.category === selectedCategory || (selectedCategory === 'Live Bidding Events' && e.status === 'Live Bidding Events');
        const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.location.toLowerCase().includes(searchQuery.toLowerCase());
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

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] p-6 max-w-[1280px] mx-auto space-y-8 pt-6">
            {/* Header */}
            <div className="space-y-3">
                <span className="adyen-badge uppercase tracking-wider">SEGREGATED EVENT DIRECTORY</span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#111827]">
                    {selectedCategory === 'All' ? 'Live Event Marketplace' : `${selectedCategory} Directory`}
                </h1>
                <p className="text-sm text-slate-600 max-w-2xl font-medium">
                    Showing events segregated specifically by category: <strong className="text-[#0ABF53]">{selectedCategory}</strong>. Filter by target budget, location, or search keywords.
                </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="adyen-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search events, cities, or venues..."
                        className="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#111827] outline-none focus:border-[#0ABF53]"
                    />
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {['All', 'Corporate Conferences', 'Music Festivals', 'Weddings & Galas', 'Live Bidding Events'].map(cat => (
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

            {/* Event Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredEvents.length === 0 ? (
                    <div className="col-span-2 adyen-card p-12 text-center space-y-3">
                        <h3 className="text-lg font-bold text-[#111827]">No events found for category "{selectedCategory}"</h3>
                        <p className="text-xs text-slate-500">Try selecting another category pill above.</p>
                    </div>
                ) : (
                    filteredEvents.map(event => (
                        <div key={event.id} className="adyen-card rounded-3xl overflow-hidden flex flex-col justify-between hover:border-[#0ABF53]">
                            <div className="relative h-56 overflow-hidden">
                                <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4">
                                    <span className="adyen-badge bg-white text-[#111827] border-none shadow-md font-bold">
                                        {event.category}
                                    </span>
                                </div>
                                <div className="absolute top-4 right-4">
                                    <span className="px-3 py-1 rounded-full bg-[#0ABF53] text-white text-[11px] font-black shadow-md">
                                        {event.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-[#111827] leading-snug">{event.title}</h3>
                                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 pt-1">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar size={14} className="text-[#0ABF53]" />
                                            <span>{event.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={14} className="text-[#0ABF53]" />
                                            <span>{event.location}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">BUDGET RANGE</span>
                                        <span className="text-base font-black text-[#0ABF53]">
                                            ${event.budgetMin.toLocaleString()} - ${event.budgetMax.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        {user?.role === 'vendor' ? (
                                            <button
                                                onClick={() => {
                                                    toast.success(`Counter-bid portal opened for ${event.title}`);
                                                    navigate('/bookings');
                                                }}
                                                className="btn-adyen-primary py-2 px-5 text-xs shadow-adyen-glow"
                                            >
                                                Submit Bid
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    toast.success(`Registering ticket pass for ${event.title}`);
                                                    navigate('/tickets');
                                                }}
                                                className="btn-adyen-primary py-2 px-5 text-xs shadow-adyen-glow"
                                            >
                                                Get Pass
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
