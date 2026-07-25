import { Link } from 'react-router-dom';
import { Check, X, Zap, Server, Shield } from 'lucide-react';
import Layout from '../components/Layout';

export default function Pricing() {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="hero-badge" style={{ marginBottom: '24px' }}>
          <Server size={14} />
          Open Source
        </div>
        <h1 className="hero-title" style={{ fontSize: '56px' }}>
          Free Forever.<br />
          <span className="hero-highlight">Self-Hosted.</span>
        </h1>
        <p className="hero-subtitle">
          OpsSentinel is open source and free to self-host. Run it on your own infrastructure,
          keep your data private, and get enterprise-grade CI/CD observability without the enterprise price tag.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="pricing-grid">
          {/* Self-Hosted - Primary */}
          <div className="pricing-card pricing-card--primary">
            <div className="pricing-badge">Most Popular</div>
            <h3 style={{ fontSize: '24px', color: 'var(--accent)', marginTop: '8px' }}>Self-Hosted</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Full control. Your data stays yours.</p>
            <div className="pricing-price">$0<span> / forever</span></div>
            <ul className="pricing-features">
              <li><Check size={18} /> Unlimited Repositories</li>
              <li><Check size={18} /> Unlimited Users</li>
              <li><Check size={18} /> Real-Time WebSocket Updates</li>
              <li><Check size={18} /> Slack, Teams & Email Alerts</li>
              <li><Check size={18} /> Flaky Workflow Detection</li>
              <li><Check size={18} /> MTTR & Trend Analytics</li>
              <li><Check size={18} /> 1-Click Workflow Re-runs</li>
              <li><Check size={18} /> Docker Compose Deployment</li>
              <li><Check size={18} /> SQLite or PostgreSQL</li>
              <li><Check size={18} /> Community Support</li>
            </ul>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              <Zap size={18} /> Get Started
            </a>
            <div className="pricing-code">
              <code>git clone https://github.com/hacrex/OpsSentinel.git</code>
              <code>cd OpsSentinel && docker-compose up -d</code>
            </div>
          </div>

          {/* Cloud - Secondary */}
          <div className="pricing-card">
            <div className="pricing-badge pricing-badge--muted">Coming Soon</div>
            <h3 style={{ fontSize: '24px', color: 'var(--text)', marginTop: '8px' }}>OpsSentinel Cloud</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>We host it. You focus on shipping.</p>
            <div className="pricing-price">$49<span> / month</span></div>
            <ul className="pricing-features">
              <li><Check size={18} /> Everything in Self-Hosted</li>
              <li><Check size={18} /> Managed Infrastructure</li>
              <li><Check size={18} /> Automatic Updates</li>
              <li><Check size={18} /> 99.9% Uptime SLA</li>
              <li><Check size={18} /> Priority Email Support</li>
              <li className="muted"><X size={18} /> Multi-Tenant Workspaces</li>
              <li className="muted"><X size={18} /> Role-Based Access Control</li>
              <li className="muted"><X size={18} /> SSO/SAML Integration</li>
            </ul>
            <Link to="/login" className="btn-secondary" style={{ justifyContent: 'center', width: '100%', opacity: 0.6 }}>
              Join Waitlist
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Is OpsSentinel really free?</h4>
            <p>Yes. OpsSentinel is MIT-licensed and free to self-host forever. No hidden fees, no usage limits, no vendor lock-in.</p>
          </div>
          <div className="faq-item">
            <h4>What do I need to run it?</h4>
            <p>Any machine with Docker. A $5/month VPS from DigitalOcean, Hetzner, or Linode works great.</p>
          </div>
          <div className="faq-item">
            <h4>Does my data leave my server?</h4>
            <p>No. When self-hosted, all data stays on your infrastructure. We have zero access to your CI/CD data.</p>
          </div>
          <div className="faq-item">
            <h4>Can I use it with GitHub Enterprise?</h4>
            <p>Yes. OpsSentinel works with GitHub.com and GitHub Enterprise Server.</p>
          </div>
          <div className="faq-item">
            <h4>What if I need help?</h4>
            <p>Community support is available via GitHub Issues. For self-hosted users who need more, we're building a paid support tier.</p>
          </div>
          <div className="faq-item">
            <h4>Can I contribute?</h4>
            <p>Absolutely. OpsSentinel is open source and we welcome contributions. Check out our Contributing Guide on GitHub.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Free, open source, and ready to deploy. Start monitoring your CI/CD pipelines today.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              <Zap size={18} /> Get Started Free
            </a>
            <Link to="/features" className="btn-secondary">
              <Shield size={18} /> See Features
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
