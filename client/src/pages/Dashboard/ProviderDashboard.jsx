import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign, Calendar, Star, ShieldCheck, ArrowRight, TrendingUp, CheckCircle2, Package
} from 'lucide-react';
import axios from '../../api/axios';
import { useWebSockets } from '../../context/WebSocketContext';
import { toast } from 'react-hot-toast';

function ProviderDashboard({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const { socket, connected } = useWebSockets();

    const fetchDashboardData = async () => {
        try {
            const res = await axios.get('/bookings/organizer/dashboard');
            if (res.data.success) {
                setData(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard data", err);
            toast.error("Failed to fetch vendor dashboard metrics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (socket && connected) {
            const handleNotification = (notif) => {
                console.log("[WebSocket] Received notification on ProviderDashboard:", notif);
                fetchDashboardData();
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

    const leads = data?.leads || [];
    const activeBookings = data?.activeBookings || [];
    const analytics = data?.analytics || { totalEarnings: 0, totalBookingsCount: 0, profileViews: 0 };

    const stats = [
        { label: 'Active Proposals/Leads', value: leads.length, icon: Calendar },
        { label: 'Confirmed Bookings', value: analytics.totalBookingsCount, icon: TrendingUp },
        { label: 'Earned Escrow Revenue', value: `$${analytics.totalEarnings.toLocaleString()}`, icon: DollarSign },
        { label: 'Profile Views', value: analytics.profileViews, icon: Star }
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#111827] space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E5E7EB]">
                <div className="space-y-1">
                    <span className="adyen-badge">VENDOR HUB & PROPOSALS</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#111827]">
                        Welcome back, <span className="text-[#0ABF53]">{user?.name || 'Vendor Partner'}</span>
                    </h1>
                    <p className="text-xs text-slate-600 font-medium">Browse open event RFPs, submit quotes, and respond to counter-offers.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/events')}
                        className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-adyen-glow"
                    >
                        <span>Browse Open Events to Bid</span>
                        <ArrowRight size={16} />
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
                {/* Active Proposals */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="adyen-card p-6 bg-white border border-[#E5E7EB] space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-lg font-bold text-[#111827]">Your Active Proposals & Counter-Offers</h3>
                        </div>

                        <div className="space-y-4">
                            {leads.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 font-medium">
                                    No active proposals or counter-offers at the moment.
                                </div>
                            ) : (
                                leads.map(prop => (
                                    <div key={prop._id} className="p-4 rounded-2xl bg-[#F8F9FA] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <h4 className="text-base font-bold text-[#111827]">
                                                {prop.eventId?.title || prop.eventDetails?.eventType || 'Custom Lead Request'}
                                            </h4>
                                            <p className="text-xs text-slate-500 font-semibold">
                                                From: {prop.customerId?.name || 'Customer'} (Trust Score: {prop.customerId?.trustScore || 100})
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Location: {prop.eventDetails?.location} • Date: {new Date(prop.eventDetails?.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <span className="text-base font-black text-[#0ABF53] font-mono">${prop.offerPrice}</span>
                                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full capitalize ${
                                                prop.status === 'negotiating' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {prop.status}
                                            </span>
                                            <button 
                                                onClick={() => navigate(`/negotiate/${prop._id}`)} 
                                                className="btn-adyen-outline py-1 px-3 text-[10px] font-bold mt-2"
                                            >
                                                Open Negotiation
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
                        <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">Vendor Toolkit</h3>
                        
                        <button onClick={() => navigate('/services')} className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-[#111827] flex items-center justify-between transition-colors">
                            <span>Manage Service Catalog & Pricing</span>
                            <ArrowRight size={14} className="text-[#0ABF53]" />
                        </button>

                        <button onClick={() => navigate('/revenue')} className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-[#111827] flex items-center justify-between transition-colors">
                            <span>View Bank Payouts & Escrow Ledger</span>
                            <ArrowRight size={14} className="text-[#0ABF53]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProviderDashboard;
