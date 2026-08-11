import axios from 'axios';
import { store } from '../store';
import { logout, updateToken } from '../store/slices/authSlice';

const instance = axios.create({
    baseURL: 'http://localhost:5000/api/v1',
});

// Request Interceptor
instance.interceptors.request.use(
    (config) => {
        const token = store.getState().auth.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor for Auto-Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return instance(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = store.getState().auth.refreshToken;
            if (!refreshToken) {
                store.dispatch(logout());
                return Promise.reject(error);
            }

            try {
                const response = await axios.post('http://localhost:5000/api/v1/auth/refresh', { refreshToken });
                const { token } = response.data;

                store.dispatch(updateToken(token));
                processQueue(null, token);

                originalRequest.headers.Authorization = `Bearer ${token}`;
                return instance(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                store.dispatch(logout());
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
