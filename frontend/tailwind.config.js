/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        collab: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
        },
        nexus: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#1e1b4b',
        },
        pink: {
          500: '#ec4899',
          600: '#db2777',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
        },
        dark: {
          bg: '#0a0d1a',
          surface: '#1a1d2e',
          editor: '#0f0f23',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'code-type': 'typewriter 2s steps(40) infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(99, 102, 241, 0.8)' },
        },
        typewriter: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #0a0d1a 0%, #1a1d2e 100%)',
        'gradient-nexus': 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
        'gradient-collab': 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
        'cyber-grid': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(99, 102, 241, 0.1) 2px, rgba(99, 102, 241, 0.1) 4px)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

