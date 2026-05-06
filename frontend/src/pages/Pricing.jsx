import React from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import MarketingLayout from '../components/MarketingLayout';

const Pricing = () => {
  return (
    <MarketingLayout>
      <div style={{ textAlign: 'center', padding: '80px 24px 40px' }}>
        <h1 className="hero-title" style={{ fontSize: '48px' }}>Simple, transparent pricing</h1>
        <p className="hero-subtitle">Start for free with our self-hosted open source version, or upgrade to Cloud for a fully managed multi-tenant experience.</p>
      </div>

      <div className="pricing-grid">
        <div className="pricing-card">
          <h3 style={{ fontSize: '24px', color: 'var(--text-primary)' }}>Self-Hosted (OSS)</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>For teams that want to manage their own infrastructure.</p>
          <div className="pricing-price">$0<span> / forever</span></div>
          <Link to="https://github.com/hacrex/OpsSentinel" className="secondary-cta" style={{ justifyContent: 'center' }}>View Docs</Link>
          <ul className="pricing-features">
            <li><Check size={18} /> Unlimited Repositories</li>
            <li><Check size={18} /> Unlimited Users (Single Tenant)</li>
            <li><Check size={18} /> Slack & Teams Integrations</li>
            <li><Check size={18} /> Docker Compose Deployment</li>
            <li><Check size={18} /> Community Support</li>
          </ul>
        </div>

        <div className="pricing-card premium">
          <h3 style={{ fontSize: '24px', color: 'var(--accent-color)' }}>OpsSentinel Cloud</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Fully managed SaaS for growing engineering teams.</p>
          <div className="pricing-price">$49<span> / month</span></div>
          <Link to="/login" className="primary-cta" style={{ justifyContent: 'center' }}>Start Free Trial</Link>
          <ul className="pricing-features">
            <li><Check size={18} /> Everything in Open Source</li>
            <li><Check size={18} /> Multi-Tenant Workspaces</li>
            <li><Check size={18} /> Role-Based Access Control</li>
            <li><Check size={18} /> 1-Year Data Retention</li>
            <li><Check size={18} /> Priority Email Support</li>
            <li><Check size={18} /> 99.9% Uptime SLA</li>
          </ul>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default Pricing;
