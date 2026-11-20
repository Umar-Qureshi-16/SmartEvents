import React, { useEffect, useState } from 'react';
import { Loader2, ImageOff } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';

// Stored paths start with /api/v1; point them at the configured API.
export const resolveImage = (src) => (src && src.startsWith('/api/v1/') ? API_BASE_URL + src.slice('/api/v1'.length) : src);
const RETRIES = 40;      // about four minutes in all (the free image tier is slow)
const RETRY_MS = 6000;
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * A design's full HD picture. The server makes it the first time it is asked
 * for, which can take a while, so a soft shimmer in the design's own colours
 * shows meanwhile and the picture is asked for again until it is ready.
 *
 * Give `src` (a stored photo link) or `path` (the API path that makes one).
 * `onState` reports 'loading' | 'ready' | 'failed' | 'none'.
 */
export default function DesignPicture({ design, src, path, alt, className = '', fit = 'cover', motion = true, onState }) {
    const base = resolveImage(src || (path ? `${API_BASE_URL}${path}` : ''));
    // Load state belongs to one picture; a new picture starts loading again.
    const [load, setLoad] = useState({ base: null, state: null, attempt: 0 });
    const current = load.base === base ? load : { base, state: base ? 'loading' : 'none', attempt: 0 };
    const { state, attempt } = current;

    // After a failed load, wait and ask again (the server may still be making it).
    useEffect(() => {
        if (state !== 'retry') return undefined;
        const t = setTimeout(() => setLoad({ base, state: 'loading', attempt: attempt + 1 }), RETRY_MS);
        return () => clearTimeout(t);
    }, [state, attempt, base]);

    const shown = state === 'retry' ? 'loading' : state;
    useEffect(() => { onState?.(shown); }, [shown, onState]);

    const url = base && attempt ? `${base}${base.includes('?') ? '&' : '?'}try=${attempt}` : base;
    const palette = (design?.palette || []).filter((c) => HEX.test(c));
    const wash = palette.length >= 2 ? `linear-gradient(135deg, ${palette.map((c) => `${c}55`).join(', ')})` : undefined;

    return (
        <div className={`relative overflow-hidden bg-[#0b0b12] ${className}`}>
            {state !== 'ready' && (
                <div className="absolute inset-0" style={{ background: wash }} aria-hidden="true">
                    <div className="absolute inset-0 se-shimmer" />
                </div>
            )}
            {base && (state === 'loading' || state === 'ready') ? (
                <img
                    key={url}
                    src={url}
                    alt={alt || `Picture of ${design?.title || 'the design'}`}
                    onLoad={() => setLoad({ base, state: 'ready', attempt })}
                    onError={() => setLoad({ base, state: attempt < RETRIES ? 'retry' : 'failed', attempt })}
                    className={`absolute inset-0 w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-700 ${state === 'ready' ? 'opacity-100' : 'opacity-0'} ${motion && state === 'ready' ? 'se-kenburns' : ''}`}
                />
            ) : null}
            {shown === 'loading' && (
                <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur text-white text-xs font-bold px-4 py-2">
                        <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Rendering full HD picture…
                    </span>
                </span>
            )}
            {(shown === 'failed' || shown === 'none') && (
                <span className="absolute inset-0 grid place-items-center pointer-events-none">
                    <span className="inline-flex items-center gap-2 rounded-full bg-black/60 text-white text-xs font-bold px-4 py-2">
                        <ImageOff size={14} aria-hidden="true" /> Picture service busy. Try again shortly.
                    </span>
                </span>
            )}
        </div>
    );
}
