import { Link } from 'react-router-dom';
import { Globe, AlertTriangle, RefreshCw, Bell, Shield, LineChart, Database, Server, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

export default function Features() {
  return (
    <Layout>
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="section-label">Features</div>
        <h1 className="hero-title">
          What OpsSentinel<br />Does
        </h1>
        <p className="hero-subtitle">
          Everything you need to monitor and fix your CI/CD pipelines.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="features-grid">
          <div className="card">
            <div className="card-icon"><Globe size={16} /></div>
            <h3>Real-Time Dashboard</h3>
            <p>WebSocket-powered live updates. No polling, no delays.</p>
            <ul className="feature-list">
              <li>Instant updates</li>
              <li>Multi-repo overview</li>
              <li>Filter by status</li>
              <li>Paginated stream</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><LineChart size={16} /></div>
            <h3>Repo Analytics</h3>
            <p>Deep visibility into each repository's health.</p>
            <ul className="feature-list">
              <li>Success rates</li>
              <li>Mean Time To Recovery</li>
              <li>30-day trends</li>
              <li>Per-workflow stats</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><AlertTriangle size={16} /></div>
            <h3>Flaky Detection</h3>
            <p>Identifies workflows with high failure rates.</p>
            <ul className="feature-list">
              <li>{'>'}30% failure threshold</li>
              <li>5+ runs minimum</li>
              <li>Visual badges</li>
              <li>Per-workflow ID</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><RefreshCw size={16} /></div>
            <h3>1-Click Re-run</h3>
            <p>Trigger re-runs from the dashboard.</p>
            <ul className="feature-list">
              <li>Failed workflows</li>
              <li>Cancelled workflows</li>
              <li>GitHub API</li>
              <li>Status feedback</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><Bell size={16} /></div>
            <h3>Multi-Channel Alerts</h3>
            <p>Get notified when builds fail.</p>
            <ul className="feature-list">
              <li>Slack</li>
              <li>Microsoft Teams</li>
              <li>Email (SMTP)</li>
              <li>Test from UI</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><Shield size={16} /></div>
            <h3>Secure by Design</h3>
            <p>Security-first principles.</p>
            <ul className="feature-list">
              <li>HMAC SHA256</li>
              <li>GitHub OAuth</li>
              <li>Rate limiting</li>
              <li>Security headers</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="section-label">Architecture</div>
          <h2 className="section-title">Flexible Setup</h2>
        </div>
        <div className="features-grid" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="card">
            <div className="card-icon"><Database size={16} /></div>
            <h3>SQLite</h3>
            <p>Zero-config. Just docker-compose up and go.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Server size={16} /></div>
            <h3>PostgreSQL</h3>
            <p>Production-ready. Handles high volume.</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2>Try It Now</h2>
          <p>Free and open source.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              Get Started <ArrowRight size={14} />
            </a>
            <Link to="/pricing" className="btn-secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
