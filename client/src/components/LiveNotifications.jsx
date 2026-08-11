import { useState, useEffect } from 'react';
import { Bell, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API_BASE_URL from '../apiConfig';

export default function LiveNotifications({ user }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const fetchFeeds = async () => {
            try {
                if (user.role === 'admin' || user.role === 'superadmin') {
                    const res = await fetch(`${API_BASE_URL}/admin/audit-logs`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                    const data = await res.json();
                    if (data.success) {
                        setNotifications(data.data.slice(0, 5).map(log => ({
                            id: log._id,
                            title: `System Event: ${log.action}`,
                            message: `Entity: ${log.entityType}`,
                            time: new Date(log.createdAt).toLocaleTimeString()
                        })));
                    }
                } else {
                    const res = await fetch(`${API_BASE_URL}/bookings/bookings`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                    const data = await res.json();
                    if (res.ok) {
                        const alerts = data.filter(b => b.status === 'counter_offered' && b.counterOfferedBy !== user.role);
                        setNotifications(alerts.map(b => ({
                            id: b._id,
                            title: 'New Counter Offer!',
                            message: `You received a counter offer of $${b.counterAmount} on your event.`,
                            time: new Date(b.updatedAt).toLocaleTimeString()
                        })));
                    }
                }
            } catch (err) { }
        };

        fetchFeeds();
        const interval = setInterval(fetchFeeds, 15000); // poll every 15s
        return () => clearInterval(interval);
    }, [user.role]);

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative bg-white/10 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white/10 dark:border-slate-700 hover:bg-white/20 dark:hover:bg-slate-800 transition-all group"
            >
                {user.role === 'admin' ? <Activity className="w-6 h-6 text-emerald" /> : <Bell className="w-6 h-6 text-emerald" />}
                {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-coral border-2 border-slate-900"></span>
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-14 right-0 w-80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 dark:border-slate-800 overflow-hidden"
                    >
                        <div className="p-4 border-b border-white/10 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white tracking-tight">{user.role === 'admin' ? 'Live System Pulse' : 'Direct Notifications'}</h3>
                            <span className="bg-emerald/10 dark:bg-emerald/20 text-emerald text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length} New</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-4 flex flex-col gap-3">
                            {notifications.length === 0 ? (
                                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6 font-medium">No new alerts.</p>
                            ) : (
                                notifications.map(n => (
                                    <div key={n.id} className="bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-white/10 dark:border-slate-700 shadow-sm hover:shadow relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald"></div>
                                        <div className="pl-2">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{n.title}</h4>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{n.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
