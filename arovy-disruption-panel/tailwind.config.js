/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        panel: {
          950: '#080A0F',
          900: '#0D1117',
          800: '#131923',
          700: '#1C2530',
          600: '#253040',
        },
        accent: {
          blue:   '#3B82F6',
          red:    '#EF4444',
          amber:  '#F59E0B',
          green:  '#10B981',
          cyan:   '#06B6D4',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow':  'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'scan':       'scan 2s linear infinite',
        'fade-up':    'fadeUp 0.4s ease forwards',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
