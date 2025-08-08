/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'ui-serif', 'serif'],
      },
      colors: {
        brand: {
          50: '#f2f7ff',
          100: '#e6efff',
          200: '#c4daff',
          300: '#9cc0ff',
          400: '#6f9cff',
          500: '#3f74ff',
          600: '#2356e6',
          700: '#1a42b4',
          800: '#183a8f',
          900: '#182f70',
        },
      },
    },
  },
  plugins: [],
};


