/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        paper: 'var(--color-paper)',
        emerald: 'var(--color-emerald)',
        gold: 'var(--color-gold)',
        coral: 'var(--color-coral)',
        slate: 'var(--color-slate)',
        // retain existing utility colors if needed
        'light-bg': '#FAFAFC',
        'light-card': '#FFFFFF',
        'light-text': '#0F172A',
        'adyen-green': '#4F46E5', // Electric Indigo Primary
        'emerald-accent': '#10B981', // Emerald Status Accent
        'adyen-dark': '#0F172A',
        'adyen-grey': '#64748B',
      },
      fontFamily: {
        primary: ['var(--font-primary)'],
        secondary: ['var(--font-secondary)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        'adyen-card': '0 4px 20px -2px rgba(15, 23, 42, 0.04), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        'adyen-glow': '0 10px 30px -5px rgba(79, 70, 229, 0.35)',
      },
    },
  },
  plugins: [],
}
