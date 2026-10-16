/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        page: 'rgb(var(--color-base) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-muted': 'rgb(var(--color-accent-muted) / <alpha-value>)',
        text: 'rgb(var(--color-text) / <alpha-value>)',
        'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      backgroundColor: {
        base: 'rgb(var(--color-base) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Oswald', 'sans-serif'],
        athletic: ['Oswald', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      minHeight: {
        tap: '44px',
      },
    },
  },
  plugins: [],
}