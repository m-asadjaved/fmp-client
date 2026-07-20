// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          background: '#ffffff',       // Surface White
          surfaceBg: '#f8fafd',        // Quiet Surface
          surface: '#ffffff',          // Card backgrounds
          
          primary: '#533afd',          // Brand Indigo
          primaryHover: '#7f7dfc',     // Brand Violet Light
          secondary: '#061b31',        // Deep Navy
          'neon-purple': '#A855F7',
          'vibrant-teal': '#14B8A6',
          
          'on-surface': '#061b31',      // Deep Navy
          'on-surface-variant': '#50617a', // Slate Body
          'border-subtle': 'transparent',  // Border Neutral
          'text-on-solid': '#ffffff',  // Text on Solid
        }
      },
    },
  },
}