const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const QRCode = require('qrcode');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');

async function seedData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        // Clear existing data
        console.log('Purging database...');
        await User.deleteMany({});
        await Event.deleteMany({});
        await Booking.deleteMany({});
        await Ticket.deleteMany({});

        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Create a Primary Provider (Muhammad Umar)
        const provider = await User.create({
            name: 'Muhammad Umar (Lead Provider)',
            email: 'umar_provider@example.com',
            password: hashedPassword,
            role: 'provider'
        });

        // 1.1 Create Admin and Super Admin
        await User.create({
            name: 'System Admin',
            email: 'admin@smartevents.com',
            password: hashedPassword,
            role: 'admin'
        });
        await User.create({
            name: 'Super Admin',
            email: 'superadmin@smartevents.com',
            password: hashedPassword,
            role: 'superadmin'
        });

        // 2. Create Multiple Customers
        const customer1 = await User.create({
            name: 'Ali Ahmed',
            email: 'ali@example.com',
            password: hashedPassword,
            role: 'customer'
        });
        const customer2 = await User.create({
            name: 'Sara Khan',
            email: 'sara@example.com',
            password: hashedPassword,
            role: 'customer'
        });
        const customer3 = await User.create({
            name: 'Hamza Malik',
            email: 'hamza@example.com',
            password: hashedPassword,
            role: 'customer'
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
                const ticketNumber = `TICK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                const qrContent = JSON.stringify({ ticketNumber, bookingId: booking._id, role: 'ATTENDEE' });
                const qrCode = await QRCode.toDataURL(qrContent);

                await Ticket.create({
                    bookingId: booking._id,
                    event: data.eventId,
                    attendee: data.customerId,
                    ticketNumber,
                    qrCode,
                    status: data.status === 'completed' ? 'used' : 'valid'
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
