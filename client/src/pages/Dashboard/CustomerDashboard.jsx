import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import {
    Plus, Sparkles, ShieldCheck, Clock,
    Calendar, ArrowUpRight, MessageSquare, CheckCircle2, DollarSign, Layers
} from 'lucide-react';
import { useWebSockets } from '../../context/WebSocketContext';
import { toast } from 'react-hot-toast';

function CustomerDashboard({ user }) {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const { socket, connected } = useWebSockets();

    const fetchBookings = async () => {
        try {
            const res = await axios.get('/bookings/my');
            if (res.data.success) {
                setBookings(res.data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch customer bookings", err);
            toast.error("Failed to load active bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        if (socket && connected) {
            const handleNotification = (notif) => {
                console.log("[WebSocket] Received notification on CustomerDashboard:", notif);
                fetchBookings();
            };
            socket.on('notification', handleNotification);
            return () => {
                socket.off('notification', handleNotification);
            };
        }
    }, [socket, connected]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F9FA] p-6 max-w-[1280px] mx-auto space-y-8 pt-6 animate-pulse">
                <div className="h-10 w-48 bg-slate-200 rounded-md"></div>
                <div className="grid grid-cols-4 gap-6 h-24 bg-slate-200 rounded-2xl"></div>
                <div className="h-96 bg-slate-200 rounded-3xl"></div>
            </div>
        );
    }

    const activeNegotiations = bookings.filter(b => ['pending', 'negotiating'].includes(b.status));
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const totalSpent = confirmedBookings.reduce((sum, b) => sum + (b.offerPrice || 0), 0);

    const stats = [
        { label: 'Total Booking Nodes', value: bookings.length, icon: Calendar },
        { label: 'Active Counter-Offers', value: activeNegotiations.length, icon: MessageSquare },
        { label: 'Confirmed Bookings', value: confirmedBookings.length, icon: CheckCircle2 },
        { label: 'Protected in Escrow', value: `$${totalSpent.toLocaleString()}`, icon: ShieldCheck }
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">HOST COMMAND CENTER</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        Welcome back, <span className="text-[#0ABF53]">{user?.name || 'Event Host'}</span>
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">Manage your event RFPs, evaluate vendor counter-offers, and lock escrow budgets.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/events')}
                        className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-adyen-glow"
                    >
                        <Plus size={16} />
                        <span>Post New Event RFP</span>
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className="adyen-card p-6 flex flex-col justify-between space-y-3 bg-white border border-[#E5E7EB]">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">{stat.label}</span>
                                <Icon size={18} className="text-[#0ABF53]" />
                            </div>
                            <div className="text-2xl md:text-3xl font-black text-[#111827]">{stat.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Active Events */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-[#111827]">Your Active Event Listings & Bookings</h3>
                        </div>

                        <div className="space-y-4">
                            {bookings.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-medium">
                                    No active bookings or negotiations. Click 'Post New Event RFP' to get started!
                                </div>
                            ) : (
                                bookings.map(booking => (
                                    <div key={booking._id} className="p-4 rounded-2xl bg-[#F8F9FA] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-[#111827]">
                                                {booking.eventId?.title || booking.eventDetails?.eventType || 'Custom Service Booking'}
                                            </h4>
                                            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold">
                                                <span>Organizer: {booking.vendorId?.name || 'Vendor'}</span>
                                                <span>•</span>
                                                <span>{booking.eventDetails?.location}</span>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <span className="text-xs font-mono font-bold text-[#0ABF53]">${booking.offerPrice}</span>
                                            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                                booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                                                booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {booking.status}
                                            </span>
                                            <button 
                                                onClick={() => navigate(`/negotiate/${booking._id}`)} 
                                                className="btn-adyen-outline py-1.5 px-4 text-xs font-bold"
                                            >
                                                Manage Booking
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions Sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-4">
                        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Quick Actions</h3>
                        
                        <button onClick={() => navigate('/vendors')} className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-[#111827] flex items-center justify-between transition-colors">
                            <span>Browse Verified Vendor Marketplace</span>
                            <ArrowUpRight size={14} className="text-[#0ABF53]" />
                        </button>

                        <button onClick={() => navigate('/tickets')} className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-[#111827] flex items-center justify-between transition-colors">
                            <span>Manage Attendee Passes & QR Tickets</span>
                            <ArrowUpRight size={14} className="text-[#0ABF53]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CustomerDashboard;
