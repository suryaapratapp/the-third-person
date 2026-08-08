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
        /* Every colour is `rgb(var(--x-rgb) / <alpha-value>)` rather than a
         * literal. That is what lets `.theme-deep` repaint whole pages by
         * overriding variables: a Tailwind literal compiles to a fixed hex and
         * would ignore any scoped theme entirely.
         *
         * The `<alpha-value>` placeholder keeps opacity modifiers working, so
         * `bg-signal/45` still means 45% of whatever `--accent-rgb` currently
         * is. */
        bone: 'rgb(var(--ink-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        smoke: 'rgb(var(--graphite-rgb) / <alpha-value>)',
        graphite: 'rgb(var(--graphite-rgb) / <alpha-value>)',
        ash: 'rgb(var(--muted-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',

        canvas: 'rgb(var(--canvas-rgb) / <alpha-value>)',
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        surface: 'rgb(var(--paper-rgb) / <alpha-value>)',
        panel: 'rgb(var(--paper-rgb) / <alpha-value>)',
        well: 'rgb(var(--well-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        lineStrong: 'rgb(var(--line-strong-rgb) / <alpha-value>)',

        signal: 'rgb(var(--accent-rgb) / <alpha-value>)',
        signalStrong: 'rgb(var(--accent-ink-rgb) / <alpha-value>)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        accentWash: 'rgb(var(--accent-wash-rgb) / <alpha-value>)',
        accentLine: 'rgb(var(--accent-line-rgb) / <alpha-value>)',

        you: 'rgb(var(--you-rgb) / <alpha-value>)',
        them: 'rgb(var(--them-rgb) / <alpha-value>)',

        good: 'rgb(var(--good-rgb) / <alpha-value>)',
        warn: 'rgb(var(--warn-rgb) / <alpha-value>)',
        risk: 'rgb(var(--risk-rgb) / <alpha-value>)',

        /* Legacy accent names, repointed so old markup stays legible. */
        bloom: 'rgb(var(--you-rgb) / <alpha-value>)',
        bloomStrong: 'rgb(var(--you-rgb) / <alpha-value>)',
        ember: 'rgb(var(--warn-rgb) / <alpha-value>)',
        emberSoft: 'rgb(var(--warn-rgb) / <alpha-value>)',
        electric: 'rgb(var(--them-rgb) / <alpha-value>)',
        electricDim: 'rgb(var(--them-rgb) / <alpha-value>)',
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
