/**
 * Adds a realistic demonstration data set WITHOUT deleting anything.
 *
 *   node scripts/seedDemoData.js --dry-run   # show what would be added
 *   node scripts/seedDemoData.js             # add it
 *
 * Safe to run against a live database:
 *  - insert-only: nothing is deleted, and the only update it ever makes is to
 *    add a photo to one of its own demo events that has none;
 *  - idempotent: a user (by email), event (by title + owner), service,
 *    booking (customer + event), ticket or review that already exists is
 *    skipped, so running it twice adds nothing the second time;
 *  - existing accounts keep their own passwords.
 *
 * New demo accounts use DEMO_PASSWORD (default "password123", the password the
 * one-click demo buttons on the sign-in page expect). Change these passwords,
 * or remove the accounts, before real users join.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Review = require('../models/Review');
const Service = require('../models/Service');
const VendorProfile = require('../models/VendorProfile');

const DRY = process.argv.includes('--dry-run');
const PASSWORD = process.env.DEMO_PASSWORD || 'password123';
const DAY = 86400000;
const inDays = (n) => new Date(Date.now() + n * DAY);

/* ----------------------------------------------------------------- data */

const USERS = [
    { key: 'superadmin', name: 'Platform Owner', email: 'superadmin@smartevents.com', role: 'superadmin' },
    { key: 'admin', name: 'Saad Mehmood', email: 'admin@smartevents.com', role: 'admin' },

    { key: 'royalPalm', name: 'Muhammad Umar', email: 'umar_provider@example.com', role: 'provider',
        profile: { businessName: 'Royal Palm Marquee', category: 'venue', location: 'Gulberg III, Lahore', description: 'Air-conditioned marquee for weddings and corporate functions, seating up to 600 guests with valet parking.' } },
    { key: 'zainab', name: 'Zainab Malik', email: 'zainab.catering@example.com', role: 'provider',
        profile: { businessName: "Zainab's Kitchen Catering", category: 'catering', location: 'Johar Town, Lahore', description: 'Desi and continental menus for weddings, birthdays and office events, with on-site serving staff.' } },
    { key: 'hassan', name: 'Hassan Raza', email: 'hassan.lens@example.com', role: 'provider',
        profile: { businessName: 'Lens & Light Studio', category: 'photography', location: 'DHA Phase 5, Lahore', description: 'Wedding photography and cinematic films, with drone coverage and a printed album.' } },
    { key: 'ayesha', name: 'Ayesha Siddiqui', email: 'ayesha.decor@example.com', role: 'provider',
        profile: { businessName: 'Bloom Decor Studio', category: 'decoration', location: 'Model Town, Lahore', description: 'Floral and stage decor for mehndi, barat and corporate gala evenings.' } },

    { key: 'ali', name: 'Ali Ahmed', email: 'ali@example.com', role: 'customer' },
    { key: 'fatima', name: 'Fatima Noor', email: 'fatima.noor@example.com', role: 'customer' },
    { key: 'bilal', name: 'Bilal Hassan', email: 'bilal.hassan@example.com', role: 'customer' },
    { key: 'hira', name: 'Hira Tariq', email: 'hira.tariq@example.com', role: 'customer' },
];

const SERVICES = [
    { owner: 'royalPalm', title: 'Evening Wedding Hall (up to 400 guests)', price: 4500, eventType: 'wedding', description: 'Hall, stage, lighting and parking for one evening.' },
    { owner: 'royalPalm', title: 'Full-day Conference Hall', price: 2800, eventType: 'corporate', description: 'Theatre seating for 250, projector, sound system and tea service.' },
    { owner: 'zainab', title: 'Wedding Banquet Menu (per 300 guests)', price: 5200, eventType: 'wedding', description: 'Three main courses, two desserts and drinks with serving staff.' },
    { owner: 'zainab', title: 'Birthday Party Menu (per 80 guests)', price: 900, eventType: 'birthday', description: 'Snacks, a main course, cake table setup and drinks.' },
    { owner: 'hassan', title: 'Wedding Photography and Film', price: 1800, eventType: 'wedding', description: 'Two photographers, a cinematic highlight film and 200 edited photos.' },
    { owner: 'hassan', title: 'Corporate Event Coverage', price: 700, eventType: 'corporate', description: 'Half-day photo coverage with same-week delivery.' },
    { owner: 'ayesha', title: 'Mehndi Night Decor', price: 1500, eventType: 'wedding', description: 'Floral stage, swings, lighting and table decor.' },
    { owner: 'ayesha', title: 'Corporate Gala Stage Design', price: 2200, eventType: 'corporate', description: 'Branded stage, backdrop and centrepieces.' },
];

// Event photos from Unsplash (free to use under the Unsplash licence, hotlinking permitted).
const photo = (id) => `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
const EVENT_IMAGES = {
    hall: photo('1519167758481-83f550bb49b3'),
    conference: photo('1540575467063-178a50c2df87'),
    banquet: photo('1555244162-803834f70033'),
    birthday: photo('1530103862676-de8c9debad1d'),
    photo: photo('1606216794074-735e91aa2c92'),
    mehndi: photo('1511795409834-ef04bbd61622'),
    gala: photo('1519225421980-715cb0215aed'),
};

const EVENTS = [
    { key: 'hall', owner: 'royalPalm', title: 'Royal Palm Wedding Hall: Evening Package', category: 'Wedding', price: 4500, capacity: 400, days: 45, location: 'Gulberg III, Lahore',
        description: 'Book the Royal Palm Marquee for your wedding evening: decorated stage, lighting, air conditioning and parking for up to 400 guests. Offers welcome for weekday dates.' },
    { key: 'conference', owner: 'royalPalm', title: 'Corporate Conference Hall: Full Day', category: 'Conference', price: 2800, capacity: 250, days: 30, location: 'Gulberg III, Lahore',
        description: 'A full-day conference setup with theatre seating, projector, sound system and two tea breaks.' },
    { key: 'banquet', owner: 'zainab', title: 'Wedding Banquet Catering for 300 Guests', category: 'Wedding', price: 5200, capacity: 300, days: 60, location: 'Johar Town, Lahore',
        description: 'Complete wedding catering with three main courses, two desserts, drinks and uniformed serving staff.' },
    { key: 'birthday', owner: 'zainab', title: 'Birthday Party Catering for 80 Guests', category: 'Birthday', price: 900, capacity: 80, days: 20, location: 'Johar Town, Lahore',
        description: 'Party catering with snacks, a main course, cake table setup and soft drinks.' },
    { key: 'photo', owner: 'hassan', title: 'Wedding Photography and Cinematic Film', category: 'Wedding', price: 1800, capacity: 1, days: 50, location: 'DHA Phase 5, Lahore',
        description: 'Full-day coverage by two photographers, a five-minute cinematic film, drone shots and a printed album.' },
    { key: 'mehndi', owner: 'ayesha', title: 'Mehndi Night Decor Package', category: 'Wedding', price: 1500, capacity: 1, days: 40, location: 'Model Town, Lahore',
        description: 'Floral stage, decorated swings, fairy lights and table decor for a mehndi evening.' },
    { key: 'gala', owner: 'ayesha', title: 'Corporate Gala Stage and Decor', category: 'Corporate', price: 2200, capacity: 1, days: 35, location: 'Model Town, Lahore',
        description: 'Branded stage, LED backdrop, centrepieces and entrance decor for an evening gala.' },
];

// status, escrow and history mirror what the real lifecycle produces.
const BOOKINGS = [
    { customer: 'fatima', event: 'hall', status: 'completed', eventDay: -12, escrow: 'released',
        history: [[4000, 'offer', 'customer', 'Could you do 4,000 for a Thursday evening?'], [4400, 'counter', 'provider', 'Thursday works. 4,400 including stage lighting.'], [4400, 'accepted', 'customer', 'Agreed, thank you.']],
        review: { rating: 5, comment: 'The hall was spotless, the staff were helpful and everything started on time. Highly recommended.' } },
    { customer: 'bilal', event: 'conference', status: 'confirmed', eventDay: 30, escrow: 'held', ticket: true,
        history: [[2500, 'offer', 'customer', 'We need the hall for our annual sales conference.'], [2700, 'counter', 'provider', '2,700 with lunch for 250 included.'], [2700, 'accepted', 'customer', 'Confirmed.']] },
    { customer: 'ali', event: 'banquet', status: 'negotiating', eventDay: 60,
        history: [[4600, 'offer', 'customer', 'Can you do 4,600 for 300 guests if we skip the second dessert?'], [5000, 'counter', 'provider', 'I can do 5,000 with one dessert and drinks included.']] },
    { customer: 'hira', event: 'photo', status: 'pending', eventDay: 50,
        history: [[1500, 'offer', 'customer', 'Is 1,500 possible without the printed album?']] },
    { customer: 'ali', event: 'mehndi', status: 'disputed', eventDay: -5, escrow: 'held',
        history: [[1300, 'offer', 'customer', 'Mehndi for about 150 guests.'], [1500, 'counter', 'provider', 'Full package is 1,500.'], [1500, 'accepted', 'customer', 'Okay, booked.']] },
    { customer: 'fatima', event: 'birthday', status: 'cancelled', eventDay: 20,
        history: [[800, 'offer', 'customer', 'For my son\'s birthday, 80 guests.']] },
];

/* ----------------------------------------------------------------- run */

const report = { users: [], profiles: 0, services: 0, events: 0, images: 0, bookings: 0, tickets: 0, reviews: 0, skipped: 0 };

async function ensureUser(u, hash) {
    let user = await User.findOne({ email: u.email });
    if (user) { report.skipped++; return user; }
    report.users.push(`${u.role.padEnd(10)} ${u.email}`);
    if (DRY) return { _id: new mongoose.Types.ObjectId(), ...u, _dry: true };
    user = await User.create({ name: u.name, email: u.email, role: u.role, password: hash, isEmailVerified: true });
    return user;
}

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set.');
    const host = uri.replace(/\/\/[^@]*@/, '//***@').split('?')[0];
    console.log(`${DRY ? 'DRY RUN' : 'WRITING'} against ${host}`);
    await mongoose.connect(uri);

    const hash = await bcrypt.hash(PASSWORD, 10);
    const users = {};
    for (const u of USERS) users[u.key] = await ensureUser(u, hash);

    const profiles = {};
    for (const u of USERS.filter((x) => x.profile)) {
        const owner = users[u.key];
        let profile = owner._dry ? null : await VendorProfile.findOne({ userId: owner._id });
        if (!profile) {
            report.profiles++;
            profile = DRY ? { _id: new mongoose.Types.ObjectId() } : await VendorProfile.create({ userId: owner._id, ...u.profile });
        } else report.skipped++;
        profiles[u.key] = profile;
    }

    for (const s of SERVICES) {
        const vendorId = profiles[s.owner]._id;
        const exists = DRY && users[s.owner]._dry ? null : await Service.findOne({ vendorId, title: s.title });
        if (exists) { report.skipped++; continue; }
        report.services++;
        if (!DRY) await Service.create({ vendorId, title: s.title, price: s.price, description: s.description, eventType: s.eventType });
    }

    const events = {};
    for (const e of EVENTS) {
        const owner = users[e.owner];
        let ev = owner._dry ? null : await Event.findOne({ title: e.title, createdBy: owner._id });
        if (!ev) {
            report.events++;
            const doc = { image: EVENT_IMAGES[e.key], title: e.title, category: e.category, price: e.price, capacity: e.capacity, location: e.location, description: e.description, date: inDays(e.days), createdBy: owner._id, status: 'upcoming' };
            ev = DRY ? { _id: new mongoose.Types.ObjectId(), ...doc } : await Event.create(doc);
        } else if (!ev.image && EVENT_IMAGES[e.key]) {
            // Our own demo event without a photo: add one (the only update this script makes).
            report.images++;
            if (!DRY) await Event.updateOne({ _id: ev._id, image: { $in: [null, ''] } }, { $set: { image: EVENT_IMAGES[e.key] } });
        } else report.skipped++;
        events[e.key] = ev;
    }

    for (const b of BOOKINGS) {
        const customer = users[b.customer];
        const event = events[b.event];
        const eventDef = EVENTS.find((e) => e.key === b.event);
        const vendor = users[eventDef.owner];
        const existing = (customer._dry || DRY && !event.createdAt) ? null : await Booking.findOne({ customerId: customer._id, eventId: event._id });
        if (existing) { report.skipped++; continue; }

        const when = inDays(b.eventDay);
        const history = b.history.map(([price, action, by, message], i) => ({
            price, action, message,
            offeredBy: by === 'customer' ? customer._id : vendor._id,
            timestamp: new Date(Date.now() - (b.history.length - i + 3) * DAY),
        }));
        const last = b.history[b.history.length - 1][0];
        const prev = b.history.length > 1 ? b.history[b.history.length - 2][0] : undefined;
        const escrow = b.escrow
            ? { status: b.escrow, amount: last, heldAt: new Date(Date.now() - 3 * DAY), ...(b.escrow === 'released' ? { settledAt: inDays(b.eventDay + 1) } : {}) }
            : { status: 'none' };

        report.bookings++;
        if (DRY) continue;
        await Booking.create({
            customerId: customer._id, vendorId: vendor._id, eventId: event._id,
            eventDetails: { eventType: eventDef.category, date: when, location: eventDef.location, budget: last },
            status: b.status, offerPrice: last, lastPrice: prev, escrow, negotiationHistory: history,
            ...(b.status === 'cancelled' ? { cancelledBy: customer._id } : {}),
        });

        if (b.ticket || b.status === 'completed') {
            if (!(await Ticket.findOne({ event: event._id, attendee: customer._id }))) {
                const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
                const payload = JSON.stringify({ ticketNumber, eventId: String(event._id), attendeeId: String(customer._id) });
                await Ticket.create({
                    event: event._id, attendee: customer._id, ticketNumber,
                    qrCodeData: await QRCode.toDataURL(payload), ticketType: 'General', price: last,
                    status: b.status === 'completed' ? 'checked_in' : 'active',
                    ...(b.status === 'completed' ? { checkInTime: when } : {}),
                });
                report.tickets++;
            }
        }
        if (b.review && !(await Review.findOne({ event: event._id, user: customer._id }))) {
            await Review.create({ event: event._id, user: customer._id, rating: b.review.rating, comment: b.review.comment });
            report.reviews++;
        }
    }

    if (!DRY) {
        const { recalculateTrustScore } = require('../services/trustScoreService');
        for (const u of USERS.filter((x) => x.role === 'provider')) await recalculateTrustScore(users[u.key]._id);
    }

    console.log(`\nNew accounts (${report.users.length}):`);
    report.users.forEach((l) => console.log('  ' + l));
    console.log(`Vendor profiles: ${report.profiles}, services: ${report.services}, events: ${report.events}, photos added to existing demo events: ${report.images}, bookings: ${report.bookings}` +
        (DRY ? '' : `, tickets: ${report.tickets}, reviews: ${report.reviews}`));
    console.log(`Already present and left untouched: ${report.skipped}`);
    if (!DRY && report.users.length) console.log(`New accounts use the demo password from DEMO_PASSWORD (default "password123"). Change them before real users join.`);
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('Demo data failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
