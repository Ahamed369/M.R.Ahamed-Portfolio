import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * v10.3.2 — last-resort safety net around the whole portfolio.
 * Without it, an unexpected error outside an app window makes React remove the
 * entire page, leaving only the dark page background ("black screen").
 * App windows keep their own AppBoundary; this one only sees errors nothing else caught.
 *  • The real error is never hidden: logged with stack + component stack, saved,
 *    and printed again after a reload.
 *  • At most ONE automatic reload per minute (shared with the chunk reload in main.tsx).
 *  • Otherwise a small "Something went wrong" card with a Reload button.
 *  • While everything works it renders only its children (no extra element).
 */
// deliberately NOT prefixed 'mra-', so Time Machine, Backup and the Storage pane never list them
export const AUTO_RELOAD_KEY = 'portfolio-auto-reload-at';
const REPORT_KEY = 'portfolio-last-crash';
const MIN_GAP_MS = 60_000;

/** true (and records the time) when an automatic reload is allowed right now */
export function claimAutoReload(): boolean {
  try {
    const last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
    if (Date.now() - last < MIN_GAP_MS) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false; // storage blocked: never auto-reload, show the card instead
  }
}

interface State {
  failed: boolean;
}

export class RootBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };
  private handled = false;

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidMount() {
    try {
      const saved = localStorage.getItem(REPORT_KEY);
      if (saved && sessionStorage.getItem(REPORT_KEY + '-shown') !== saved) {
        sessionStorage.setItem(REPORT_KEY + '-shown', saved);
       console.error('[Portfolio] An error happened before the last reload:', JSON.parse(saved));
      }
    } catch {
      /* ignore */
    }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const e = error instanceof Error ? error : new Error(String(error));
    console.error('[Portfolio] Unexpected error (caught by RootBoundary):', e, info.componentStack);
    if (this.handled) return; // several errors from one incident: act once
    this.handled = true;
    try {
      localStorage.setItem(
        REPORT_KEY,
        JSON.stringify({
          at: new Date().toISOString(),
          url: location.href,
          message: e.message,
          stack: e.stack ?? '',
          componentStack: info.componentStack ?? '',
        }),
      );
    } catch {
      /* ignore */
    }
    if (claimAutoReload()) window.setTimeout(() => location.reload(), 300);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alertdialog"
        aria-label="Something went wrong"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#1b1b1f',
          color: '#f5f5f7',
          font: '15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Something went wrong</div>
          <p style={{ margin: '0 0 16px', opacity: 0.75 }}>
            The portfolio hit an unexpected error. Reloading fixes it — your saved notes, settings and messages are kept.
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '9px 22px',
              font: 'inherit',
              fontWeight: 600,
              color: '#fff',
              background: '#0a84ff',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}