import React from 'react';
import { MapPin, CalendarDays } from 'lucide-react';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'U';

/** Cover, photo, name, city, bio and interests: shared by both organizer views. */
export default function ProfileHeader({ user, roleLabel = 'Organizer', actions }) {
    return (
        <>
            <div className="relative h-44 md:h-56 max-w-6xl mx-auto md:mt-4 md:rounded-3xl overflow-hidden bg-gradient-to-br from-brand/40 via-brand/10 to-success/30">
                {user.coverImage && <img src={user.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
            <div className="max-w-6xl mx-auto px-4 md:px-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 -mt-12 md:-mt-14 relative">
                    <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-surface border-4 border-bg shadow-card flex items-center justify-center text-3xl font-black text-brand shrink-0 overflow-hidden">
                        {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : initials(user.name)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2 md:pt-16">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-fg">{user.name}</h1>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand bg-brand/10 rounded-full px-2.5 py-0.5">{roleLabel}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted font-semibold">
                            {user.city && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{user.city}</span>}
                            {user.memberSince && <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" />Member since {new Date(user.memberSince).toLocaleString('en', { month: 'long', year: 'numeric' })}</span>}
                        </div>
                        {user.bio && <p className="text-sm text-fg/80 leading-relaxed max-w-2xl">{user.bio}</p>}
                        {user.interests?.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5" aria-label="Interests">
                                {user.interests.map((i) => <li key={i} className="text-[11px] font-bold text-fg bg-surface-2 border border-border rounded-full px-2.5 py-0.5">{i}</li>)}
                            </ul>
                        )}
                    </div>
                    {actions && <div className="flex flex-wrap gap-2 md:pt-16">{actions}</div>}
                </div>
            </div>
        </>
    );
}

export function StatButton({ icon: Icon, value, label, onClick, active, tone = 'brand' }) {
    const tones = { brand: 'bg-brand/10 text-brand', success: 'bg-success/10 text-success', warning: 'bg-warning/10 text-warning' };
    return (
        <button type="button" onClick={onClick} aria-pressed={active}
            className={`bg-surface border rounded-2xl px-4 py-3 flex items-center gap-3 min-w-0 text-left transition-all ${active ? 'border-brand shadow-card' : 'border-border hover:border-brand/50 hover:shadow-card'}`}>
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={17} aria-hidden="true" /></span>
            <span className="min-w-0">
                <span className="block text-lg font-black text-fg leading-tight truncate">{value}</span>
                <span className="block text-[11px] text-muted font-semibold truncate">{label}</span>
            </span>
        </button>
    );
}
