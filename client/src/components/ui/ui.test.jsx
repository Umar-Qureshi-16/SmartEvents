import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Button, Badge, EmptyState, ErrorState, formatCurrency, BOOKING_STATUS } from './index';
import { setMoneyLocale, toBase, fromBase } from '../../utils/money';

describe('Button', () => {
    it('calls onClick', () => {
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Save</Button>);
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('is disabled and ignores clicks while loading', () => {
        const onClick = vi.fn();
        render(<Button loading onClick={onClick}>Save</Button>);
        const btn = screen.getByRole('button', { name: 'Save' });
        expect(btn).toBeDisabled();
        fireEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('Badge', () => {
    it('renders its content', () => {
        render(<Badge tone="success">Live</Badge>);
        expect(screen.getByText('Live')).toBeInTheDocument();
    });
});

describe('EmptyState', () => {
    it('shows the title, description and an action', () => {
        const onClick = vi.fn();
        render(
            <MemoryRouter>
                <EmptyState title="No bookings" description="Nothing here yet" action={{ label: 'Browse events', onClick }} />
            </MemoryRouter>
        );
        expect(screen.getByText('No bookings')).toBeInTheDocument();
        expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Browse events' }));
        expect(onClick).toHaveBeenCalled();
    });
});

describe('ErrorState', () => {
    it('is announced as an alert and offers retry', () => {
        const onRetry = vi.fn();
        render(<ErrorState message="Server unreachable" onRetry={onRetry} />);
        expect(screen.getByRole('alert')).toHaveTextContent('Server unreachable');
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));
        expect(onRetry).toHaveBeenCalled();
    });

    it('has a sensible default message', () => {
        render(<ErrorState />);
        expect(screen.getByRole('alert')).toHaveTextContent(/try again/i);
    });
});

describe('helpers', () => {
    it('formats currency consistently', () => {
        setMoneyLocale({ country: 'US' });
        expect(formatCurrency(12500)).toBe('$12,500');
    });

    it('shows dollar amounts in the viewer currency and converts typed amounts back', () => {
        setMoneyLocale({ country: 'PK' });
        expect(formatCurrency(1000)).toContain('280,000');
        expect(formatCurrency(1000)).toMatch(/Rs|PKR/);
        expect(fromBase(1000)).toBe(280000);
        expect(toBase(280000)).toBe(1000);
        setMoneyLocale({ country: 'US' });
    });

    it('labels every booking status the server can produce', () => {
        ['pending', 'negotiating', 'confirmed', 'rejected', 'cancelled', 'completed', 'disputed']
            .forEach(status => expect(BOOKING_STATUS[status]?.label).toBeTruthy());
    });
});
