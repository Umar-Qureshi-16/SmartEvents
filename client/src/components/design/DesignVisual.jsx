import React, { useMemo } from 'react';

/**
 * A drawn concept of the stage décor, built from the design itself: its colour
 * palette and the items it lists (arch, drapes, lights, lanterns, flowers,
 * seating, aisle, tables...). Used when there is no photo or AI render, so a
 * vendor and organizer can both see what is meant, not only read it.
 */

const lum = (hex) => {
    const h = hex.replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const shade = (hex, k) => {
    const h = hex.replace('#', '');
    const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const ch = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(f.slice(i, i + 2), 16) * k))));
    return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};
function rng(seedText) {
    let s = 0;
    for (const c of String(seedText)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export default function DesignVisual({ design, className = '', label = true }) {
    const art = useMemo(() => {
        const text = `${design?.title || ''} ${design?.theme || ''} ${design?.style || ''} ${(design?.elements || []).map((e) => `${e.item} ${e.description || ''}`).join(' ')}`.toLowerCase();
        const has = (re) => re.test(text);
        const pal = (design?.palette || []).filter((c) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c));
        const palette = pal.length >= 2 ? pal : ['#7a1f2b', '#d4af37', '#fff8e7', '#0e4d2e'];
        const sorted = [...palette].sort((a, b) => lum(a) - lum(b));
        const dark = sorted[0];
        const light = sorted[sorted.length - 1];
        const accent = palette.find((c) => c !== dark && c !== light) || palette[1] || '#d4af37';
        const flowerCols = palette.length > 2 ? palette : [...palette, '#f4a6c0', '#ffffff'];
        return {
            r: rng(design?._id || design?.title || 'design'),
            dark, light, accent, flowerCols,
            wall: shade(dark, 0.35),
            arch: has(/arch|jaali|mughal|dome|gate|entrance|frame/),
            drapes: has(/drape|fabric|canopy|swag|tent|curtain|chiffon/) || true,
            lights: has(/light|fairy|glow|led|chandelier|lamp|candle|diya|ambient/),
            lanterns: has(/lantern|lamp|chandelier/),
            flowers: has(/flower|floral|rose|marigold|jasmine|bloom|garland|petal|centrepiece|centerpiece/) || true,
            seating: has(/sofa|seat|chair|dais|throne|couple|stage|bride|groom/),
            aisle: has(/aisle|walkway|pathway|path|runner|carpet|petal|diya|entrance/),
            tables: has(/table|linen|centrepiece|centerpiece|dinner|guest/),
            pillars: has(/pillar|column|entrance|gate|arch/),
        };
    }, [design]);

    const { r } = art;
    const flowers = (cx, cy, n, spread, size) => Array.from({ length: n }, (_, i) => {
        const a = r() * Math.PI * 2; const d = r() * spread;
        return <circle key={`${cx}-${cy}-${i}`} cx={cx + Math.cos(a) * d} cy={cy + Math.sin(a) * d * 0.7} r={size * (0.6 + r() * 0.6)} fill={art.flowerCols[Math.floor(r() * art.flowerCols.length)]} opacity={0.92} />;
    });
    const swag = (x1, x2, y, sag) => `M${x1},${y} Q${(x1 + x2) / 2},${y + sag} ${x2},${y}`;

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <svg viewBox="0 0 640 400" className="w-full h-full block" role="img" aria-label={`Drawn concept of ${design?.title || 'the design'}`} preserveAspectRatio="xMidYMid slice">
                <defs>
                    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(art.wall, 0.7)} /><stop offset="1" stopColor={art.wall} /></linearGradient>
                    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={shade(art.dark, 0.5)} /><stop offset="1" stopColor={shade(art.dark, 0.25)} /></linearGradient>
                    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stopColor={art.accent} stopOpacity="0.35" /><stop offset="1" stopColor={art.accent} stopOpacity="0" /></radialGradient>
                    <pattern id="jaali" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 0 L18 9 L9 18 L0 9 Z" fill="none" stroke={art.accent} strokeOpacity="0.45" strokeWidth="1.2" /></pattern>
                </defs>

                {/* Venue */}
                <rect width="640" height="400" fill="url(#wall)" />
                <rect y="300" width="640" height="100" fill="url(#floor)" />
                <rect width="640" height="400" fill="url(#glow)" />

                {/* Ceiling drapes */}
                {art.drapes && [0, 1, 2, 3].map((i) => (
                    <path key={`d${i}`} d={swag(i * 160, i * 160 + 160, 0, 55)} fill="none" stroke={i % 2 ? art.light : art.accent} strokeOpacity="0.55" strokeWidth="16" />
                ))}
                {art.lights && [0, 1, 2, 3].map((i) => Array.from({ length: 9 }, (_, j) => {
                    const t = j / 8; const x = i * 160 + t * 160; const y = 4 + 4 * 55 * t * (1 - t) * 0.5 + 18;
                    return <circle key={`l${i}-${j}`} cx={x} cy={y} r="2.6" fill="#fff6c8" opacity={0.95} />;
                }))}

                {/* Pillars */}
                {art.pillars && [70, 570].map((x) => (
                    <g key={`p${x}`}>
                        <rect x={x - 14} y="110" width="28" height="195" rx="6" fill={art.light} opacity="0.9" />
                        <rect x={x - 18} y="104" width="36" height="10" rx="3" fill={art.accent} />
                        {flowers(x, 120, 10, 18, 6)}
                        {flowers(x, 290, 8, 16, 6)}
                    </g>
                ))}

                {/* Backdrop */}
                {art.arch ? (
                    <g>
                        <path d="M170,300 L170,170 Q170,95 240,80 Q280,55 320,45 Q360,55 400,80 Q470,95 470,170 L470,300 Z" fill={art.dark} stroke={art.accent} strokeWidth="6" />
                        <path d="M195,300 L195,175 Q195,115 250,103 Q285,82 320,74 Q355,82 390,103 Q445,115 445,175 L445,300 Z" fill="url(#jaali)" />
                        <path d="M195,300 L195,175 Q195,115 250,103 Q285,82 320,74 Q355,82 390,103 Q445,115 445,175 L445,300 Z" fill={art.light} opacity="0.08" />
                        {flowers(320, 52, 14, 26, 7)}
                    </g>
                ) : (
                    <g>
                        <rect x="160" y="80" width="320" height="220" rx="14" fill={art.dark} stroke={art.accent} strokeWidth="5" />
                        {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={`pl${i}`} x={172 + i * 43} y="92" width="34" height="196" rx="6" fill={i % 2 ? art.light : art.accent} opacity="0.18" />)}
                    </g>
                )}
                {art.flowers && <>{flowers(175, 110, 16, 30, 8)}{flowers(465, 110, 16, 30, 8)}</>}

                {/* Lanterns */}
                {art.lanterns && [230, 320, 410].map((x, i) => (
                    <g key={`ln${x}`}>
                        <line x1={x} y1="0" x2={x} y2={60 + i % 2 * 18} stroke={art.accent} strokeWidth="1.5" />
                        <path d={`M${x - 10},${62 + i % 2 * 18} h20 l-4,22 h-12 z`} fill={art.accent} />
                        <circle cx={x} cy={74 + i % 2 * 18} r="5" fill="#fff6c8" />
                    </g>
                ))}

                {/* Stage platform */}
                <path d="M120,300 L520,300 L560,330 L80,330 Z" fill={art.light} opacity="0.92" />
                <rect x="80" y="330" width="480" height="10" fill={art.accent} />
                {art.flowers && <>{flowers(110, 318, 14, 30, 7)}{flowers(530, 318, 14, 30, 7)}{flowers(320, 336, 10, 60, 5)}</>}

                {/* Couple's seating */}
                {art.seating && (
                    <g>
                        <path d="M270,300 L270,250 Q320,222 370,250 L370,300 Z" fill={art.accent} />
                        <rect x="262" y="276" width="116" height="24" rx="8" fill={art.light} stroke={art.accent} strokeWidth="2" />
                        <rect x="256" y="262" width="14" height="38" rx="6" fill={art.accent} />
                        <rect x="370" y="262" width="14" height="38" rx="6" fill={art.accent} />
                    </g>
                )}

                {/* Aisle with petals and diyas */}
                {art.aisle && (
                    <g>
                        <path d="M290,340 L350,340 L420,400 L220,400 Z" fill={art.dark} opacity="0.85" />
                        {Array.from({ length: 26 }, (_, i) => <circle key={`pt${i}`} cx={240 + r() * 160} cy={345 + r() * 52} r={1.8 + r() * 1.5} fill={art.flowerCols[i % art.flowerCols.length]} />)}
                        {[0, 1, 2, 3].map((i) => (
                            <g key={`dy${i}`}>
                                <circle cx={262 - i * 14} cy={350 + i * 15} r="4" fill="#ffcf5a" />
                                <circle cx={378 + i * 14} cy={350 + i * 15} r="4" fill="#ffcf5a" />
                            </g>
                        ))}
                    </g>
                )}

                {/* Guest tables */}
                {art.tables && [70, 570].map((x) => (
                    <g key={`t${x}`}>
                        <ellipse cx={x} cy="372" rx="52" ry="14" fill={art.light} />
                        <rect x={x - 52} y="372" width="104" height="22" fill={art.light} opacity="0.85" />
                        {flowers(x, 360, 8, 12, 5)}
                    </g>
                ))}
            </svg>
            {label && <span className="absolute bottom-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-black/55 text-white rounded-full px-2 py-0.5">Concept drawing</span>}
        </div>
    );
}
