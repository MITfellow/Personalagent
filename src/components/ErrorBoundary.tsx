import React from 'react';
import { clearState } from '../lib/persist';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In a real deployment this is where Sentry/Bugsnag would be called.
    console.error('[Messages] render error', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="crash" role="alert">
        <div className="crash-card">
          <div className="crash-glyph" aria-hidden="true">
            !
          </div>
          <h1>Messages stopped responding</h1>
          <p>
            Something went wrong while drawing this screen. Your conversations are still saved on
            this device.
          </p>
          <pre className="crash-detail">{error.message}</pre>
          <div className="crash-actions">
            <button className="btn primary" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="btn"
              onClick={() => {
                // the reload must wait for the database clear, or it races it
                void clearState().finally(() => window.location.reload());
              }}
            >
              Reset all data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
