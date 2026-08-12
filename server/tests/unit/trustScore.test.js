const mongoose = require('mongoose');
const { recalculateTrustScore } = require('../../services/trustScoreService');
const User = require('../../models/User');
const Event = require('../../models/Event');
const Booking = require('../../models/Booking');
const Review = require('../../models/Review');

/**
 * The trust score is displayed prominently as a reputation signal, so its
 * behaviour needs to be explainable and defensible.
 */
describe('Trust score', () => {
    let vendor, customer;

    beforeEach(async () => {
        vendor = await User.create({ name: 'V', email: `v${Date.now()}@t.com`, password: 'x', role: 'provider' });
        customer = await User.create({ name: 'C', email: `c${Date.now()}@t.com`, password: 'x', role: 'customer' });
    });

    const addBooking = (status, extra = {}) => Booking.create({
        customerId: customer._id,
        vendorId: vendor._id,
        eventDetails: { eventType: 'Corporate', date: new Date(), location: 'Lahore' },
        offerPrice: 1000,
        status,
        ...extra,
    });

    it('returns a neutral baseline for a provider with no history', async () => {
        const score = await recalculateTrustScore(vendor._id);
        expect(score).toBe(70);
    });

    it('stays neutral below the minimum sample size, rather than implying excellence', async () => {
        await addBooking('completed');
        await addBooking('completed');
        const score = await recalculateTrustScore(vendor._id);
        expect(score).toBe(70);
    });

    it('rewards a perfect completion record', async () => {
        for (let i = 0; i < 5; i++) await addBooking('completed');
        const score = await recalculateTrustScore(vendor._id);
        expect(score).toBeGreaterThan(70);
    });

    it('scores a provider who cancels everything far below one who completes everything', async () => {
        for (let i = 0; i < 5; i++) await addBooking('completed');
        const good = await recalculateTrustScore(vendor._id);

        const bad = await User.create({ name: 'B', email: `b${Date.now()}@t.com`, password: 'x', role: 'provider' });
        for (let i = 0; i < 5; i++) {
            await Booking.create({
                customerId: customer._id, vendorId: bad._id,
                eventDetails: { eventType: 'Corporate', date: new Date(), location: 'Lahore' },
                offerPrice: 1000, status: 'cancelled', cancelledBy: bad._id,
            });
        }
        const badScore = await recalculateTrustScore(bad._id);

        expect(good).toBeGreaterThan(badScore);
    });

    it('penalises disputes lost to the customer', async () => {
        for (let i = 0; i < 5; i++) await addBooking('completed');
        const before = await recalculateTrustScore(vendor._id);

        await addBooking('completed', { disputeOutcome: 'refunded_customer' });
        const after = await recalculateTrustScore(vendor._id);

        expect(after).toBeLessThan(before);
    });

    it('penalises no-shows', async () => {
        for (let i = 0; i < 5; i++) await addBooking('completed');
        const before = await recalculateTrustScore(vendor._id);

        await addBooking('no_show');
        const after = await recalculateTrustScore(vendor._id);

        expect(after).toBeLessThan(before);
    });

    it('raises the score for strong reviews', async () => {
        const event = await Event.create({
            title: 'E', category: 'Corporate', price: 100, description: 'Long enough description.',
            location: 'Lahore', capacity: 10, date: new Date(), createdBy: vendor._id,
        });
        for (let i = 0; i < 5; i++) await addBooking('completed');
        const withoutReviews = await recalculateTrustScore(vendor._id);

        await Review.create({ event: event._id, user: customer._id, rating: 5, comment: 'Excellent work' });
        const withReviews = await recalculateTrustScore(vendor._id);

        expect(withReviews).toBeGreaterThan(withoutReviews);
    });

    it('clamps the result to the 0-100 range', async () => {
        for (let i = 0; i < 20; i++) await addBooking('no_show');
        const score = await recalculateTrustScore(vendor._id);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
    });

    it('persists the score and the derived analytics onto the user', async () => {
        for (let i = 0; i < 4; i++) await addBooking('completed');
        await recalculateTrustScore(vendor._id);

        const updated = await User.findById(vendor._id);
        expect(updated.trustScore).toBeGreaterThan(0);
        expect(updated.analytics.completedEvents).toBe(4);
    });

    it('does not throw for an unknown provider id', async () => {
        const score = await recalculateTrustScore(new mongoose.Types.ObjectId());
        expect(score).toBe(70);
    });
});
