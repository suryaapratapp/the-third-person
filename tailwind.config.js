/** Design tokens, mirrored from the CSS custom properties in styles.css.
 *
 * The dark-theme names (`bone`, `smoke`, `ash`, `panel`, `signal`, and the
 * violet/pink/cyan ramp) are kept as NAMES and repointed, because they are used
 * ~600 times across the app. Renaming them would be a 40-file mechanical diff
 * that changes nothing a user sees; repointing them moves the whole product.
 *
 * Read them as: `bone` → primary ink, `smoke` → body, `ash` → muted.
 *
 * Every value here was chosen against a computed contrast ratio. The weakest
 * text/ground pair in the system is 4.74:1; body text on the page is 9.5:1.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // No webfont anywhere: nothing render-blocking, no layout shift.
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        /* Ink, three steps. */
        bone: '#0d1017',
        ink: '#0d1017',
        smoke: '#383d49',
        graphite: '#383d49',
        ash: '#585e6d',
        muted: '#585e6d',

        /* Ground, three steps. The page is `canvas`, a card is `paper`. */
        canvas: '#eef0f4',
        paper: '#ffffff',
        surface: '#ffffff',
        panel: '#ffffff',
        well: '#e4e7ee',
        line: '#d9dce4',
        lineStrong: '#bfc4d0',

        /* One action colour. Dark enough to also be used as text. */
        signal: '#4338ca',
        signalStrong: '#362ba6',
        accent: '#4338ca',
        accentWash: '#eceafb',
        accentLine: '#c5bff4',

        /* Per-person identity, constant across every chart. */
        you: '#bb1f57',
        them: '#0f5cb8',

        /* Semantic. */
        good: '#0a7350',
        warn: '#8a5a0b',
        risk: '#bd2f26',

        /* Legacy accent names, repointed so old markup stays legible. */
        bloom: '#bb1f57',
        bloomStrong: '#9a1848',
        ember: '#8a5a0b',
        emberSoft: '#a06b0d',
        electric: '#0f5cb8',
        electricDim: '#0c4a94',
      },
      borderRadius: {
        none: '0',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '12px',
        full: '9999px',
      },
      boxShadow: {
        // Two levels and no more: resting and raised.
        glow: '0 1px 2px rgba(13,16,23,0.04), 0 1px 3px rgba(13,16,23,0.06)',
        card: '0 1px 2px rgba(13,16,23,0.04), 0 1px 3px rgba(13,16,23,0.06)',
        raised: '0 2px 4px rgba(13,16,23,0.05), 0 8px 20px rgba(13,16,23,0.08)',
        neon: '0 1px 2px rgba(13,16,23,0.04), 0 1px 3px rgba(13,16,23,0.06)',
        'neon-strong': '0 2px 4px rgba(13,16,23,0.05), 0 8px 20px rgba(13,16,23,0.08)',
      },
    },
  },
  plugins: [],
};
