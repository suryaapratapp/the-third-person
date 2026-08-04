import { Component } from 'react';
import { reportClientError } from '../lib/errorReporter.js';

// Without this, a single bad render shows the user a blank white page and we
// never hear about it. Now they get a way out, and the crash is recorded.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong.' };
  }

  componentDidCatch(error, info) {
    reportClientError(error, { kind: 'render', extra: info?.componentStack?.slice(0, 300) });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="flex min-h-screen items-center justify-center px-4 py-24">
        <div className="accent-panel w-full max-w-lg p-7 text-center sm:p-9">
          <p className="tech-label text-orange-100">Something broke on this page</p>
          <h1 className="serif-title mt-4 text-4xl leading-tight sm:text-5xl">
            Sorry — that didn’t load properly.
          </h1>
          <p className="mt-5 text-sm leading-7 text-smoke">
            Your saved reports and credits are safe. This was a display problem on our side, and we’ve been notified automatically.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => window.location.reload()}
              className="glass-button rounded-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-bone"
            >
              Reload page
            </button>
            <button
              onClick={() => { window.location.href = '/reports'; }}
              className="glass-button rounded-full px-5 py-4 font-mono text-xs uppercase tracking-[0.16em] text-smoke"
            >
              Go to my reports
            </button>
          </div>
          <p className="mt-6 text-xs leading-6 text-ash">
            Still stuck? Email support@thethirdperson.ai and we’ll sort it out.
          </p>
        </div>
      </section>
    );
  }
}
