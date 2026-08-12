import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';

export { default as Modal } from './Modal';

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

const VARIANTS = {
    primary: 'bg-brand hover:bg-brand-hover text-white shadow-glow',
    secondary: 'bg-surface-2 hover:bg-border text-fg border border-border',
    outline: 'border border-border text-fg hover:bg-fg/5',
    danger: 'bg-danger hover:opacity-90 text-white',
    success: 'bg-success hover:opacity-90 text-white',
    ghost: 'text-muted hover:text-fg hover:bg-fg/5',
};

const SIZES = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon: Icon,
    className = '',
    disabled,
    ...props
}) {
    return (
        <button
            disabled={disabled || loading}
            className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all
                active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
            {...props}
        >
            {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
            {children}
        </button>
    );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '', ...props }) {
    return (
        <div className={`bg-surface border border-border rounded-3xl shadow-card ${className}`} {...props}>
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Input / Textarea — always paired with a real <label>                       */
/* -------------------------------------------------------------------------- */

export function Input({ label, id, error, hint, className = '', ...props }) {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-bold text-fg">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                className={`w-full bg-surface-2 border rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted
                    outline-none transition-colors focus:border-brand
                    ${error ? 'border-danger' : 'border-border'} ${className}`}
                {...props}
            />
            {error && <p id={`${inputId}-error`} className="text-xs text-danger font-medium">{error}</p>}
            {!error && hint && <p id={`${inputId}-hint`} className="text-xs text-muted">{hint}</p>}
        </div>
    );
}

export function Textarea({ label, id, error, hint, className = '', ...props }) {
    const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    return (
        <div className="space-y-1.5">
            {label && (
                <label htmlFor={inputId} className="block text-xs font-bold text-fg">
                    {label}
                </label>
            )}
            <textarea
                id={inputId}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
                className={`w-full bg-surface-2 border rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted
                    outline-none transition-colors focus:border-brand resize-y min-h-[100px]
                    ${error ? 'border-danger' : 'border-border'} ${className}`}
                {...props}
            />
            {error && <p id={`${inputId}-error`} className="text-xs text-danger font-medium">{error}</p>}
            {!error && hint && <p id={`${inputId}-hint`} className="text-xs text-muted">{hint}</p>}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

const TONES = {
    neutral: 'bg-fg/5 text-muted border-border',
    brand: 'bg-brand/10 text-brand border-brand/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
};

export function Badge({ children, tone = 'neutral', className = '' }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold
            uppercase tracking-wider border ${TONES[tone]} ${className}`}>
            {children}
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* Async state components                                                     */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className = '' }) {
    return <div className={`animate-pulse bg-fg/5 rounded-2xl ${className}`} aria-hidden="true" />;
}

export function SkeletonList({ count = 4, height = 'h-32', cols = 'md:grid-cols-2' }) {
    return (
        <div className={`grid grid-cols-1 ${cols} gap-6`} role="status" aria-label="Loading">
            <span className="sr-only">Loading…</span>
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} className={height} />
            ))}
        </div>
    );
}

/**
 * Distinguishes "nothing here" from "still loading" from "it failed" — the app
 * previously showed a blank region for all three.
 */
export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border border-dashed border-border">
            <Icon size={44} className="text-muted opacity-40 mb-4" aria-hidden="true" />
            <h3 className="text-base font-bold text-fg">{title}</h3>
            {description && <p className="text-sm text-muted mt-1.5 max-w-sm">{description}</p>}
            {action && (
                <div className="mt-6">
                    {action.to ? (
                        <Link to={action.to}>
                            <Button size="sm">{action.label}</Button>
                        </Link>
                    ) : (
                        <Button size="sm" onClick={action.onClick}>{action.label}</Button>
                    )}
                </div>
            )}
        </div>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl border border-danger/20 bg-danger/5"
        >
            <AlertTriangle size={44} className="text-danger mb-4" aria-hidden="true" />
            <h3 className="text-base font-bold text-fg">Something went wrong</h3>
            <p className="text-sm text-muted mt-1.5 max-w-sm">{message || 'Please try again in a moment.'}</p>
            {onRetry && (
                <div className="mt-6">
                    <Button size="sm" variant="secondary" icon={RefreshCw} onClick={onRetry}>
                        Try again
                    </Button>
                </div>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Formatting helpers — one place, so currency and dates stay consistent      */
/* -------------------------------------------------------------------------- */

export const formatCurrency = (amount, currency = 'USD') =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

export const formatDate = (value, opts = {}) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', ...opts }).format(d);
};

export const formatDateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });

export const formatRelative = (value) => {
    if (!value) return '—';
    const diff = Date.now() - new Date(value).getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(value);
};

/** Maps schema status values to user-facing labels and a tone. */
export const BOOKING_STATUS = {
    pending: { label: 'Awaiting response', tone: 'neutral' },
    negotiating: { label: 'In negotiation', tone: 'warning' },
    confirmed: { label: 'Confirmed', tone: 'success' },
    completed: { label: 'Completed', tone: 'success' },
    rejected: { label: 'Declined', tone: 'danger' },
    cancelled: { label: 'Cancelled', tone: 'danger' },
    disputed: { label: 'Disputed', tone: 'warning' },
    no_show: { label: 'No-show', tone: 'danger' },
};
