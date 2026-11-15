import { createSlice } from '@reduxjs/toolkit';

// Tokens are never held in JavaScript: the session is an httpOnly cookie. Only
// the (non-secret) user profile lives here, and it is re-fetched from /auth/me
// on every page load, so nothing sensitive is persisted in browser storage.
const initialState = {
    user: null,
    isAuthenticated: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            state.user = action.payload.user;
            state.isAuthenticated = !!action.payload.user;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
