import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import { toast } from 'react-hot-toast';
import { Bell, CheckCheck, Trash2, Calendar, MessageSquare, DollarSign, ShieldAlert, ArrowLeft, ChevronRight } from 'lucide-react';
import { useWebSockets } from '../../context/WebSocketContext';
import { useNavigate } from 'react-router-dom';

const ICONS = {
    booking: <Calendar size={18} className="text-indigo-500" />,
    chat: <MessageSquare size={18} className="text-sky-500" />,
    counter_offer: <DollarSign size={18} className="text-emerald-500" />,
    payment: <DollarSign size={18} className="text-amber-500" />,
    system: <ShieldAlert size={18} className="text-rose-500" />,
};

export default function Notifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { socket, connected } = useWebSockets();

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data || []);
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load notifications history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    useEffect(() => {
        if (socket && connected) {
            const handleNotif = (notif) => {
                setNotifications(prev => [notif, ...prev]);
            };
            socket.on('notification', handleNotif);
            return () => {
                socket.off('notification', handleNotif);
            };
        }
    }, [socket, connected]);

    const markRead = async (id) => {
        try {
            const res = await axios.put(`/notifications/${id}/read`);
            if (res.data.success) {
                setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const markAllRead = async () => {
        try {
            const res = await axios.put('/notifications/read-all');
            if (res.data.success) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                toast.success('All notifications marked as read');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to update notifications');
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        if (seconds < 60) return `Just now`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <span className="adyen-badge">ALERTS & NOTIFICATION HISTORY</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">
                        Notifications Center
                    </h1>
                    <p className="text-xs text-muted font-medium">Keep track of price negotiations, escrow releases, and platform updates.</p>
                </div>

                {notifications.some(n => !n.isRead) && (
                    <button
                        onClick={markAllRead}
                        className="btn-adyen-primary text-xs px-6 py-3 font-bold shadow-glow"
                    >
                        <CheckCheck size={16} />
                        <span>Mark All as Read</span>
                    </button>
                )}
            </div>

            {/* Notifications Grid */}
            <div className="max-w-3xl space-y-4">
                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-16 bg-surface border border-border rounded-2xl"></div>
                        <div className="h-16 bg-surface border border-border rounded-2xl"></div>
                        <div className="h-16 bg-surface border border-border rounded-2xl"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="adyen-card p-12 text-center text-muted border border-border bg-surface">
                        <Bell size={48} className="mx-auto mb-4 opacity-20 text-muted animate-bounce" />
                        <h3 className="text-base font-bold text-fg">Your inbox is clean</h3>
                        <p className="text-xs text-muted font-semibold mt-1">You will receive live updates when users bid or counter-offer.</p>
                    </div>
                ) : (
                    <div className="adyen-card bg-surface border border-border divide-y divide-slate-100 overflow-hidden rounded-3xl">
                        {notifications.map((n) => (
                            <div
                                key={n._id}
                                onClick={() => !n.isRead && markRead(n._id)}
                                className={`flex gap-4 p-5 cursor-pointer transition-colors hover:bg-surface-2 ${!n.isRead ? 'bg-indigo-50/20' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                                    {ICONS[n.type] || <Bell size={18} className="text-muted" />}
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-fg">{n.title}</h4>
                                        <span className="text-[10px] text-muted font-mono font-bold">{timeAgo(n.createdAt)}</span>
                                    </div>
                                    <p className="text-xs text-muted leading-relaxed font-medium">{n.message}</p>
                                    {n.relatedId && n.type === 'booking' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/negotiate/${n.relatedId}`);
                                            }}
                                            className="text-[10px] text-success hover:underline font-bold flex items-center gap-1 mt-2"
                                        >
                                            <span>Open negotiation thread</span>
                                            <ChevronRight size={12} />
                                        </button>
                                    )}
                                </div>
                                {!n.isRead && (
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
