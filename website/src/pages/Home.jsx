import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, GitBranch, Globe, AlertTriangle, RefreshCw, Bell, Shield, LineChart, Database, Terminal, ArrowRight, Star, Users, Clock, Check, X, Play, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';

const typingTexts = [
  'git clone github.com/hacrex/OpsSentinel',
  'docker-compose up -d',
  'open http://localhost',
];

function TypingCode() {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentText = typingTexts[textIndex];
    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentText.length) {
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === currentText.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex > 0) {
        setCharIndex(charIndex - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setTextIndex((textIndex + 1) % typingTexts.length);
      }
    }, isDeleting ? 30 : 80);
    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, textIndex]);

  return (
    <code>
      $ {typingTexts[textIndex].slice(0, charIndex)}
      <span style={{ borderRight: '2px solid var(--text-dim)', marginLeft: '2px' }} />
    </code>
  );
}

export default function Home() {
  const [email, setEmail] = useState('');

  return (
    <Layout>
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">
          <Terminal size={12} />
          Open Source & Free
        </div>
        <h1 className="hero-title">
          Stop Digging Through<br />GitHub Actions Logs
        </h1>
        <p className="hero-subtitle">
          One dashboard for all your CI/CD pipelines. Real-time alerts.
          Flaky test detection. 1-click re-runs. Deploy in 3 minutes.
        </p>
        <div className="hero-actions">
          <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn-primary">
            Get Started Free <ArrowRight size={16} />
          </a>
          <Link to="/features" className="btn-secondary">
            See Features
          </Link>
        </div>
        <div className="hero-code">
          <TypingCode />
        </div>
      </section>

      {/* Trust Badges */}
      <section style={{ padding: '24px 24px 0', textAlign: 'center' }}>
        <div className="trust-badges">
          <div className="trust-badge">
            <Star size={14} />
            <span>MIT License</span>
          </div>
          <div className="trust-badge">
            <Database size={14} />
            <span>Docker Ready</span>
          </div>
          <div className="trust-badge">
            <Shield size={14} />
            <span>GitHub Actions</span>
          </div>
          <div className="trust-badge">
            <Globe size={14} />
            <span>Self-Hosted</span>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="section" style={{ paddingTop: '48px' }}>
        <div className="dashboard-preview">
          <div className="preview-header">
            <div className="preview-dots">
              <span /><span /><span />
            </div>
            <span className="preview-title">OpsSentinel Dashboard</span>
          </div>
          <div className="preview-content">
            <div className="preview-sidebar">
              <div className="preview-nav-item active">Dashboard</div>
              <div className="preview-nav-item">Repositories</div>
              <div className="preview-nav-item">Settings</div>
            </div>
            <div className="preview-main">
              <div className="preview-stats">
                <div className="preview-stat">
                  <span className="preview-stat-value">1,247</span>
                  <span className="preview-stat-label">Total Runs</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-value">98.2%</span>
                  <span className="preview-stat-label">Success Rate</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-value">23</span>
                  <span className="preview-stat-label">Failures</span>
                </div>
                <div className="preview-stat">
                  <span className="preview-stat-value">4.2m</span>
                  <span className="preview-stat-label">Avg MTTR</span>
                </div>
              </div>
              <div className="preview-chart">
                <div className="preview-chart-bar" style={{ height: '40%' }} />
                <div className="preview-chart-bar" style={{ height: '60%' }} />
                <div className="preview-chart-bar" style={{ height: '30%' }} />
                <div className="preview-chart-bar" style={{ height: '80%' }} />
                <div className="preview-chart-bar" style={{ height: '45%' }} />
                <div className="preview-chart-bar" style={{ height: '90%' }} />
                <div className="preview-chart-bar" style={{ height: '35%' }} />
              </div>
              <div className="preview-table">
                <div className="preview-row">
                  <span className="preview-repo">frontend/build</span>
                  <span className="preview-status success">passed</span>
                  <span className="preview-time">2m ago</span>
                </div>
                <div className="preview-row">
                  <span className="preview-repo">api/deploy</span>
                  <span className="preview-status failure">failed</span>
                  <span className="preview-time">15m ago</span>
                </div>
                <div className="preview-row">
                  <span className="preview-repo">backend/test</span>
                  <span className="preview-status success">passed</span>
                  <span className="preview-time">1h ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

      {/* Comparison */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">Compare</div>
          <h2 className="section-title">Why Not Build Your Own?</h2>
        </div>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Build Yourself</th>
                <th className="highlight">OpsSentinel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Time to Setup</td>
                <td><X size={14} className="icon-bad" /> Days of work</td>
                <td className="highlight"><Check size={14} className="icon-good" /> 3 minutes</td>
              </tr>
              <tr>
                <td>Maintenance</td>
                <td><X size={14} className="icon-bad" /> Ongoing</td>
                <td className="highlight"><Check size={14} className="icon-good" /> Zero</td>
              </tr>
              <tr>
                <td>Cost</td>
                <td><X size={14} className="icon-bad" /> Engineering hours</td>
                <td className="highlight"><Check size={14} className="icon-good" /> Free forever</td>
              </tr>
              <tr>
                <td>Real-time Updates</td>
                <td><X size={14} className="icon-bad" /> Build from scratch</td>
                <td className="highlight"><Check size={14} className="icon-good" /> Built-in</td>
              </tr>
              <tr>
                <td>Notifications</td>
                <td><X size={14} className="icon-bad" /> DIY</td>
                <td className="highlight"><Check size={14} className="icon-good" /> Slack, Teams, Email</td>
              </tr>
              <tr>
                <td>Flaky Detection</td>
                <td><X size={14} className="icon-bad" /> Complex analytics</td>
                <td className="highlight"><Check size={14} className="icon-good" /> Automatic</td>
              </tr>
            </tbody>
          </table>
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

      {/* Who Uses This */}
      <section className="section">
        <div className="section-header">
          <div className="section-label">For Teams</div>
          <h2 className="section-title">Built for You</h2>
        </div>
        <div className="features-grid" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="card use-case-card">
            <div className="use-case-icon">
              <Users size={18} />
            </div>
            <h3>Startups</h3>
            <p>5-20 repos. Run on a $5/mo VPS. Get visibility without the overhead.</p>
          </div>
          <div className="card use-case-card">
            <div className="use-case-icon">
              <Clock size={18} />
            </div>
            <h3>Growing Teams</h3>
            <p>50-200 repos. Multiple squads. PostgreSQL for scale, alerts for the org.</p>
          </div>
          <div className="card use-case-card">
            <div className="use-case-icon">
              <Shield size={18} />
            </div>
            <h3>Enterprise</h3>
            <p>200+ repos. Self-hosted on your infrastructure. Compliance-ready.</p>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p className="social-proof-text">
          Trusted by DevOps teams worldwide
        </p>
        <div className="social-proof-stats">
          <div className="social-proof-stat">
            <Star size={16} />
            <span>Open Source</span>
          </div>
          <div className="social-proof-stat">
            <Database size={16} />
            <span>100+ Deploys</span>
          </div>
          <div className="social-proof-stat">
            <Globe size={16} />
            <span>Self-Hosted</span>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="newsletter-card">
          <h3>Stay Updated</h3>
          <p>Get notified about new features and releases.</p>
          <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); setEmail(''); alert('Thanks for subscribing!'); }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary">Subscribe</button>
          </form>
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
