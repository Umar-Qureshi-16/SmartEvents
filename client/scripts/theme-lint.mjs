#!/usr/bin/env node
/**
 * Theme safety linter.
 *
 * Catches the class of bug where an element pairs a FIXED colour with a
 * THEME-AWARE token, so it reads correctly in one mode and is unreadable in
 * the other. For example `bg-[#111827] text-fg`: the background is always
 * near-black, but text-fg resolves to near-black in light mode too, making the
 * copy invisible.
 *
 * Run: node scripts/theme-lint.mjs
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

// Components that are intentionally single-theme.
const EXEMPT = ['DynamicNavbar.jsx', 'EventManagerLogo.jsx', 'ParticleBackground.jsx'];

const walk = (dir, out = []) => {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.jsx?$/.test(entry)) out.push(full);
    }
    return out;
};

// Foreground that follows the theme.
const TOKEN_FG = /\b(?:text|border|divide)-(?:fg|muted|border|brand|success|warning|danger|surface)\b/;
// Background that follows the theme.
const TOKEN_BG = /\bbg-(?:bg|surface|surface-2|fg|brand|success|warning|danger|muted)\b/;

// Backgrounds that never change with the theme.
const FIXED_DARK_BG = /\bbg-(?:black|slate-(?:8|9)00|slate-950|gray-(?:8|9)00|zinc-(?:8|9)00|neutral-(?:8|9)00|\[#0[0-9a-fA-F]{5}\]|\[#1[0-9a-fA-F]{5}\])(?![/\w-])/;
const FIXED_LIGHT_BG = /\bbg-(?:white|slate-(?:50|100|200)|gray-(?:50|100)|\[#[fFeE][0-9a-fA-F]{5}\])(?![/\w-])/;

// Foregrounds that never change with the theme.
const FIXED_LIGHT_FG = /\btext-(?:white|slate-(?:100|200|300))\b/;
const FIXED_DARK_FG = /\btext-(?:black|slate-(?:800|900)|gray-900)\b/;

const problems = [];

for (const file of walk(SRC)) {
    if (EXEMPT.some(e => file.endsWith(e))) continue;
    const rel = relative(SRC, file);
    const src = readFileSync(file, 'utf8');

    // Inspect each className string on its own.
    const re = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\})/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const raw = m[1] ?? m[2] ?? m[3] ?? '';
        const line = src.slice(0, m.index).split('\n').length;

        // A template literal often holds a ternary whose branches are mutually
        // exclusive — `active ? 'bg-indigo-500 text-white' : 'bg-fg/5 text-muted'`.
        // Judging the concatenation would pair classes that never co-occur, so
        // split on quoted alternatives and check the base classes plus each
        // branch separately.
        const branches = [...raw.matchAll(/'([^']*)'/g)].map(x => x[1]);
        const base = raw.replace(/\$\{[\s\S]*?\}/g, ' ');
        const candidates = branches.length ? branches.map(b => `${base} ${b}`) : [base];

        for (const cls of candidates) {
            check(cls, rel, line);
        }
    }
}

function check(cls, rel, line) {
    {

        const flag = (why) => problems.push({ rel, line, why, cls: cls.slice(0, 90) });

        // Fixed dark background carrying theme-aware text → invisible in light mode.
        if (FIXED_DARK_BG.test(cls) && TOKEN_FG.test(cls)) {
            flag('fixed DARK background with theme-aware text (invisible in light mode)');
        }
        // Fixed light background carrying theme-aware text → invisible in dark mode.
        if (FIXED_LIGHT_BG.test(cls) && TOKEN_FG.test(cls)) {
            flag('fixed LIGHT background with theme-aware text (invisible in dark mode)');
        }
        // Theme background with permanently light text → invisible in light mode.
        if (TOKEN_BG.test(cls) && FIXED_LIGHT_FG.test(cls) && !/bg-(?:brand|success|warning|danger)\b/.test(cls)) {
            flag('theme background with fixed LIGHT text (invisible in light mode)');
        }
        // Theme background with permanently dark text → invisible in dark mode.
        if (TOKEN_BG.test(cls) && FIXED_DARK_FG.test(cls) && !/bg-(?:warning|success)\b/.test(cls)) {
            flag('theme background with fixed DARK text (invisible in dark mode)');
        }
    }
}

if (problems.length === 0) {
    console.log('theme-lint: no theme-unsafe colour pairings found.');
    process.exit(0);
}

console.log(`theme-lint: ${problems.length} theme-unsafe pairing(s)\n`);
for (const p of problems) {
    console.log(`  ${p.rel}:${p.line}`);
    console.log(`    ${p.why}`);
    console.log(`    ${p.cls}\n`);
}
process.exit(1);
