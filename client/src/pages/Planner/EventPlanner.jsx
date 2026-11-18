import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarCheck, CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import axios from '../../api/axios';
import { Badge, Button, Card, EmptyState, Input, Skeleton, formatDate } from '../../components/ui';
import PackageList, { FIELD_LABELS } from '../../components/planner/PackageList';
import BudgetPlanner from '../../components/planner/BudgetPlanner';

const EVENT_TYPES = ['Wedding', 'Mehndi', 'Walima', 'Birthday', 'Corporate', 'Conference', 'Concert', 'Exhibition'];
const DAY = 86400000;

function NewPlanForm({ onCreated }) {
    const [form, setForm] = useState({ title: '', eventType: 'Wedding', date: '', location: '', budget: '' });
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.date) return toast.error('Give the event a name and a date.');
        setBusy(true);
        try {
            const body = { ...form, budget: form.budget ? Number(form.budget) : undefined };
            const res = await axios.post('/plans', body);
            toast.success('Your plan is ready.');
            onCreated(res.data.data);
            setForm({ title: '', eventType: 'Wedding', date: '', location: '', budget: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not create the plan.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2"><Input id="plan-title" label="Event name" value={form.title} onChange={set('title')} placeholder="Royal Palm wedding" /></div>
            <div>
                <label htmlFor="plan-type" className="block text-xs font-bold text-fg mb-1.5">Type</label>
                <select id="plan-type" value={form.eventType} onChange={set('eventType')} className="w-full bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg">
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
            </div>
            <Input id="plan-date" label="Date" type="date" value={form.date} onChange={set('date')} min={new Date().toISOString().slice(0, 10)} />
            <Input id="plan-city" label="City" value={form.location} onChange={set('location')} placeholder="Lahore" />
            <Button type="submit" loading={busy} icon={Sparkles}>Plan it</Button>
        </form>
    );
}

function TaskRow({ task, plan, onToggle, now }) {
    const [open, setOpen] = useState(false);
    const done = task.status === 'done';
    const due = task.dueDate ? new Date(task.dueDate) : null;
    const overdue = !done && due && due.getTime() < now - DAY;
    return (
        <li className="border border-border rounded-2xl bg-surface">
            <div className="flex items-start gap-3 p-4">
                <button
                    onClick={() => onToggle(task)}
                    aria-label={done ? `Mark ${task.title} as to do` : `Mark ${task.title} as done`}
                    className={`mt-0.5 shrink-0 ${done ? 'text-success' : 'text-muted hover:text-fg'}`}
                >
                    {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-sm font-bold ${done ? 'text-muted line-through' : 'text-fg'}`}>{task.title}</h3>
                        {task.category && <Badge tone="brand">{FIELD_LABELS[task.category]}</Badge>}
                        {overdue && <Badge tone="danger">Overdue</Badge>}
                    </div>
                    {task.description && <p className="text-xs text-muted leading-relaxed">{task.description}</p>}
                    <p className="text-[11px] text-muted">
                        {task.daysBefore === 1 ? '1 day' : `${task.daysBefore} days`} before{due ? ` · due ${formatDate(due)}` : ''}
                        {done && task.bookingId && <> · <Link to={`/negotiate/${task.bookingId}`} className="text-brand font-bold">booked, view booking</Link></>}
                    </p>
                </div>
                {task.category && !done && (
                    <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                        {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
                        {open ? 'Hide' : 'Packages'}
                    </Button>
                )}
            </div>
            {open && (
                <div className="px-4 pb-4 border-t border-border">
                    <PackageList category={task.category} planId={plan._id} location={plan.location} />
                </div>
            )}
        </li>
    );
}

export default function EventPlanner() {
    const [params, setParams] = useSearchParams();
    const [plans, setPlans] = useState(null);
    const activeId = params.get('plan');
    const [now] = useState(() => Date.now());

    const load = useCallback(async () => {
        try {
            const res = await axios.get('/plans');
            setPlans(res.data.data || []);
        } catch {
            setPlans([]);
            toast.error('Could not load your plans.');
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const plan = useMemo(() => plans?.find((p) => p._id === activeId) || plans?.find((p) => new Date(p.date) >= now - DAY) || plans?.[0], [plans, activeId, now]);
    const replace = (updated) => setPlans((list) => {
        const rest = (list || []).filter((p) => p._id !== updated._id);
        return [...rest, updated].sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    const toggle = async (task) => {
        try {
            const res = await axios.patch(`/plans/${plan._id}/tasks/${task._id}`, { status: task.status === 'done' ? 'todo' : 'done' });
            replace(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not update the task.');
        }
    };

    const remove = async () => {
        if (!window.confirm(`Delete the plan "${plan.title}"? Your bookings are not affected.`)) return;
        try {
            await axios.delete(`/plans/${plan._id}`);
            setPlans((list) => list.filter((p) => p._id !== plan._id));
            setParams({});
        } catch {
            toast.error('Could not delete the plan.');
        }
    };

    const [adding, setAdding] = useState('');
    const addTask = async (e) => {
        e.preventDefault();
        if (!adding.trim()) return;
        try {
            const res = await axios.post(`/plans/${plan._id}/tasks`, { title: adding.trim() });
            replace(res.data.data);
            setAdding('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not add the task.');
        }
    };

    const doneCount = plan ? plan.tasks.filter((t) => t.status === 'done').length : 0;
    const pct = plan?.tasks.length ? Math.round((doneCount / plan.tasks.length) * 100) : 0;

    return (
        <div className="min-h-screen bg-bg text-fg px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-6">
            <header className="space-y-1">
                <h1 className="text-2xl font-black text-fg flex items-center gap-2"><CalendarCheck className="text-brand" aria-hidden="true" />Event planner</h1>
                <p className="text-sm text-muted">Every step from booking the venue to the final review, with vendor packages for each one. You can also just tell Smartie, for example &ldquo;plan my wedding on 20 December in Lahore&rdquo; or &ldquo;mark invitations as done&rdquo;.</p>
            </header>

            <BudgetPlanner />

            <Card className="p-5 space-y-3">
                <h2 className="text-sm font-bold text-fg">Or start a plan without a budget</h2>
                <NewPlanForm onCreated={(p) => { replace(p); setParams({ plan: p._id }); }} />
            </Card>

            {!plans ? (
                <Skeleton className="h-96" />
            ) : !plan ? (
                <EmptyState icon={CalendarCheck} title="No plans yet" description="Add your event above and Smartie lays out the tasks and dates for you." />
            ) : (
                <section className="space-y-4" aria-labelledby="plan-heading">
                    {plans.length > 1 && (
                        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Your plans">
                            {plans.map((p) => (
                                <button key={p._id} role="tab" aria-selected={p._id === plan._id} onClick={() => setParams({ plan: p._id })}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${p._id === plan._id ? 'bg-brand text-white border-brand' : 'bg-surface text-fg border-border hover:bg-fg/5'}`}>
                                    {p.title}
                                </button>
                            ))}
                        </div>
                    )}
                    <Card className="p-5 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 id="plan-heading" className="text-xl font-black text-fg">{plan.title}</h2>
                                <p className="text-xs text-muted">{plan.eventType} · {formatDate(plan.date)}{plan.location ? ` · ${plan.location}` : ''}</p>
                            </div>
                            <Button size="sm" variant="ghost" icon={Trash2} onClick={remove}>Delete plan</Button>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs font-bold text-fg mb-1.5"><span>{doneCount} of {plan.tasks.length} done</span><span>{pct}%</span></div>
                            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress">
                                <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    </Card>

                    <ol className="space-y-3">
                        {plan.tasks.map((t) => <TaskRow key={t._id} task={t} plan={plan} onToggle={toggle} now={now} />)}
                    </ol>

                    <form onSubmit={addTask} className="flex gap-2">
                        <label htmlFor="add-task" className="sr-only">Add a task</label>
                        <input id="add-task" value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a task, e.g. Book a makeup artist"
                            className="flex-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm text-fg placeholder:text-muted" />
                        <Button type="submit" variant="secondary" icon={Plus}>Add</Button>
                    </form>
                    <p className="text-[11px] text-muted">Tasks for a vendor field tick themselves off when a booking with a vendor in that field is confirmed.</p>
                </section>
            )}
        </div>
    );
}
