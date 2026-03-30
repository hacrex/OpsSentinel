import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '60vh', gap: '16px',
          color: 'var(--text-secondary)',
        }}>
          <AlertTriangle size={40} color="var(--error-color)" />
          <p style={{ fontSize: '16px', color: 'var(--text-primary)' }}>Something went wrong</p>
          <p style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>
            {this.state.error?.message}
          </p>
          <button className="glowing-btn" onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
