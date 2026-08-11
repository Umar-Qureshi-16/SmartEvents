import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Calendar, MapPin, Users, ArrowRight, Loader2 } from 'lucide-react';
import axios from '../../api/axios';
import { Link } from 'react-router-dom';

const EventList = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        status: 'upcoming'
    });

    useEffect(() => {
        fetchEvents();
    }, [filters.category, filters.status]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);

            const res = await axios.get(`/events?${params.toString()}`);
            if (res.data.success) {
                setEvents(res.data.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const categories = ['All', 'Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference'];

    return (
        <div className="min-h-screen bg-[#030712] pt-24 pb-20 px-6">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-4">
                            Global Events <span className="text-indigo-500">Nodes.</span>
                        </h1>
                        <p className="text-slate-400 max-w-md">Browse and book premium events verified by the SmartEvents Trust Protocol.</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setFilters(prev => ({ ...prev, category: cat === 'All' ? '' : cat }))}
                                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all border ${filters.category === (cat === 'All' ? '' : cat)
                                    ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by title, location, or keywords..."
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-6 pl-16 pr-6 text-white outline-none focus:ring-2 ring-indigo-500/30 transition-all text-lg font-medium"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="glass h-96 rounded-3xl animate-pulse bg-white/5" />
                        ))
                    ) : events.length === 0 ? (
                        <div className="col-span-full py-40 text-center space-y-4 opacity-50">
                            <Filter size={48} className="mx-auto text-slate-600" />
                            <h3 className="text-xl font-bold text-white">No nodes found in this sector.</h3>
                            <p className="text-slate-400">Try adjusting your spectral filters.</p>
                        </div>
                    ) : (
                        events.map(event => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={event._id}
                                className="group glass rounded-3xl border-white/5 overflow-hidden hover:border-indigo-500/30 transition-all flex flex-col h-full"
                            >
                                <div className="aspect-video w-full bg-white/5 relative overflow-hidden">
                                    {event.image ? (
                                        <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-20">
                                            <Calendar size={48} />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase text-indigo-400">
                                        {event.category}
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{event.title}</h3>
                                        <div className="flex flex-wrap gap-4 mt-4">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                                <Calendar size={14} className="text-indigo-500" />
                                                {new Date(event.date).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                                <MapPin size={14} className="text-indigo-500" />
                                                {event.location || 'Remote'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Entry Node</p>
                                            <p className="text-xl font-black text-white">${event.price}</p>
                                        </div>
                                        <Link
                                            to={`/events/${event._id}`}
                                            className="grad-indigo w-12 h-12 rounded-2xl flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                                        >
                                            <ArrowRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventList;
