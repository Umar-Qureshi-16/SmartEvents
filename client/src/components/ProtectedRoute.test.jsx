import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import authReducer from '../store/slices/authSlice';
import ProtectedRoute from './ProtectedRoute';

const renderAt = (auth, roles) => {
    const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } });
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={['/secret']}>
                <Routes>
                    <Route path="/login" element={<div>LOGIN PAGE</div>} />
                    <Route path="/dashboard" element={<div>DASHBOARD</div>} />
                    <Route element={<ProtectedRoute roles={roles} />}>
                        <Route path="/secret" element={<div>SECRET CONTENT</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </Provider>
    );
};

describe('ProtectedRoute', () => {
    it('waits (renders nothing, does not redirect) until the session check has finished', () => {
        const { container } = renderAt({ user: null, isAuthenticated: false, authChecked: false });
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByText('LOGIN PAGE')).toBeNull();
    });

    it('sends a visitor with no session to the login page once the check is done', () => {
        renderAt({ user: null, isAuthenticated: false, authChecked: true });
        expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    });

    it('shows the page to a signed-in user', () => {
        renderAt({ user: { id: '1', role: 'customer' }, isAuthenticated: true, authChecked: true });
        expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
    });

    it('keeps users out of pages their role cannot use', () => {
        renderAt({ user: { id: '1', role: 'customer' }, isAuthenticated: true, authChecked: true }, ['admin']);
        expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
        expect(screen.queryByText('SECRET CONTENT')).toBeNull();
    });
});
