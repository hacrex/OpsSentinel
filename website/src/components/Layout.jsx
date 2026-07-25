import { Link, useLocation } from 'react-router-dom';
import { Activity, Github } from 'lucide-react';

export default function Layout({ children }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <Activity size={18} />
          OpsSentinel
        </Link>
        <div className="nav-links">
          <Link to="/features" className={isActive('/features')}>Features</Link>
          <Link to="/pricing" className={isActive('/pricing')}>Pricing</Link>
          <Link to="/docs" className={isActive('/docs')}>Docs</Link>
          <a
            href="https://github.com/hacrex/OpsSentinel"
            target="_blank"
            rel="noreferrer"
            className="nav-cta"
          >
            <Github size={14} /> GitHub
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
              <Activity size={16} />
              OpsSentinel
            </Link>
            <p>Open source CI/CD observability for GitHub Actions.</p>
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
              <Link to="/docs">Documentation</Link>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OpsSentinel</p>
        </div>
      </footer>
    </div>
  );
}
