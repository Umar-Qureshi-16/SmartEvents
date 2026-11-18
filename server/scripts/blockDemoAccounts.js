/**
 * Blocks (or unblocks) the demonstration accounts created by seedDemoData.js,
 * so nobody can sign in to them on a live deployment. Their events, bookings
 * and reviews stay as sample content; blocked vendors take no new bookings.
 *
 *   node scripts/blockDemoAccounts.js --dry-run   # list what would change
 *   node scripts/blockDemoAccounts.js             # block them (status: banned)
 *   node scripts/blockDemoAccounts.js --unblock   # make them active again
 *
 * Only these exact emails are touched.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const DEMO_EMAILS = [
    'superadmin@smartevents.com',
    'admin@smartevents.com',
    'umar_provider@example.com',
    'zainab.catering@example.com',
    'hassan.lens@example.com',
    'ayesha.decor@example.com',
    'ali@example.com',
    'fatima.noor@example.com',
    'bilal.hassan@example.com',
    'hira.tariq@example.com',
];

const DRY = process.argv.includes('--dry-run');
const UNBLOCK = process.argv.includes('--unblock');
const target = UNBLOCK ? 'active' : 'banned';

(async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not set.');
    console.log(`${DRY ? 'DRY RUN' : 'WRITING'}: set status=${target} on demo accounts in ${uri.replace(/\/\/[^@]*@/, '//***@').split('?')[0]}`);
    await mongoose.connect(uri);
    const users = await User.find({ email: { $in: DEMO_EMAILS } }).select('email role status').lean();
    for (const u of users) console.log(`  ${u.role.padEnd(10)} ${u.email.padEnd(30)} ${u.status || 'active'} -> ${target}`);
    if (!DRY && users.length) {
        const res = await User.updateMany({ email: { $in: DEMO_EMAILS } }, { $set: { status: target } });
        console.log(`Updated ${res.modifiedCount} of ${users.length} demo accounts.`);
    }
    if (!users.length) console.log('No demo accounts found.');
    await mongoose.disconnect();
})().catch(async (err) => {
    console.error('Failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
