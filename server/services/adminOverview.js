/**
 * The business picture for admins and super admins: who has signed up,
 * what has been booked, and the money (gross value, escrow held, released,
 * refunded, and the platform's 2.5% fee on escrowed deals).
 */
const User = require('../models/User');
const Booking = require('../models/Booking');
const VendorProfile = require('../models/VendorProfile');

const FEE_RATE = 0.025; // as advertised on the pricing page
const BOOKED = ['confirmed', 'completed'];
const month = (d) => new Date(d).toISOString().slice(0, 7);

async function overview() {
    const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
    const [users, bookings, profiles] = await Promise.all([
        User.find().select('role status createdAt').lean(),
        Booking.find().select('status offerPrice escrow vendorId createdAt eventDetails.eventType').lean(),
        VendorProfile.find().select('userId businessName category').lean(),
    ]);
    const byRole = {}; const byStatusUser = {};
    users.forEach((u) => { byRole[u.role] = (byRole[u.role] || 0) + 1; byStatusUser[u.status || 'active'] = (byStatusUser[u.status || 'active'] || 0) + 1; });
    const signups = {};
    users.filter((u) => u.createdAt >= since).forEach((u) => { const m = month(u.createdAt); signups[m] = (signups[m] || 0) + 1; });

    const byStatus = {};
    bookings.forEach((b) => { byStatus[b.status] = (byStatus[b.status] || 0) + 1; });
    const booked = bookings.filter((b) => BOOKED.includes(b.status));
    const sum = (list) => list.reduce((t, b) => t + (b.offerPrice || 0), 0);
    const held = bookings.filter((b) => b.escrow?.status === 'held');
    const released = bookings.filter((b) => b.escrow?.status === 'released' || (b.status === 'completed' && b.escrow?.status !== 'refunded'));
    const refunded = bookings.filter((b) => b.escrow?.status === 'refunded');

    const catOf = new Map(profiles.map((p) => [String(p.userId), p]));
    const byField = {}; const byVendor = {}; const byMonth = {};
    booked.forEach((b) => {
        const p = catOf.get(String(b.vendorId));
        const f = p?.category || 'other';
        byField[f] = (byField[f] || 0) + (b.offerPrice || 0);
        const key = String(b.vendorId);
        byVendor[key] = byVendor[key] || { vendorId: key, name: p?.businessName || 'Vendor', category: f, value: 0, deals: 0 };
        byVendor[key].value += b.offerPrice || 0; byVendor[key].deals += 1;
        if (b.createdAt >= since) { const m = month(b.createdAt); byMonth[m] = (byMonth[m] || 0) + (b.offerPrice || 0); }
    });

    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i); months.push(month(d)); }

    return {
        accounts: {
            total: users.length,
            byRole,
            active: byStatusUser.active || 0,
            suspended: (byStatusUser.banned || 0) + (byStatusUser.restricted || 0),
            signupsByMonth: months.map((m) => ({ month: m, count: signups[m] || 0 })),
        },
        bookings: { total: bookings.length, byStatus, open: (byStatus.pending || 0) + (byStatus.negotiating || 0) },
        revenue: {
            gross: sum(booked),
            heldInEscrow: sum(held),
            released: sum(released),
            refunded: sum(refunded),
            feeRate: FEE_RATE,
            platformFee: Math.round(sum(released) * FEE_RATE * 100) / 100,
            pendingFee: Math.round(sum(held) * FEE_RATE * 100) / 100,
            byMonth: months.map((m) => ({ month: m, value: byMonth[m] || 0 })),
            byField: Object.entries(byField).map(([field, value]) => ({ field, value })).sort((a, b) => b.value - a.value),
            topVendors: Object.values(byVendor).sort((a, b) => b.value - a.value).slice(0, 5),
        },
    };
}

/** Every booking on the platform, newest first, filterable by status and a name/title search. */
async function listBookings({ status, q, page = 1, limit = 20 } = {}) {
    const filter = {};
    if (status && status !== 'all') filter.status = status === 'open' ? { $in: ['pending', 'negotiating'] } : status;
    let list = await Booking.find(filter)
        .populate('customerId', 'name').populate('vendorId', 'name').populate('eventId', 'title').populate('serviceId', 'title')
        .sort({ createdAt: -1 }).limit(500).lean();
    if (q) {
        const s = String(q).toLowerCase();
        list = list.filter((b) => [b.customerId?.name, b.vendorId?.name, b.eventId?.title, b.serviceId?.title, b.eventDetails?.eventType]
            .some((v) => String(v || '').toLowerCase().includes(s)));
    }
    const per = Math.min(Number(limit) || 20, 100);
    const p = Math.max(1, Number(page) || 1);
    return {
        total: list.length,
        page: p,
        pages: Math.max(1, Math.ceil(list.length / per)),
        items: list.slice((p - 1) * per, p * per).map((b) => ({
            _id: b._id,
            title: b.eventId?.title || (b.serviceId?.title ? `${b.serviceId.title} package` : b.eventDetails?.eventType) || 'Booking',
            organizer: b.customerId?.name || '—',
            vendor: b.vendorId?.name || '—',
            status: b.status,
            price: b.offerPrice,
            escrow: b.escrow?.status || 'none',
            date: b.eventDetails?.date,
            createdAt: b.createdAt,
        })),
    };
}

module.exports = { overview, listBookings, FEE_RATE };
