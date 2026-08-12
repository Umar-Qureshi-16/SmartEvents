import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  // Theme is driven by a `.dark` class on <html>, set by ThemeContext.
  // Without this, `dark:` variants follow the OS and ignore the app's toggle.
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Semantic tokens -------------------------------------------------
        // Each resolves to a CSS custom property defined for both themes in
        // index.css, so components never hardcode a hex and both themes work
        // without `dark:` variants scattered through every file.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-hover': 'rgb(var(--brand-hover) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',

        // --- Legacy aliases --------------------------------------------------
        // `ink`, `paper`, `gold` and `coral` are not Tailwind defaults, so
        // defining them outright is safe.
        ink: 'rgb(var(--bg) / <alpha-value>)',
        paper: 'rgb(var(--surface) / <alpha-value>)',
        gold: 'rgb(var(--warning) / <alpha-value>)',
        coral: 'rgb(var(--danger) / <alpha-value>)',

        // `emerald` and `slate` ARE Tailwind defaults. Assigning a bare string
        // to them replaces the whole 50–950 scale, which silently deleted every
        // `slate-400` / `emerald-500` class in the app (504 usages generating
        // no CSS). Spreading the default scale and adding a DEFAULT key keeps
        // the numeric shades working while still allowing bare `text-emerald`.
        emerald: { ...colors.emerald, DEFAULT: 'rgb(var(--success) / <alpha-value>)' },
        slate: { ...colors.slate, DEFAULT: 'rgb(var(--muted) / <alpha-value>)' },
      },
      fontFamily: {
        primary: ['var(--font-primary)'],
        secondary: ['var(--font-secondary)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgb(var(--shadow) / 0.08), 0 2px 6px -1px rgb(var(--shadow) / 0.04)',
        glow: '0 10px 30px -5px rgb(var(--brand) / 0.35)',
      },
    },
  },
  plugins: [],
}
