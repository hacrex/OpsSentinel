import { Link } from 'react-router-dom';
import { Check, X, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

export default function Pricing() {
  return (
    <Layout>
      <section className="hero" style={{ paddingBottom: '40px' }}>
        <div className="section-label">Pricing</div>
        <h1 className="hero-title">
          Free to Self-Host
        </h1>
        <p className="hero-subtitle">
          Open source. No hidden fees. Run it on your own infrastructure.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="pricing-grid">
          <div className="pricing-card pricing-card--primary">
            <div className="pricing-badge">Free</div>
            <h3 style={{ fontSize: '16px', marginTop: '8px' }}>Self-Hosted</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>Your data stays yours.</p>
            <div className="pricing-price">$0<span> / forever</span></div>
            <ul className="pricing-features">
              <li><Check size={16} /> Unlimited Repositories</li>
              <li><Check size={16} /> Unlimited Users</li>
              <li><Check size={16} /> Real-Time Updates</li>
              <li><Check size={16} /> Slack, Teams, Email Alerts</li>
              <li><Check size={16} /> Flaky Detection</li>
              <li><Check size={16} /> MTTR Analytics</li>
              <li><Check size={16} /> 1-Click Re-runs</li>
              <li><Check size={16} /> Docker Compose</li>
              <li><Check size={16} /> SQLite or PostgreSQL</li>
            </ul>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              Get Started <ArrowRight size={14} />
            </a>
            <div className="pricing-code">
              <code>git clone github.com/hacrex/OpsSentinel</code>
              <code>docker-compose up -d</code>
            </div>
          </div>

          <div className="pricing-card">
            <div className="pricing-badge pricing-badge--muted">Soon</div>
            <h3 style={{ fontSize: '16px', marginTop: '8px' }}>Cloud</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>We host it for you.</p>
            <div className="pricing-price">$49<span> / month</span></div>
            <ul className="pricing-features">
              <li><Check size={16} /> Everything in Free</li>
              <li><Check size={16} /> Managed Infrastructure</li>
              <li><Check size={16} /> Auto Updates</li>
              <li><Check size={16} /> Priority Support</li>
              <li className="muted"><X size={16} /> Multi-Tenant</li>
              <li className="muted"><X size={16} /> RBAC</li>
              <li className="muted"><X size={16} /> SSO/SAML</li>
            </ul>
            <button className="btn-secondary" style={{ justifyContent: 'center', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
              Coming Soon
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Questions</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Is it really free?</h4>
            <p>Yes. MIT-licensed. Free forever.</p>
          </div>
          <div className="faq-item">
            <h4>What do I need?</h4>
            <p>Any machine with Docker. A $5/mo VPS works fine.</p>
          </div>
          <div className="faq-item">
            <h4>Does my data leave my server?</h4>
            <p>No. We have zero access to your data.</p>
          </div>
          <div className="faq-item">
            <h4>GitHub Enterprise?</h4>
            <p>Yes. Works with GitHub.com and Enterprise.</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-content">
          <h2>Get Started</h2>
          <p>Free and open source.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              View on GitHub <ArrowRight size={14} />
            </a>
            <Link to="/features" className="btn-secondary">
              See Features
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
