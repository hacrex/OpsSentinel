import { Link } from 'react-router-dom';
import {
  BarChart3, Brain, Layers, Settings, AlertTriangle, Target,
  Workflow, Eye, Lock, Shield, Bell, GitBranch, Server,
  CheckCircle, Activity, Zap, FileCode, Terminal
} from 'lucide-react';
import Layout from '../components/Layout';

const featureSections = [
  {
    status: 'available',
    label: 'Available today',
    title: 'GitHub-Native CI/CD Observability',
    description: 'OpsSentinel currently focuses on making GitHub Actions failures easier to understand, triage, and recover from. The product is self-hosted and built around your existing GitHub workflows.',
    features: [
      { icon: <BarChart3 size={18} />, name: 'Real-Time Dashboard', desc: 'WebSocket-powered live updates for workflow runs and repository events. No refresh needed.' },
      { icon: <Brain size={18} />, name: 'LLM Failure Analysis', desc: 'Analyze failed workflow logs with a supported LLM provider and receive a category, likely root cause, suggested fix, and confidence score.' },
      { icon: <AlertTriangle size={18} />, name: 'Flaky Workflow Detection', desc: 'Identify workflows with repeated failures and surface patterns that deserve attention.' },
      { icon: <Workflow size={18} />, name: 'Failure Triage', desc: 'Use repository context, changed files, and CODEOWNERS data to help route failures to the right owners.' },
      { icon: <Target size={18} />, name: 'MTTR Tracking', desc: 'Measure mean time to recovery for workflow failures and follow how reliability changes over time.' },
      { icon: <Zap size={18} />, name: 'One-Click Re-Run', desc: 'Trigger a GitHub workflow re-run directly from the dashboard when a retry is the right next action.' },
    ],
  },
  {
    status: 'available',
    label: 'Operations foundation',
    title: 'Secure, Self-Hosted, and Extensible',
    description: 'The current release provides the operational foundation for teams that want visibility without handing their pipeline data to another SaaS platform.',
    features: [
      { icon: <GitBranch size={18} />, name: 'GitHub OAuth', desc: 'Authenticate through GitHub and keep repository access connected to the identity system your team already uses.' },
      { icon: <Shield size={18} />, name: 'Verified Webhooks', desc: 'Validate incoming GitHub webhook signatures with HMAC SHA-256 before processing workflow events.' },
      { icon: <Activity size={18} />, name: 'Event History', desc: 'Persist workflow events for investigation, dashboards, and retention-based cleanup.' },
      { icon: <Lock size={18} />, name: 'Roles and Permissions', desc: 'Use the existing role and permission model to control sensitive workflow and administration actions.' },
      { icon: <Server size={18} />, name: 'SQLite or PostgreSQL', desc: 'Use SQLite for local development and PostgreSQL for production deployments.' },
      { icon: <Terminal size={18} />, name: 'Docker Compose', desc: 'Run the application with the repository’s Docker-based deployment path and keep infrastructure under your control.' },
    ],
  },
  {
    status: 'roadmap',
    label: 'Roadmap',
    title: 'A Foundation for Broader GitOps Workflows',
    description: 'The broader GitOps control-plane vision is planned, not presented as shipped functionality. These areas are where future releases can extend the current GitHub-native foundation.',
    features: [
      { icon: <Layers size={18} />, name: 'IaC Connectors', desc: 'OpenTofu, Terraform, Pulumi, CloudFormation, and Crossplane integrations are roadmap areas for future releases.' },
      { icon: <Settings size={18} />, name: 'Configuration Management', desc: 'Ansible, Chef, Puppet, and SaltStack support is planned for a future cross-domain operations layer.' },
      { icon: <GitBranch size={18} />, name: 'Additional CI Providers', desc: 'GitLab CI and Bitbucket Pipelines are planned beyond the current GitHub Actions focus.' },
      { icon: <Bell size={18} />, name: 'Incident Integrations', desc: 'Deeper incident-management and notification workflows can build on the current event and triage model.' },
      { icon: <Eye size={18} />, name: 'Predictive Analytics', desc: 'Forecasting workflow failure probabilities and broader operational trends remains a future capability.' },
      { icon: <FileCode size={18} />, name: 'Automated Remediation', desc: 'More automated recovery and cross-domain correlation are planned as the integration surface grows.' },
    ],
  },
];

export default function Features() {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Features</span>
            <h1 className="section-title">Understand Pipeline Failures Without the Guesswork</h1>
            <p className="section-subtitle">
              Start with GitHub-native CI/CD observability today, then grow toward a broader GitOps control plane as the roadmap ships.
            </p>
          </div>
        </div>
      </section>

      {featureSections.map((section, idx) => (
        <section key={section.label} className="section" style={{ background: idx % 2 === 1 ? 'var(--surface)' : 'transparent' }}>
          <div className="container">
            <div className="section-header">
              <div className="section-heading-meta">
                <span className="section-label">{section.label}</span>
                <span className={`status-pill status-pill-${section.status}`}>
                  {section.status === 'roadmap' ? 'Roadmap' : 'Available'}
                </span>
              </div>
              <h2 className="section-title">{section.title}</h2>
              <p className="section-subtitle">{section.description}</p>
            </div>
            <div className="features-grid">
              {section.features.map((feature) => (
                <div key={feature.name} className="card feature-card">
                  <div className="card-icon">{feature.icon}</div>
                  <h3>{feature.name}</h3>
                  <p>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Architecture</span>
            <h2 className="section-title">Flexible. Self-Hosted. Open Source.</h2>
          </div>
          <div className="features-grid">
            <div className="card feature-card">
              <div className="card-icon"><Server size={20} /></div>
              <h3>Self-Hosted</h3>
              <p>Run the current release on your infrastructure with Docker Compose. Your workflow data stays under your control.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Shield size={20} /></div>
              <h3>MIT Licensed</h3>
              <p>Read the source, fork the project, and contribute improvements through the public repository.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Layers size={20} /></div>
              <h3>SQLite or PostgreSQL</h3>
              <p>Use SQLite for local development and PostgreSQL for production deployments.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Zap size={20} /></div>
              <h3>Real-Time Events</h3>
              <p>WebSocket-powered updates keep the dashboard current as workflow events arrive.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Lock size={20} /></div>
              <h3>Secure by Default</h3>
              <p>GitHub OAuth, verified webhooks, security headers, and permission checks protect sensitive actions.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Terminal size={20} /></div>
              <h3>API-First Foundation</h3>
              <p>Use the backend API as the integration point for dashboards, automation, and future connectors.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Start With a Clearer View of CI/CD</h2>
            <p>Deploy the open-source release, connect GitHub, and see where failures are coming from.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                Get Started Free
              </a>
              <Link to="/docs" className="btn btn-secondary">
                Read the Docs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
