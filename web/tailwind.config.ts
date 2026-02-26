/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          950: '#08090d',
          900: '#0f1117',
          800: '#161b22',
          700: '#1c2333',
          600: '#252d3a',
          500: '#2f3a4a',
        },
        accent: {
          DEFAULT: '#2dd4bf',
          50: '#effefb',
          100: '#c8fff4',
          200: '#91feea',
          300: '#53f5dc',
          400: '#2dd4bf',
          500: '#0db9a5',
          600: '#079487',
          700: '#0a766d',
          800: '#0d5d58',
          900: '#104d49',
        },
        amber: {
          DEFAULT: '#f5b845',
          50: '#fefbec',
          100: '#fdf3c9',
          200: '#fbe58e',
          300: '#f9d254',
          400: '#f5b845',
          500: '#ef9b16',
          600: '#d3760f',
          700: '#af5510',
          800: '#8f4214',
          900: '#763714',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
        },
        success: {
          DEFAULT: '#22c55e',
          light: '#86efac',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'number-tick': 'numberTick 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        numberTick: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '60%': { transform: 'translateY(5%)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(45,212,191,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(45,212,191,0.03) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
};
