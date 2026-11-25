const { api, makeUser, makeEvent, auth } = require('../helpers');
const VendorDesign = require('../../models/VendorDesign');
const lab = require('../../services/designLab');

/**
 * Design Lab boards: who can open them, what is saved, and the picture proxy
 * only fetching links the server signed itself.
 */
describe('Design Lab', () => {
    const pin = { id: 'p1', title: 'Mehndi stage', creator: 'A. Photographer', license: 'CC BY 2.0', thumb: '/api/v1/designs/inspiration/image?u=x&s=y', full: '/api/v1/designs/inspiration/image?u=x&s=y', width: 800, height: 600 };
    const canvas = { artboard: 'stage', width: 1920, height: 1080, background: '#f5efe6', layers: [{ id: 'a', type: 'rect', x: 10, y: 10, width: 200, height: 100, fill: '#d4af37' }] };

    it('keeps a vendor\'s own lab with pins and the canvas', async () => {
        const v = await makeUser('provider');
        const empty = await api().get('/api/v1/designs/boards/user/me').set(auth(v.token));
        expect(empty.status).toBe(200);
        expect(empty.body.data).toMatchObject({ pins: [], canvas: null });

        const saved = await api().put('/api/v1/designs/boards/user/me').set(auth(v.token)).send({ pins: [pin], canvas });
        expect(saved.status).toBe(200);
        expect(saved.body.data.pins).toHaveLength(1);
        expect(saved.body.data.canvas.layers[0]).toMatchObject({ type: 'rect', fill: '#d4af37' });

        const again = await api().get('/api/v1/designs/boards/user/me').set(auth(v.token));
        expect(again.body.data.canvas.layers).toHaveLength(1);
    });

    it('lets only the owner open a design board, and both parties open a booking board', async () => {
        const v = await makeUser('provider');
        const other = await makeUser('provider');
        const d = await VendorDesign.create({ vendor: v.id, title: 'Marigold mehndi', totalCost: 500, elements: [{ item: 'Stage', cost: 500 }] });
        expect((await api().get(`/api/v1/designs/boards/design/${d._id}`).set(auth(v.token))).status).toBe(200);
        expect((await api().get(`/api/v1/designs/boards/design/${d._id}`).set(auth(other.token))).status).toBe(403);

        const customer = await makeUser('customer');
        const outsider = await makeUser('customer');
        const event = await makeEvent(v.id);
        const b = await api().post('/api/v1/bookings').set(auth(customer.token)).send({ eventId: String(event._id), offerPrice: 400 });
        const id = b.body.data._id;
        expect((await api().put(`/api/v1/designs/boards/booking/${id}`).set(auth(customer.token)).send({ canvas })).status).toBe(200);
        const seen = await api().get(`/api/v1/designs/boards/booking/${id}`).set(auth(v.token));
        expect(seen.status).toBe(200);
        expect(seen.body.data.canvas.layers).toHaveLength(1);
        expect((await api().get(`/api/v1/designs/boards/booking/${id}`).set(auth(outsider.token))).status).toBe(403);
    });

    it('refuses oversized canvases and keeps only pins with our own or https links', async () => {
        const v = await makeUser('provider');
        const many = { ...canvas, layers: Array.from({ length: 401 }, (_, i) => ({ id: String(i), type: 'rect' })) };
        expect((await api().put('/api/v1/designs/boards/user/me').set(auth(v.token)).send({ canvas: many })).status).toBe(400);
        const res = await api().put('/api/v1/designs/boards/user/me').set(auth(v.token)).send({ pins: [pin, { ...pin, id: 'bad', thumb: 'javascript:alert(1)' }] });
        expect(res.body.data.pins.map((p) => p.id)).toEqual(['p1']);
    });

    it('a canvas picture becomes the design\'s picture', async () => {
        const v = await makeUser('provider');
        const d = await VendorDesign.create({ vendor: v.id, title: 'Walima stage', totalCost: 800, elements: [{ item: 'Stage', cost: 800 }] });
        const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        const res = await api().put(`/api/v1/designs/boards/design/${d._id}/preview`).set(auth(v.token)).send({ dataUrl: png });
        expect(res.status).toBe(200);
        expect(res.body.data.designPicture).toBe(true);
        const img = await api().get(`/api/v1/designs/${d._id}/image`);
        expect(img.status).toBe(200);
        // Served as a full HD picture (see hd() in vendorDesignService), so any image type.
        expect(img.headers['content-type']).toMatch(/^image\//);
        expect((await api().put(`/api/v1/designs/boards/design/${d._id}/preview`).set(auth(v.token)).send({ dataUrl: 'data:text/html;base64,PGI+' })).status).toBe(400);
    });

    it('the picture proxy only fetches links the server signed', async () => {
        const res = await api().get('/api/v1/designs/inspiration/image').query({ u: 'https://169.254.169.254/latest/meta-data', s: 'forged' });
        expect(res.status).toBe(403);
        const url = 'https://example.org/a.jpg';
        expect(lab.sign(url)).toHaveLength(32);
        expect(lab.sign(url)).not.toBe(lab.sign(`${url}?x`));
    });

    it('builds searches from the event, theme, own words and region', () => {
        const q = lab.queriesFor({ eventType: 'Mehndi', theme: 'Marigold', q: 'floral swing', locale: { country: 'PK', region: 'Sindh' } });
        expect(q[0]).toBe('floral swing');
        expect(q).toContain('marigold mehndi');
        expect(q.length).toBeLessThanOrEqual(5);
        expect(lab.queriesFor({ eventType: 'Walima', locale: { country: 'PK', region: 'Sindh' } })).toEqual(
            expect.arrayContaining(['walima decoration', 'pakistani walima', 'ajrak decoration']),
        );
    });
});
