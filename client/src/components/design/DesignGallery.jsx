import React, { useState } from 'react';
import DesignPicture from './DesignPicture';

const MAX_PARTS = 5; // the whole setup + up to four decor items (matches the server)

/**
 * Pictures of one design: the whole setup first, then one per decor item
 * (backdrop, entrance, cake table...). Each picture is made the first time it
 * is opened, so only the ones someone looks at are generated.
 *
 * `path(part)` gives the API path of a picture; `src` is an optional stored
 * photo for the whole setup.
 */
export default function DesignGallery({ design, path, src, className = '', imageClassName = 'aspect-[16/10]' }) {
    const items = (design?.elements || []).filter((e) => e?.item).slice(0, MAX_PARTS - 1);
    const parts = [{ label: 'Full setup' }, ...items.map((e) => ({ label: e.item }))];
    const [part, setPart] = useState(0);

    return (
        <div className={className}>
            <DesignPicture
                design={design}
                src={part === 0 ? src : undefined}
                path={part === 0 ? path(0) : path(part)}
                alt={`${parts[part]?.label || 'Picture'} of ${design?.title || 'the design'}`}
                className={imageClassName}
            />
            {parts.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pt-2 pb-0.5" role="tablist" aria-label="Pictures of this design">
                    {parts.map((p, i) => (
                        <button
                            key={`${i}-${p.label}`}
                            type="button"
                            role="tab"
                            aria-selected={part === i}
                            onClick={() => setPart(i)}
                            className={`shrink-0 max-w-[11rem] truncate px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors ${part === i ? 'bg-brand text-white border-brand' : 'border-border text-muted hover:text-fg hover:border-brand/50'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
