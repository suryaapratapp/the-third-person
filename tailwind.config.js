/** Light product theme.
 *
 * The old dark tokens (`bone`, `smoke`, `ash`, `panel`, `line`, and the
 * violet/pink/cyan signal ramp) are kept as NAMES and repointed at light
 * values, because they are used ~600 times across the app. Renaming them
 * would be a 40-file mechanical diff that changes nothing a user sees;
 * repointing them flips the whole product in one place.
 *
 * `bone` → primary ink, `smoke` → body, `ash` → muted. Read them that way.
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
        /* Text, three steps. */
        bone: '#15151a',
        ink: '#15151a',
        smoke: '#46464f',
        graphite: '#46464f',
        ash: '#6e6e7a',
        muted: '#6e6e7a',

        /* Ground, three steps. */
        paper: '#ffffff',
        canvas: '#f6f6f8',
        surface: '#ffffff',
        panel: '#ffffff',
        well: '#f0f0f3',
        line: '#e5e5ea',
        lineStrong: '#d2d2da',

        /* One action colour. */
        signal: '#5546d6',
        signalStrong: '#4136ad',
        accent: '#5546d6',

        /* Per-person identity, constant across every chart. */
        you: '#c62a63',
        them: '#1263c4',

        /* Semantic. */
        good: '#0a8055',
        warn: '#9a6410',
        risk: '#c8392f',

        /* Legacy accent names, repointed so old markup stays legible. */
        bloom: '#c62a63',
        bloomStrong: '#a41f51',
        ember: '#9a6410',
        emberSoft: '#b8760a',
        electric: '#1263c4',
        electricDim: '#0f4f9c',
      },
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '4px',
        md: '4px',
        lg: '6px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '8px',
        full: '9999px',
      },
      boxShadow: {
        // One elevation. A product with five shadow depths has none.
        glow: '0 1px 2px rgba(21,21,26,0.05), 0 4px 12px rgba(21,21,26,0.04)',
        card: '0 1px 2px rgba(21,21,26,0.05), 0 4px 12px rgba(21,21,26,0.04)',
        neon: '0 1px 2px rgba(21,21,26,0.05), 0 4px 12px rgba(21,21,26,0.04)',
        'neon-strong': '0 2px 4px rgba(21,21,26,0.06), 0 8px 24px rgba(21,21,26,0.06)',
      },
    },
  },
  plugins: [],
};
