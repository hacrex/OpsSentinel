import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Github, Sun, Moon, Star, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function GitHubStars() {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/hacrex/OpsSentinel')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href="https://github.com/hacrex/OpsSentinel"
      target="_blank"
      rel="noreferrer"
      className="nav-cta github-btn"
    >
      <Github size={14} />
      {stars !== null && (
        <span className="stars-count">
          <Star size={12} />
          {stars}
        </span>
      )}
    </a>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path) => location.pathname === path ? 'active' : '';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav className={`nav ${scrolled ? 'nav-scrolled' : ''}`}>
        <Link to="/" className="nav-logo">
          <Activity size={18} />
          OpsSentinel
        </Link>
        <div className={`nav-links ${mobileOpen ? 'nav-links-open' : ''}`}>
          <Link to="/features" className={isActive('/features')}>Features</Link>
          <Link to="/infrastructure" className={isActive('/infrastructure')}>Infrastructure</Link>
          <Link to="/configuration" className={isActive('/configuration')}>Configuration</Link>
          <Link to="/pricing" className={isActive('/pricing')}>Pricing</Link>
          <Link to="/docs" className={isActive('/docs')}>Docs</Link>
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <GitHubStars />
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Link to="/" className="nav-logo" style={{ marginBottom: '12px' }}>
              <Activity size={18} />
              OpsSentinel
            </Link>
            <p>The open-source GitOps control plane. Connect CI/CD, infrastructure automation, and incident management into one intelligent platform.</p>
            <div className="footer-social">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" aria-label="GitHub">
                <Github size={18} />
              </a>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <Link to="/features">Features</Link>
              <Link to="/infrastructure">Infrastructure</Link>
              <Link to="/configuration">Configuration</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <Link to="/docs">Documentation</Link>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer">Contributing</a>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer">Deployment</a>
              <a href="https://github.com/hacrex/OpsSentinel/issues" target="_blank" rel="noreferrer">Support</a>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <a href="https://github.com/hacrex/OpsSentinel/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer">Source Code</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} OpsSentinel. Built with love by the community.</p>
        </div>
      </footer>
    </div>
  );
}
