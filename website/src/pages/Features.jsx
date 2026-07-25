import { Link } from 'react-router-dom';
import { Zap, Globe, AlertTriangle, RefreshCw, Bell, Shield, LineChart, Database, Server, GitBranch, ArrowRight, Check } from 'lucide-react';
import Layout from '../components/Layout';

export default function Features() {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="section-label">Features</div>
        <h1 className="hero-title" style={{ fontSize: '48px' }}>
          Built for<br />
          <span className="hero-highlight">DevOps Teams</span>
        </h1>
        <p className="hero-subtitle">
          Everything you need to monitor, analyze, and fix your CI/CD pipelines.
          No bloat, no complexity — just visibility that matters.
        </p>
      </section>

      {/* Core Features */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="features-grid">
          <div className="card">
            <div className="card-icon"><Globe size={20} /></div>
            <h3>Real-Time Dashboard</h3>
            <p>
              WebSocket-powered live updates deliver pipeline status the instant events occur.
              No polling, no delays.
            </p>
            <ul className="feature-list">
              <li>Instant WebSocket updates</li>
              <li>Multi-repo overview</li>
              <li>Filter by repository or status</li>
              <li>Paginated event stream</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><LineChart size={20} /></div>
            <h3>Repo Analytics</h3>
            <p>
              Deep visibility into each repository's health. Track success rates, MTTR,
              and spot trends before they become problems.
            </p>
            <ul className="feature-list">
              <li>Success rate tracking</li>
              <li>Mean Time To Recovery</li>
              <li>30-day failure trend charts</li>
              <li>Per-workflow breakdown</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><AlertTriangle size={20} /></div>
            <h3>Flaky Workflow Detection</h3>
            <p>
              Automatically identifies workflows with high failure rates. Stop wasting time
              investigating flaky tests.
            </p>
            <ul className="feature-list">
              <li>Auto-detect {'>'}30% failure rate</li>
              <li>Requires 5+ runs for accuracy</li>
              <li>Visual "FLAKY" badges</li>
              <li>Per-workflow identification</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><RefreshCw size={20} /></div>
            <h3>1-Click Re-run</h3>
            <p>
              Trigger workflow re-runs directly from the dashboard. Fix it right where you see it.
            </p>
            <ul className="feature-list">
              <li>Re-run failed workflows</li>
              <li>Re-run cancelled workflows</li>
              <li>GitHub API integration</li>
              <li>Status feedback in UI</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><Bell size={20} /></div>
            <h3>Multi-Channel Alerts</h3>
            <p>
              Get notified instantly when builds fail. Choose the channel that works for your team.
            </p>
            <ul className="feature-list">
              <li>Slack integration</li>
              <li>Microsoft Teams integration</li>
              <li>Email notifications (SMTP)</li>
              <li>Test notifications from UI</li>
            </ul>
          </div>

          <div className="card">
            <div className="card-icon"><Shield size={20} /></div>
            <h3>Secure by Design</h3>
            <p>
              Your CI/CD data is sensitive. OpsSentinel is built with security-first principles.
            </p>
            <ul className="feature-list">
              <li>HMAC SHA256 webhook verification</li>
              <li>GitHub OAuth authentication</li>
              <li>Rate limiting on all endpoints</li>
              <li>Helmet security headers</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Architecture</div>
          <h2 className="section-title">Flexible by Design</h2>
          <p className="section-subtitle">Run it your way — SQLite for simplicity, PostgreSQL for scale</p>
        </div>
        <div className="features-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card">
            <div className="card-icon"><Database size={20} /></div>
            <h3>SQLite Mode</h3>
            <p>Zero-config database. Perfect for small teams and personal use. Just docker-compose up and go.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Server size={20} /></div>
            <h3>PostgreSQL Mode</h3>
            <p>Production-ready database. Handles high-volume webhook traffic and large datasets.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>See OpsSentinel in Action</h2>
          <p>Free, open source, and ready to deploy. Start monitoring your CI/CD pipelines today.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              Get Started Free <ArrowRight size={16} />
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
