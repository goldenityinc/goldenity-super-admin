/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#136dac',
        dark: '#101822',
        background: '#f8fafc',
      },
    },
  },
  plugins: [],
};
