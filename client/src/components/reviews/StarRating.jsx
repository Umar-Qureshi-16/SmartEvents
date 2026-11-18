import React from 'react';
import { Star } from 'lucide-react';

/** Read-only 1-5 star display (5 is best), with partial fill for decimals. */
export default function StarRating({ value = 0, size = 14, showValue = false, count }) {
    const v = Math.max(0, Math.min(5, Number(value) || 0));
    return (
        <span className="inline-flex items-center gap-1" aria-label={`${v.toFixed(1)} out of 5 stars${count != null ? `, ${count} reviews` : ''}`}>
            <span className="inline-flex" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => {
                    const fill = Math.max(0, Math.min(1, v - (i - 1)));
                    return (
                        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
                            <Star size={size} className="absolute inset-0 text-muted/40" />
                            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                                <Star size={size} className="text-amber-500 fill-amber-500" />
                            </span>
                        </span>
                    );
                })}
            </span>
            {showValue && <span className="text-xs font-bold text-fg">{v ? v.toFixed(1) : 'New'}</span>}
            {count != null && <span className="text-xs text-muted">({count})</span>}
        </span>
    );
}
