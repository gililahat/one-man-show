/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Gold brand ──────────────────────────────────────────
        brand: {
          50:  '#FFF8DB',
          100: '#FFF0A8',
          200: '#FFE566',
          300: '#FFD43B',
          400: '#F5C518',  // ← primary gold
          500: '#D4A017',
          600: '#B38600',
          700: '#8C6900',
          800: '#664D00',
          900: '#3D2D00',
          950: '#1A1200',
        },
        // ── Dark surfaces ───────────────────────────────────────
        surface: {
          DEFAULT: '#0C0C0C',
          50:  '#0C0C0C',   // page background
          100: '#141414',   // sidebar / nav bar
          200: '#1E1E1E',   // cards / inputs / modals
          300: '#262626',   // borders / dividers
          400: '#303030',   // hover states
          800: '#A0A0A0',
          900: '#D0D0D0',
          950: '#F0F0F0',
        },
        // ── Text ────────────────────────────────────────────────
        ink: {
          DEFAULT: '#FFFFFF',
          muted:   '#9CA3AF',
          subtle:  '#6B7280',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#60A5FA',
      },
      fontFamily: {
        sans:    ['Noto Sans Hebrew', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Noto Sans Hebrew', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft':  '0 1px 4px 0 rgba(0,0,0,0.5)',
        'card':  '0 4px 24px 0 rgba(0,0,0,0.6)',
        'modal': '0 20px 80px 0 rgba(0,0,0,0.9)',
        'gold':  '0 0 24px 0 rgba(245,197,24,0.15)',
      },
      spacing: {
        'sidebar': '240px',
      },
      keyframes: {
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'flash-green': {
          '0%, 25%': { backgroundColor: 'rgba(34,197,94,0.12)' },
          '100%':    { backgroundColor: 'transparent' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'pulse-bar': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        'gold-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,197,24,0)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(245,197,24,0.08)' },
        },
      },
      animation: {
        'slide-up':    'slide-up 200ms ease-out both',
        'flash-green': 'flash-green 1800ms ease-out forwards',
        'toast-in':    'toast-in 200ms ease-out both',
        'pulse-bar':   'pulse-bar 1.2s ease-in-out infinite',
        'gold-pulse':  'gold-pulse 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
