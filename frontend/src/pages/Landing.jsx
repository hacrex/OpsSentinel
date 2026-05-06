import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, GitBranch, Bell, LineChart, Globe } from 'lucide-react';
import MarketingLayout from '../components/MarketingLayout';

const Landing = () => {
  return (
    <MarketingLayout>
      <section className="hero-section">
        <h1 className="hero-title">The GitHub-Native<br />CI/CD Observability Platform</h1>
        <p className="hero-subtitle">
          Stop digging through scattered GitHub Action logs. Get a centralized, high-density dashboard that highlights pipeline health across all your repositories in real-time.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/login" className="primary-cta">
            Start for free <Zap size={18} />
          </Link>
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="secondary-cta">
            View on GitHub <GitBranch size={18} />
          </a>
        </div>
      </section>

      <section className="features-grid">
        <div className="feature-card">
          <div className="feature-icon"><Globe size={24} /></div>
          <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Real-Time Tracking</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Listens to GitHub workflow_run events to track pipeline states as they change, without proactive polling.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><LineChart size={24} /></div>
          <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Command Center UI</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            A high-density, centralized dashboard designed for DevOps teams to monitor hundreds of repos at a glance.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Bell size={24} /></div>
          <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Multi-Channel Alerts</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Instant failure notifications delivered directly to Slack, Microsoft Teams, or your Email Inbox.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Shield size={24} /></div>
          <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-primary)' }}>Secure by Design</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Webhook verification via HMAC SHA256 and GitHub OAuth integration ensures your data is always protected.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Landing;
