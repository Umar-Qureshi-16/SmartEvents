jest.mock('../../services/groqClient', () => {
    const actual = jest.requireActual('../../services/groqClient');
    return { ...actual, complete: jest.fn(), isConfigured: jest.fn(() => true) };
});

const { complete, isConfigured } = require('../../services/groqClient');
const { api, makeUser, makeEvent, auth } = require('../helpers');
const Booking = require('../../models/Booking');

async function setup() {
    const prov = await makeUser('provider');
    const cust = await makeUser('customer');
    const ev = await makeEvent(prov.id, { title: 'Mehndi Night', price: 2000 });
    const booking = await Booking.create({
        customerId: cust.id, vendorId: prov.id, eventId: ev._id, status: 'confirmed', offerPrice: 2000,
        eventDetails: { eventType: 'Wedding', date: new Date(), location: 'Lahore' },
    });
    return { prov, cust, id: String(booking._id) };
}

const aiReply = (concepts) => ({ choices: [{ message: { content: JSON.stringify({ concepts }) } }] });
const concept = (tier, costs) => ({
    title: `${tier} mehndi`, tier, summary: 'Marigold and fairy lights.', palette: ['#f4a300', '#2e7d32', 'not-a-colour'],
    elements: costs.map((c, i) => ({ item: `Item ${i}`, description: 'Detail', cost: c })),
});

afterEach(() => { complete.mockReset(); isConfigured.mockReturnValue(true); });

describe('Design Studio', () => {
    test('both parties share a brief; outsiders are refused', async () => {
        const { prov, cust, id } = await setup();
        const res = await api().put(`/api/v1/bookings/${id}/design/brief`).set(auth(cust.token))
            .send({ theme: 'Traditional mehndi', style: 'Vibrant', colors: ['#f4a300', '#2e7d32'], budget: 1800, guestCount: 150, notes: 'Swings for the bride',
                references: [{ url: 'https://images.unsplash.com/photo-1', caption: 'Marigold arch' }] });
        expect(res.status).toBe(200);
        const seen = await api().get(`/api/v1/bookings/${id}/design`).set(auth(prov.token));
        expect(seen.body.data.brief).toMatchObject({ theme: 'Traditional mehndi', budget: 1800, colors: ['#f4a300', '#2e7d32'] });
        expect(seen.body.data.brief.references[0].caption).toBe('Marigold arch');

        const outsider = await makeUser('customer');
        expect((await api().get(`/api/v1/bookings/${id}/design`).set(auth(outsider.token))).status).toBe(403);
    });

    test('invalid colours and reference links are rejected', async () => {
        const { cust, id } = await setup();
        expect((await api().put(`/api/v1/bookings/${id}/design/brief`).set(auth(cust.token)).send({ colors: ['red'] })).status).toBe(400);
        expect((await api().put(`/api/v1/bookings/${id}/design/brief`).set(auth(cust.token)).send({ references: [{ url: 'javascript:alert(1)' }] })).status).toBe(400);
    });

    test('decor discussion is separate from price offers', async () => {
        const { prov, cust, id } = await setup();
        await api().post(`/api/v1/bookings/${id}/design/messages`).set(auth(cust.token)).send({ text: 'Can we add a floral swing?' });
        const res = await api().post(`/api/v1/bookings/${id}/design/messages`).set(auth(prov.token)).send({ text: 'Yes, within the Signature tier.' });
        expect(res.body.data.messages.map((m) => m.text)).toEqual(['Can we add a floral swing?', 'Yes, within the Signature tier.']);
        expect((await Booking.findById(id)).negotiationHistory).toHaveLength(0);
    });

    test('AI concepts come in three tiers and never exceed the budget', async () => {
        const { cust, id } = await setup();
        await api().put(`/api/v1/bookings/${id}/design/brief`).set(auth(cust.token)).send({ budget: 1000 });
        complete.mockResolvedValueOnce(aiReply([concept('Essential', [300, 300]), concept('Signature', [500, 400]), concept('Luxe', [900, 900])]));
        const res = await api().post(`/api/v1/bookings/${id}/design/concepts`).set(auth(cust.token));
        expect(res.status).toBe(200);
        const concepts = res.body.data.concepts;
        expect(concepts.map((c) => c.tier)).toEqual(['Essential', 'Signature', 'Luxe']);
        expect(concepts.every((c) => c.totalCost <= 1000)).toBe(true);
        // Tier ceilings: Essential 70%, Signature 90%, Luxe 100% of the budget.
        expect(concepts[0].totalCost).toBeLessThanOrEqual(700);
        expect(concepts[1].totalCost).toBeLessThanOrEqual(900);
        expect(concepts[2].totalCost).toBeLessThanOrEqual(1000);
        expect(concepts[0].palette).toEqual(['#f4a300', '#2e7d32']);
    });

    test('when the AI is unavailable, budget-based template concepts are produced', async () => {
        const { cust, id } = await setup();
        complete.mockRejectedValueOnce(new Error('upstream down'));
        const res = await api().post(`/api/v1/bookings/${id}/design/concepts`).set(auth(cust.token));
        expect(res.status).toBe(200);
        expect(res.body.data.concepts).toHaveLength(3);
        expect(res.body.data.concepts.every((c) => c.source === 'template' && c.totalCost <= 2000)).toBe(true);
    });

    test('either party can choose the concept to follow, and only one is chosen', async () => {
        const { prov, cust, id } = await setup();
        complete.mockRejectedValueOnce(new Error('x'));
        const gen = await api().post(`/api/v1/bookings/${id}/design/concepts`).set(auth(cust.token));
        const [a, b] = gen.body.data.concepts;
        await api().put(`/api/v1/bookings/${id}/design/concepts/${a._id}/select`).set(auth(cust.token));
        const res = await api().put(`/api/v1/bookings/${id}/design/concepts/${b._id}/select`).set(auth(prov.token));
        const chosen = res.body.data.concepts.filter((c) => c.selected);
        expect(chosen).toHaveLength(1);
        expect(chosen[0]._id).toBe(b._id);
    });
});
