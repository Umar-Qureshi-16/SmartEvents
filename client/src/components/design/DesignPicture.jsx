import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import API_BASE_URL from '../../apiConfig';
import DesignVisual from './DesignVisual';

// Stored paths start with /api/v1; point them at the configured API.
export const resolveImage = (src) => (src && src.startsWith('/api/v1/') ? API_BASE_URL + src.slice('/api/v1'.length) : src);
const RETRIES = 40;      // about four minutes in all (the free image tier is slow)
const RETRY_MS = 6000;

/**
 * A design's picture in one of two views:
 * - "3d": the full HD photo-real render. The server makes it the first time it
 *   is asked for, which can take a while, so the 2D animated view plays
 *   underneath and the render is asked for again until it is ready.
 * - "2d": the animated drawing of the design.
 *
 * Give `src` (a stored photo link) or `path` (the API path that makes one).
 * `onState` reports 'loading' | 'ready' | 'failed' | 'none' for the 3D render.
 */
export default function DesignPicture({ design, src, path, alt, className = '', view = '3d', fit = 'cover', motion = true, onState, svgRef }) {
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
    const waiting = shown === 'loading';
    const show3d = view === '3d';

    return (
        <div className={`relative overflow-hidden bg-[#0b0b12] ${className}`}>
            {/* The animated 2D view stays underneath, so nothing flashes while the render fades in. */}
            <DesignVisual design={design} svgRef={svgRef} label={false} className="absolute inset-0 w-full h-full" />
            {show3d && base && (state === 'loading' || state === 'ready') ? (
                <img
                    key={url}
                    src={url}
                    alt={alt || `Picture of ${design?.title || 'the design'}`}
                    onLoad={() => setLoad({ base, state: 'ready', attempt })}
                    onError={() => setLoad({ base, state: attempt < RETRIES ? 'retry' : 'failed', attempt })}
                    className={`absolute inset-0 w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-700 ${state === 'ready' ? 'opacity-100' : 'opacity-0'} ${motion && state === 'ready' ? 'se-kenburns' : ''}`}
                />
            ) : null}
            {show3d && waiting && (
                <span className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur text-white text-[11px] font-bold px-3 py-1 whitespace-nowrap">
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Rendering full HD picture…
                </span>
            )}
            {show3d && shown === 'failed' && (
                <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 text-white text-[11px] font-bold px-3 py-1 whitespace-nowrap">
                    Picture service busy, showing the 2D view
                </span>
            )}
        </div>
    );
}
