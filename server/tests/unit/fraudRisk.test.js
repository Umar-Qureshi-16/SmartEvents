const FraudRiskEngine = require('../../services/fraudRiskEngine');
const User = require('../../models/User');
const Booking = require('../../models/Booking');

describe('Fraud risk engine', () => {
    let provider, customer;

    beforeEach(async () => {
        provider = await User.create({ name: 'P', email: `p${Date.now()}@t.com`, password: 'x', role: 'provider' });
        customer = await User.create({ name: 'C', email: `c${Date.now()}@t.com`, password: 'x', role: 'customer' });
    });

    const booking = (attrs) => Booking.create({
        customerId: customer._id,
        vendorId: provider._id,
        eventDetails: { eventType: 'Corporate', date: new Date(), location: 'Lahore' },
        offerPrice: 500,
        ...attrs,
    });

    describe('classification thresholds', () => {
        it.each([
            [0, 'LOW'], [19, 'LOW'],
            [20, 'MODERATE'], [49, 'MODERATE'],
            [50, 'HIGH'], [79, 'HIGH'],
            [80, 'CRITICAL'], [100, 'CRITICAL'],
        ])('classifies a score of %i as %s', (score, expected) => {
            expect(FraudRiskEngine.getClassification(score)).toBe(expected);
        });
    });

    it('scores a clean provider as low risk', async () => {
        const score = await FraudRiskEngine.calculateUserRisk(provider._id);
        expect(score).toBe(0);
        expect(FraudRiskEngine.getClassification(score)).toBe('LOW');
    });

    it('detects cancellation velocity on the correct schema field', async () => {
        // The engine previously queried a `userId` field that does not exist on
        // Booking, so every score came back 0 regardless of behaviour.
        for (let i = 0; i < 6; i++) await booking({ status: 'cancelled' });

        const score = await FraudRiskEngine.calculateUserRisk(customer._id);
        expect(score).toBeGreaterThan(0);
    });

    it('ignores cancellations older than the seven-day window', async () => {
        for (let i = 0; i < 6; i++) {
            const b = await booking({ status: 'cancelled' });
            // Go through the raw driver — Mongoose rewrites createdAt on save.
            await Booking.collection.updateOne(
                { _id: b._id },
                { $set: { createdAt: new Date(Date.now() - 30 * 86400000) } }
            );
        }
        const score = await FraudRiskEngine.calculateUserRisk(customer._id);
        expect(score).toBe(0);
    });

    it('raises the score for a provider with repeated disputes', async () => {
        for (let i = 0; i < 4; i++) await booking({ status: 'disputed' });
        const score = await FraudRiskEngine.calculateUserRisk(provider._id);
        expect(score).toBeGreaterThan(0);
    });

    it('raises the score for repeated no-shows', async () => {
        for (let i = 0; i < 3; i++) await booking({ status: 'no_show' });
        const score = await FraudRiskEngine.calculateUserRisk(provider._id);
        expect(score).toBeGreaterThan(0);
    });

    it('flags an already-restricted account', async () => {
        await User.updateOne({ _id: provider._id }, { status: 'restricted' });
        const score = await FraudRiskEngine.calculateUserRisk(provider._id);
        expect(score).toBeGreaterThanOrEqual(40);
    });

    it('never exceeds 100', async () => {
        await User.updateOne({ _id: provider._id }, { status: 'restricted' });
        for (let i = 0; i < 20; i++) await booking({ status: 'disputed' });
        for (let i = 0; i < 20; i++) await booking({ status: 'cancelled' });
        const score = await FraudRiskEngine.calculateUserRisk(provider._id);
        expect(score).toBeLessThanOrEqual(100);
    });

    it('returns 0 for an unknown user rather than throwing', async () => {
        const mongoose = require('mongoose');
        const score = await FraudRiskEngine.calculateUserRisk(new mongoose.Types.ObjectId());
        expect(score).toBe(0);
    });
});
