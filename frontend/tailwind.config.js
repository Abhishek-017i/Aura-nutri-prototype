/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        'background-secondary': 'rgb(var(--color-background-secondary, var(--color-background)) / <alpha-value>)',
        sidebar: 'rgb(var(--color-sidebar, var(--color-background)) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        'card-secondary': 'rgb(var(--color-card-secondary) / <alpha-value>)',
        'card-elevated': 'rgb(var(--color-card-elevated) / <alpha-value>)',
        'surface-light': 'rgb(var(--color-surface-light) / <alpha-value>)',
        'surface-light-secondary': 'rgb(var(--color-surface-light-secondary) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'border-elevated': 'rgb(var(--color-border-elevated, var(--color-border)) / <alpha-value>)',
        'border-highlight': 'rgb(var(--color-border-highlight, var(--color-border)) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
        },
        'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
        'text-main': 'rgb(var(--color-text-main) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        'text-subtle': 'rgb(var(--color-text-subtle, var(--color-text-muted)) / <alpha-value>)',
        'text-light-primary': 'rgb(var(--color-text-light-primary) / <alpha-value>)',
        'text-light-secondary': 'rgb(var(--color-text-light-secondary) / <alpha-value>)',
        'soft-accent': 'rgb(var(--color-soft-accent) / <alpha-value>)',

        // Semantic aliases for compatibility & seamless theme mapping
        'dark-text': 'rgb(var(--color-text-main) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        'soft-peach': 'rgb(var(--color-soft-accent) / <alpha-value>)',
        'soft-sage': 'rgb(var(--color-soft-accent) / <alpha-value>)',
        sage: 'rgb(var(--color-primary) / <alpha-value>)',
        peach: 'rgb(var(--color-primary) / <alpha-value>)',

        // Status & Nutrient Supporting Colors (WCAG AA compliant in light & dark)
        emerald: 'rgb(var(--color-emerald) / <alpha-value>)',
        amber: 'rgb(var(--color-amber) / <alpha-value>)',
        rose: 'rgb(var(--color-rose) / <alpha-value>)',
        'rose-deep': 'rgb(var(--color-rose-deep, var(--color-primary)) / <alpha-value>)',
        burgundy: 'rgb(var(--color-burgundy, var(--color-card)) / <alpha-value>)',
        lavender: 'rgb(var(--color-lavender) / <alpha-value>)',
        'secondary-nutrient': 'rgb(var(--color-secondary-nutrient) / <alpha-value>)',

        white: '#FFFFFF',

        // Nutrient accents (retained identity colors)
        iron: '#B7410E',
        calcium: '#2F6B5E',
        vitd: '#C98A12',
        b12: '#6B4FA0',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        hindi: ['"Tiro Devanagari Hindi"', 'Georgia', 'serif'],
      },
      borderRadius: {
        data: '4px',
        card: '8px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      maxWidth: {
        dashboard: '1120px',
        chat: '640px',
      },
      boxShadow: {
        modal: '0 8px 24px rgba(51,65,85,.12)',
      },
    },
  },
  plugins: [],
}
