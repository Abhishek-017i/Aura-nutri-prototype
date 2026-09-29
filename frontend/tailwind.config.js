/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F7F3EC',
        card: '#FFFFFF',
        primary: '#718A73',
        sage: '#82977F',
        peach: '#DFA58D',
        'dark-text': '#332D29',
        muted: '#817A74',
        border: '#E5DDD3',
        white: '#FFFFFF',
        emerald: '#5F8A68',
        amber: '#C8953D',
        rose: '#C96B67',
        'soft-peach': '#F3DDD2',
        'soft-sage': '#E4EDE2',
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
