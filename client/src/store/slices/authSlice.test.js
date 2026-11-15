import { describe, it, expect, beforeEach } from 'vitest';
import reducer, { setCredentials, logout } from './authSlice';

describe('authSlice', () => {
    beforeEach(() => localStorage.clear());

    it('starts signed out', () => {
        expect(reducer(undefined, { type: 'init' })).toEqual({ user: null, isAuthenticated: false });
    });

    it('stores only the user profile and writes nothing to browser storage', () => {
        const state = reducer(undefined, setCredentials({ user: { id: '1', name: 'Ali' }, token: 'secret', refreshToken: 'secret2' }));
        expect(state.user.name).toBe('Ali');
        expect(state.isAuthenticated).toBe(true);
        expect(state.token).toBeUndefined();
        expect(state.refreshToken).toBeUndefined();
        expect(localStorage.length).toBe(0);
    });

    it('clears the user on logout', () => {
        const signedIn = reducer(undefined, setCredentials({ user: { id: '1' } }));
        expect(reducer(signedIn, logout())).toEqual({ user: null, isAuthenticated: false });
    });
});
