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
        bone: '#fffaff',
        smoke: '#ddd6ee',
        ash: '#aea7c2',
        ink: '#100e1b',
        panel: '#181626',
        line: 'rgba(216,202,255,0.14)',
        accentOrange: '#fb923c',
        warmthOrange: '#fdba74',
        signalOrange: '#f97316',
      },
      boxShadow: {
        glow: '0 22px 70px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
