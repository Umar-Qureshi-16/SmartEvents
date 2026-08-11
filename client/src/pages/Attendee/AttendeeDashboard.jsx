import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket as TicketIcon, Heart, Award, Download, Share2, Star, MapPin, QrCode, Search, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../../components/common/StatCard';

export default function AttendeeDashboard({ user }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('tickets');
    const [eventDetailTab, setEventDetailTab] = useState('overview');

    const [favoriteEvents, setFavoriteEvents] = useState([
        { id: 'fav-1', title: 'Global Tech Summit 2026', date: 'Aug 18, 2026', location: 'New York, NY' }
    ]);

    const handleWishlist = (title) => {
        toast.success(`Saved "${title}" to your favorites!`);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">ATTENDEE PASS PORTAL</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        Welcome, <span className="text-[#0ABF53]">{user?.name || 'Guest Attendee'}</span>
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">Browse events, manage your digital QR passes, and review past events.</p>
                </div>

                <button
                    onClick={() => navigate('/events')}
                    className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-adyen-glow"
                >
                    <span>Browse All Events</span>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* ATTENDEE STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label="UPCOMING EVENTS" value="2" icon={Calendar} />
                <StatCard label="PAST EVENTS" value="5" icon={Calendar} />
                <StatCard label="FAVORITES" value={favoriteEvents.length} icon={Heart} />
                <StatCard label="TOTAL TICKETS" value="2" icon={TicketIcon} />
                <StatCard label="REWARDS POINTS" value="450 Pts" icon={Award} trend="+50 Pts" />
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="adyen-card p-6 bg-white border border-[#E5E7EB] rounded-3xl space-y-6 shadow-sm">
                {/* Event Detail Tabs */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 font-semibold text-xs text-slate-500 overflow-x-auto">
                    {['overview', 'schedule', 'gallery', 'venue', 'reviews', 'faq'].map(t => (
                        <button
                            key={t}
                            onClick={() => setEventDetailTab(t)}
                            className={`capitalize pb-2 px-3 transition-colors border-b-2 ${eventDetailTab === t ? 'border-[#0ABF53] text-[#0ABF53] font-bold' : 'border-transparent hover:text-[#111827]'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* TAB OVERVIEW */}
                {eventDetailTab === 'overview' && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-[#111827]">Your Confirmed Pass: Global Tech Summit 2026</h3>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Join 2,500+ developers, tech leaders, and investors at the Javits Center. Your VIP Pass includes access to mainstage keynotes, networking lounge, and official gala dinner.
                        </p>
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => toast.success('Ticket PDF Downloaded')} className="btn-adyen-primary text-xs py-2 px-5 shadow-adyen-glow">
                                <Download size={14} /> Download PDF Pass
                            </button>
                            <button onClick={() => handleWishlist('Global Tech Summit 2026')} className="btn-adyen-outline text-xs py-2 px-4">
                                <Heart size={14} /> Save to Wishlist
                            </button>
                        </div>
                    </div>
                )}

                {/* TAB SCHEDULE */}
                {eventDetailTab === 'schedule' && (
                    <div className="space-y-3 text-xs font-semibold">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                            <span>09:00 AM - Opening Keynote & AI Roadmap</span>
                            <span className="text-[#0ABF53]">Main Auditorium</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                            <span>12:30 PM - Networking Banquet & VIP Lunch</span>
                            <span className="text-[#0ABF53]">Executive Lounge</span>
                        </div>
                    </div>
                )}

                {/* TAB VENUE */}
                {eventDetailTab === 'venue' && (
                    <div className="space-y-2 text-xs font-semibold">
                        <h4 className="text-sm font-bold text-[#111827]">Javits Convention Center</h4>
                        <p className="text-slate-600">429 11th Ave, New York, NY 10001 • Capacity: 10,000</p>
                    </div>
                )}

                {/* TAB REVIEWS */}
                {eventDetailTab === 'reviews' && (
                    <div className="space-y-3 text-xs font-semibold">
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                            <div className="flex justify-between font-bold text-[#111827]">
                                <span>Sarah Jenkins</span>
                                <span className="text-amber-500 font-mono">★ 5.0</span>
                            </div>
                            <p className="text-slate-600">"Outstanding organization and seamless gate check-in via QR ticket!"</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
