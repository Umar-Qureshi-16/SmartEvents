import React from 'react';
import { Check, X } from 'lucide-react';
import { checkPasswordRules } from '../../utils/passwordPolicy';

const LEVELS = [
    { label: 'Weak', bar: 'bg-rose-500', text: 'text-rose-500' },
    { label: 'Fair', bar: 'bg-amber-500', text: 'text-amber-500' },
    { label: 'Good', bar: 'bg-sky-500', text: 'text-sky-500' },
    { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-500' },
];

/**
 * Live password rules under a "new password" field: a strength bar plus a
 * tick or cross for each rule. `name` and `email` stop passwords built from them.
 */
export default function PasswordChecklist({ password = '', name = '', email = '', className = '' }) {
    const rules = checkPasswordRules(password, { name, email });
    const met = rules.filter((r) => r.ok).length;
    const allMet = met === rules.length;
    const level = allMet ? 3 : met >= 6 ? 2 : met >= 4 ? 1 : 0;
    const touched = password.length > 0;

    return (
        <div className={`space-y-2 ${className}`} aria-live="polite">
            <div className="flex items-center gap-2">
                <div className="flex-1 grid grid-cols-4 gap-1" aria-hidden="true">
                    {LEVELS.map((l, i) => (
                        <span key={l.label} className={`h-1.5 rounded-full ${touched && i <= level ? LEVELS[level].bar : 'bg-border'}`} />
                    ))}
                </div>
                <span className={`text-[10px] font-bold w-12 text-right ${touched ? LEVELS[level].text : 'text-muted'}`}>
                    {touched ? LEVELS[level].label : ''}
                </span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {rules.map((r) => (
                    <li key={r.id} className={`flex items-center gap-1.5 text-[10px] ${r.ok ? 'text-success' : 'text-muted'}`}>
                        {r.ok ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
                        <span>{r.label}</span>
                        <span className="sr-only">{r.ok ? '(met)' : '(not met)'}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
