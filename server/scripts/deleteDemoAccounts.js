/**
 * Permanently deletes the demonstration accounts created by seedDemoData.js
 * and everything that belongs to them (vendor profiles, events, packages,
 * designs, plans, bookings involving them, reviews, tickets, notifications),
 * and removes them from other users' follow lists.
 *
 *   node scripts/deleteDemoAccounts.js            # dry run: counts only
 *   node scripts/deleteDemoAccounts.js --confirm  # delete
 *
 * Only these exact emails are touched. Audit logs are kept.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const DEMO_EMAILS = [
    'superadmin@smartevents.com', 'admin@smartevents.com',
    'umar_provider@example.com', 'zainab.catering@example.com', 'hassan.lens@example.com', 'ayesha.decor@example.com',
    'ali@example.com', 'fatima.noor@example.com', 'bilal.hassan@example.com', 'hira.tariq@example.com',
];
const CONFIRM = process.argv.includes('--confirm');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = require('../models/User');
    const VendorProfile = require('../models/VendorProfile');
    const Event = require('../models/Event');
    const Service = require('../models/Service');
    const Booking = require('../models/Booking');
    const Review = require('../models/Review');
    const Ticket = require('../models/Ticket');
    const Notification = require('../models/Notification');
    const VendorDesign = require('../models/VendorDesign');
    const EventPlan = require('../models/EventPlan');

    const users = await User.find({ email: { $in: DEMO_EMAILS } }).select('_id email').lean();
    const ids = users.map((u) => u._id);
    const profiles = await VendorProfile.find({ userId: { $in: ids } }).select('_id').lean();
    const events = await Event.find({ createdBy: { $in: ids } }).select('_id').lean();
    const eventIds = events.map((e) => e._id);
    const bookingFilter = { $or: [{ customerId: { $in: ids } }, { vendorId: { $in: ids } }] };
    const plan = [
        ['bookings', Booking, bookingFilter],
        ['reviews', Review, { $or: [{ user: { $in: ids } }, { event: { $in: eventIds } }] }],
        ['tickets', Ticket, { $or: [{ attendee: { $in: ids } }, { event: { $in: eventIds } }] }],
        ['notifications', Notification, { $or: [{ user: { $in: ids } }, { recipient: { $in: ids } }] }],
        ['packages', Service, { vendorId: { $in: profiles.map((p) => p._id) } }],
        ['designs', VendorDesign, { vendor: { $in: ids } }],
        ['plans', EventPlan, { owner: { $in: ids } }],
        ['events', Event, { createdBy: { $in: ids } }],
        ['vendor profiles', VendorProfile, { userId: { $in: ids } }],
        ['accounts', User, { _id: { $in: ids } }],
    ];
    console.log(CONFIRM ? 'DELETING' : 'DRY RUN (add --confirm to delete)');
    for (const [label, Model, filter] of plan) {
        const n = await Model.countDocuments(filter);
        if (CONFIRM && n) await Model.deleteMany(filter);
        console.log(`  ${label}: ${n}`);
    }
    const followers = await User.countDocuments({ favorites: { $in: ids } });
    if (CONFIRM && followers) await User.updateMany({ favorites: { $in: ids } }, { $pull: { favorites: { $in: ids } } });
    console.log(`  follow links removed from other accounts: ${followers}`);
    await mongoose.disconnect();
})().catch(async (err) => {
    console.error('Failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
