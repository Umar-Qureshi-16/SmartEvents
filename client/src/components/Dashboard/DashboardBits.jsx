import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle } from 'lucide-react';

/** Shared, compact building blocks for the organizer and vendor dashboards. */

export function Panel({ title, icon: Icon, action, children, className = '' }) {
    return (
        <section className={`bg-surface border border-border rounded-3xl shadow-card p-5 ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm font-black text-fg uppercase tracking-wider flex items-center gap-2">
                        {Icon && <Icon size={15} className="text-brand" aria-hidden="true" />}{title}
                    </h2>
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}

/** Links laid out as a 2-column grid of small tiles instead of a long list. */
export function QuickGrid({ items }) {
    return (
        <ul className="grid grid-cols-2 gap-2">
            {items.map(({ label, path, icon: Icon }) => (
                <li key={path}>
                    <Link to={path} className="h-full flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-2 border border-transparent hover:border-brand/40 transition-colors">
                        <span className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0"><Icon size={15} aria-hidden="true" /></span>
                        <span className="text-xs font-bold text-fg leading-tight">{label}</span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

const TONE = { warning: 'bg-warning/10 text-warning', success: 'bg-success/10 text-success', brand: 'bg-brand/10 text-brand' };

/** "Needs your attention": one line per thing only this user can move forward. */
export function AttentionList({ items, emptyText = 'Nothing waiting on you. Nice.' }) {
    return (
        <Panel title="Needs your attention" icon={AlertCircle}>
            {items.length === 0 ? <p className="text-sm text-muted">{emptyText}</p> : (
                <ul className="divide-y divide-border -my-1">
                    {items.map(({ key, icon: Icon, text, cta, to, tone }) => (
                        <li key={key}>
                            <Link to={to} className="flex items-center gap-3 py-2.5 group">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE[tone] || TONE.brand}`}><Icon size={15} aria-hidden="true" /></span>
                                <span className="flex-1 text-[13px] text-fg leading-snug">{text}</span>
                                <span className="text-xs font-bold text-brand inline-flex items-center gap-0.5 group-hover:underline shrink-0">{cta}<ArrowRight size={12} aria-hidden="true" /></span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}

/** Wide photo card with a countdown, used for "your next event" / "next job". */
export function NextUp({ to, label, title, date, location, withName, image, days, empty }) {
    if (!to) return empty;
    return (
        <Link to={to} className="group relative block rounded-3xl overflow-hidden border border-border shadow-card h-48 bg-gradient-to-br from-brand/50 via-brand/20 to-success/40">
            {image && <img src={image} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-5 text-white flex items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{label}</p>
                    <h2 className="text-xl md:text-2xl font-black truncate">{title}</h2>
                    <p className="text-xs text-white/85 flex flex-wrap gap-x-3">
                        <span>{date}</span>{location && <span>{location}</span>}{withName && <span>with {withName}</span>}
                    </p>
                </div>
                <div className="text-center bg-white/15 backdrop-blur rounded-2xl px-4 py-2 shrink-0">
                    <p className="text-2xl font-black leading-none">{days}</p>
                    <p className="text-[10px] font-bold uppercase">{days === 1 ? 'day to go' : 'days to go'}</p>
                </div>
            </div>
        </Link>
    );
}
