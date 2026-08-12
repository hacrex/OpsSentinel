import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, BarChart3,
  Lock, Layers, Server, Settings, Github,
  CheckCircle, XCircle, ArrowRight, Eye,
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
    let pauseTimeout;
    const timeout = setTimeout(() => {
      if (!isDeleting && charIndex < currentText.length) {
        setCharIndex(charIndex + 1);
      } else if (!isDeleting && charIndex === currentText.length) {
        pauseTimeout = setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex > 0) {
        setCharIndex(charIndex - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setTextIndex((textIndex + 1) % typingTexts.length);
      }
    }, isDeleting ? 30 : 80);
    return () => {
      clearTimeout(timeout);
      if (pauseTimeout) clearTimeout(pauseTimeout);
    };
  }, [charIndex, isDeleting, textIndex]);

  return (
    <div className="hero-code">
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
    description: 'Live dashboard for GitHub Actions, GitLab CI, and Jenkins. Track workflows, jobs, and steps across every repository in real time.',
  },
  {
    icon: <Brain size={20} />,
    title: 'AI Failure Analysis',
    description: 'LLM-powered root cause analysis. Failure fingerprinting clusters similar issues. Flaky test detection with actionable recommendations.',
  },
  {
    icon: <Layers size={20} />,
    title: 'Multi-Engine IaC',
    description: 'OpenTofu, Terraform, Pulumi, CloudFormation, Crossplane. Plan, approve, and apply infrastructure from a single control plane.',
  },
  {
    icon: <Settings size={20} />,
    title: 'Configuration Management',
    description: 'Ansible, Chef, Puppet, SaltStack. Run playbooks, enforce compliance, and catch configuration drift before it causes outages.',
  },
  {
    icon: <AlertTriangle size={20} />,
    title: 'Incident Management',
    description: 'Automatically open incidents from repeated failures. Track severity, timeline, and resolution — all linked to GitHub Issues.',
  },
  {
    icon: <Target size={20} />,
    title: 'DORA Metrics',
    description: 'Deployment frequency, lead time, change failure rate, MTTR. Measure your team against industry benchmarks.',
  },
  {
    icon: <Workflow size={20} />,
    title: 'Cross-Domain Correlation',
    description: 'Trace a commit through build, deploy, and incident. See the full chain the moment something breaks.',
  },
  {
    icon: <Eye size={20} />,
    title: 'Drift Detection',
    description: 'Detect infrastructure and configuration drift across all engines. Get alerted before drift becomes downtime.',
  },
  {
    icon: <Lock size={20} />,
    title: 'Policy Engine',
    description: 'Require approvals, enforce gates, and audit every action. Policy-driven automation with built-in guardrails.',
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
          <span className="hero-badge">Free Forever</span>
          <h1 className="hero-title">
            The Open-Source<br />
            <span style={{ color: 'var(--accent)' }}>GitOps Control Plane</span>
          </h1>
          <p className="hero-subtitle">
            Unify CI/CD pipelines, infrastructure automation, configuration management and incident response into a single platform. Powered by AI.
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
              Modern teams juggle 5–15 tools across the delivery lifecycle. Each one sees only its own slice.
              When things break, you're left stitching together dashboards, logs, and alerts by hand.
            </p>
          </div>
          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon"><XCircle size={24} style={{ color: '#ef4444' }} /></div>
              <h3>Without OpsSentinel</h3>
              <ul className="feature-list">
                <li>GitHub Actions fails — but the root cause is buried in Terraform</li>
                <li>Infrastructure changes are invisible to your CI/CD pipeline</li>
                <li>Ansible drift goes undetected until production breaks</li>
                <li>Incidents lack context: which commit, which deploy, which change</li>
                <li>Five tools, five dashboards, zero answers</li>
              </ul>
            </div>
            <div className="problem-card" style={{ borderColor: 'var(--accent)' }}>
              <div className="problem-icon"><CheckCircle size={24} style={{ color: 'var(--accent)' }} /></div>
              <h3>With OpsSentinel</h3>
              <ul className="feature-list">
                <li>AI analyzes logs and surfaces the root cause in seconds</li>
                <li>Infrastructure changes are correlated with every deployment</li>
                <li>Configuration drift is detected and alerted automatically</li>
                <li>Incidents carry full context: commit to deploy to infra</li>
                <li>One platform, one view, complete operational clarity</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Core Features</span>
            <h2 className="section-title">Everything You Need to Own Your Operations</h2>
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
              Plug in your existing stack. No migrations. No vendor lock-in. Just visibility.
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
            <div className="architecture-svg">
              <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
                <rect x="300" y="20" width="200" height="50" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="2"/>
                <text x="400" y="52" text-anchor="middle" fill="#ffffff" fontSize="18" fontWeight="600">OPSSENTINEL</text>
                <text x="400" y="70" text-anchor="middle" fill="#a3a3a3" fontSize="12">Control Plane</text>

                <line x1="400" y1="70" x2="400" y2="110" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="100" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="180" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Provision</text>
                <text x="180" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">OpenTofu</text>
                <text x="180" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">Terraform</text>
                <text x="180" y="184" text-anchor="middle" fill="#a3a3a3" fontSize="10">Pulumi</text>

                <rect x="320" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="400" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Configure</text>
                <text x="400" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">Ansible</text>
                <text x="400" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">Chef</text>
                <text x="400" y="184" text-anchor="middle" fill="#a3a3a3" fontSize="10">Puppet</text>

                <rect x="540" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="620" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Deploy</text>
                <text x="620" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">GitHub Actions</text>
                <text x="620" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">GitLab CI</text>

                <line x1="180" y1="160" x2="320" y2="160" stroke="#38bdf8" strokeWidth="2"/>
                <text x="250" y="155" text-anchor="middle" fill="#38bdf8" fontSize="10">converge</text>

                <line x1="460" y1="160" x2="540" y2="160" stroke="#38bdf8" strokeWidth="2"/>
                <text x="500" y="155" text-anchor="middle" fill="#38bdf8" fontSize="10">connect</text>

                <rect x="200" y="190" width="400" height="70" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="1"/>
                <text x="400" y="215" text-anchor="middle" fill="#38bdf8" fontSize="14" fontWeight="600">INTELLIGENCE</text>
                <text x="400" y="235" text-anchor="middle" fill="#a3a3a3" fontSize="11">AI Analysis | Failure Intel | Drift Detection</text>
                <text x="400" y="250" text-anchor="middle" fill="#a3a3a3" fontSize="11">Root Cause | Correlation | Recommendations</text>

                <line x1="400" y1="260" x2="400" y2="280" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="300" y="280" width="200" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="400" y="310" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Recover</text>
                <text x="400" y="328" text-anchor="middle" fill="#a3a3a3" fontSize="10">Incidents | Remediation | Rollbacks</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Clone & Deploy</h3>
              <p>One command. Three containers: PostgreSQL, Backend, Frontend. Running in under five minutes.</p>
              <div className="step-code">docker-compose up -d</div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Connect Your Tools</h3>
              <p>Add GitHub webhooks, point to your IaC projects, link Ansible inventories. One API for all of it.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>See Everything</h3>
              <p>Full-stack visibility. AI-driven analysis. Cross-domain correlation. Incidents that resolve themselves.</p>
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
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td>Partial</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Failure Intelligence</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Multi-Engine IaC</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Incident Management</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Cross-Domain Correlation</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Open Source</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
                <tr>
                  <td>Self-Hosted</td>
                  <td>Partial</td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><XCircle size={16} style={{ color: '#ef4444' }} aria-label="Not supported" /></td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Supported" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Stop Guessing. Start Knowing.</h2>
            <p>Open source. Self-hosted. Up and running in minutes.</p>
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


