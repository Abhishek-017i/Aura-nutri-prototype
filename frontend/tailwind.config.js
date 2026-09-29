/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAF6F0',
        card: '#FFFFFF',
        primary: '#8A7568',
        sage: '#82977F',
        peach: '#DFA58D',
        'dark-text': '#332D29',
        muted: '#817A74',
        border: '#E8DED4',
        white: '#FFFFFF',
        emerald: '#10B981',
        amber: '#F59E0B',
        rose: '#F43F5E',
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
