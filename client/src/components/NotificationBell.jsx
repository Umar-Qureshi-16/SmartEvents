import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, CheckCheck, AlertCircle, Calendar, MessageSquare, DollarSign, ShieldAlert } from 'lucide-react';
import axios from '../api/axios';
import { useWebSockets } from '../context/WebSocketContext';
import { toast } from 'react-hot-toast';

const ICONS = {
    booking: <Calendar size={14} className="text-emerald" />,
    chat: <MessageSquare size={14} className="text-sky-400" />,
    counter_offer: <DollarSign size={14} className="text-emerald" />,
    payment: <DollarSign size={14} className="text-gold" />,
    system: <ShieldAlert size={14} className="text-coral" />,
};

const NotificationBell = ({ user }) => {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { socket, connected } = useWebSockets();
    const ref = useRef(null);

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        if (socket && connected) {
            socket.on('notification', (notif) => {
                setNotifications(prev => [notif, ...prev]);
                setUnreadCount(prev => prev + 1);
                toast.success(notif.title, { icon: '🔔' });
            });
        }
        return () => {
            if (socket) socket.off('notification');
        };
    }, [socket, connected]);

    useEffect(() => {
        const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data || []);
                setUnreadCount((res.data.data || []).filter(n => !n.isRead).length);
            }
        } catch (err) { console.error('Failed to fetch notifications', err); }
    };

    const markRead = async (id) => {
        try {
            await axios.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id || n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) { /* silent */ }
    };

    const markAllRead = async () => {
        try {
            await axios.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) { /* silent */ }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => { setOpen(!open); if (!open) fetchNotifications(); }}
                className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
            >
                <Bell size={18} className="text-slate-300" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-coral text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-80 bg-[#0d1120] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <h4 className="text-sm font-bold text-white">Notifications</h4>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && <span className="text-xs font-bold text-coral">{unreadCount} unread</span>}
                                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-80">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 text-sm">
                                    <Bell size={24} className="mx-auto mb-2 opacity-30" />
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((n, idx) => (
                                    <div
                                        key={n._id || idx}
                                        onClick={() => !n.isRead && markRead(n._id || n.id)}
                                        className={`flex gap-3 px-4 py-3 border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${!n.isRead ? 'bg-emerald/5' : ''}`}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                                            {ICONS[n.type] || <AlertCircle size={14} className="text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-white truncate">{n.title}</p>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
                                            <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt || Date.now())}</p>
                                        </div>
                                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-emerald shrink-0 mt-2" />}
                                    </div>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-white/5">
                                <button
                                    onClick={markAllRead}
                                    className="text-xs text-emerald hover:text-emerald/80 font-bold flex items-center gap-1 transition-colors"
                                >
                                    <CheckCheck size={12} /> Mark all as read
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
