/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep evergreen — primary brand. Echoes the slide's green identity
        // without copying it. Reads as healthcare-serious, not SaaS-generic.
        brand: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
          950: '#0A2E1A',
        },
        // Warm amber — used sparingly as an accent (never as a fill).
        accent: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        // Warm neutrals — slightly tinted away from pure grey to feel
        // less clinical. Surfaces are off-white, not glaring white.
        surface:  '#FAFAF9',
        ink:      '#0F172A',
        muted:    '#64748B',
        line:     '#E7E5E4',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      // Custom shadow that sits softer than Tailwind defaults.
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 0 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
      },
      animation: {
        'fade-in':  'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                  to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' },    to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
