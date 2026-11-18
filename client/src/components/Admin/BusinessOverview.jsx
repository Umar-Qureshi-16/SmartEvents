import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Users, DollarSign, Lock, CheckCircle2, Percent, Search } from 'lucide-react';
import axios from '../../api/axios';
import { Badge, formatCurrency, formatDate, BOOKING_STATUS } from '../ui';

const STATUSES = [['all', 'All'], ['open', 'Open'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['disputed', 'Disputed'], ['cancelled', 'Cancelled']];
const ROLE = { customer: 'Organizers', provider: 'Vendors', admin: 'Admins', superadmin: 'Super admins' };
const FIELD = { venue: 'Venue', catering: 'Catering', decoration: 'Decoration', photography: 'Photography', music: 'Music', makeup: 'Makeup', other: 'Other' };
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleString('en', { month: 'short' });

function Kpi({ icon: Icon, label, value, sub, onClick }) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick}
            className={`text-left bg-surface border border-border rounded-2xl p-4 ${onClick ? 'hover:border-brand/50 hover:shadow-card transition-all' : ''}`}>
            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted"><Icon size={14} className="text-brand" aria-hidden="true" />{label}</span>
            <span className="block text-2xl font-black text-fg mt-1">{value}</span>
            {sub && <span className="block text-[11px] text-muted mt-0.5">{sub}</span>}
        </Tag>
    );
}

function Bars({ rows }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <ul className="space-y-2">
            {rows.map((r) => (
                <li key={r.label}>
                    <div className="flex justify-between text-xs font-bold text-fg mb-1"><span>{r.label}</span><span>{r.display ?? r.value}</span></div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden"><div className={`h-full rounded-full ${r.color || 'bg-brand'}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
                </li>
            ))}
        </ul>
    );
}

/**
 * Accounts, bookings and money for the whole platform, from live data:
 * gross booking value, escrow held and released, refunds and the 2.5% fee.
 */
export default function BusinessOverview() {
    const [o, setO] = useState(null);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState('all');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [list, setList] = useState(null);

    useEffect(() => {
        axios.get('/admin/overview').then((r) => setO(r.data.data)).catch((e) => setError(e.response?.data?.message || 'Could not load the overview.'));
    }, []);

    const loadList = useCallback(() => {
        axios.get('/admin/bookings', { params: { status, q: q || undefined, page } }).then((r) => setList(r.data.data)).catch(() => setList({ items: [], total: 0, pages: 1, page: 1 }));
    }, [status, q, page]);
    useEffect(() => { const t = setTimeout(loadList, 250); return () => clearTimeout(t); }, [loadList]);

    const jump = (s) => { setStatus(s); setPage(1); document.getElementById('all-bookings')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

    if (error) return <p role="alert" className="text-sm text-danger">{error}</p>;
    if (!o) return <div className="h-96 rounded-3xl bg-surface-2 animate-pulse" />;
    const { accounts, bookings, revenue } = o;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <Kpi icon={Users} label="Accounts" value={accounts.total} sub={`${accounts.byRole.customer || 0} organizers · ${accounts.byRole.provider || 0} vendors`} />
                <Kpi icon={CheckCircle2} label="Bookings" value={bookings.total} sub={`${bookings.open} open · ${bookings.byStatus.confirmed || 0} confirmed`} onClick={() => jump('all')} />
                <Kpi icon={DollarSign} label="Gross value" value={formatCurrency(revenue.gross)} sub="confirmed + completed" onClick={() => jump('confirmed')} />
                <Kpi icon={Lock} label="Held in escrow" value={formatCurrency(revenue.heldInEscrow)} sub="until organizers confirm" onClick={() => jump('confirmed')} />
                <Kpi icon={CheckCircle2} label="Released" value={formatCurrency(revenue.released)} sub={`${formatCurrency(revenue.refunded)} refunded`} onClick={() => jump('completed')} />
                <Kpi icon={Percent} label={`Platform fee ${revenue.feeRate * 100}%`} value={formatCurrency(revenue.platformFee)} sub={`${formatCurrency(revenue.pendingFee)} more when escrow releases`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <section className="xl:col-span-2 bg-surface border border-border rounded-3xl p-5">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider mb-3">Booking value by month</h3>
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenue.byMonth.map((m) => ({ ...m, name: monthLabel(m.month) }))}>
                                <XAxis dataKey="name" stroke="currentColor" className="text-muted" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="currentColor" className="text-muted" fontSize={11} tickLine={false} axisLine={false} width={50} />
                                <Tooltip formatter={(v) => formatCurrency(v)} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                                <Bar dataKey="value" name="Booking value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>
                <section className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">Bookings by status</h3>
                    <Bars rows={Object.entries(bookings.byStatus).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: BOOKING_STATUS[k]?.label || k, value: v }))} />
                </section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <section className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">Value by vendor field</h3>
                    {revenue.byField.length ? <Bars rows={revenue.byField.map((f) => ({ label: FIELD[f.field] || f.field, value: f.value, display: formatCurrency(f.value), color: 'bg-success' }))} /> : <p className="text-sm text-muted">No confirmed bookings yet.</p>}
                </section>
                <section className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">Top vendors</h3>
                    {revenue.topVendors.length ? (
                        <ol className="space-y-2">
                            {revenue.topVendors.map((v, i) => (
                                <li key={v.vendorId}>
                                    <Link to={`/vendor/${v.vendorId}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-2">
                                        <span className="w-7 h-7 rounded-lg bg-brand/10 text-brand text-xs font-black flex items-center justify-center">{i + 1}</span>
                                        <span className="flex-1 min-w-0"><span className="block text-sm font-bold text-fg truncate">{v.name}</span><span className="block text-[11px] text-muted">{FIELD[v.category] || v.category} · {v.deals} deal{v.deals === 1 ? '' : 's'}</span></span>
                                        <span className="text-sm font-black text-success">{formatCurrency(v.value)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    ) : <p className="text-sm text-muted">No confirmed bookings yet.</p>}
                </section>
                <section className="bg-surface border border-border rounded-3xl p-5 space-y-3">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">Accounts</h3>
                    <Bars rows={Object.entries(accounts.byRole).map(([k, v]) => ({ label: ROLE[k] || k, value: v }))} />
                    <p className="text-[11px] text-muted">{accounts.active} active · {accounts.suspended} suspended</p>
                    <div className="flex items-end gap-1.5 h-16" aria-label="Sign-ups per month">
                        {accounts.signupsByMonth.map((m) => {
                            const max = Math.max(1, ...accounts.signupsByMonth.map((x) => x.count));
                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.count} sign-ups in ${monthLabel(m.month)}`}>
                                    <div className="w-full bg-brand/70 rounded-t" style={{ height: `${Math.max(4, (m.count / max) * 48)}px` }} />
                                    <span className="text-[9px] text-muted">{monthLabel(m.month)}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            <section id="all-bookings" className="bg-surface border border-border rounded-3xl p-5 space-y-4 scroll-mt-28">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-fg uppercase tracking-wider">All bookings {list && <span className="text-muted font-semibold">({list.total})</span>}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {STATUSES.map(([k, l]) => (
                            <button key={k} onClick={() => { setStatus(k); setPage(1); }} aria-pressed={status === k}
                                className={`text-xs font-bold rounded-full px-3 py-1 border ${status === k ? 'bg-brand text-white border-brand' : 'border-border text-fg hover:border-brand/50'}`}>{l}</button>
                        ))}
                        <label className="relative">
                            <span className="sr-only">Search bookings</span>
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Organizer, vendor or event" className="bg-surface-2 border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted w-52" />
                        </label>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-[11px] uppercase tracking-wider text-muted text-left">
                            <tr><th className="py-2 pr-3">Booking</th><th className="py-2 pr-3">Organizer</th><th className="py-2 pr-3">Vendor</th><th className="py-2 pr-3 hidden md:table-cell">Event date</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3 hidden md:table-cell">Escrow</th><th className="py-2 text-right">Amount</th></tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {(list?.items || []).map((b) => {
                                const st = BOOKING_STATUS[b.status] || { label: b.status, tone: 'neutral' };
                                return (
                                    <tr key={b._id}>
                                        <td className="py-2.5 pr-3 font-bold text-fg">{b.title}</td>
                                        <td className="py-2.5 pr-3 text-fg/80">{b.organizer}</td>
                                        <td className="py-2.5 pr-3 text-fg/80">{b.vendor}</td>
                                        <td className="py-2.5 pr-3 text-muted hidden md:table-cell">{formatDate(b.date)}</td>
                                        <td className="py-2.5 pr-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                                        <td className="py-2.5 pr-3 text-muted hidden md:table-cell">{b.escrow === 'none' ? '—' : b.escrow}</td>
                                        <td className="py-2.5 text-right font-black text-success">{formatCurrency(b.price)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {list && list.items.length === 0 && <p className="text-sm text-muted text-center py-6">No bookings match.</p>}
                </div>
                {list && list.pages > 1 && (
                    <div className="flex items-center justify-end gap-2 text-xs">
                        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border border-border rounded-lg px-3 py-1 font-bold disabled:opacity-40">Previous</button>
                        <span className="text-muted">Page {list.page} of {list.pages}</span>
                        <button disabled={page >= list.pages} onClick={() => setPage((p) => p + 1)} className="border border-border rounded-lg px-3 py-1 font-bold disabled:opacity-40">Next</button>
                    </div>
                )}
            </section>
        </div>
    );
}
