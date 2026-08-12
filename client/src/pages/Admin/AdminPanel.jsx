import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Calendar, DollarSign, AlertCircle, CheckCircle2, XCircle, Search, Filter, Download, UserPlus, Eye, Edit, Lock, Trash2, Sliders, Layers, FileText, Image, MessageSquare, History, BarChart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Drawer from '../../components/common/Drawer';
import axios from '../../api/axios';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

export default function AdminPanel({ user }) {
    const [activeTab, setTab] = useState('users');
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalEvents: 0, totalBookings: 0 });
    const [disputesList, setDisputesList] = useState([]);

    // Drawer state
    const [selectedUserDrawer, setSelectedUserDrawer] = useState(null);
    const [selectedDisputeEvidence, setSelectedDisputeEvidence] = useState(null);
    const [commissionRate, setCommissionRate] = useState(2.5);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes, logsRes, bookingsRes] = await Promise.all([
                axios.get('/admin/users'),
                axios.get('/admin/stats'),
                axios.get('/admin/audit-logs'),
                axios.get('/bookings/organizer') // Fetching bookings to find disputes
            ]);

            if (usersRes.data.success) {
                setUsersList(usersRes.data.data || []);
            }
            if (statsRes.data.success) {
                setStats(statsRes.data.data || { totalUsers: 0, totalEvents: 0, totalBookings: 0 });
            }
            if (logsRes.data.success) {
                setAuditLogs(logsRes.data.data || []);
            }
            // Filter disputes from bookings
            if (bookingsRes.data.success) {
                const bookings = bookingsRes.data.data || [];
                const disputes = bookings.filter(b => b.status === 'disputed').map(b => ({
                    ticketId: `DSP-${b._id.substring(18)}`,
                    event: b.eventId?.title || b.eventDetails?.eventType || 'Custom RFP Lead',
                    organizer: b.customerId?.name || 'Customer',
                    vendor: b.vendorId?.name || 'Vendor',
                    amount: b.offerPrice,
                    status: b.status,
                    evidence: {
                        images: ['https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=400&q=80'],
                        chatHistory: b.negotiationHistory?.map(h => `${h.offeredBy === b.customerId?._id ? 'Customer' : 'Vendor'}: ${h.message || 'Counter price suggested'}`).join('\n') || 'No messages.',
                        contract: `Contract for booking ID #${b._id}`
                    }
                }));
                setDisputesList(disputes);
            }
        } catch (err) {
            console.error("Failed to load admin data", err);
            toast.error("Failed to load administrative reports.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
    }, []);

    // PUT /admin/users/:id/role existed but nothing on the client called it,
    // so roles could only be changed directly in the database.
    const handleRoleChange = async (id, role, name) => {
        try {
            await axios.put(`/admin/users/${id}/role`, { role });
            toast.success(`${name} is now a ${role}.`);
            fetchAdminData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not change that role.');
        }
    };

    const toggleUserStatus = async (id, currentStatus) => {
        const nextStatus = currentStatus === 'active' || currentStatus === 'Active' ? 'restricted' : 'active';
        try {
            const res = await axios.put(`/admin/users/${id}/ban`, { status: nextStatus });
            if (res.data.success) {
                toast.success(`User status updated to ${nextStatus}`);
                fetchAdminData();
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update account permissions.");
        }
    };

    const toggleVerification = async (id, currentVerified) => {
        try {
            const res = await axios.put(`/admin/users/${id}/verify`, { verified: !currentVerified });
            if (res.data.success) {
                toast.success(!currentVerified ? 'Vendor verified successfully' : 'Vendor verification revoked');
                fetchAdminData();
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to update verification status.");
        }
    };

    const userColumns = [
        { header: 'User Profile', cell: (row) => (
            <div>
                <div className="font-bold text-fg">{row.name}</div>
                <div className="text-muted font-mono text-[11px]">{row.email}</div>
            </div>
        )},
        { header: 'Role', cell: (row) => (
            <select
                value={row.role}
                aria-label={`Change role for ${row.name}`}
                disabled={row._id === user?._id || row._id === user?.id}
                onChange={(e) => handleRoleChange(row._id, e.target.value, row.name)}
                className="bg-surface-2 border border-border rounded-lg px-2 py-1 text-[11px] font-mono font-bold uppercase text-fg outline-none focus:border-brand disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {['customer', 'provider', 'admin', 'superadmin'].map(r => (
                    <option key={r} value={r}>{r}</option>
                ))}
            </select>
        )},
        { header: 'Trust Score', cell: (row) => {
            if (row.role !== 'provider') return <span className="text-muted font-bold">-</span>;
            const score = row.trustScore ?? 100;
            const badgeColor = score >= 80 ? 'text-emerald-600 bg-emerald-50/50' : score >= 50 ? 'text-amber-600 bg-amber-50/50' : 'text-rose-600 bg-rose-50/50';
            return (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-current ${badgeColor}`}>
                    {score}%
                </span>
            );
        }},
        { header: 'Status', cell: (row) => (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${row.status === 'active' || row.status === 'Active' ? 'bg-success/15 text-success' : 'bg-rose-500/15 text-rose-600'}`}>
                {row.status || 'Active'}
            </span>
        )},
        { header: 'Account Created', cell: (row) => <span className="font-mono">{new Date(row.createdAt).toLocaleDateString()}</span> },
        { header: 'Actions', cell: (row) => (
            <div className="flex items-center gap-1.5">
                <button onClick={() => setSelectedUserDrawer(row)} className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-2 text-fg" title="View Details">
                    <Eye size={14} />
                </button>
                <button onClick={() => toggleUserStatus(row._id, row.status)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${row.status === 'active' || row.status === 'Active' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.status === 'active' || row.status === 'Active' ? 'Suspend' : 'Activate'}
                </button>
            </div>
        )}
    ];

    const chartData = [
        { name: 'Jan', bookings: 45, revenue: 12000 },
        { name: 'Feb', bookings: 60, revenue: 18000 },
        { name: 'Mar', bookings: 85, revenue: 24000 },
        { name: 'Apr', bookings: 120, revenue: 35000 },
        { name: 'May', bookings: 150, revenue: 45000 },
        { name: 'Jun', bookings: 210, revenue: 64000 }
    ];

    const pieData = [
        { name: 'Confirmed', value: 65, color: '#0ABF53' },
        { name: 'Negotiating', value: 20, color: '#f59e0b' },
        { name: 'Cancelled', value: 10, color: '#ef4444' },
        { name: 'Disputed', value: 5, color: '#6366f1' }
    ];

    return (
        <div className="min-h-screen bg-bg text-fg p-6 max-w-[1280px] mx-auto space-y-8 pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-success" size={20} />
                        <span className="font-mono text-xs text-success uppercase font-bold tracking-wider">SUPER ADMIN GOVERNANCE PANEL</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-fg">Platform Command Center</h1>
                </div>

                <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-full flex-wrap">
                    {['users', 'verification', 'analytics', 'disputes', 'audit', 'commission'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setTab(tab)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === tab ? 'bg-success text-white shadow-sm' : 'text-muted hover:text-fg'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* StatCards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard label="TOTAL USERS" value={stats.totalUsers} icon={Users} />
                <StatCard label="TOTAL EVENTS" value={stats.totalEvents} icon={Calendar} />
                <StatCard label="TOTAL BOOKINGS" value={stats.totalBookings} icon={DollarSign} />
                <StatCard label="DISPUTES IN BOX" value={disputesList.length} icon={AlertCircle} />
                <StatCard label="VERIFIED VENDORS" value={usersList.filter(u => u.role === 'provider').length} icon={ShieldCheck} />
            </div>

            {loading ? (
                <div className="h-96 bg-surface border border-border rounded-3xl animate-pulse flex items-center justify-center">
                    <span className="text-muted font-bold uppercase tracking-widest text-xs">Loading analytics databases...</span>
                </div>
            ) : (
                <>
                    {/* TAB 1: USERS */}
                    {activeTab === 'users' && (
                        <DataTable
                            title="Platform Users & Permissions"
                            columns={userColumns}
                            data={usersList}
                            searchPlaceholder="Search accounts..."
                            onExport={() => toast.success('Exported Users catalog to CSV.')}
                        />
                    )}

                    {/* TAB: VERIFICATION */}
                    {activeTab === 'verification' && (
                        <div className="adyen-card p-6 bg-surface border border-border space-y-6">
                            <h3 className="text-lg font-bold text-fg">Vendor Account Verification Management</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs font-semibold">
                                    <thead>
                                        <tr className="bg-surface-2 text-muted font-mono text-[10px] uppercase border-b border-border">
                                            <th className="p-4">Vendor Business</th>
                                            <th className="p-4">Owner Email</th>
                                            <th className="p-4">Trust Score</th>
                                            <th className="p-4">Verification Status</th>
                                            <th className="p-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E5E7EB]">
                                        {usersList.filter(u => u.role === 'provider').map(vendor => (
                                            <tr key={vendor._id} className="hover:bg-surface-2 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-fg">{vendor.name}</div>
                                                    <div className="text-[10px] text-muted font-mono">{vendor.businessDetails?.companyName || 'Not configured'}</div>
                                                </td>
                                                <td className="p-4 font-mono text-muted">{vendor.email}</td>
                                                <td className="p-4 font-mono text-success font-bold">{vendor.trustScore}%</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${vendor.businessDetails?.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                        {vendor.businessDetails?.verified ? 'Verified' : 'Pending Verification'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => toggleVerification(vendor._id, vendor.businessDetails?.verified)}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shadow-sm ${
                                                            vendor.businessDetails?.verified
                                                                ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
                                                                : 'btn-adyen-primary hover:shadow-md'
                                                        }`}
                                                    >
                                                        {vendor.businessDetails?.verified ? 'Revoke Verification' : 'Approve & Verify'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 adyen-card p-6 bg-surface border border-border space-y-6">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Escrow Volume & Billings Trend</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0ABF53" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#0ABF53" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                                            <YAxis stroke="#94a3b8" fontSize={11} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="revenue" stroke="#0ABF53" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="lg:col-span-4 adyen-card p-6 bg-surface border border-border space-y-6 flex flex-col justify-between">
                                <h3 className="text-sm font-black text-fg uppercase tracking-wider">Bookings Status Spread</h3>
                                <div className="h-64 flex justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                                    {pieData.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span>{item.name} ({item.value}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: DISPUTES */}
                    {activeTab === 'disputes' && (
                        <div className="adyen-card p-6 bg-surface border border-border space-y-6">
                            <h3 className="text-lg font-bold text-fg">Platform Escrow Dispute Cases</h3>
                            {disputesList.length === 0 ? (
                                <div className="p-12 text-center text-muted font-bold uppercase tracking-widest text-xs">
                                    No active dispute cases under investigation.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {disputesList.map(dsp => (
                                        <div key={dsp.ticketId} className="p-4 rounded-2xl bg-surface-2 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-fg">{dsp.event}</span>
                                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                                                        {dsp.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted">Host: {dsp.organizer} vs Vendor: {dsp.vendor}</p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black text-success font-mono mr-2">${dsp.amount.toLocaleString()}</span>
                                                <button onClick={() => setSelectedDisputeEvidence(dsp)} className="btn-adyen-outline text-[11px] py-1.5 px-3">
                                                    View Evidence
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: AUDIT LOGS */}
                    {activeTab === 'audit' && (
                        <div className="adyen-card p-6 bg-surface border border-border space-y-4">
                            <h3 className="text-lg font-bold text-fg">Platform Security Audit Logs</h3>
                            <div className="space-y-2">
                                {auditLogs.length === 0 ? (
                                    <div className="p-8 text-center text-muted font-bold uppercase tracking-widest text-xs">
                                        No security audits logged.
                                    </div>
                                ) : (
                                    auditLogs.map(log => (
                                        <div key={log._id || log.id} className="p-3 rounded-xl bg-surface-2 border border-border flex items-center justify-between text-xs font-semibold">
                                            <div>
                                                <span className="font-bold text-fg">{log.action || 'ACTION'}</span>
                                                <p className="text-[11px] text-muted">Actor: {log.actor?.email || 'System'} • Target: {log.targetType}</p>
                                            </div>
                                            <span className="text-[10px] font-mono text-muted">{new Date(log.createdAt).toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 5: COMMISSION MANAGER */}
                    {activeTab === 'commission' && (
                        <div className="adyen-card p-8 bg-surface border border-border space-y-6 max-w-xl">
                            <h3 className="text-lg font-bold text-fg">Escrow Platform Commission Manager</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-muted block mb-2 font-semibold">Adjust Escrow Commission Fee (%)</label>
                                    <input
                                        type="range"
                                        min="1.0"
                                        max="10.0"
                                        step="0.1"
                                        value={commissionRate}
                                        onChange={(e) => setCommissionRate(Number(e.target.value))}
                                        className="w-full accent-[#0ABF53]"
                                    />
                                    <div className="flex justify-between text-xs font-mono font-bold mt-1">
                                        <span>Min: 1.0%</span>
                                        <span className="text-success text-lg">{commissionRate}%</span>
                                        <span>Max: 10.0%</span>
                                    </div>
                                </div>

                                <button onClick={() => toast.success(`Escrow fee saved at ${commissionRate}%!`)} className="w-full btn-adyen-primary py-3 rounded-full text-xs justify-center shadow-glow">
                                    Save Fee Configuration
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* User Drawer */}
            <Drawer isOpen={!!selectedUserDrawer} onClose={() => setSelectedUserDrawer(null)} title="User Details Overview">
                {selectedUserDrawer && (
                    <div className="space-y-4 text-xs font-semibold">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 rounded-full bg-success text-white flex items-center justify-center text-2xl font-black mx-auto">
                                {selectedUserDrawer.name.charAt(0)}
                            </div>
                            <h4 className="text-base font-bold text-fg">{selectedUserDrawer.name}</h4>
                            <span className="adyen-badge bg-success/15 text-success uppercase">{selectedUserDrawer.role}</span>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-border">
                            <div className="flex justify-between">
                                <span className="text-muted">Email:</span>
                                <span className="font-mono">{selectedUserDrawer.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Account Status:</span>
                                <span className="font-mono font-bold text-emerald-600">{selectedUserDrawer.status || 'Active'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted">Registry Date:</span>
                                <span className="font-mono">{new Date(selectedUserDrawer.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
