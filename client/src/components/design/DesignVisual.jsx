import React, { useId, useMemo } from 'react';

/**
 * The 2D animated view of a design, drawn from the design itself: its colour
 * palette, its theme and the items it lists. Birthdays and themed parties get
 * a balloon-ring backdrop with plinths and a cake; weddings and formal events
 * get a stage with an arch or panelled backdrop, drapes, lights and flowers.
 * Lights twinkle, balloons float and a soft light sweeps across; all motion
 * stops for people who ask their system for reduced motion.
 *
 * It draws on a 1600 x 900 (16:9) canvas so it can be saved in full HD.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const full = (hex) => {
    const h = hex.replace('#', '');
    return h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
};
const lum = (hex) => {
    const f = full(hex);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const shade = (hex, k) => {
    const f = full(hex);
    const ch = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(f.slice(i, i + 2), 16) * k))));
    return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};
function rng(seedText) {
    let s = 0;
    for (const c of String(seedText)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const W = 1600;
const H = 900;
const PARTY = /\b(birthday|party|kids?|baby|shower|batman|spider-?man|superhero(es)?|marvel|princess|unicorn|frozen|cartoon|balloons?|jungle|safari|dino(saur)?s?|cars|space|mermaid|barbie|minnie|mickey)\b/;
// Formal events always get a stage, whatever words their theme uses.
const FORMAL = /wedding|nikah|mehndi|mehendi|walima|baraat|engagement|corporate|conference|gala/;

export default function DesignVisual({ design, className = '', label = '2D animated', animated = true, svgRef }) {
    const uid = useId().replace(/[^a-z0-9]/gi, '');
    const id = (n) => `${n}-${uid}`;

    const art = useMemo(() => {
        const text = `${design?.title || ''} ${design?.theme || ''} ${design?.style || ''} ${design?.eventType || ''} ${(design?.elements || []).map((e) => `${e.item} ${e.description || ''}`).join(' ')}`.toLowerCase();
        const has = (re) => re.test(text);
        const pal = (design?.palette || []).filter((c) => HEX.test(c));
        const palette = pal.length >= 2 ? pal : ['#7a1f2b', '#d4af37', '#fff8e7', '#0e4d2e'];
        const sorted = [...palette].sort((a, b) => lum(a) - lum(b));
        const dark = sorted[0];
        const light = sorted[sorted.length - 1];
        const accent = palette.find((c) => c !== dark && c !== light) || palette[1] || '#d4af37';
        return {
            seed: design?._id || design?.title || 'design',
            palette, dark, light, accent,
            party: !FORMAL.test(String(design?.eventType || '').toLowerCase()) && has(PARTY),
            arch: has(/arch|jaali|mughal|dome|gate|entrance|frame/),
            lights: true,
            lanterns: has(/lantern|lamp|chandelier/),
            seating: has(/sofa|seat|chair|dais|throne|couple|bride|groom/),
            aisle: has(/aisle|walkway|pathway|path|runner|carpet|petal|diya|entrance/),
            tables: has(/table|linen|centrepiece|centerpiece|dinner|guest/),
            pillars: has(/pillar|column|entrance|gate|arch/),
            cake: has(/cake|dessert|sweet/),
        };
    }, [design]);

    const scene = useMemo(() => {
        const r = rng(art.seed);
        const pick = () => art.palette[Math.floor(r() * art.palette.length)];
        const bloom = (cx, cy, n, spread, size) => Array.from({ length: n }, () => {
            const a = r() * Math.PI * 2; const d = r() * spread;
            return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.7, r: size * (0.6 + r() * 0.6), c: pick(), delay: r() * 4 };
        });
        // Balloon ring: big balloons on the outside, small ones tucked in, heavier on the top-right.
        const ring = [];
        for (let i = 0; i < 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            const lump = 1 + 0.55 * Math.max(0, Math.cos(a + 0.9)) + 0.45 * Math.max(0, Math.cos(a - 2.4));
            const rad = 255 + (r() - 0.5) * 34;
            ring.push({ x: 800 + Math.cos(a) * rad, y: 420 + Math.sin(a) * rad, r: (20 + r() * 16) * lump, c: i % 3 === 0 ? art.accent : (i % 3 === 1 ? art.dark : pick()), delay: r() * 3 });
        }
        const sparkles = Array.from({ length: 34 }, () => ({ x: r() * W, y: r() * H * 0.75, s: 3 + r() * 6, delay: r() * 5 }));
        const confetti = Array.from({ length: 70 }, () => ({ x: r() * W, y: 760 + r() * 140, w: 6 + r() * 10, c: pick(), rot: r() * 180 }));
        const petals = Array.from({ length: 22 }, () => ({ x: 200 + r() * 1200, delay: r() * 9, dur: 7 + r() * 6, c: pick() }));
        return { r, bloom, ring, sparkles, confetti, petals, floorBalloons: [bloom(300, 760, 9, 70, 30), bloom(1300, 760, 9, 70, 30)] };
    }, [art]);

    const emblem = String(design?.theme || design?.eventType || 'Party').split(/\s+/)[0].slice(0, 9).toUpperCase();
    const swag = (x1, x2, y, sag) => `M${x1},${y} Q${(x1 + x2) / 2},${y + sag} ${x2},${y}`;
    const anim = animated ? '' : ' se-still';

    const balloon = (b, k, cls = 'se-bob') => (
        <g key={k} className={cls} style={{ animationDelay: `${b.delay}s` }}>
            <circle cx={b.x} cy={b.y} r={b.r} fill={b.c} />
            <circle cx={b.x} cy={b.y} r={b.r} fill={`url(#${id('shine')})`} />
        </g>
    );

    return (
        <div className={`relative overflow-hidden ${className}`}>
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" className={`w-full h-full block${anim}`} role="img"
                aria-label={`2D animated view of ${design?.title || 'the design'}`} preserveAspectRatio="xMidYMid slice">
                <style>{`
                    .se-twinkle{animation:se-tw 2.6s ease-in-out infinite}
                    .se-bob{animation:se-bob 4.5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
                    .se-pulse{animation:se-pulse 5s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
                    .se-swing{animation:se-swing 6s ease-in-out infinite;transform-box:fill-box;transform-origin:top center}
                    .se-sweep{animation:se-sweep 9s ease-in-out infinite}
                    .se-breathe{animation:se-breathe 6s ease-in-out infinite}
                    .se-fall{animation:se-fall linear infinite}
                    @keyframes se-tw{0%,100%{opacity:.25}50%{opacity:1}}
                    @keyframes se-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
                    @keyframes se-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
                    @keyframes se-swing{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
                    @keyframes se-sweep{0%{transform:translateX(-1700px)}60%,100%{transform:translateX(1700px)}}
                    @keyframes se-breathe{0%,100%{opacity:.55}50%{opacity:1}}
                    @keyframes se-fall{0%{transform:translateY(-60px) rotate(0);opacity:0}10%{opacity:.9}100%{transform:translateY(960px) rotate(260deg);opacity:0}}
                    .se-still *{animation:none!important}
                    @media (prefers-reduced-motion: reduce){svg *{animation:none!important}}
                `}</style>
                <defs>
                    <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={shade(art.dark, art.party ? 0.55 : 0.3)} />
                        <stop offset="1" stopColor={shade(art.dark, art.party ? 0.9 : 0.55)} />
                    </linearGradient>
                    <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor={shade(art.light, 0.55)} />
                        <stop offset="1" stopColor={shade(art.light, 0.3)} />
                    </linearGradient>
                    <radialGradient id={id('glow')} cx="0.5" cy="0.42" r="0.55">
                        <stop offset="0" stopColor={art.accent} stopOpacity="0.45" />
                        <stop offset="1" stopColor={art.accent} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id={id('shine')} cx="0.32" cy="0.28" r="0.7">
                        <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" />
                        <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.15" />
                        <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
                    </radialGradient>
                    <linearGradient id={id('cyl')} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#000" stopOpacity="0.35" />
                        <stop offset="0.35" stopColor="#fff" stopOpacity="0.18" />
                        <stop offset="1" stopColor="#000" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id={id('beam')} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#fff" stopOpacity="0" />
                        <stop offset="0.5" stopColor="#fff" stopOpacity="0.16" />
                        <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </linearGradient>
                    <pattern id={id('jaali')} width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M20 0 L40 20 L20 40 L0 20 Z" fill="none" stroke={art.accent} strokeOpacity="0.5" strokeWidth="2.5" />
                    </pattern>
                    <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
                </defs>

                {/* Room */}
                <rect width={W} height={H} fill={`url(#${id('wall')})`} />
                <rect y="700" width={W} height="200" fill={`url(#${id('floor')})`} />
                <rect width={W} height={H} fill={`url(#${id('glow')})`} className="se-breathe" />

                {art.party ? (
                    <g>
                        {/* Round backdrop panel inside a balloon ring */}
                        <ellipse cx="800" cy="735" rx="520" ry="34" fill="#000" opacity="0.25" filter={`url(#${id('soft')})`} />
                        <circle cx="800" cy="420" r="235" fill={art.light} />
                        <circle cx="800" cy="420" r="235" fill={`url(#${id('glow')})`} />
                        <circle cx="800" cy="420" r="235" fill="none" stroke={art.accent} strokeWidth="10" />
                        {/* Theme emblem */}
                        <g className="se-pulse">
                            <ellipse cx="800" cy="300" rx="150" ry="82" fill={art.dark} />
                            <ellipse cx="800" cy="300" rx="138" ry="72" fill={art.accent} />
                            <text x="800" y="320" textAnchor="middle" textLength={emblem.length > 6 ? 230 : undefined} lengthAdjust="spacingAndGlyphs" fontFamily="Inter, Arial, sans-serif" fontWeight="900" fontSize="58" fill={art.dark}>
                                {emblem}
                            </text>
                        </g>
                        {scene.ring.map((b, i) => balloon(b, `rb${i}`))}

                        {/* Plinths with the cake on the tallest */}
                        {[{ x: 560, w: 120, h: 150 }, { x: 800, w: 170, h: 250 }, { x: 1040, w: 120, h: 190 }].map((p, i) => (
                            <g key={`pl${i}`}>
                                <rect x={p.x - p.w / 2} y={720 - p.h} width={p.w} height={p.h} fill={i === 1 ? art.dark : art.accent} />
                                <rect x={p.x - p.w / 2} y={720 - p.h} width={p.w} height={p.h} fill={`url(#${id('cyl')})`} />
                                <ellipse cx={p.x} cy={720 - p.h} rx={p.w / 2} ry="14" fill={shade(i === 1 ? art.dark : art.accent, 1.25)} />
                                <ellipse cx={p.x} cy="720" rx={p.w / 2} ry="14" fill={shade(i === 1 ? art.dark : art.accent, 0.7)} />
                            </g>
                        ))}
                        {(
                            <g>
                                <rect x="740" y="410" width="120" height="60" rx="8" fill={art.light} />
                                <rect x="758" y="368" width="84" height="44" rx="8" fill={art.accent} />
                                <rect x="740" y="410" width="120" height="10" fill={art.accent} opacity="0.7" />
                                {[780, 800, 820].map((x) => (
                                    <g key={`cd${x}`}>
                                        <rect x={x - 3} y="344" width="6" height="26" fill="#fff" />
                                        <ellipse cx={x} cy="338" rx="6" ry="10" fill="#ffcf5a" className="se-twinkle" style={{ animationDelay: `${(x % 7) / 5}s` }} />
                                    </g>
                                ))}
                            </g>
                        )}
                        {/* Balloon clusters on the floor */}
                        {scene.floorBalloons.flat().map((b, i) => balloon(b, `fb${i}`))}
                        {scene.confetti.map((c, i) => (
                            <rect key={`cf${i}`} x={c.x} y={c.y} width={c.w} height={c.w / 2.5} fill={c.c} opacity="0.85" transform={`rotate(${c.rot} ${c.x} ${c.y})`} />
                        ))}
                    </g>
                ) : (
                    <g>
                        {/* Ceiling drapes and string lights */}
                        {[0, 1, 2, 3].map((i) => (
                            <path key={`d${i}`} d={swag(i * 400, i * 400 + 400, -10, 140)} fill="none" stroke={i % 2 ? art.light : art.accent} strokeOpacity="0.6" strokeWidth="38" />
                        ))}
                        {[0, 1, 2, 3].map((i) => Array.from({ length: 13 }, (_, j) => {
                            const t = j / 12;
                            return <circle key={`l${i}-${j}`} cx={i * 400 + t * 400} cy={40 + 4 * 140 * t * (1 - t) * 0.5} r="6" fill="#fff6c8" className="se-twinkle" style={{ animationDelay: `${(i * 13 + j) % 9 * 0.3}s` }} />;
                        }))}

                        {/* Pillars */}
                        {art.pillars && [190, 1410].map((x) => (
                            <g key={`p${x}`}>
                                <rect x={x - 36} y="270" width="72" height="440" rx="14" fill={art.light} opacity="0.92" />
                                <rect x={x - 36} y="270" width="72" height="440" rx="14" fill={`url(#${id('cyl')})`} />
                                <rect x={x - 46} y="255" width="92" height="24" rx="6" fill={art.accent} />
                                {scene.bloom(x, 285, 14, 44, 15).map((f, k) => <circle key={k} cx={f.x} cy={f.y} r={f.r} fill={f.c} className="se-pulse" style={{ animationDelay: `${f.delay}s` }} />)}
                            </g>
                        ))}

                        {/* Backdrop */}
                        {art.arch ? (
                            <g>
                                <path d="M430,700 L430,420 Q430,230 600,200 Q700,140 800,115 Q900,140 1000,200 Q1170,230 1170,420 L1170,700 Z" fill={art.dark} stroke={art.accent} strokeWidth="14" />
                                <path d="M490,700 L490,430 Q490,285 625,258 Q712,205 800,185 Q888,205 975,258 Q1110,285 1110,430 L1110,700 Z" fill={`url(#${id('jaali')})`} />
                                {scene.bloom(800, 130, 22, 70, 18).map((f, k) => <circle key={k} cx={f.x} cy={f.y} r={f.r} fill={f.c} className="se-pulse" style={{ animationDelay: `${f.delay}s` }} />)}
                            </g>
                        ) : (
                            <g>
                                <rect x="400" y="200" width="800" height="510" rx="30" fill={art.dark} stroke={art.accent} strokeWidth="12" />
                                {Array.from({ length: 7 }, (_, i) => <rect key={`pn${i}`} x={428 + i * 108} y="228" width="86" height="454" rx="14" fill={i % 2 ? art.light : art.accent} opacity="0.2" />)}
                            </g>
                        )}
                        {scene.bloom(440, 270, 22, 70, 18).concat(scene.bloom(1160, 270, 22, 70, 18)).map((f, k) => (
                            <circle key={`fl${k}`} cx={f.x} cy={f.y} r={f.r} fill={f.c} className="se-pulse" style={{ animationDelay: `${f.delay}s` }} />
                        ))}

                        {/* Lanterns */}
                        {art.lanterns && [580, 800, 1020].map((x, i) => (
                            <g key={`ln${x}`} className="se-swing" style={{ animationDelay: `${i * 0.8}s` }}>
                                <line x1={x} y1="0" x2={x} y2={150 + (i % 2) * 40} stroke={art.accent} strokeWidth="3" />
                                <path d={`M${x - 26},${150 + (i % 2) * 40} h52 l-10,56 h-32 z`} fill={art.accent} />
                                <circle cx={x} cy={180 + (i % 2) * 40} r="12" fill="#fff6c8" className="se-twinkle" />
                            </g>
                        ))}

                        {/* Stage */}
                        <path d="M300,700 L1300,700 L1400,770 L200,770 Z" fill={art.light} opacity="0.95" />
                        <rect x="200" y="770" width="1200" height="22" fill={art.accent} />
                        {scene.bloom(270, 735, 18, 70, 16).concat(scene.bloom(1330, 735, 18, 70, 16)).map((f, k) => (
                            <circle key={`sf${k}`} cx={f.x} cy={f.y} r={f.r} fill={f.c} />
                        ))}

                        {art.seating && (
                            <g>
                                <path d="M670,700 L670,580 Q800,510 930,580 L930,700 Z" fill={art.accent} />
                                <rect x="650" y="640" width="300" height="60" rx="20" fill={art.light} stroke={art.accent} strokeWidth="5" />
                                <rect x="636" y="610" width="36" height="90" rx="14" fill={art.accent} />
                                <rect x="928" y="610" width="36" height="90" rx="14" fill={art.accent} />
                            </g>
                        )}

                        {art.aisle && (
                            <g>
                                <path d="M720,792 L880,792 L1060,900 L540,900 Z" fill={art.dark} opacity="0.85" />
                                {[0, 1, 2, 3].map((i) => (
                                    <g key={`dy${i}`}>
                                        <circle cx={660 - i * 40} cy={815 + i * 26} r="9" fill="#ffcf5a" className="se-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
                                        <circle cx={940 + i * 40} cy={815 + i * 26} r="9" fill="#ffcf5a" className="se-twinkle" style={{ animationDelay: `${i * 0.4 + 0.2}s` }} />
                                    </g>
                                ))}
                            </g>
                        )}

                        {art.tables && [150, 1450].map((x) => (
                            <g key={`t${x}`}>
                                <ellipse cx={x} cy="850" rx="130" ry="32" fill={art.light} />
                                <rect x={x - 130} y="850" width="260" height="50" fill={art.light} opacity="0.85" />
                                {scene.bloom(x, 822, 10, 30, 12).map((f, k) => <circle key={k} cx={f.x} cy={f.y} r={f.r} fill={f.c} />)}
                            </g>
                        ))}

                        {/* Falling petals */}
                        {scene.petals.map((p, i) => (
                            <ellipse key={`pt${i}`} cx={p.x} cy="0" rx="7" ry="4" fill={p.c} className="se-fall" style={{ animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
                        ))}
                    </g>
                )}

                {/* Sparkles and a soft sweep of light */}
                {scene.sparkles.map((s, i) => (
                    <path key={`sp${i}`} d={`M${s.x},${s.y - s.s} L${s.x + s.s / 3},${s.y} L${s.x},${s.y + s.s} L${s.x - s.s / 3},${s.y} Z`} fill="#fff8d6" className="se-twinkle" style={{ animationDelay: `${s.delay}s` }} />
                ))}
                <g transform="skewX(-12)"><rect x="0" y="0" width="420" height={H} fill={`url(#${id('beam')})`} className="se-sweep" /></g>
            </svg>
            {label && <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-black/55 text-white rounded-full px-2 py-0.5 pointer-events-none">{label}</span>}
        </div>
    );
}
