require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const MONGODB_URI = require('../config/env').MONGODB_URI;

const seed = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        const password = 'Password123!';
        const hashedPassword = await bcrypt.hash(password, 10);

        const users = [
            {
                name: 'Super Admin Node',
                email: 'superadmin@smartevents.com',
                password: hashedPassword,
                role: 'superadmin'
            },
            {
                name: 'Pro Vendor X',
                email: 'provider_pro@smartevents.com',
                password: hashedPassword,
                role: 'provider',
                businessDetails: { companyName: 'Elite Events Ltd.', verified: true }
            },
            {
                name: 'Elite Customer',
                email: 'customer_v2@smartevents.com',
                password: hashedPassword,
                role: 'customer'
            }
        ];

        for (const u of users) {
            await User.findOneAndUpdate(
                { email: u.email },
                u,
                { upsert: true, new: true }
            );
            console.log(`Synced user: ${u.email} [${u.role}]`);
        }

        console.log('Seeding complete. Credentials:');
        console.log('Password for all: Password123!');

        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seed();
