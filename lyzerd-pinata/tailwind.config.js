/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors para el globals.css original
        'bg-dark': '#0f172a',      // slate-900
        'text-primary': '#f8fafc', // slate-50
        'border': '#334155',       // slate-700
        
        // Frutiger Aero color palette (opcional)
        'cyber': {
          50: '#e0f9ff',
          100: '#b3f0ff',
          200: '#80e7ff',
          300: '#4dddff',
          400: '#1ad4ff',
          500: '#00d4ff',  // Main cyan
          600: '#00b8e6',
          700: '#0099cc',
          800: '#007ab3',
          900: '#005c99',
        },
        'aqua': {
          50: '#e5fffd',
          100: '#b3fff9',
          200: '#80fff5',
          300: '#4dfff1',
          400: '#1affed',
          500: '#00ffe9',  // Bright aqua
          600: '#00e6d0',
          700: '#00ccb7',
          800: '#00b39e',
          900: '#009985',
        }
      },
      animation: {
        'gradient-shift': 'gradient-shift 5s ease infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shine': 'shine 3s infinite',
        'spin-glossy': 'spin-glossy 1s linear infinite',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor'
          },
          '50%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor'
          },
        },
        'shine': {
          '0%': { left: '-100%' },
          '50%, 100%': { left: '100%' },
        },
        'spin-glossy': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.5)',
        'glow-teal': '0 0 20px rgba(20, 212, 212, 0.5)',
        '3xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 50px rgba(0, 255, 255, 0.1)',
      }
    },
  },
  plugins: [],
}
