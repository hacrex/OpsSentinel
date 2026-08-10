import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Shield, GitBranch, AlertTriangle, BarChart3,
  Bell, Lock, Terminal, Layers, Server, Settings, Zap,
  CheckCircle, XCircle, ArrowRight, Cpu, Eye, FileCode,
  Workflow, Brain, Target
} from 'lucide-react';
import Layout from '../components/Layout';

const typingTexts = [
  'git clone github.com/hacrex/OpsSentinel',
  'docker-compose up -d',
  'open http://localhost:3000',
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
    <div className="hero-code">
      <div className="preview-header">
        <div className="preview-dots">
          <span style={{ background: '#ff5f57' }}></span>
          <span style={{ background: '#ffbd2e' }}></span>
          <span style={{ background: '#28c840' }}></span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>terminal</span>
      </div>
      <code className="code-content">
        <span style={{ color: '#22c55e' }}>$</span> {typingTexts[textIndex].slice(0, charIndex)}
        <span style={{ borderRight: '2px solid var(--text)', marginLeft: '2px' }} />
      </code>
    </div>
  );
}

const features = [
  {
    icon: <BarChart3 size={20} />,
    title: 'CI/CD Observability',
    description: 'Real-time dashboard for GitHub Actions, GitLab CI, Jenkins. Track workflows, jobs, and steps across all repositories.',
  },
  {
    icon: <Brain size={20} />,
    title: 'AI Failure Analysis',
    description: 'LLM-powered root cause analysis. Failure fingerprinting groups similar failures. Flaky test detection with recommendations.',
  },
  {
    icon: <Layers size={20} />,
    title: 'Multi-Engine IaC',
    description: 'OpenTofu, Terraform, Pulumi, CloudFormation, Crossplane. Plan, approve, apply — all from one control plane.',
  },
  {
    icon: <Settings size={20} />,
    title: 'Configuration Management',
    description: 'Ansible, Chef, Puppet, SaltStack. Run playbooks, enforce compliance, detect configuration drift.',
  },
  {
    icon: <AlertTriangle size={20} />,
    title: 'Incident Management',
    description: 'Auto-create incidents from repeated failures. Track severity, timeline, and resolution. Integrate with GitHub Issues.',
  },
  {
    icon: <Target size={20} />,
    title: 'DORA Metrics',
    description: 'Deployment frequency, lead time, change failure rate, MTTR. Industry benchmarks to measure your team.',
  },
  {
    icon: <Workflow size={20} />,
    title: 'Cross-Domain Correlation',
    description: 'Connect commit to build to deploy to incident. See the full chain when something goes wrong.',
  },
  {
    icon: <Eye size={20} />,
    title: 'Drift Detection',
    description: 'Detect infrastructure and configuration drift across all engines. Get alerted before it causes incidents.',
  },
  {
    icon: <Lock size={20} />,
    title: 'Policy Engine',
    description: 'Require approvals, enforce gates, audit all actions. Policy-driven automation with guardrails.',
  },
];

const tools = [
  { name: 'OpenTofu', category: 'IaC', color: '#22c55e' },
  { name: 'Terraform', category: 'IaC', color: '#7b61ff' },
  { name: 'Pulumi', category: 'IaC', color: '#f59e0b' },
  { name: 'Ansible', category: 'Config', color: '#22c55e' },
  { name: 'Chef', category: 'Config', color: '#f59e0b' },
  { name: 'Puppet', category: 'Config', color: '#7b61ff' },
  { name: 'GitHub Actions', category: 'CI/CD', color: '#38bdf8' },
  { name: 'Kubernetes', category: 'Deploy', color: '#38bdf8' },
];

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <div className="container">
          <span className="hero-badge">Open Source & Free Forever</span>
          <h1 className="hero-title">
            The Open-Source<br />
            <span style={{ color: 'var(--accent)' }}>GitOps Control Plane</span>
          </h1>
          <p className="hero-subtitle">
            Connect your CI/CD pipelines, infrastructure automation (Terraform, OpenTofu, Pulumi),
            configuration management (Ansible, Chef, Puppet), and incident response into one
            intelligent platform with AI-powered failure analysis.
          </p>
          <div className="hero-actions">
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn btn-primary">
              <Github size={16} />
              View on GitHub
            </a>
            <Link to="/features" className="btn btn-secondary">
              See Features
              <ArrowRight size={16} />
            </Link>
          </div>
          <TypingCode />
          <div className="trust-badges">
            <span className="trust-badge"><Shield size={14} /> MIT License</span>
            <span className="trust-badge"><Server size={14} /> Self-Hosted</span>
            <span className="trust-badge"><Layers size={14} /> Multi-Engine IaC</span>
            <span className="trust-badge"><Brain size={14} /> AI-Powered</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">The Problem</span>
            <h2 className="section-title">Your Tools Don't Talk to Each Other</h2>
            <p className="section-subtitle">
              Modern teams use 5-15 tools across the delivery lifecycle. Each tool sees only its own domain.
              When something fails, you manually correlate across dashboards, logs, and alerts.
            </p>
          </div>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon"><XCircle size={24} style={{ color: '#ef4444' }} /></div>
              <h3>Without OpsSentinel</h3>
              <ul className="feature-list">
                <li>GitHub Actions shows "failed" — but why?</li>
                <li>Terraform change invisible to CI/CD monitoring</li>
                <li>Ansible drift detected by nobody</li>
                <li>Incident has no infrastructure context</li>
                <li>5 tools, 5 dashboards, 0 answers</li>
              </ul>
            </div>
            <div className="problem-card" style={{ borderColor: 'var(--accent)' }}>
              <div className="problem-icon"><CheckCircle size={24} style={{ color: 'var(--accent)' }} /></div>
              <h3>With OpsSentinel</h3>
              <ul className="feature-list">
                <li>AI analyzes logs and finds root cause</li>
                <li>Infrastructure changes correlated with deployments</li>
                <li>Configuration drift detected and alerted</li>
                <li>Incidents have full context: commit to deploy</li>
                <li>One platform, one view, full understanding</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Core Features</span>
            <h2 className="section-title">Everything You Need to Understand Your Operations</h2>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="card feature-card">
                <div className="card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Supported Tools</span>
            <h2 className="section-title">One Platform. Every Tool.</h2>
            <p className="section-subtitle">
              OpsSentinel connects to your existing tools. No migration required. No vendor lock-in.
            </p>
          </div>
          <div className="tools-grid">
            {tools.map((tool) => (
              <div key={tool.name} className="tool-card">
                <span className="tool-category" style={{ color: tool.color }}>{tool.category}</span>
                <span className="tool-name">{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="architecture-diagram">
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '32px' }}>How It Works</h2>
            <pre className="architecture-pre">{`
                         OPSSENTINEL
                      Control Plane
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
     PROVISION         CONFIGURE         DEPLOY
     OpenTofu           Ansible          CI/CD
     Terraform          Chef          GitHub Actions
     Pulumi             Puppet         GitLab CI
          |                |                |
          +----------------+----------------+
                           |
                      INTELLIGENCE
                    AI Analysis
                   Failure Intel
                  Drift Detection
                           |
                      RECOVER
                   Incidents
                   Remediation
                    Rollbacks
            `}</pre>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Clone & Deploy</h3>
              <p>Docker Compose up. Three containers: PostgreSQL, Backend, Frontend. Running in minutes.</p>
              <div className="step-code">docker-compose up -d</div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Connect Your Tools</h3>
              <p>Add GitHub webhooks, configure IaC projects, connect Ansible inventories. One API for everything.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Understand Everything</h3>
              <p>See the full picture. AI-powered analysis. Cross-domain correlation. Incident management.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Why OpsSentinel</span>
            <h2 className="section-title">Not Just Another Tool. The Missing Layer.</h2>
          </div>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Spacelift / env0</th>
                  <th>PagerDuty / OpsGenie</th>
                  <th>Datadog / Grafana</th>
                  <th style={{ color: 'var(--accent)' }}>OpsSentinel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>CI/CD Observability</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td>Partial</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Failure Intelligence</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Multi-Engine IaC</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Incident Management</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Cross-Domain Correlation</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Open Source</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
                <tr>
                  <td>Self-Hosted</td>
                  <td>Partial</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Start Understanding Your Operations Today</h2>
            <p>Free. Open source. Self-hosted. Connect your first tool in minutes.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn btn-primary">
                Get Started Free
              </a>
              <Link to="/features" className="btn btn-secondary">
                Explore Features
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Github({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}
