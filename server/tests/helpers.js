const request = require('supertest');
const createApp = require('../app');
const User = require('../models/User');
const Event = require('../models/Event');

const app = createApp();
const api = () => request(app);

const PASSWORD = 'password123';

/**
 * Registers a user and returns { user, token, id }.
 * Elevated roles bypass the public signup route, which only permits
 * customer|provider, by writing straight to the database.
 */
async function makeUser(role = 'customer', overrides = {}) {
    const email = overrides.email || `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`;
    const name = overrides.name || `Test ${role}`;

    if (role === 'customer' || role === 'provider') {
        await api().post('/api/v1/auth/register').send({ name, email, password: PASSWORD, role });
        await User.findOneAndUpdate({ email }, { isEmailVerified: true });
    } else {
        const bcrypt = require('bcrypt');
        await User.create({ name, email, password: await bcrypt.hash(PASSWORD, 10), role, isEmailVerified: true });
    }

    const res = await api().post('/api/v1/auth/login').send({ email, password: PASSWORD });
    return {
        user: res.body.user,
        token: res.body.token,
        refreshToken: res.body.refreshToken,
        id: res.body.user.id,
        email,
    };
}

/** Creates an event owned by the given provider. */
async function makeEvent(providerId, overrides = {}) {
    return Event.create({
        title: 'Test Event',
        category: 'Corporate',
        price: 5000,
        description: 'An event created for automated testing purposes.',
        location: 'Lahore',
        capacity: 100,
        date: new Date(Date.now() + 30 * 86400000),
        createdBy: providerId,
        ...overrides,
    });
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, api, makeUser, makeEvent, auth, PASSWORD };
