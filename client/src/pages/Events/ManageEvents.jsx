import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Plus, Pencil, Trash2, CalendarPlus, Users, MapPin, Calendar, Eye, AlertTriangle
} from 'lucide-react';

import axios from '../../api/axios';
import {
    Button, Card, Badge, Input, Textarea, Modal, SkeletonList, EmptyState, ErrorState,
    formatCurrency, formatDate
} from '../../components/ui';

const CATEGORIES = ['Wedding', 'Corporate', 'Concert', 'Birthday', 'Conference', 'Exhibition'];

const EMPTY = {
    title: '', category: 'Wedding', price: '', location: '',
    description: '', capacity: '100', date: '',
};

/**
 * Event listings owned by the signed-in provider.
 *
 * Providers previously had no way to create, edit or delete an event through
 * the UI at all — the API supported full CRUD, but the only path to a listing
 * was the seed script.
 */
export default function ManageEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editing, setEditing] = useState(null);   // null | 'new' | event object
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/events/organizer/my-events');
            setEvents(res.data.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your events.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const openNew = () => {
        setForm(EMPTY);
        setErrors({});
        setEditing('new');
    };

    const openEdit = (event) => {
        setForm({
            title: event.title || '',
            category: event.category || 'Wedding',
            price: String(event.price ?? ''),
            location: event.location || '',
            description: event.description || '',
            capacity: String(event.capacity ?? 100),
            date: event.date ? new Date(event.date).toISOString().slice(0, 10) : '',
        });
        setErrors({});
        setEditing(event);
    };

    /** Mirrors the server-side Zod rules so users see problems before submitting. */
    const validate = () => {
        const e = {};
        if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
        if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters.';
        if (form.location.trim().length < 2) e.location = 'Location is required.';
        if (form.price === '' || Number(form.price) < 0) e.price = 'Enter a price of zero or more.';
        if (!form.date) e.date = 'An event date is required.';
        else if (new Date(form.date) < new Date(new Date().toDateString())) e.date = 'The date cannot be in the past.';
        if (Number(form.capacity) < 1) e.capacity = 'Capacity must be at least 1.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = {
                title: form.title.trim(),
                category: form.category,
                price: Number(form.price),
                location: form.location.trim(),
                description: form.description.trim(),
                capacity: Number(form.capacity),
                date: new Date(form.date).toISOString(),
            };

            if (editing === 'new') {
                await axios.post('/events', payload);
                toast.success('Event published.');
            } else {
                await axios.put(`/events/${editing._id}`, payload);
                toast.success('Event updated.');
            }
            setEditing(null);
            await fetchEvents();
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) {
                setErrors(Object.fromEntries(data.errors.map(e => [e.path, e.message])));
            }
            toast.error(data?.message || 'Could not save the event.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setSaving(true);
        try {
            await axios.delete(`/events/${deleting._id}`);
            toast.success('Event deleted.');
            setDeleting(null);
            await fetchEvents();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not delete the event.');
        } finally {
            setSaving(false);
        }
    };

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

    return (
        <div className="min-h-screen bg-bg text-fg space-y-8 p-6 max-w-[1280px] mx-auto">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div className="space-y-1">
                    <Badge tone="brand">My listings</Badge>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight">Manage events</h1>
                    <p className="text-sm text-muted">
                        Publish an event so customers can find it and make you an offer.
                    </p>
                </div>
                <Button icon={Plus} onClick={openNew}>New event</Button>
            </header>

            {loading ? (
                <SkeletonList count={4} height="h-40" />
            ) : error ? (
                <ErrorState message={error} onRetry={fetchEvents} />
            ) : events.length === 0 ? (
                <EmptyState
                    icon={CalendarPlus}
                    title="You have not published any events yet"
                    description="Create your first listing and it will appear in the marketplace for customers to browse and bid on."
                    action={{ label: 'Create an event', onClick: openNew }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {events.map(event => (
                        <Card key={event._id} className="p-6 flex flex-col justify-between gap-4">
                            <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-lg font-bold leading-snug">{event.title}</h2>
                                    <Badge tone="brand">{event.category}</Badge>
                                </div>
                                <p className="text-sm text-muted line-clamp-2">{event.description}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-muted font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={13} className="text-brand" aria-hidden="true" />
                                        {formatDate(event.date)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin size={13} className="text-brand" aria-hidden="true" />
                                        {event.location}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Users size={13} className="text-brand" aria-hidden="true" />
                                        {event.capacity}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border flex items-end justify-between gap-3">
                                <div>
                                    <span className="text-[10px] font-mono text-muted block uppercase font-bold">Asking price</span>
                                    <span className="text-lg font-black text-success">{formatCurrency(event.price)}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Link to={`/events/${event._id}`}>
                                        <Button size="sm" variant="ghost" icon={Eye}>View</Button>
                                    </Link>
                                    <Button size="sm" variant="outline" icon={Pencil} onClick={() => openEdit(event)}>
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setDeleting(event)}
                                        aria-label={`Delete ${event.title}`}
                                        className="!text-danger hover:!bg-danger/10"
                                    >
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create / edit */}
            <Modal
                open={Boolean(editing)}
                onClose={() => setEditing(null)}
                title={editing === 'new' ? 'Publish a new event' : 'Edit event'}
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button loading={saving} onClick={save}>
                            {editing === 'new' ? 'Publish' : 'Save changes'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Input label="Title" value={form.title} onChange={set('title')} error={errors.title}
                           placeholder="e.g. Grand Royal Wedding Package" maxLength={100} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label htmlFor="ev-category" className="block text-xs font-bold text-fg">Category</label>
                            <select
                                id="ev-category"
                                value={form.category}
                                onChange={set('category')}
                                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-fg outline-none focus:border-brand"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <Input label="Asking price" type="number" min="0" value={form.price}
                               onChange={set('price')} error={errors.price}
                               hint="Customers can offer below this — that is the point." />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Event date" type="date" value={form.date}
                               onChange={set('date')} error={errors.date}
                               min={new Date().toISOString().slice(0, 10)} />
                        <Input label="Capacity" type="number" min="1" value={form.capacity}
                               onChange={set('capacity')} error={errors.capacity} />
                    </div>

                    <Input label="Location" value={form.location} onChange={set('location')}
                           error={errors.location} placeholder="e.g. Pearl Continental, Lahore" />

                    <Textarea label="Description" value={form.description} onChange={set('description')}
                              error={errors.description}
                              placeholder="What is included, who it suits, and what makes it worth the price."
                              maxLength={2000} />
                </div>
            </Modal>

            {/* Delete confirmation */}
            <Modal
                open={Boolean(deleting)}
                onClose={() => setDeleting(null)}
                title="Delete this event?"
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
                        <Button variant="danger" loading={saving} onClick={remove}>Delete</Button>
                    </>
                }
            >
                <div className="flex gap-3">
                    <AlertTriangle className="text-danger shrink-0" size={20} aria-hidden="true" />
                    <p className="text-sm text-muted">
                        <strong className="text-fg">{deleting?.title}</strong> will be removed from the
                        marketplace. Existing bookings are not affected, but no new offers can be made.
                        This cannot be undone.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
