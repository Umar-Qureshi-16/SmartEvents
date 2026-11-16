import { createSlice } from '@reduxjs/toolkit';

// Tokens are never held in JavaScript: the session is an httpOnly cookie. Only
// the (non-secret) user profile lives here, and it is re-fetched from /auth/me
// on every page load, so nothing sensitive is persisted in browser storage.
const initialState = {
    user: null,
    isAuthenticated: false,
    // False until the first /auth/me answer arrives. Route guards must wait for
    // it: the cookie is invisible to JavaScript, so until the server has said
    // who we are, "no user yet" does not mean "signed out".
    authChecked: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            state.user = action.payload.user;
            state.isAuthenticated = !!action.payload.user;
            state.authChecked = true;
        },
        authResolved: (state) => {
            state.authChecked = true;
        },
        logout: (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.authChecked = true;
        },
    },
});

export const { setCredentials, logout, authResolved } = authSlice.actions;
export default authSlice.reducer;
