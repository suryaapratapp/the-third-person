export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        bone: '#fffaff',
        smoke: '#ddd6ee',
        ash: '#aea7c2',
        panel: '#181626',
        line: 'rgba(216,202,255,0.14)',
        signal: '#a78bfa',
        signalStrong: '#8b6ef2',
        bloom: '#fb7ba6',
        bloomStrong: '#f0568f',
        ember: '#fb923c',
        emberSoft: '#fdba74',
        // Electric cyan — the sci-fi accent. Used sparingly for HUD lines,
        // active-state glows and data highlights, never as a fill, so the
        // interface reads high-tech without turning into a toy.
        electric: '#38a0ff',
        electricDim: '#2b7fd0',
        /* Editorial ground, three depths. */
        ink: '#05070e',
        surface: '#0b0e17',
        well: '#11151f',
        /* Per-person identity, constant across every chart. */
        you: '#ff4d8d',
        them: '#38a0ff',
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '3px',
        '3xl': '3px',
        full: '9999px',
      },
      boxShadow: {
        glow: '0 22px 70px rgba(0,0,0,0.28)',
        neon: '0 0 0 1px rgba(139,233,255,0.20), 0 18px 60px rgba(20,10,45,0.45)',
        'neon-strong': '0 0 0 1px rgba(139,233,255,0.35), 0 0 28px rgba(139,233,255,0.18), 0 18px 60px rgba(20,10,45,0.5)',
      },
    },
  },
  plugins: [],
};
