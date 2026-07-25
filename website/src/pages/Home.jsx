import { Link } from 'react-router-dom';
import { Zap, GitBranch, Globe, AlertTriangle, RefreshCw, Bell, Shield, LineChart, Database, Terminal, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <Terminal size={12} />
          Open Source
        </div>
        <h1 className="hero-title">
          See Your CI/CD<br />
          At a Glance
        </h1>
        <p className="hero-subtitle">
          A single dashboard for all your GitHub Actions workflows.
          Know when things break. Fix them faster.
        </p>
        <div className="hero-actions">
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
            Get Started <ArrowRight size={14} />
          </a>
          <Link to="/features" className="btn-secondary">
            Learn More
          </Link>
        </div>
        <p className="hero-code">
          <code>git clone github.com/hacrex/OpsSentinel && docker-compose up -d</code>
        </p>
      </section>

      {/* Problem */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Why OpsSentinel</div>
          <h2 className="section-title">The Problem</h2>
        </div>
        <div className="problem-grid">
          <div className="problem-card problem-card--bad">
            <div className="problem-icon problem-icon--bad">
              <AlertTriangle size={18} />
            </div>
            <h3>Without OpsSentinel</h3>
            <ul>
              <li>Check 50+ repos for failed Actions</li>
              <li>Miss failures until standup</li>
              <li>No visibility into flaky tests</li>
              <li>Manual investigation of every failure</li>
            </ul>
          </div>
          <div className="problem-card problem-card--good">
            <div className="problem-icon problem-icon--good">
              <Zap size={18} />
            </div>
            <h3>With OpsSentinel</h3>
            <ul>
              <li>One dashboard for all pipelines</li>
              <li>Instant Slack/Teams/Email alerts</li>
              <li>Auto-detect flaky workflows</li>
              <li>1-click re-run failed jobs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Features</div>
          <h2 className="section-title">What You Get</h2>
        </div>
        <div className="features-grid">
          <div className="card">
            <div className="card-icon"><Globe size={16} /></div>
            <h3>Real-Time Updates</h3>
            <p>Live WebSocket updates. No polling. See failures the moment they happen.</p>
          </div>
          <div className="card">
            <div className="card-icon"><LineChart size={16} /></div>
            <h3>Repo Analytics</h3>
            <p>Success rates, MTTR, and trend charts for every repository.</p>
          </div>
          <div className="card">
            <div className="card-icon"><AlertTriangle size={16} /></div>
            <h3>Flaky Detection</h3>
            <p>Auto-detect workflows with high failure rates. Stop chasing ghosts.</p>
          </div>
          <div className="card">
            <div className="card-icon"><RefreshCw size={16} /></div>
            <h3>1-Click Re-run</h3>
            <p>Trigger re-runs from the dashboard. No need to go to GitHub.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Bell size={16} /></div>
            <h3>Alerts</h3>
            <p>Slack, Teams, and Email notifications when builds fail.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Shield size={16} /></div>
            <h3>Secure</h3>
            <p>HMAC webhook verification. GitHub OAuth. Your data stays yours.</p>
          </div>
        </div>
      </section>

      {/* How */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Setup</div>
          <h2 className="section-title">Three Steps</h2>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>Clone</h3>
            <div className="step-code">cp .env.example .env</div>
            <p>Add your GitHub credentials</p>
          </div>
          <div className="step-card">
            <div className="step-number">02</div>
            <h3>Deploy</h3>
            <div className="step-code">docker-compose up -d</div>
            <p>Everything included</p>
          </div>
          <div className="step-card">
            <div className="step-number">03</div>
            <h3>Connect</h3>
            <div className="step-code">Settings → Webhooks</div>
            <p>Point your repos here</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Start Monitoring Today</h2>
          <p>Free and open source. Deploy in minutes.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              View on GitHub <ArrowRight size={14} />
            </a>
            <Link to="/docs" className="btn-secondary">
              Read the Docs
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
