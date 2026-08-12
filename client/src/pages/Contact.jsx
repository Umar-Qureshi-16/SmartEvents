import React, { useState } from 'react';
import { Mail, MapPin, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

import axios from '../api/axios';
import { Button, Card, Badge, Input, Textarea } from '../components/ui';

/**
 * Contact form.
 *
 * The previous version ran a setTimeout and told the user "our team will get
 * back to you" without sending anything anywhere. It also used inline styles
 * with hardcoded hex colours, so it ignored the theme entirely.
 */
export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

    const validate = () => {
        const e = {};
        if (form.name.trim().length < 2) e.name = 'Please tell us your name.';
        if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address.';
        if (form.subject.trim().length < 3) e.subject = 'Please add a subject.';
        if (form.message.trim().length < 10) e.message = 'Please write at least 10 characters.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const res = await axios.post('/auth/contact', {
                name: form.name.trim(),
                email: form.email.trim(),
                subject: form.subject.trim(),
                message: form.message.trim(),
            });
            setSent(true);
            toast.success(res.data.message || 'Message sent.');
            setForm({ name: '', email: '', subject: '', message: '' });
        } catch (err) {
            const data = err.response?.data;
            if (data?.errors?.length) setErrors(Object.fromEntries(data.errors.map(x => [x.path, x.message])));
            toast.error(data?.message || 'Could not send your message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg text-fg p-6 max-w-3xl mx-auto space-y-8">
            <header className="text-center space-y-3">
                <Badge tone="brand">Get in touch</Badge>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">Contact us</h1>
                <p className="text-sm text-muted max-w-xl mx-auto">
                    Questions about negotiating on SmartEvents, listing your services, or
                    partnering with us? Send a message and we will reply by email.
                </p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 text-center space-y-2">
                    <Mail className="mx-auto text-brand" size={20} aria-hidden="true" />
                    <p className="text-xs font-bold">Email</p>
                    <p className="text-xs text-muted break-all">support@smartevents.local</p>
                </Card>
                <Card className="p-5 text-center space-y-2">
                    <MessageSquare className="mx-auto text-brand" size={20} aria-hidden="true" />
                    <p className="text-xs font-bold">Response time</p>
                    <p className="text-xs text-muted">Within 2 working days</p>
                </Card>
                <Card className="p-5 text-center space-y-2">
                    <MapPin className="mx-auto text-brand" size={20} aria-hidden="true" />
                    <p className="text-xs font-bold">Based in</p>
                    <p className="text-xs text-muted">Lahore, Pakistan</p>
                </Card>
            </div>

            <Card className="p-8">
                {sent ? (
                    <div className="text-center py-10 space-y-4" role="status">
                        <CheckCircle2 className="mx-auto text-success" size={48} aria-hidden="true" />
                        <h2 className="text-xl font-bold">Message sent</h2>
                        <p className="text-sm text-muted max-w-sm mx-auto">
                            Thanks for getting in touch. We will reply to the address you gave us.
                        </p>
                        <Button variant="secondary" onClick={() => setSent(false)}>
                            Send another message
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input label="Your name" value={form.name} onChange={set('name')}
                                   error={errors.name} maxLength={80} />
                            <Input label="Email address" type="email" value={form.email} onChange={set('email')}
                                   error={errors.email} />
                        </div>
                        <Input label="Subject" value={form.subject} onChange={set('subject')}
                               error={errors.subject} maxLength={150}
                               placeholder="What is this about?" />
                        <Textarea label="Message" value={form.message} onChange={set('message')}
                                  error={errors.message} maxLength={2000}
                                  placeholder="Tell us how we can help." />
                        <Button type="submit" icon={Send} loading={submitting} className="w-full sm:w-auto">
                            Send message
                        </Button>
                    </form>
                )}
            </Card>
        </div>
    );
}
