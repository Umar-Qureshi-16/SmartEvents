import React, { useEffect, useState } from 'react';
import { Ticket } from 'lucide-react';
import axios from '../../api/axios';

/** Ticket sales summary for an event, shown to the event's owner and admins. */
export default function TicketSales({ eventId }) {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        axios.get(`/tickets/event/${eventId}`)
            .then(res => { if (active) setData(res.data.data); })
            .catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [eventId]);

    if (failed) return null;
    if (!data) return <div className="adyen-card bg-surface border border-border p-5 text-xs text-muted">Loading ticket sales...</div>;

    const { summary, tickets } = data;
    return (
        <div className="adyen-card bg-surface border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-fg"><Ticket size={16} className="text-success" /> Ticket sales</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[
                    ['Sold', summary.capacity ? `${summary.sold} / ${summary.capacity}` : summary.sold],
                    ['Checked in', summary.checkedIn],
                    ['Cancelled', summary.cancelled],
                    ['Revenue', `$${summary.revenue.toLocaleString()}`],
                ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-surface-2 p-3">
                        <div className="text-lg font-black text-fg">{value}</div>
                        <div className="text-[10px] font-mono uppercase text-muted">{label}</div>
                    </div>
                ))}
            </div>
            {tickets.length > 0 && (
                <ul className="divide-y divide-border text-xs max-h-48 overflow-y-auto">
                    {tickets.map(t => (
                        <li key={t.id} className="flex justify-between py-2">
                            <span className="font-semibold text-fg">{t.attendee?.name || 'Attendee'}</span>
                            <span className="text-muted font-mono">{t.ticketNumber} &middot; {t.status.replace('_', ' ')}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
