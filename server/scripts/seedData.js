const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const VendorProfile = require('../models/VendorProfile');
const Service = require('../models/Service');
const Review = require('../models/Review');

async function seedData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(require('../config/env').MONGODB_URI);
        console.log('Connected!');

        // Clear existing data
        console.log('Purging database...');
        await User.deleteMany({});
        await Event.deleteMany({});
        await Booking.deleteMany({});
        await Ticket.deleteMany({});
        await VendorProfile.deleteMany({});
        await Service.deleteMany({});
        await Review.deleteMany({});

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Create a Primary Provider (Muhammad Umar)
        const provider = await User.create({
            name: 'Muhammad Umar (Lead Provider)',
            email: 'umar_provider@example.com',
            password: hashedPassword,
            role: 'provider',
            isEmailVerified: true
        });

        // 1.1 Create Admin and Super Admin
        await User.create({
            name: 'System Admin',
            email: 'admin@smartevents.com',
            password: hashedPassword,
            role: 'admin',
            isEmailVerified: true
        });
        await User.create({
            name: 'Super Admin',
            email: 'superadmin@smartevents.com',
            password: hashedPassword,
            role: 'superadmin',
            isEmailVerified: true
        });

        // 1.2 Additional providers, each with a real VendorProfile and packages,
        //     so the public vendor directory has genuine records to list. It
        //     previously had none, which is why the marketplace page was mocked.
        const providerSpecs = [
            {
                name: 'Ayesha Khan', email: 'ayesha_catering@example.com',
                businessName: 'Gourmet Royale Catering', category: 'catering', location: 'Lahore',
                description: 'Multi-cuisine wedding and corporate catering with in-house service staff.',
                packages: [
                    { title: 'Silver Buffet (100 guests)', price: 180000, description: 'Three-course buffet with service staff.', includes: ['3 mains', '2 desserts', 'Service crew'] },
                    { title: 'Gold Banquet (250 guests)', price: 420000, description: 'Premium banquet with live cooking stations.', includes: ['5 mains', 'Live BBQ', 'Waitstaff', 'Crockery'] }
                ]
            },
            {
                name: 'Bilal Ahmed', email: 'bilal_photo@example.com',
                businessName: 'Lumina Studios', category: 'photography', location: 'Islamabad',
                description: 'Documentary-style wedding photography and 4K cinematography.',
                packages: [
                    { title: 'Single Day Coverage', price: 95000, description: 'One photographer and one cinematographer.', includes: ['8 hours', '300 edited photos', 'Highlight reel'] },
                    { title: 'Full Wedding Package', price: 240000, description: 'Three-event coverage with drone.', includes: ['3 events', 'Drone footage', 'Album', 'Full film'] }
                ]
            },
            {
                name: 'Sana Malik', email: 'sana_decor@example.com',
                businessName: 'Bloom and Co. Decor', category: 'decoration', location: 'Karachi',
                description: 'Floral installations, stage design and themed event styling.',
                packages: [
                    { title: 'Classic Stage Setup', price: 120000, description: 'Floral stage with lighting.', includes: ['Stage florals', 'Uplighting', 'Setup crew'] },
                    { title: 'Full Venue Styling', price: 350000, description: 'Complete venue transformation.', includes: ['Entrance', 'Stage', 'Table centrepieces', 'Lighting'] }
                ]
            },
            {
                name: 'Hassan Raza', email: 'hassan_venue@example.com',
                businessName: 'The Grand Pavilion', category: 'venue', location: 'Lahore',
                description: 'Indoor and outdoor banquet halls seating up to 800 guests.',
                packages: [
                    { title: 'Garden Lawn (300 guests)', price: 300000, description: 'Open-air lawn with parking.', includes: ['Lawn', 'Parking', 'Basic lighting'] },
                    { title: 'Grand Hall (800 guests)', price: 750000, description: 'Air-conditioned hall with stage.', includes: ['Hall', 'Stage', 'AV rig', 'Valet'] }
                ]
            },
            {
                name: 'Zara Sheikh', email: 'zara_music@example.com',
                businessName: 'Aura Sound and Light', category: 'music', location: 'Islamabad',
                description: 'Live bands, DJs and concert-grade sound and lighting.',
                packages: [
                    { title: 'DJ Night', price: 85000, description: 'DJ with full sound and lighting rig.', includes: ['DJ', 'Sound system', 'Dance floor lighting'] }
                ]
            }
        ];

        console.log('Creating vendor profiles and service packages...');
        for (const spec of providerSpecs) {
            const providerUser = await User.create({
                name: spec.name, email: spec.email, password: hashedPassword, role: 'provider',
                trustScore: 70 + Math.floor(Math.random() * 25),
                businessDetails: { companyName: spec.businessName, verified: true },
                isEmailVerified: true
            });

            const profile = await VendorProfile.create({
                userId: providerUser._id,
                businessName: spec.businessName,
                description: spec.description,
                category: spec.category,
                location: spec.location,
                packages: spec.packages,
                rating: Number((4 + Math.random()).toFixed(2)),
                reviewsCount: Math.floor(Math.random() * 40) + 5
            });

            for (const pkg of spec.packages) {
                await Service.create({
                    vendorId: profile._id,
                    title: pkg.title,
                    price: pkg.price,
                    description: pkg.description,
                    eventType: spec.category === 'venue' ? 'wedding' : spec.category
                });
            }
        }

        // The lead provider needs a profile too, or their own public page and
        // the directory have nothing to show for them.
        const leadProfile = await VendorProfile.create({
            userId: provider._id,
            businessName: 'Umar Events and Production',
            description: 'Full-service event production covering venues, catering coordination and staging.',
            category: 'venue',
            location: 'Lahore',
            packages: [
                { title: 'Complete Wedding Production', price: 850000, description: 'End-to-end wedding management.', includes: ['Venue', 'Catering', 'Decor', 'Photography'] },
                { title: 'Corporate Event Package', price: 450000, description: 'Conference and summit production.', includes: ['Venue', 'AV', 'Catering', 'Registration desk'] }
            ],
            rating: 4.8,
            reviewsCount: 32
        });
        for (const pkg of leadProfile.packages) {
            await Service.create({
                vendorId: leadProfile._id, title: pkg.title, price: pkg.price,
                description: pkg.description, eventType: 'wedding'
            });
        }

        // 2. Create Multiple Customers
        const customer1 = await User.create({
            name: 'Ali Ahmed',
            email: 'ali@example.com',
            password: hashedPassword,
            role: 'customer',
            isEmailVerified: true
        });
        const customer2 = await User.create({
            name: 'Sara Khan',
            email: 'sara@example.com',
            password: hashedPassword,
            role: 'customer',
            isEmailVerified: true
        });
        const customer3 = await User.create({
            name: 'Hamza Malik',
            email: 'hamza@example.com',
            password: hashedPassword,
            role: 'customer',
            isEmailVerified: true
        });

        // 3. Create Diverse Events
        const events = await Event.insertMany([
            { title: 'Grand Royal Wedding', price: 8500, description: 'Luxury 5-star venue with full decor.', category: 'Wedding', date: new Date('2025-09-10'), location: 'Pearl Continental, Lahore', createdBy: provider._id, status: 'upcoming' },
            { title: 'Corporate Tech Summit', price: 4500, description: 'High-speed internet, AV, and buffet.', category: 'Corporate', date: new Date('2025-10-05'), location: 'Marriott, Islamabad', createdBy: provider._id, status: 'upcoming' },
            { title: 'Neon Birthday Party', price: 1500, description: 'DJ, neon lights, and themed cake.', category: 'Birthday', date: new Date('2025-11-20'), location: 'Garden Town, Lahore', createdBy: provider._id, status: 'upcoming' },
            { title: 'Minimalist Nikkah', price: 3000, description: 'Elegant and simple setup for 50 guests.', category: 'Wedding', date: new Date('2025-08-15'), location: 'Badshahi Mosque, Lahore', createdBy: provider._id, status: 'upcoming' },
            { title: 'Executive Workshop', price: 2000, description: 'Intimate setting for 20 professionals.', category: 'Corporate', date: new Date('2025-12-01'), location: 'DHA, Lahore', createdBy: provider._id, status: 'upcoming' }
        ]);

        // 4. Detailed Booking History (12 Bookings)
        const bookingsData = [
            // Past/Completed (Revenue impact)
            { customerId: customer1._id, eventId: events[0]._id, status: 'completed', amount: 8500, date: new Date('2025-01-10'), type: 'wedding' },
            { customerId: customer2._id, eventId: events[1]._id, status: 'completed', amount: 4500, date: new Date('2025-02-15'), type: 'corporate' },
            { customerId: customer3._id, eventId: events[2]._id, status: 'completed', amount: 1500, date: new Date('2025-03-05'), type: 'birthday' },
            { customerId: customer1._id, eventId: events[4]._id, status: 'completed', amount: 2000, date: new Date('2025-03-20'), type: 'corporate' },

            // Current/Confirmed (Pipeline impact)
            { customerId: customer2._id, eventId: events[0]._id, status: 'confirmed', amount: 8000, date: new Date('2025-06-15'), type: 'wedding' },
            { customerId: customer3._id, eventId: events[3]._id, status: 'confirmed', amount: 3000, date: new Date('2025-07-01'), type: 'wedding' },

            // New Leads/Pending
            { customerId: customer1._id, eventId: events[2]._id, status: 'pending', amount: 1500, date: new Date('2025-11-20'), type: 'birthday', msg: 'Need a Spiderman theme!' },
            { customerId: customer2._id, eventId: events[4]._id, status: 'pending', amount: 2000, date: new Date('2025-12-01'), type: 'corporate', msg: 'Projector is a must.' },
            { customerId: customer3._id, eventId: events[1]._id, status: 'pending', amount: 4500, date: new Date('2025-10-05'), type: 'corporate', msg: '50 delegates expected.' },

            // Rejected/Canceled
            { customerId: customer1._id, eventId: events[0]._id, status: 'cancelled', amount: 9000, date: new Date('2025-09-10'), type: 'wedding' },
            { customerId: customer2._id, eventId: events[2]._id, status: 'cancelled', amount: 1500, date: new Date('2025-11-20'), type: 'birthday' }
        ];

        console.log('Creating 11 dynamic bookings...');
        for (const data of bookingsData) {
            const bookingStatus = data.status === 'completed' ? 'confirmed' : data.status;

            const booking = await Booking.create({
                customerId: data.customerId,
                vendorId: provider._id,
                eventId: data.eventId,
                eventDetails: {
                    eventType: data.type,
                    date: data.date,
                    location: events.find(e => e._id.toString() === data.eventId.toString()).location,
                    budget: data.amount,
                    message: data.msg || 'Automatic system seed entry.'
                },
                status: bookingStatus,
                offerPrice: data.amount
            });

            // If confirmed or completed, generate a ticket
            if (data.status === 'confirmed' || data.status === 'completed') {
                const ticketNumber = `TKT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
                const qrCodeData = JSON.stringify({
                    ticketNumber,
                    eventId: data.eventId,
                    attendeeId: data.customerId,
                    issuedAt: new Date().toISOString()
                });

                await Ticket.create({
                    bookingId: booking._id,
                    event: data.eventId,
                    attendee: data.customerId,
                    ticketNumber,
                    qrCodeData,
                    ticketType: 'General',
                    price: data.amount,
                    status: data.status === 'completed' ? 'checked_in' : 'active',
                    checkInTime: data.status === 'completed' ? new Date() : null
                });
            }
        }

        console.log('--------------------------------------------------');
        console.log('✅ SEEDING SUCCESSFUL');
        console.log('--------------------------------------------------');
        console.log('\nSuper Admin Credentials:');
        console.log('Email: superadmin@smartevents.com');
        console.log('Pass:  password123');
        console.log('\nAdmin Credentials:');
        console.log('Email: admin@smartevents.com');
        console.log('Pass:  password123');
        console.log('\nProvider Dashboard Credentials:');
        console.log('Email: umar_provider@example.com');
        console.log('Pass:  password123');
        console.log('\nCustomer Dashboard Credentials (Ali):');
        console.log('Email: ali@example.com');
        console.log('Pass:  password123');
        console.log('\nWorkflow Tips:');
        console.log('1. Log in as Ali to see your QR Tickets in the wallet.');
        console.log('2. Log in as Umar to see Revenue Metrics and AI Reports.');
        console.log('3. Ask Smartie: "Show me my business performance report."');
        console.log('--------------------------------------------------');

        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
