import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand accent — calm business blue
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Semantic status colours
        status: {
          paid: '#16a34a',
          'paid-bg': '#f0fdf4',
          overdue: '#dc2626',
          'overdue-bg': '#fef2f2',
          warning: '#d97706',
          'warning-bg': '#fffbeb',
          failed: '#991b1b',
          'failed-bg': '#fef2f2',
          pending: '#2563eb',
          'pending-bg': '#eff6ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      spacing: {
        'sidebar-w': '260px',
        'topbar-h': '64px',
        'mobile-nav-h': '64px',
      },
      maxWidth: {
        content: '1400px',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover':
          '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        sidebar: '1px 0 3px 0 rgb(0 0 0 / 0.05)',
      },
      screens: {
        xs: '360px',
        mobile: '480px',
      },
      // Touch-target minimum
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
} satisfies Config;
