/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ONE MAN SHOW brand palette
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#6366f1',  // primary
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        surface: {
          DEFAULT: '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        ink: {
          DEFAULT: '#0f172a',
          muted:   '#64748b',
          subtle:  '#94a3b8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans: ['Noto Sans Hebrew', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Noto Sans Hebrew', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft':  '0 2px 8px 0 rgba(0,0,0,0.06)',
        'card':  '0 4px 16px 0 rgba(0,0,0,0.08)',
        'modal': '0 20px 60px 0 rgba(0,0,0,0.15)',
      },
      spacing: {
        'sidebar': '240px',
      },
    },
  },
  plugins: [],
}
