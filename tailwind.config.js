// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          // Switch light backgrounds to rich, deep space shades
          background: '#0b0f19',       // Deepest dark slate
          surfaceBg: '#131b2e',        // Container background
          surface: '#1e293b',          // Card backgrounds
          
          // Keep or amplify your core functional colors
          primary: '#3b82f6',          // Electric blue
          primaryHover: '#60a5fa',
          secondary: '#605691',
          'neon-purple': '#A855F7',
          'vibrant-teal': '#14B8A6',
          
          // Inverse text behaviors
          'on-surface': '#f8fafc',      // Bright white/slate text
          'on-surface-variant': '#94a3b8', // Muted silver text
          'border-subtle': '#334155',  // Dark slate borders
        }
      },
    },
  },
}