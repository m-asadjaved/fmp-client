// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s ease-out forwards',
      },
    },
  },
  }