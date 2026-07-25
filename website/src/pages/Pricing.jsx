import { Link } from 'react-router-dom';
import { Check, X, ArrowRight, Star, Zap, Shield } from 'lucide-react';
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
          Open source. No hidden fees. No vendor lock-in.
          Run it on your own infrastructure.
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="pricing-grid">
          {/* Free Tier - Primary */}
          <div className="pricing-card pricing-card--primary">
            <div className="pricing-header">
              <div className="pricing-badge">
                <Star size={12} /> Most Popular
              </div>
              <h3>Self-Hosted</h3>
              <p>Your data stays yours.</p>
            </div>
            <div className="pricing-price">
              $0<span> / forever</span>
            </div>
            <ul className="pricing-features">
              <li><Check size={16} /> Unlimited Repositories</li>
              <li><Check size={16} /> Unlimited Users</li>
              <li><Check size={16} /> Real-Time WebSocket Updates</li>
              <li><Check size={16} /> Slack, Teams, Email Alerts</li>
              <li><Check size={16} /> Flaky Workflow Detection</li>
              <li><Check size={16} /> MTTR & Trend Analytics</li>
              <li><Check size={16} /> 1-Click Workflow Re-runs</li>
              <li><Check size={16} /> Docker Compose</li>
              <li><Check size={16} /> SQLite or PostgreSQL</li>
            </ul>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
              Get Started Free <ArrowRight size={16} />
            </a>
            <div className="pricing-code">
              <code>git clone github.com/hacrex/OpsSentinel</code>
              <code>docker-compose up -d</code>
            </div>
          </div>

          {/* Cloud Tier - Secondary */}
          <div className="pricing-card pricing-card--secondary">
            <div className="pricing-header">
              <div className="pricing-badge pricing-badge--muted">
                <Zap size={12} /> Coming Soon
              </div>
              <h3>OpsSentinel Cloud</h3>
              <p>We host it for you.</p>
            </div>
            <div className="pricing-price">
              $49<span> / month</span>
            </div>
            <ul className="pricing-features">
              <li><Check size={16} /> Everything in Free</li>
              <li><Check size={16} /> Managed Infrastructure</li>
              <li><Check size={16} /> Automatic Updates</li>
              <li><Check size={16} /> 99.9% Uptime SLA</li>
              <li><Check size={16} /> Priority Support</li>
              <li className="muted"><X size={16} /> Multi-Tenant Workspaces</li>
              <li className="muted"><X size={16} /> Role-Based Access Control</li>
              <li className="muted"><X size={16} /> SSO/SAML Integration</li>
            </ul>
            <button className="btn-secondary" style={{ justifyContent: 'center', width: '100%', opacity: 0.5, cursor: 'not-allowed' }}>
              Join Waitlist
            </button>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="pricing-trust">
          <div className="pricing-trust-item">
            <Shield size={20} />
            <div>
              <h4>Open Source</h4>
              <p>MIT licensed. Fork it, modify it, run it forever.</p>
            </div>
          </div>
          <div className="pricing-trust-item">
            <Shield size={20} />
            <div>
              <h4>Your Data</h4>
              <p>Stays on your server. We have zero access.</p>
            </div>
          </div>
          <div className="pricing-trust-item">
            <Shield size={20} />
            <div>
              <h4>No Lock-in</h4>
              <p>Migrate anytime. No contracts, no commitments.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Questions</h2>
        </div>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>Is it really free?</h4>
            <p>Yes. MIT-licensed and free forever. No hidden fees, no usage limits, no vendor lock-in.</p>
          </div>
          <div className="faq-item">
            <h4>What do I need?</h4>
            <p>Any machine with Docker. A $5/month VPS from DigitalOcean or Hetzner works great.</p>
          </div>
          <div className="faq-item">
            <h4>Does my data leave my server?</h4>
            <p>No. When self-hosted, all data stays on your infrastructure. We have zero access.</p>
          </div>
          <div className="faq-item">
            <h4>Can I use GitHub Enterprise?</h4>
            <p>Yes. OpsSentinel works with both GitHub.com and GitHub Enterprise Server.</p>
          </div>
          <div className="faq-item">
            <h4>What if I need help?</h4>
            <p>Community support via GitHub Issues. Paid support tier coming soon.</p>
          </div>
          <div className="faq-item">
            <h4>Can I contribute?</h4>
            <p>Absolutely. Check out our Contributing Guide on GitHub.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Get Started Today</h2>
          <p>Free, open source, and ready to deploy.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              Get Started Free <ArrowRight size={16} />
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
