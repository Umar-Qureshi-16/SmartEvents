import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarCheck, CheckCircle2, Circle } from 'lucide-react';
import axios from '../../api/axios';
import { Button, formatDate, formatDateRange } from '../ui';

/**
 * Dashboard summary of the organizer's nearest event plan: progress and the
 * next open tasks. The full checklist, with vendor packages per task, lives on
 * /planner. With no plan yet it offers to build one from the next booking.
 */
const TimelineBoard = ({ nextBooking }) => {
    const navigate = useNavigate();
    const [plan, setPlan] = useState(undefined);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        axios.get('/plans')
            .then((res) => {
                const list = res.data.data || [];
                setPlan(list.find((p) => new Date(p.date) >= Date.now() - 86400000) || list[0] || null);
            })
            .catch(() => setPlan(null));
    }, []);

    const createFromBooking = async () => {
        setBusy(true);
        try {
            const res = await axios.post('/plans', { bookingId: nextBooking._id });
            setPlan(res.data.data);
            toast.success('Plan created.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not create the plan.');
        } finally {
            setBusy(false);
        }
    };

    if (plan === undefined) return null;
    const done = plan ? plan.tasks.filter((t) => t.status === 'done').length : 0;
    const next = plan ? plan.tasks.filter((t) => t.status !== 'done').slice(0, 4) : [];

    return (
        <div className="bg-surface border border-border rounded-3xl shadow-card p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                    <CalendarCheck size={22} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-base font-bold text-fg">Planning timeline</h3>
                    <p className="text-muted text-xs truncate">{plan ? `For ${plan.title} · ${formatDateRange(plan.date, plan.endDate)}` : 'Every step to your event'}</p>
                </div>
            </div>

            {plan ? (
                <>
                    <div>
                        <div className="flex justify-between text-xs font-bold text-fg mb-1"><span>{done} of {plan.tasks.length} done</span></div>
                        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                            <div className="h-full bg-success rounded-full" style={{ width: `${plan.tasks.length ? (done / plan.tasks.length) * 100 : 0}%` }} />
                        </div>
                    </div>
                    <ol className="space-y-2.5">
                        {next.length === 0 && <li className="text-xs text-success font-bold flex items-center gap-2"><CheckCircle2 size={14} aria-hidden="true" />Everything is done.</li>}
                        {next.map((t) => (
                            <li key={t._id} className="flex items-start gap-2.5">
                                <Circle size={14} className="text-muted mt-0.5 shrink-0" aria-hidden="true" />
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-fg">{t.title}</p>
                                    <p className="text-[11px] text-muted">{t.daysBefore === 1 ? '1 day' : `${t.daysBefore} days`} before{t.dueDate ? ` · due ${formatDate(t.dueDate)}` : ''}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <Button size="sm" className="w-full" onClick={() => navigate(`/planner?plan=${plan._id}`)}>Open planner</Button>
                </>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs text-muted">Get a checklist from venue booking to the final review, with vendor packages for each step.</p>
                    {nextBooking
                        ? <Button size="sm" className="w-full" loading={busy} onClick={createFromBooking}>Plan around {nextBooking.eventId?.title || 'my next booking'}</Button>
                        : <Button size="sm" className="w-full" onClick={() => navigate('/planner')}>Start a plan</Button>}
                    {nextBooking && <Link to="/planner" className="block text-center text-xs font-bold text-brand">or start a new plan</Link>}
                </div>
            )}
        </div>
    );
};

export default TimelineBoard;
