import { describe, it, expect } from 'vitest';
import { parseAssistantReply, describeAction, buildEventPayload, ACTION_TYPES } from './aiActions';

describe('parseAssistantReply', () => {
    it('returns plain text when there is no action block', () => {
        expect(parseAssistantReply('  Hello there  ')).toEqual({ text: 'Hello there', action: null });
    });

    it('handles an empty or missing reply', () => {
        expect(parseAssistantReply()).toEqual({ text: '', action: null });
    });

    it('extracts an event-create action and removes the raw block from the text', () => {
        const reply = 'Here is a plan.\n[ACTION_EVENT_CREATE]: { "title": "Gala", "type": "wedding", "price": 5000 }';
        const { text, action } = parseAssistantReply(reply);
        expect(text).toBe('Here is a plan.');
        expect(action.type).toBe(ACTION_TYPES.EVENT_CREATE);
        expect(action.payload).toEqual({ title: 'Gala', type: 'wedding', price: 5000 });
    });

    it('never shows malformed JSON to the user and offers no action', () => {
        const { text, action } = parseAssistantReply('Sure.\n[ACTION_EVENT_CREATE]: { "title": ');
        expect(action).toBeNull();
        expect(text).not.toContain('ACTION_');
    });

    it('strips but does not offer actions it cannot execute', () => {
        const { text, action } = parseAssistantReply('Done.\n[ACTION_DELETE_EVERYTHING]: { "x": 1 }');
        expect(action).toBeNull();
        expect(text).toBe('Done.');
    });
});

describe('describeAction', () => {
    it('describes a service creation with category and price', () => {
        const d = describeAction({ type: 'EVENT_CREATE', payload: { title: 'Gala', type: 'wedding', price: 12000 } });
        expect(d.summary).toBe('Gala');
        expect(d.details).toContain('Category: wedding');
        expect(d.details).toContain('Price: $12,000');
    });

    it('describes a report request', () => {
        const d = describeAction({ type: 'REPORT_GENERATE', payload: { timeframe: 'weekly', metrics: ['revenue', 'bookings'] } });
        expect(d.summary).toBe('weekly performance report');
        expect(d.details).toContain('Metrics: revenue, bookings');
    });

    it('returns null for no action', () => {
        expect(describeAction(null)).toBeNull();
    });
});

describe('buildEventPayload', () => {
    it('maps a known category and keeps provided values', () => {
        const p = buildEventPayload({ title: 'Big Day', type: 'Wedding', price: '750', capacity: 40, location: 'Lahore' });
        expect(p).toMatchObject({ title: 'Big Day', category: 'Wedding', price: 750, capacity: 40, location: 'Lahore' });
    });

    it('falls back to safe defaults that satisfy the Event schema', () => {
        const p = buildEventPayload({ type: 'unknown-thing' });
        expect(p.category).toBe('Corporate');
        expect(p.price).toBe(0);
        expect(p.capacity).toBe(100);
        expect(new Date(p.date).getTime()).toBeGreaterThan(Date.now());
    });
});
