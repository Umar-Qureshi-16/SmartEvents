import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import instance from './axios';
import { store } from '../store';
import { setCredentials } from '../store/slices/authSlice';

// Replaces the network: `handlers` maps a URL to a function returning a status + body.
const fakeAdapter = (handlers, calls) => (config) => {
    calls.push(config.url);
    const { status = 200, data = {} } = handlers[config.url]?.(config) ?? {};
    const response = { data, status, statusText: String(status), headers: {}, config };
    return status >= 200 && status < 300
        ? Promise.resolve(response)
        : Promise.reject(Object.assign(new Error(`HTTP ${status}`), { config, response, isAxiosError: true }));
};

describe('axios instance (cookie session)', () => {
    let calls;
    beforeEach(() => {
        calls = [];
        vi.restoreAllMocks();
        store.dispatch(setCredentials({ user: { id: 'u1', name: 'Test' } }));
    });

    it('sends credentials and asks for cookie mode', () => {
        expect(instance.defaults.withCredentials).toBe(true);
        expect(instance.defaults.headers['X-Auth-Mode']).toBe('cookie');
        expect(instance.defaults.baseURL).toBe('/api/v1');
    });

    it('never attaches an Authorization header', async () => {
        let seen;
        instance.defaults.adapter = (config) => { seen = config.headers; return Promise.resolve({ data: {}, status: 200, headers: {}, config }); };
        await instance.get('/anything');
        expect(seen.Authorization ?? seen.get?.('Authorization')).toBeFalsy();
    });

    it('refreshes once on a 401 and retries the original request', async () => {
        let first = true;
        instance.defaults.adapter = fakeAdapter({
            '/bookings/my': () => (first ? ((first = false), { status: 401 }) : { data: { ok: true } }),
        }, calls);
        const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: { success: true } });

        const res = await instance.get('/bookings/my');
        expect(res.data.ok).toBe(true);
        expect(post).toHaveBeenCalledTimes(1);
        expect(post.mock.calls[0][0]).toBe('/api/v1/auth/refresh');
        expect(calls.filter(c => c === '/bookings/my')).toHaveLength(2);
    });

    it('shares a single refresh between simultaneous 401s', async () => {
        const seen = {};
        instance.defaults.adapter = fakeAdapter({
            '/a': () => (seen.a ? { data: 'a' } : ((seen.a = true), { status: 401 })),
            '/b': () => (seen.b ? { data: 'b' } : ((seen.b = true), { status: 401 })),
        }, calls);
        const post = vi.spyOn(axios, 'post').mockImplementation(() => new Promise(r => setTimeout(() => r({ data: {} }), 20)));

        const [a, b] = await Promise.all([instance.get('/a'), instance.get('/b')]);
        expect([a.data, b.data]).toEqual(['a', 'b']);
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('signs the user out locally when the refresh fails', async () => {
        instance.defaults.adapter = fakeAdapter({ '/private': () => ({ status: 401 }) }, calls);
        vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh denied'));

        await expect(instance.get('/private')).rejects.toBeTruthy();
        expect(store.getState().auth.user).toBeNull();
        expect(store.getState().auth.isAuthenticated).toBe(false);
    });

    it('does not try to refresh when a login attempt itself returns 401', async () => {
        instance.defaults.adapter = fakeAdapter({ '/auth/login': () => ({ status: 401 }) }, calls);
        const post = vi.spyOn(axios, 'post');

        await expect(instance.post('/auth/login', {})).rejects.toBeTruthy();
        expect(post).not.toHaveBeenCalled();
    });

    it('signs out when the account has been suspended', async () => {
        instance.defaults.adapter = fakeAdapter({ '/x': () => ({ status: 403, data: { code: 'ACCOUNT_BANNED' } }) }, calls);
        await expect(instance.get('/x')).rejects.toBeTruthy();
        expect(store.getState().auth.user).toBeNull();
    });
});
