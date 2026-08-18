import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, AlertTriangle, BarChart3,
  Lock, Layers, Server, Settings, Github,
  CheckCircle, XCircle, ArrowRight, Eye,
  Workflow, Brain, Target, Clipboard, Check
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
    status: 'available',
    icon: <BarChart3 size={20} />,
    title: 'CI/CD Observability',
    description: 'Live dashboard for GitHub Actions. Track workflow runs and repository events in real time with WebSocket-powered updates.',
  },
  {
    status: 'available',
    icon: <Brain size={20} />,
    title: 'AI Failure Analysis',
    description: 'Use a supported LLM provider to analyze failed workflow logs, surface likely root causes, and suggest next steps.',
  },
  {
    status: 'available',
    icon: <Layers size={20} />,
    title: 'Failure Triage',
    description: 'Use repository context, changed files, and CODEOWNERS data to route workflow failures toward the right owners.',
  },
  {
    status: 'available',
    icon: <Settings size={20} />,
    title: 'Verified Webhooks',
    description: 'Validate GitHub webhook signatures with HMAC SHA-256 before workflow events enter the system.',
  },
  {
    status: 'available',
    icon: <AlertTriangle size={20} />,
    title: 'Failure History & MTTR',
    description: 'Persist workflow events, identify repeated failures, and track mean time to recovery across repositories.',
  },
  {
    status: 'available',
    icon: <Target size={20} />,
    title: 'One-Click Re-Runs',
    description: 'Trigger a GitHub workflow re-run directly from the dashboard when retrying is the right next action.',
  },
  {
    status: 'available',
    icon: <Workflow size={20} />,
    title: 'Roles & Permissions',
    description: 'Control sensitive workflow and administration actions with the existing role and permission model.',
  },
  {
    status: 'available',
    icon: <Eye size={20} />,
    title: 'Self-Hosted by Design',
    description: 'Run the application on your own infrastructure with Docker Compose and keep workflow data under your control.',
  },
  {
    status: 'roadmap',
    icon: <Lock size={20} />,
    title: 'Roadmap: Broader GitOps',
    description: 'Future releases can extend the current GitHub-native foundation into IaC, configuration management, and wider GitOps workflows.',
  },
];

const workflowStages = [
  { label: 'Receive', detail: 'GitHub webhooks and workflow events', icon: <Workflow size={18} /> },
  { label: 'Analyze', detail: 'Live status and AI-assisted failure intelligence', icon: <Brain size={18} /> },
  { label: 'Triage', detail: 'Repository context, CODEOWNERS, and ownership', icon: <Target size={18} /> },
  { label: 'Recover', detail: 'Re-run workflows and measure MTTR', icon: <CheckCircle size={18} /> },
];

const installCommands = [
  { label: 'Clone', command: 'git clone https://github.com/hacrex/OpsSentinel.git' },
  { label: 'Configure', command: 'cd OpsSentinel && cp .env.example .env' },
  { label: 'Start', command: 'docker compose up -d --build' },
];

const tools = [
  { name: 'GitHub Actions', category: 'CI/CD', color: '#38bdf8' },
  { name: 'GitHub OAuth', category: 'Identity', color: '#a78bfa' },
  { name: 'GitHub Webhooks', category: 'Events', color: '#22c55e' },
  { name: 'Docker Compose', category: 'Deploy', color: '#38bdf8' },
  { name: 'PostgreSQL', category: 'Database', color: '#7b61ff' },
  { name: 'SQLite', category: 'Database', color: '#f59e0b' },
  { name: 'OpenAI / Anthropic', category: 'AI', color: '#22c55e' },
  { name: 'REST API', category: 'Integrate', color: '#38bdf8' },
];

function InstallPanel() {
  const [copiedCommand, setCopiedCommand] = useState(null);

  const handleCopy = async (command) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedCommand(command);
      window.setTimeout(() => setCopiedCommand(null), 1800);
    } catch {
      setCopiedCommand(null);
    }
  };

  return (
    <div className="install-panel" aria-labelledby="install-panel-title">
      <div className="install-panel-header">
        <div>
          <span className="section-label">Quick start</span>
          <h3 id="install-panel-title">Run OpsSentinel locally</h3>
        </div>
        <span className="status-pill status-pill-available">Self-hosted</span>
      </div>
      <p>Three small steps from clone to a running local control plane. Add GitHub credentials in `.env` before starting.</p>
      <div className="install-commands">
        {installCommands.map((item) => (
          <div className="install-command" key={item.label}>
            <span className="install-command-label">{item.label}</span>
            <code>{item.command}</code>
            <button
              type="button"
              className="copy-command-btn"
              onClick={() => handleCopy(item.command)}
              aria-label={`Copy ${item.label} command`}
            >
              {copiedCommand === item.command ? <Check size={15} /> : <Clipboard size={15} />}
              <span>{copiedCommand === item.command ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Layout>
      <section className="hero">
        <div className="container">
          <span className="hero-badge">Open Source · Self-Hosted</span>
          <h1 className="hero-title">
            Open-Source<br />
            <span style={{ color: 'var(--accent)' }}>CI/CD Observability</span>
          </h1>
          <p className="hero-subtitle">
              GitHub-native CI/CD observability for teams that want live workflow visibility, failure intelligence, and self-hosted control. Powered by AI when you choose to connect an LLM provider.
          </p>
          <div className="hero-actions">
            <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Github size={16} />
              View on GitHub
            </a>
            <Link to="/features" className="btn btn-secondary">
              See Features
              <ArrowRight size={16} />
            </Link>
          </div>
          <TypingCode />
          <InstallPanel />

          <div className="trust-badges">
            <span className="trust-badge"><Shield size={14} /> MIT License</span>
            <span className="trust-badge"><Server size={14} /> Self-Hosted</span>
            <span className="trust-badge"><Layers size={14} /> GitHub Workflows</span>
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
                <li>GitHub Actions fails, but the useful context is buried in raw logs</li>
                <li>Repeated failures are difficult to compare across repositories</li>
                <li>Ownership is unclear when a failure crosses team boundaries</li>
                <li>Recovery means switching between dashboards and GitHub tabs</li>
                <li>One failure can consume hours of manual investigation</li>
              </ul>
            </div>
            <div className="problem-card" style={{ borderColor: 'var(--accent)' }}>
              <div className="problem-icon"><CheckCircle size={24} style={{ color: 'var(--accent)' }} /></div>
              <h3>With OpsSentinel</h3>
              <ul className="feature-list">
                <li>AI-assisted analysis surfaces likely causes and suggested next steps</li>
                <li>Failure patterns are visible across workflow runs and repositories</li>
                <li>CODEOWNERS and changed-file context help route triage</li>
                <li>MTTR and event history make recovery measurable</li>
                <li>One self-hosted view for GitHub workflow operations</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Core Features</span>
            <h2 className="section-title">Everything You Need to Understand CI/CD Failures</h2>
          </div>
          <div className="features-grid">
            {features.map((feature) => (
              <div key={feature.title} className="card feature-card">
                <div className="card-icon">{feature.icon}</div>
                <div className="feature-card-meta">
                  <span className={`status-pill status-pill-${feature.status}`}>
                    {feature.status === 'roadmap' ? 'Roadmap' : 'Available'}
                  </span>
                </div>
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
            <span className="section-label">Current Integrations</span>
            <h2 className="section-title">One Platform. Every Tool.</h2>
            <p className="section-subtitle">
              Start with the integrations available in the current release. Broader GitOps connectors are part of the roadmap.
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
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '12px' }}>How the Current Release Works</h2>
            <div className="architecture-svg">
              <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
                <rect x="300" y="20" width="200" height="50" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="2"/>
                <text x="400" y="52" text-anchor="middle" fill="#ffffff" fontSize="18" fontWeight="600">OPSSENTINEL</text>
                <text x="400" y="70" text-anchor="middle" fill="#a3a3a3" fontSize="12">GitHub Control Plane</text>

                <line x1="400" y1="70" x2="400" y2="110" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="100" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="180" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Receive</text>
                <text x="180" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">GitHub Webhooks</text>
                <text x="180" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">Workflow Runs</text>
                <text x="180" y="184" text-anchor="middle" fill="#a3a3a3" fontSize="10">Repository Events</text>

                <rect x="320" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="400" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Analyze</text>
                <text x="400" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">Live Dashboard</text>
                <text x="400" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">Failure Intelligence</text>
                <text x="400" y="184" text-anchor="middle" fill="#a3a3a3" fontSize="10">MTTR Tracking</text>

                <rect x="540" y="110" width="160" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="620" y="140" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Recover</text>
                <text x="620" y="156" text-anchor="middle" fill="#a3a3a3" fontSize="11">Triage & Re-Run</text>
                <text x="620" y="170" text-anchor="middle" fill="#a3a3a3" fontSize="10">GitHub Actions</text>

                <line x1="180" y1="160" x2="320" y2="160" stroke="#38bdf8" strokeWidth="2"/>
                <text x="250" y="155" text-anchor="middle" fill="#38bdf8" fontSize="10">ingest</text>

                <line x1="460" y1="160" x2="540" y2="160" stroke="#38bdf8" strokeWidth="2"/>
                <text x="500" y="155" text-anchor="middle" fill="#38bdf8" fontSize="10">analyze</text>

                <rect x="200" y="190" width="400" height="70" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="1"/>
                <text x="400" y="215" text-anchor="middle" fill="#38bdf8" fontSize="14" fontWeight="600">INTELLIGENCE</text>
                <text x="400" y="235" text-anchor="middle" fill="#a3a3a3" fontSize="11">AI Analysis | Failure Intelligence | MTTR</text>
                <text x="400" y="250" text-anchor="middle" fill="#a3a3a3" fontSize="11">Root Cause | Triage | Recommendations</text>

                <line x1="400" y1="260" x2="400" y2="280" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="300" y="280" width="200" height="50" rx="8" fill="#161616" stroke="#262626"/>
                <text x="400" y="310" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="500">Recover</text>
                <text x="400" y="328" text-anchor="middle" fill="#a3a3a3" fontSize="10">Triage | Re-Runs | Audit Trail</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="section workflow-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Operational loop</span>
            <h2 className="section-title">From Event to Recovery</h2>
            <p className="section-subtitle">A focused workflow for turning a failed GitHub run into a clear next action.</p>
          </div>
          <div className="workflow-track">
            {workflowStages.map((stage, index) => (
              <div className="workflow-stage" key={stage.label}>
                <div className="workflow-stage-icon">{stage.icon}</div>
                <span className="workflow-stage-index">0{index + 1}</span>
                <h3>{stage.label}</h3>
                <p>{stage.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Clone & Deploy</h3>
              <p>One command. Three containers: PostgreSQL, Backend, Frontend. Start the self-hosted stack in minutes.</p>
              <div className="step-code">docker-compose up -d</div>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Connect Your Tools</h3>
              <p>Connect GitHub OAuth and webhooks, then choose an LLM provider if you want AI-assisted failure analysis.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>See Everything</h3>
              <p>Live workflow visibility. AI-assisted analysis. Faster triage, measurable recovery, and fewer dashboard hops.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Why OpsSentinel</span>
            <h2 className="section-title">A Focused Starting Point for Operational Clarity</h2>
          </div>
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Capability</th>
                  <th style={{ color: 'var(--accent)' }}>Current release</th>
                  <th>Roadmap direction</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>GitHub Actions observability</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Available" /></td>
                  <td>Expand provider coverage over time</td>
                </tr>
                <tr>
                  <td>Failure analysis and triage</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Available" /></td>
                  <td>Automate more recovery workflows</td>
                </tr>
                <tr>
                  <td>MTTR and event history</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Available" /></td>
                  <td>Broader operational intelligence</td>
                </tr>
                <tr>
                  <td>IaC integrations</td>
                  <td>Not yet</td>
                  <td>OpenTofu, Terraform, Pulumi, CloudFormation, and Crossplane</td>
                </tr>
                <tr>
                  <td>Configuration management</td>
                  <td>Not yet</td>
                  <td>Ansible, Chef, Puppet, and SaltStack</td>
                </tr>
                <tr>
                  <td>Self-hosted deployment</td>
                  <td><CheckCircle size={16} style={{ color: '#22c55e' }} aria-label="Available" /></td>
                  <td>Managed offering under consideration</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Start With a Clearer View of CI/CD</h2>
            <p>Open source. Self-hosted. Connect GitHub and investigate failures from one place.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
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


