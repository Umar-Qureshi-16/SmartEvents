import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import DesignVisual from './DesignVisual';

// Stored paths start with /api/v1; point them at the configured API.
const resolve = (src) => (src && src.startsWith('/api/v1/') ? API_BASE_URL + src.slice('/api/v1'.length) : src);
const RETRIES = 30;      // about three minutes in all (the free image tier is slow)
const RETRY_MS = 6000;

/**
 * A design's picture. The server makes a photo-style image of the décor the
 * first time it is asked for, which can take a little while, so the drawn
 * concept shows underneath and the picture is asked for again until it is
 * ready. If no picture can be made, the drawing stays.
 *
 * Give `src` (a stored photo link) or `path` (the API path that makes one).
 */
export default function DesignPicture({ design, src, path, alt, className = '' }) {
    const base = resolve(src || (path ? `${API_BASE_URL}${path}` : ''));
    // Load state belongs to one picture; a new picture starts loading again.
    const [load, setLoad] = useState({ base: null, state: null, attempt: 0 });
    const current = load.base === base ? load : { base, state: base ? 'loading' : 'none', attempt: 0 };
    const { state, attempt } = current;

    // After a failed load, wait and ask again (the server may still be drawing it).
    useEffect(() => {
        if (state !== 'retry') return undefined;
        const t = setTimeout(() => setLoad({ base, state: 'loading', attempt: attempt + 1 }), RETRY_MS);
        return () => clearTimeout(t);
    }, [state, attempt, base]);

    const url = base && attempt ? `${base}${base.includes('?') ? '&' : '?'}try=${attempt}` : base;
    const waiting = state === 'loading' || state === 'retry';

    return (
        <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
            {/* The drawing stays underneath so nothing flashes while the photo fades in. */}
            <DesignVisual design={design} className="absolute inset-0 w-full h-full" />
            {base && (state === 'loading' || state === 'ready') ? (
                <img
                    key={url}
                    src={url}
                    loading="lazy"
                    alt={alt || `Picture of ${design?.title || 'the design'}`}
                    onLoad={() => setLoad({ base, state: 'ready', attempt })}
                    onError={() => setLoad({ base, state: attempt < RETRIES ? 'retry' : 'failed', attempt })}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${state === 'ready' ? 'opacity-100' : 'opacity-0'}`}
                />
            ) : null}
            {waiting && (
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-black/60 text-white text-[10px] font-bold px-2.5 py-1">
                    <Loader2 size={11} className="animate-spin" aria-hidden="true" /> Creating picture…
                </span>
            )}
        </div>
    );
}
