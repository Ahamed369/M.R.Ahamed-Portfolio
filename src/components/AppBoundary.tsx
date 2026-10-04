import { Component, type ReactNode } from 'react';

interface Props {
  name: string;
  onClose: () => void;
  children: ReactNode;
}
interface State {
  err: Error | null;
  key: number;
}

/**
 * v10 — crash recovery. If an app throws, only that window shows
 * "<App> quit unexpectedly" with Reopen / Close (the rest keeps running).
 */
export class AppBoundary extends Component<Props, State> {
  state: State = { err: null, key: 0 };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  componentDidCatch(err: Error) {
    console.warn(`[${this.props.name}] crashed:`, err);
  }
  render() {
    if (!this.state.err) return <div key={this.state.key} className="app-boundary-ok">{this.props.children}</div>;
    return (
      <div className="app-crash" role="alertdialog" aria-label={`${this.props.name} quit unexpectedly`}>
        <span className="app-crash-ico" aria-hidden="true">
          ⚠︎
        </span>
        <b>{this.props.name} quit unexpectedly.</b>
        <p>Nothing you saved was lost. Reopen to try again.</p>
        <div>
          <button type="button" className="app-crash-btn" onClick={this.props.onClose}>
            Close
          </button>
          <button type="button" className="app-crash-btn primary" onClick={() => this.setState((s) => ({ err: null, key: s.key + 1 }))}>
            Reopen
          </button>
        </div>
      </div>
    );
  }
}
