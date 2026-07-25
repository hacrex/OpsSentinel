import { Link } from 'react-router-dom';
import { Activity, Github, ExternalLink } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <Activity size={28} color="var(--accent)" />
          OpsSentinel
        </Link>
        <div className="nav-links">
          <Link to="/features">Features</Link>
          <Link to="/pricing">Pricing</Link>
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer">
            Docs <ExternalLink size={12} />
          </a>
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="nav-cta">
            <Github size={16} /> Star on GitHub
          </a>
        </div>
      </nav>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/" className="nav-logo">
              <Activity size={24} color="var(--accent)" />
              OpsSentinel
            </Link>
            <p>The open-source CI/CD observability platform for GitHub Actions.</p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/features">Features</Link>
              <Link to="/pricing">Pricing</Link>
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer">GitHub</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/Documentation.md" target="_blank" rel="noreferrer">Documentation</a>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a>
              <Link to="/docs">Quick Start</Link>
            </div>
            <div className="footer-col">
              <h4>Community</h4>
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer">Star on GitHub</a>
              <a href="https://github.com/hacrex/OpsSentinel/issues" target="_blank" rel="noreferrer">Issue Tracker</a>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OpsSentinel. Open Source under MIT License.</p>
        </div>
      </footer>
    </div>
  );
}
