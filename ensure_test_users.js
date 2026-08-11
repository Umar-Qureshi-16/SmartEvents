const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/eventflow';

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,
    phone: String,
    vendorProfile: Object
});

const User = mongoose.model('User', userSchema);

async function seedTestUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB for Seeding...');

        const salt = await bcrypt.genSalt(10);
        const testAccounts = [
            {
                name: 'Super Admin Governance',
                email: 'admin@smartie.io',
                password: await bcrypt.hash('admin123', salt),
                role: 'admin'
            },
            {
                name: 'Global Events Organizer',
                email: 'organizer@smartie.io',
                password: await bcrypt.hash('org123', salt),
                role: 'organizer'
            },
            {
                name: 'Apex Catering & Stages',
                email: 'vendor@smartie.io',
                password: await bcrypt.hash('vendor123', salt),
                role: 'vendor',
                vendorProfile: { category: 'Catering & AV', bio: 'Premier stage & gourmet catering', rating: 4.9, totalReviews: 128 }
            },
            {
                name: 'Sarah Jenkins (Attendee)',
                email: 'attendee@smartie.io',
                password: await bcrypt.hash('attendee123', salt),
                role: 'organizer'
            }
        ];

        for (const acc of testAccounts) {
            await User.findOneAndUpdate({ email: acc.email }, acc, { upsert: true, new: true });
            console.log(`Seeded Test Account: ${acc.role.toUpperCase()} -> ${acc.email}`);
        }

        console.log('Seeding Complete!');
        process.exit(0);
    } catch (err) {
        console.error('Seeding Failed:', err);
        process.exit(1);
    }
}

seedTestUsers();
