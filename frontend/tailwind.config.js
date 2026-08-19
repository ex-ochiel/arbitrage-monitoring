/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0F172A',
        cardBg: '#1E293B',
        neonGreen: '#10B981',
        vibrantRed: '#EF4444',
        amberWarning: '#F59E0B'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
