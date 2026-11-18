import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

// Same-origin by default: in production Vercel proxies /api to the backend, so
// the session cookies are first-party; in development Vite proxies it.
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// The session lives in httpOnly cookies the page cannot read. `withCredentials`
// sends them; `X-Auth-Mode: cookie` tells the server not to put tokens in
// response bodies.
const COOKIE_MODE = { 'X-Auth-Mode': 'cookie' };

const instance = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: COOKIE_MODE,
});

// A single refresh is shared by every request that fails at the same moment.
let refreshPromise = null;
const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true, headers: COOKIE_MODE })
            .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
};

// Credential endpoints report their own 401s; they must never trigger a refresh.
const NO_REFRESH = /\/auth\/(login|register|refresh|logout|google|verify-email|resend-verification|forgot-password|reset-password)/;

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;
        const status = error.response?.status;

        // Vercel's bot checkpoint answers API calls with an HTML challenge page.
        // A normal page load passes it, so reload once (at most every 2 minutes).
        const body = error.response?.data;
        if (status === 403 && typeof body === 'string' && body.includes('Vercel Security Checkpoint')) {
            try {
                const last = Number(sessionStorage.getItem('checkpointReload') || 0);
                if (Date.now() - last > 120000) {
                    sessionStorage.setItem('checkpointReload', String(Date.now()));
                    window.location.reload();
                }
            } catch { window.location.reload(); }
            return Promise.reject(error);
        }

        if (status === 403 && error.response?.data?.code === 'ACCOUNT_BANNED') {
            store.dispatch(logout());
            return Promise.reject(error);
        }

        if (status === 401 && original && !original._retry && !NO_REFRESH.test(original.url || '')) {
            original._retry = true;
            try {
                await refreshSession();
                return instance(original);
            } catch {
                store.dispatch(logout());
                return Promise.reject(error);
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
