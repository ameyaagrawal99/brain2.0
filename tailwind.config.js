/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:  ['Inter', 'Inter var', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      colors: {
        brand:    'rgb(var(--color-brand) / <alpha-value>)',
        'brand-l':'rgb(var(--color-brand-l) / <alpha-value>)',
        bg:       'rgb(var(--color-bg) / <alpha-value>)',
        surface:  'rgb(var(--color-surface) / <alpha-value>)',
        surface2: 'rgb(var(--color-surface2) / <alpha-value>)',
        hover:    'rgb(var(--color-hover) / <alpha-value>)',
        border:   'rgb(var(--color-border) / <alpha-value>)',
        border2:  'rgb(var(--color-border2) / <alpha-value>)',
        ink:      'rgb(var(--color-text) / <alpha-value>)',
        ink2:     'rgb(var(--color-text2) / <alpha-value>)',
        ink3:     'rgb(var(--color-text3) / <alpha-value>)',
        ok:       'rgb(var(--color-green) / <alpha-value>)',
        warn:     'rgb(var(--color-yellow) / <alpha-value>)',
        danger:   'rgb(var(--color-red) / <alpha-value>)',
        info:     'rgb(var(--color-blue) / <alpha-value>)',
        purple:   'rgb(var(--color-purple) / <alpha-value>)',
        accent:   'rgb(var(--color-orange) / <alpha-value>)',
      },

      boxShadow: {
        sm:   'var(--shadow-sm)',
        md:   'var(--shadow-md)',
        lg:   'var(--shadow-lg)',
        xl:   'var(--shadow-xl)',
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },

      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },

      animation: {
        'fade-in':   'fadeIn 0.18s ease-out both',
        'slide-up':  'slideUp 0.22s ease-out both',
        'scale-in':  'scaleIn 0.18s ease-out both',
        'spin-slow': 'spin 1.6s linear infinite',
      },

      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
