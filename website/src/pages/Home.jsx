import { Link } from 'react-router-dom';
import { Zap, GitBranch, Globe, AlertTriangle, RefreshCw, Bell, Shield, LineChart, Database, Server, Terminal } from 'lucide-react';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <Terminal size={14} />
          Open Source & Self-Hosted
        </div>
        <h1 className="hero-title">
          Stop Digging Through<br />
          <span className="hero-highlight">GitHub Actions Logs</span>
        </h1>
        <p className="hero-subtitle">
          OpsSentinel gives you a centralized, real-time dashboard for all your CI/CD pipelines.
          Know instantly when builds fail, track recovery time, and ship faster.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
            <Zap size={18} /> Get Started Free
          </a>
          <Link to="/features" className="btn-secondary">
            <GitBranch size={18} /> See Features
          </Link>
        </div>
        <p className="hero-code">
          <code>git clone https://github.com/hacrex/OpsSentinel.git && docker-compose up -d</code>
        </p>
      </section>

      {/* Problem/Solution */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">The Problem with CI/CD Visibility</h2>
          <p className="section-subtitle">Teams waste hours every week hunting through logs. There's a better way.</p>
        </div>
        <div className="problem-grid">
          <div className="problem-card problem-card--bad">
            <div className="problem-icon problem-icon--bad">
              <AlertTriangle size={20} />
            </div>
            <h3>Without OpsSentinel</h3>
            <ul>
              <li>Check 50+ repos for failed Actions</li>
              <li>Miss failures until standup meetings</li>
              <li>No visibility into flaky tests</li>
              <li>Manual investigation of every failure</li>
            </ul>
          </div>
          <div className="problem-card problem-card--good">
            <div className="problem-icon problem-icon--good">
              <Zap size={20} />
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
          <h2 className="section-title">Everything You Need</h2>
          <p className="section-subtitle">Built for DevOps teams who want visibility without the complexity</p>
        </div>
        <div className="features-grid">
          <div className="card">
            <div className="card-icon"><Globe size={24} /></div>
            <h3>Real-Time Tracking</h3>
            <p>WebSocket-powered live updates. No polling, no delays. See failures the instant they happen.</p>
          </div>
          <div className="card">
            <div className="card-icon"><LineChart size={24} /></div>
            <h3>Repo Analytics</h3>
            <p>Success rates, MTTR, and 30-day trend charts. Identify problematic repositories at a glance.</p>
          </div>
          <div className="card">
            <div className="card-icon"><AlertTriangle size={24} /></div>
            <h3>Flaky Detection</h3>
            <p>Automatically identifies workflows with high failure rates. Stop chasing ghosts in your CI.</p>
          </div>
          <div className="card">
            <div className="card-icon"><RefreshCw size={24} /></div>
            <h3>1-Click Re-run</h3>
            <p>Trigger workflow re-runs directly from the dashboard. No need to navigate to GitHub.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Bell size={24} /></div>
            <h3>Multi-Channel Alerts</h3>
            <p>Get notified via Slack, Microsoft Teams, or Email. Configure per your team's workflow.</p>
          </div>
          <div className="card">
            <div className="card-icon"><Shield size={24} /></div>
            <h3>Secure by Design</h3>
            <p>HMAC webhook verification and GitHub OAuth. Your data stays on your infrastructure.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Up and Running in 3 Minutes</h2>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3>Clone & Configure</h3>
            <div className="step-code">cp .env.example .env</div>
            <p>Add your GitHub OAuth credentials</p>
          </div>
          <div className="step-card">
            <div className="step-number">02</div>
            <h3>Docker Compose</h3>
            <div className="step-code">docker-compose up -d</div>
            <p>Backend, database, frontend — all included</p>
          </div>
          <div className="step-card">
            <div className="step-number">03</div>
            <h3>Add Webhooks</h3>
            <div className="step-code">Settings {'>'} Webhooks</div>
            <p>Point your repos to OpsSentinel</p>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Built with Modern Tech</h2>
        </div>
        <div className="tech-grid">
          <div className="tech-item"><Database size={20} /> SQLite / PostgreSQL</div>
          <div className="tech-item"><Zap size={20} /> Node.js + Express</div>
          <div className="tech-item"><Globe size={20} /> React + Vite</div>
          <div className="tech-item"><Shield size={20} /> GitHub OAuth</div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-content">
          <h2>Ready to Take Control of Your CI/CD?</h2>
          <p>Join teams shipping faster with OpsSentinel. Free and open source.</p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
              <Zap size={18} /> Get Started Free
            </a>
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-secondary">
              <GitBranch size={18} /> Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
}
