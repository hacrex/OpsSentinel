import { Link } from 'react-router-dom';
import { Book, Terminal, Settings, Shield, Bell, GitBranch, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';

export default function Docs() {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <h1 className="hero-title" style={{ fontSize: '48px' }}>
          Documentation
        </h1>
        <p className="hero-subtitle">
          Everything you need to set up, configure, and use OpsSentinel.
        </p>
      </section>

      {/* Quick Start */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2 className="section-title">Quick Start</h2>
        </div>
        <div className="features-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card">
            <div className="card-icon"><Terminal size={24} /></div>
            <h3>1. Clone & Configure</h3>
            <div className="pricing-code">
              <code>git clone https://github.com/hacrex/OpsSentinel.git</code>
              <code>cd OpsSentinel</code>
              <code>cp .env.example .env</code>
            </div>
            <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
              Edit <code>.env</code> and add your GitHub OAuth credentials.
            </p>
          </div>

          <div className="card">
            <div className="card-icon"><GitBranch size={24} /></div>
            <h3>2. Start the Stack</h3>
            <div className="pricing-code">
              <code>docker-compose up -d --build</code>
            </div>
            <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
              This starts the backend, database, and frontend.
            </p>
          </div>

          <div className="card">
            <div className="card-icon"><Settings size={24} /></div>
            <h3>3. Add Webhooks</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              In your GitHub repo, go to Settings {'>'} Webhooks {'>'} Add webhook.
              Set the payload URL to your backend endpoint.
            </p>
          </div>
        </div>
      </section>

      {/* Configuration */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Configuration</h2>
          <p className="section-subtitle">All environment variables</p>
        </div>
        <div className="faq-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="faq-item">
            <h4>Required Variables</h4>
            <div className="pricing-code">
              <code>GITHUB_CLIENT_ID=your_client_id</code>
              <code>GITHUB_CLIENT_SECRET=your_secret</code>
              <code>GITHUB_WEBHOOK_SECRET=your_secret</code>
            </div>
          </div>
          <div className="faq-item">
            <h4>Optional Variables</h4>
            <div className="pricing-code">
              <code>PORT=3001</code>
              <code>RETENTION_DAYS=30</code>
              <code>SAAS_MODE=false</code>
            </div>
          </div>
          <div className="faq-item">
            <h4>Notifications</h4>
            <div className="pricing-code">
              <code>SLACK_WEBHOOK_URL=</code>
              <code>TEAMS_WEBHOOK_URL=</code>
              <code>ALERT_EMAIL_TO=</code>
              <code>SMTP_HOST=</code>
            </div>
          </div>
          <div className="faq-item">
            <h4>Database</h4>
            <div className="pricing-code">
              <code># Uses SQLite by default</code>
              <code># Set DATABASE_URL for PostgreSQL:</code>
              <code>DATABASE_URL=postgresql://...</code>
            </div>
          </div>
        </div>
      </section>

      {/* Links */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">More Resources</h2>
        </div>
        <div className="tech-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <a href="https://github.com/hacrex/OpsSentinel/blob/main/Documentation.md" target="_blank" rel="noreferrer" className="tech-item" style={{ cursor: 'pointer' }}>
            <Book size={20} /> Full Documentation <ExternalLink size={14} />
          </a>
          <a href="https://github.com/hacrex/OpsSentinel/blob/main/DEPLOYMENT.md" target="_blank" rel="noreferrer" className="tech-item" style={{ cursor: 'pointer' }}>
            <Shield size={20} /> Deployment Guide <ExternalLink size={14} />
          </a>
          <a href="https://github.com/hacrex/OpsSentinel/blob/main/CONTRIBUTING.md" target="_blank" rel="noreferrer" className="tech-item" style={{ cursor: 'pointer' }}>
            <Bell size={20} /> Contributing Guide <ExternalLink size={14} />
          </a>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Need Help?</h2>
          <p>Join our community on GitHub for support and discussions.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel/issues" target="_blank" rel="noreferrer" className="btn-primary">
              <GitBranch size={18} /> Open an Issue
            </a>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
