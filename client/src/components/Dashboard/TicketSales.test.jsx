import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api/axios', () => ({ default: { get: vi.fn() } }));
import axios from '../../api/axios';
import TicketSales from './TicketSales';
import { setMoneyLocale } from '../../utils/money';

const payload = {
    summary: { capacity: 50, sold: 2, checkedIn: 1, cancelled: 0, revenue: 400 },
    tickets: [
        { id: 'a', ticketNumber: 'TKT-1', status: 'active', attendee: { name: 'Ayesha' } },
        { id: 'b', ticketNumber: 'TKT-2', status: 'checked_in', attendee: { name: 'Bilal' } },
    ],
};

describe('TicketSales', () => {
    beforeEach(() => { vi.clearAllMocks(); setMoneyLocale({ country: 'US' }); });

    it('shows sold / capacity, revenue and the attendee list', async () => {
        axios.get.mockResolvedValue({ data: { data: payload } });
        render(<TicketSales eventId="evt1" />);
        await waitFor(() => expect(screen.getByText('2 / 50')).toBeInTheDocument());
        expect(axios.get).toHaveBeenCalledWith('/tickets/event/evt1');
        expect(screen.getByText('$400')).toBeInTheDocument();
        expect(screen.getByText('Ayesha')).toBeInTheDocument();
        expect(screen.getByText(/checked in/, { selector: 'span' })).toBeInTheDocument();
    });

    it('renders nothing when the request is refused', async () => {
        axios.get.mockRejectedValue(new Error('403'));
        const { container } = render(<TicketSales eventId="evt1" />);
        await waitFor(() => expect(container).toBeEmptyDOMElement());
    });
});
