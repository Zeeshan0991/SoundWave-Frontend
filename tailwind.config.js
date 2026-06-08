/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          black: '#121212',
          dark: '#181818',
          card: '#282828',
          hover: '#3E3E3E',
          muted: '#B3B3B3',
          light: '#FFFFFF',
        }
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-bar': 'pulseBar 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseBar: { '0%, 100%': { transform: 'scaleY(0.4)' }, '50%': { transform: 'scaleY(1)' } },
      }
    },
  },
  plugins: [],
}
