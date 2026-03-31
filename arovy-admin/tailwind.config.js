/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'sans-serif'],
        body:    ['"Instrument Sans"', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        ink:  { 950:'#05070C', 900:'#090D16', 800:'#0F1521', 700:'#161E2E', 600:'#1E2940' },
        sky:  '#4F8EF7',
        jade: '#23D18B',
        fire: '#F5532D',
        sun:  '#F5A623',
        iris: '#8B7FED',
      },
      keyframes: {
        slideIn:  { from:{ opacity:0, transform:'translateY(6px)' }, to:{ opacity:1, transform:'translateY(0)' } },
        fadeIn:   { from:{ opacity:0 }, to:{ opacity:1 } },
        shimmer:  { '0%':{ backgroundPosition:'-200% 0' }, '100%':{ backgroundPosition:'200% 0' } },
        countUp:  { from:{ opacity:0, transform:'translateY(4px)' }, to:{ opacity:1, transform:'translateY(0)' } },
      },
      animation: {
        'slide-in': 'slideIn 0.35s ease forwards',
        'fade-in':  'fadeIn 0.25s ease forwards',
        shimmer:    'shimmer 2s linear infinite',
        'count-up': 'countUp 0.5s ease forwards',
      }
    }
  },
  plugins: []
}
