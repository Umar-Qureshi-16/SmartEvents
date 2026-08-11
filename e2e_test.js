#!/usr/bin/env node
// SmartEvents E2E Test Script v2 - clean output
const http = require('http');

const BASE = 'http://localhost:5000/api/v1';
let CUSTOMER_TOKEN = '';
let PROVIDER_TOKEN = '';
let ADMIN_TOKEN = '';
let EVENT_ID = '';
let NEW_EVENT_ID = '';
let BOOKING_ID = '';
let REVIEW_ID = '';

const results = {};

function req(method, path, body, token) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const url = new URL(BASE + path);
        const options = {
            hostname: url.hostname,
            port: parseInt(url.port) || 80,
            path: url.pathname + (url.search || ''),
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            },
        };
        const r = http.request(options, (res) => {
            let raw = '';
            res.on('data', (c) => (raw += c));
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        r.on('error', (e) => resolve({ status: 0, body: { error: e.message, code: e.code } }));
        if (data) r.write(data);
        r.end();
    });
}

function record(id, pass, note) {
    results[id] = { pass, note };
}

async function run() {
    // 1a. Register Customer
    {
        const r = await req('POST', '/auth/register', {
            name: 'Test Customer', email: 'testcustomer@smartevents.com',
            password: 'Test@1234', role: 'customer'
        });
        if (r.status === 201 && (r.body.accessToken || r.body.token))
            record('1a', true, `Token received. User: ${r.body.user?.email}`);
        else record('1a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 1b. Register Provider
    {
        const r = await req('POST', '/auth/register', {
            name: 'Test Provider', email: 'testprovider@smartevents.com',
            password: 'Test@1234', role: 'provider'
        });
        if (r.status === 201 && (r.body.accessToken || r.body.token))
            record('1b', true, `Token received. User: ${r.body.user?.email}`);
        else record('1b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 1c. Login Customer
    {
        const r = await req('POST', '/auth/login', {
            email: 'testcustomer@smartevents.com', password: 'Test@1234'
        });
        const tok = r.body.accessToken || r.body.token;
        if (r.status === 200 && tok) {
            CUSTOMER_TOKEN = tok;
            record('1c', true, `Logged in. Token: ${tok.substring(0, 30)}...`);
        } else record('1c', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 1d. Login Provider
    {
        const r = await req('POST', '/auth/login', {
            email: 'testprovider@smartevents.com', password: 'Test@1234'
        });
        const tok = r.body.accessToken || r.body.token;
        if (r.status === 200 && tok) {
            PROVIDER_TOKEN = tok;
            record('1d', true, `Logged in. Token: ${tok.substring(0, 30)}...`);
        } else record('1d', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 1e. Get current user
    {
        const r = await req('GET', '/auth/me', null, CUSTOMER_TOKEN);
        const user = r.body.user || r.body.data || r.body;
        if (r.status === 200 && (user.email || user._id))
            record('1e', true, `User: ${user.name} <${user.email}> role=${user.role}`);
        else record('1e', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 2a. Get all events
    {
        const r = await req('GET', '/events');
        const arr = Array.isArray(r.body) ? r.body : (r.body.events || r.body.data || []);
        if (r.status === 200 && arr.length > 0) {
            EVENT_ID = arr[0]._id;
            record('2a', true, `${arr.length} events. First title: "${arr[0].title}", ID: ${EVENT_ID}`);
        } else record('2a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}, arr.length=${arr.length}`);
    }

    // 2b. Get single event
    {
        const r = await req('GET', `/events/${EVENT_ID}`);
        const evt = r.body.event || r.body.data || r.body;
        if (r.status === 200 && (evt.title || evt._id))
            record('2b', true, `Event: "${evt.title}", category: ${evt.category}`);
        else record('2b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 2c. Create event as Provider
    {
        const r = await req('POST', '/events', {
            title: 'Test Wedding Package',
            description: 'A beautiful wedding package for up to 200 guests',
            category: 'Wedding',
            price: 150000,
            date: '2026-12-15',
            capacity: 200,
            location: 'Lahore, Pakistan'
        }, PROVIDER_TOKEN);
        const evt = r.body.event || r.body.data || r.body;
        if (r.status === 201 && evt._id) {
            NEW_EVENT_ID = evt._id;
            record('2c', true, `Created event ID: ${NEW_EVENT_ID}, title: "${evt.title}"`);
        } else record('2c', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 2d. Provider my events
    {
        const r = await req('GET', '/events/organizer/my-events', null, PROVIDER_TOKEN);
        const arr = Array.isArray(r.body) ? r.body : (r.body.events || r.body.data || []);
        if (r.status === 200)
            record('2d', true, `${arr.length} events for provider`);
        else record('2d', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 3a. Initial offer
    {
        const r = await req('POST', '/bookings', {
            eventId: NEW_EVENT_ID,
            offerPrice: 120000,
            note: 'Can you offer a discount for early booking?'
        }, CUSTOMER_TOKEN);
        const bk = r.body.booking || r.body.data || r.body;
        if (r.status === 201 && bk._id) {
            BOOKING_ID = bk._id;
            const hist = bk.negotiationHistory || [];
            record('3a', true, `Booking ID: ${BOOKING_ID}, status: ${bk.status}, negotiationHistory entries: ${hist.length}`);
        } else record('3a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 3b. Customer my bookings
    {
        const r = await req('GET', '/bookings/my', null, CUSTOMER_TOKEN);
        const arr = Array.isArray(r.body) ? r.body : (r.body.bookings || r.body.data || []);
        if (r.status === 200)
            record('3b', true, `${arr.length} bookings`);
        else record('3b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 3c. Get single booking
    {
        const r = await req('GET', `/bookings/${BOOKING_ID}`, null, CUSTOMER_TOKEN);
        const bk = r.body.booking || r.body.data || r.body;
        if (r.status === 200 && bk._id) {
            const hist = bk.negotiationHistory || [];
            record('3c', true, `Booking status: ${bk.status}, negotiationHistory: ${JSON.stringify(hist).substring(0, 150)}`);
        } else record('3c', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 3d. Provider incoming bookings
    {
        const r = await req('GET', '/bookings/organizer', null, PROVIDER_TOKEN);
        const arr = Array.isArray(r.body) ? r.body : (r.body.bookings || r.body.data || []);
        if (r.status === 200)
            record('3d', true, `${arr.length} incoming bookings`);
        else record('3d', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 3e. Provider counter offer
    {
        const r = await req('POST', `/bookings/${BOOKING_ID}/negotiate`, {
            price: 135000, note: 'This is our best rate including decoration'
        }, PROVIDER_TOKEN);
        const bk = r.body.booking || r.body.data || r.body;
        if (r.status === 200) {
            const hist = bk.negotiationHistory || [];
            record('3e', true, `Counter offered. negotiationHistory entries: ${hist.length}, last: ${JSON.stringify(hist[hist.length - 1]).substring(0, 120)}`);
        } else record('3e', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 3f. Accept offer
    {
        const r = await req('PUT', `/bookings/${BOOKING_ID}/accept`, null, CUSTOMER_TOKEN);
        const bk = r.body.booking || r.body.data || r.body;
        if (r.status === 200)
            record('3f', true, `Booking status now: ${bk.status}`);
        else record('3f', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 4a. Submit review
    {
        const r = await req('POST', '/reviews', {
            eventId: NEW_EVENT_ID, rating: 5,
            comment: 'Excellent service and very professional team!'
        }, CUSTOMER_TOKEN);
        const rv = r.body.review || r.body.data || r.body;
        if (r.status === 201 && rv._id) {
            REVIEW_ID = rv._id;
            record('4a', true, `Review ID: ${REVIEW_ID}, rating: ${rv.rating}`);
        } else record('4a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 4b. Get event reviews
    {
        const r = await req('GET', `/reviews/event/${NEW_EVENT_ID}`);
        const arr = Array.isArray(r.body) ? r.body : (r.body.reviews || r.body.data || []);
        if (r.status === 200)
            record('4b', true, `${arr.length} reviews for event`);
        else record('4b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 5a. Notifications
    {
        const r = await req('GET', '/notifications', null, CUSTOMER_TOKEN);
        const arr = Array.isArray(r.body) ? r.body : (r.body.notifications || r.body.data || []);
        if (r.status === 200)
            record('5a', true, `${arr.length} notifications`);
        else record('5a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 5b. Mark all read
    {
        const r = await req('PUT', '/notifications/read-all', null, CUSTOMER_TOKEN);
        if (r.status === 200)
            record('5b', true, `All notifications marked read`);
        else record('5b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 6a. Chatbot single message
    let chatReply6a = '';
    {
        let r = await req('POST', '/chatbot/message', {
            message: 'What kind of events can I book on SmartEvents?',
            conversationHistory: []
        }, CUSTOMER_TOKEN);
        if (r.status !== 200) {
            // try alt path
            r = await req('POST', '/chatbot', {
                message: 'What kind of events can I book on SmartEvents?',
                conversationHistory: []
            }, CUSTOMER_TOKEN);
        }
        if (r.status === 200) {
            chatReply6a = r.body.reply || r.body.message || JSON.stringify(r.body).substring(0, 150);
            record('6a', true, `Reply: ${chatReply6a.substring(0, 150)}`);
        } else record('6a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 6b. Multi-turn
    {
        const r = await req('POST', '/chatbot/message', {
            message: 'How does the price negotiation work?',
            conversationHistory: [
                { role: 'user', content: 'What kind of events can I book on SmartEvents?' },
                { role: 'assistant', content: chatReply6a || 'SmartEvents offers various event types.' }
            ]
        }, CUSTOMER_TOKEN);
        if (r.status === 200) {
            const reply = r.body.reply || r.body.message || JSON.stringify(r.body).substring(0, 150);
            record('6b', true, `Reply: ${reply.substring(0, 150)}`);
        } else record('6b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 7a. Admin login
    {
        const r = await req('POST', '/auth/login', {
            email: 'admin@smartevents.com', password: 'password123'
        });
        const tok = r.body.accessToken || r.body.token;
        if (r.status === 200 && tok) {
            ADMIN_TOKEN = tok;
            record('7a', true, `Admin logged in`);
        } else record('7a', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 200)}`);
    }

    // 7b. Get all users
    {
        const r = await req('GET', '/admin/users', null, ADMIN_TOKEN);
        const arr = Array.isArray(r.body) ? r.body : (r.body.users || r.body.data || []);
        if (r.status === 200)
            record('7b', true, `${arr.length} users`);
        else record('7b', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // 7c. Platform stats
    {
        const r = await req('GET', '/admin/stats', null, ADMIN_TOKEN);
        if (r.status === 200) {
            const stats = r.body.stats || r.body.data || r.body;
            record('7c', true, `Stats: ${JSON.stringify(stats).substring(0, 200)}`);
        } else record('7c', false, `Status ${r.status}: ${JSON.stringify(r.body).substring(0, 300)}`);
    }

    // Print clean final output
    console.log(JSON.stringify(results, null, 2));
}

run().catch(e => { console.error('FATAL:', e.message); });
