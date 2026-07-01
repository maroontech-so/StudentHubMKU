module.exports = {
  darkMode: 'class',
  content: [
    './*.html',
    './admin/**/*.html',
    './assets/js/**/*.js',
    './pages/**/*.html',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        serif: ['Playfair Display', 'serif']
      },
      colors: {
        gavel: {
          bg: '#0a0a0a',
          card: '#121212',
          border: '#2a2a2a',
          yellow: '#FFDE00',
          purple: '#8b5cf6',
          text: '#e5e5e5',
          muted: '#737373',
          editorial: '#EBE9E0',
          blue: '#3b82f6',
          green: '#10b981',
          rose: '#f43f5e',
          danger: '#ef4444',
          success: '#22c55e',
          warning: '#eab308'
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-down': 'slideDown 0.4s ease-out forwards',
        'modal-enter': 'modalEnter 0.3s ease-out forwards',
        blob: 'blob 8s infinite'
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        modalEnter: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -18px) scale(1.04)' },
          '66%': { transform: 'translate(-18px, 20px) scale(0.96)' }
        }
      }
    }
  }
};
