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
        signal: '#a78bfa',
        signalStrong: '#8b6ef2',
        bloom: '#fb7ba6',
        bloomStrong: '#f0568f',
        ember: '#fb923c',
        emberSoft: '#fdba74',
      },
      boxShadow: {
        glow: '0 22px 70px rgba(0,0,0,0.28)',
      },
    },
  },
  plugins: [],
};
