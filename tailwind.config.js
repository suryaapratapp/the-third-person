export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bone: '#f3f1ed',
        smoke: '#b9b7b1',
        ash: '#7b7a75',
        ink: '#050505',
        panel: '#090909',
        line: 'rgba(255,255,255,0.15)',
        accentOrange: '#fb923c',
        warmthOrange: '#fdba74',
        signalOrange: '#f97316',
      },
      boxShadow: {
        glow: '0 0 60px rgba(255,255,255,0.08)',
      },
    },
  },
  plugins: [],
};
