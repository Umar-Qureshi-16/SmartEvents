import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Calendar, DollarSign, AlertCircle, CheckCircle2, XCircle, Search, Filter, Download, UserPlus, Eye, Edit, Lock, Trash2, Sliders, Layers, FileText, Image, MessageSquare, History, BarChart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import StatCard from '../../components/common/StatCard';
import DataTable from '../../components/common/DataTable';
import Drawer from '../../components/common/Drawer';
import DisputeResolutionCenter from '../../components/SuperAdmin/DisputeResolutionCenter';
import axios from '../../api/axios';
import BusinessOverview from '../../components/Admin/BusinessOverview';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

export default function AdminPanel({ user }) {
    const [activeTab, setTab] = useState('business');
    const [loading, setLoading] = useState(true);
    const [usersList, setUsersList] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, totalEvents: 0, totalBookings: 0 });
    const [disputesList, setDisputesList] = useState([]);

    // Drawer state
    const [selectedUserDrawer, setSelectedUserDrawer] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes, logsRes, bookingsRes] = await Promise.all([
                axios.get('/admin/users'),
                axios.get('/admin/stats'),
                axios.get('/admin/audit-logs'),
                axios.get('/admin/disputes')
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
            if (bookingsRes.data.success) {
                setDisputesList(bookingsRes.data.data || []);
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

    const resolveDispute = async (bookingId, resolution) => {
        setBusyId(bookingId);
        try {
            await axios.put(`/admin/bookings/${bookingId}/resolve-dispute`, { resolution });
            toast.success('Dispute resolved. Escrow settled.');
            await fetchAdminData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not resolve the dispute.');
        } finally {
            setBusyId(null);
        }
    };

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
            const badgeColor = score >= 80 ? 'text-success bg-success/10' : score >= 50 ? 'text-warning bg-warning/10' : 'text-danger bg-danger/10';
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
                <button onClick={() => toggleUserStatus(row._id, row.status)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${row.status === 'active' || row.status === 'Active' ? 'bg-danger/10 text-danger' : 'bg-emerald-100 text-emerald-700'}`}>
                    {row.status === 'active' || row.status === 'Active' ? 'Suspend' : 'Activate'}
                </button>
            </div>
        )}
    ];

    return (
        <div className="min-h-screen bg-bg text-fg px-4 md:px-6 lg:px-8 py-6 max-w-[1440px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-success" size={20} />
                        <span className="font-mono text-xs text-success uppercase font-bold tracking-wider">Admin console</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-fg">Platform overview</h1>
                </div>

                <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-full flex-wrap">
                    {['business', 'users', 'verification', 'disputes', 'audit'].map(tab => (
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
                <StatCard label="ACCOUNTS" value={stats.totalUsers} icon={Users} subtext="Manage users" onClick={() => setTab('users')} />
                <StatCard label="BOOKINGS" value={stats.totalBookings} icon={DollarSign} subtext="Money and bookings" onClick={() => setTab('business')} />
                <StatCard label="EVENTS LISTED" value={stats.totalEvents} icon={Calendar} subtext="Browse events" onClick={() => { window.location.href = '/events'; }} />
                <StatCard label="OPEN DISPUTES" value={disputesList.length} icon={AlertCircle} subtext="Resolve" onClick={() => setTab('disputes')} />
                <StatCard label="VENDORS" value={usersList.filter(u => u.role === 'provider').length} icon={ShieldCheck} subtext="Verify vendors" onClick={() => setTab('verification')} />
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
                            onExport={() => {
                                const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
                                const rows = [['Name', 'Email', 'Role', 'Status', 'Created'], ...usersList.map((u) => [u.name, u.email, u.role, u.status || 'active', new Date(u.createdAt).toISOString().slice(0, 10)])];
                                const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }));
                                const a = document.createElement('a'); a.href = url; a.download = 'smartevents-users.csv'; a.click(); URL.revokeObjectURL(url);
                                toast.success(`Exported ${usersList.length} accounts.`);
                            }}
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
                                                                ? 'bg-danger/10 text-danger hover:bg-rose-200'
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

                    {/* BUSINESS: live accounts, bookings and money */}
                    {activeTab === 'business' && <BusinessOverview />}

                    {/* TAB 3: DISPUTES */}
                    {activeTab === 'disputes' && (
                        <DisputeResolutionCenter disputes={disputesList} onResolve={resolveDispute} busyId={busyId} />
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
