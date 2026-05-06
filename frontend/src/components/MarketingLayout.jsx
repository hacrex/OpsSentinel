import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

const MarketingLayout = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="marketing-nav">
        <Link to="/" className="marketing-logo">
          <Activity size={28} color="var(--accent-color)" />
          OpsSentinel
        </Link>
        <div className="marketing-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/login" style={{ 
            marginLeft: '32px', 
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '8px 16px',
            borderRadius: '6px',
            color: 'var(--accent-color)'
          }}>Sign In</Link>
        </div>
      </nav>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <footer style={{ padding: '48px 24px', textAlign: 'center', borderTop: '1px solid var(--border-color)', marginTop: '80px', color: 'var(--text-secondary)' }}>
        <p>&copy; {new Date().getFullYear()} OpsSentinel Inc. All rights reserved.</p>
        <p style={{ marginTop: '8px', fontSize: '14px' }}>Open Source & Self-Hostable DevOps Observability.</p>
      </footer>
    </div>
  );
};

export default MarketingLayout;
