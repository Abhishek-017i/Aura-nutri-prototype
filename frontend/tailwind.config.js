/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F2',
        ink: '#1A1A18',
        'ink-soft': '#5C5A55',
        line: '#E5DFD5',
        surface: '#FFFFFF',
        iron: '#B7410E',
        calcium: '#2F6B5E',
        vitd: '#C98A12',
        b12: '#6B4FA0',
        'risk-high': '#B7410E',
        'risk-med': '#C98A12',
        'risk-low': '#2F6B5E',
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
    },
  },
  plugins: [],
}
