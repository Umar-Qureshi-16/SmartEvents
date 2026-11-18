/**
 * Copies the demo vendors' packages and events (with their photos) to a real
 * vendor account, so the marketplace and the planner have content after the
 * demo accounts are blocked. Insert-only: nothing is changed or deleted, and
 * items the target already has (same title) are skipped, so it is safe to rerun.
 *
 *   node scripts/copyDemoToVendor.js you@example.com --dry-run
 *   node scripts/copyDemoToVendor.js you@example.com
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Service = require('../models/Service');
const Event = require('../models/Event');

const DEMO_VENDORS = [
    'umar_provider@example.com',
    'zainab.catering@example.com',
    'hassan.lens@example.com',
    'ayesha.decor@example.com',
];

const email = (process.argv[2] || '').toLowerCase().trim();
const DRY = process.argv.includes('--dry-run');

(async () => {
    if (!email || email.startsWith('--')) throw new Error('Usage: node scripts/copyDemoToVendor.js <vendor email> [--dry-run]');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(DRY ? 'DRY RUN (nothing is written)' : 'WRITING');

    const target = await User.findOne({ email }).select('_id role status name').lean();
    if (!target || target.role !== 'provider') throw new Error(`${email} is not a vendor account.`);
    const profile = await VendorProfile.findOne({ userId: target._id }).lean();
    if (!profile) throw new Error(`${email} has no vendor profile yet.`);

    const demoUsers = await User.find({ email: { $in: DEMO_VENDORS } }).select('_id').lean();
    const demoProfiles = await VendorProfile.find({ userId: { $in: demoUsers.map((u) => u._id) } }).lean();

    const haveServices = new Set((await Service.find({ vendorId: profile._id }).select('title').lean()).map((s) => s.title));
    const services = await Service.find({ vendorId: { $in: demoProfiles.map((p) => p._id) } }).lean();
    const catOf = new Map(demoProfiles.map((p) => [String(p._id), p.category]));
    const newServices = services.filter((s) => !haveServices.has(s.title)).map((s) => ({
        vendorId: profile._id, title: s.title, price: s.price, description: s.description, eventType: s.eventType,
        images: s.images || [], isAvailable: s.isAvailable !== false, category: s.category || catOf.get(String(s.vendorId)) || null,
    }));

    const haveEvents = new Set((await Event.find({ createdBy: target._id }).select('title').lean()).map((e) => e.title));
    const events = await Event.find({ createdBy: { $in: demoUsers.map((u) => u._id) } }).lean();
    const newEvents = events.filter((e) => !haveEvents.has(e.title)).map((e) => ({
        title: e.title, price: e.price, description: e.description, category: e.category, date: e.date,
        status: e.status, capacity: e.capacity, location: e.location, image: e.image, createdBy: target._id,
    }));

    console.log(`Target: ${target.name} (${profile.businessName}, ${profile.category})`);
    console.log(`Packages to copy: ${newServices.length}`);
    newServices.forEach((s) => console.log(`  [${s.category}] ${s.title} - ${s.price}`));
    console.log(`Events to copy: ${newEvents.length}`);
    newEvents.forEach((e) => console.log(`  ${e.title} - ${new Date(e.date).toISOString().slice(0, 10)} - ${e.price}${e.image ? ' (photo)' : ''}`));
    console.log(`Already there, skipped: ${services.length - newServices.length} packages, ${events.length - newEvents.length} events`);

    if (!DRY) {
        if (newServices.length) await Service.insertMany(newServices);
        if (newEvents.length) await Event.insertMany(newEvents);
        console.log('Copied.');
    }
    await mongoose.disconnect();
})().catch(async (err) => {
    console.error('Failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
