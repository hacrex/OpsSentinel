import { Link } from 'react-router-dom';
import {
  BarChart3, Brain, Layers, Settings, AlertTriangle, Target,
  Workflow, Eye, Lock, Shield, Bell, GitBranch, Server,
  CheckCircle, Activity, Zap, FileCode, Terminal
} from 'lucide-react';
import Layout from '../components/Layout';

const featureSections = [
  {
    label: 'CI/CD Intelligence',
    title: 'Understand Why Things Fail',
    description: 'Go beyond "build failed." OpsSentinel fingerprints failures, clusters similar issues, and uses AI to find root causes.',
    features: [
      { icon: <BarChart3 size={18} />, name: 'Real-Time Dashboard', desc: 'WebSocket-powered live updates across all repositories and workflows.' },
      { icon: <Brain size={18} />, name: 'AI Root Cause Analysis', desc: 'LLM-powered log analysis. GPT-4o-mini or Claude 3 Haiku. Category, cause, fix, confidence.' },
      { icon: <FileCode size={18} />, name: 'Failure Fingerprinting', desc: 'Group similar failures across repos. Track patterns. Identify known issues.' },
      { icon: <AlertTriangle size={18} />, name: 'Flaky Test Detection', desc: 'Identify workflows with >30% failure rate. Track patterns over time.' },
      { icon: <Workflow size={18} />, name: 'Auto-Triage', desc: 'Parse CODEOWNERS, match changed files, assign failure owners with confidence scores.' },
      { icon: <Target size={18} />, name: 'Pipeline Health Score', desc: 'Composite score from success rate, MTTR, flakiness, and duration.' },
    ],
  },
  {
    label: 'Infrastructure Automation',
    title: 'Every IaC Engine. One Control Plane.',
    description: 'OpenTofu, Terraform, Pulumi, CloudFormation, Crossplane — all managed from OpsSentinel with unified drift detection and plan approval.',
    features: [
      { icon: <Layers size={18} />, name: 'Multi-Engine Support', desc: '5 IaC engines: OpenTofu, Terraform, Pulumi, CloudFormation, Crossplane.' },
      { icon: <Eye size={18} />, name: 'Drift Detection', desc: 'Scheduled and on-demand drift detection across all IaC engines.' },
      { icon: <Lock size={18} />, name: 'Plan Approval', desc: 'Require approval before applying infrastructure changes. Policy gates.' },
      { icon: <GitBranch size={18} />, name: 'State Management', desc: 'Track state across all engines. Local, remote, and cloud backends.' },
      { icon: <Zap size={18} />, name: 'Multi-Engine Orchestration', desc: 'Run OpenTofu + Ansible in a single workflow.' },
      { icon: <Shield size={18} />, name: 'Change Correlation', desc: 'See how infrastructure changes relate to CI/CD and config changes.' },
    ],
  },
  {
    label: 'Configuration Management',
    title: 'Configure Servers. Enforce Compliance.',
    description: 'Ansible, Chef, Puppet, SaltStack — run playbooks, enforce desired state, and detect configuration drift.',
    features: [
      { icon: <Terminal size={18} />, name: 'Ansible Integration', desc: 'Playbook execution, inventory management, Vault integration, host-level results.' },
      { icon: <Settings size={18} />, name: 'Chef Integration', desc: 'Cookbook management, recipe execution, InSpec compliance, node convergence.' },
      { icon: <Shield size={18} />, name: 'Puppet Integration', desc: 'Manifest management, Hiera data, PuppetDB, compliance reporting.' },
      { icon: <Server size={18} />, name: 'SaltStack Integration', desc: 'State management, remote execution, reactor system, beacon monitoring.' },
      { icon: <Eye size={18} />, name: 'Configuration Drift', desc: 'Detect when servers drift from desired state. Get alerted.' },
      { icon: <CheckCircle size={18} />, name: 'Approval Workflows', desc: 'Require approval before running configuration changes in production.' },
    ],
  },
  {
    label: 'Incident Management',
    title: 'From Failure to Resolution.',
    description: 'Auto-create incidents from repeated failures. Track severity, timeline, and resolution. Integrate with GitHub Issues.',
    features: [
      { icon: <AlertTriangle size={18} />, name: 'Auto-Incident Creation', desc: 'Same failure 3+ times? Production failure? Multi-repo impact? Auto-create incident.' },
      { icon: <Activity size={18} />, name: 'Incident Timeline', desc: 'Track every event from creation to resolution. Comments, status changes, assignments.' },
      { icon: <GitBranch size={18} />, name: 'GitHub Issues Integration', desc: 'Create Issues from incidents. Auto-close when resolved.' },
      { icon: <Target size={18} />, name: 'MTTR Tracking', desc: 'Mean Time To Recovery per incident, per repo, per team.' },
      { icon: <Zap size={18} />, name: 'Recovery Actions', desc: 'Rerun workflow, execute playbook, trigger rollback — all from incident view.' },
      { icon: <Lock size={18} />, name: 'Severity Classification', desc: 'Critical, High, Medium, Low. Auto-classify based on impact.' },
    ],
  },
  {
    label: 'Deployment Intelligence',
    title: 'Track Every Deployment.',
    description: 'Record deployments, correlate with infrastructure changes, calculate DORA metrics.',
    features: [
      { icon: <GitBranch size={18} />, name: 'Deployment Tracking', desc: 'Track commit → workflow → build → deploy → health check.' },
      { icon: <Target size={18} />, name: 'DORA Metrics', desc: 'Deployment frequency, lead time, change failure rate, MTTR.' },
      { icon: <BarChart3 size={18} />, name: 'Deployment Frequency', desc: 'Per repo, per environment, per team.' },
      { icon: <Workflow size={18} />, name: 'Infrastructure Correlation', desc: 'See which infrastructure changes preceded a deployment.' },
      { icon: <Eye size={18} />, name: 'Health Checks', desc: 'Track post-deployment health status.' },
      { icon: <Bell size={18} />, name: 'Rollback Tracking', desc: 'Track rollbacks and their reasons.' },
    ],
  },
  {
    label: 'Security & Governance',
    title: 'Enterprise-Grade Control.',
    description: 'RBAC, audit logging, policy engine, SSO — everything you need for compliance and governance.',
    features: [
      { icon: <Shield size={18} />, name: 'RBAC', desc: 'Viewer, Developer, Operator, Admin, Owner roles. Resource-level permissions.' },
      { icon: <Lock size={18} />, name: 'Policy Engine', desc: 'Require approvals, enforce gates, audit all actions. OPA/Rego support.' },
      { icon: <FileCode size={18} />, name: 'Audit Logging', desc: 'Track every action: login, workflow run, infrastructure change, incident creation.' },
      { icon: <Shield size={18} />, name: 'SSO/SAML', desc: 'Okta, Google Workspace, enterprise identity providers.' },
      { icon: <Lock size={18} />, name: 'Webhook Security', desc: 'HMAC SHA256 verification, replay protection, rate limiting.' },
      { icon: <Server size={18} />, name: 'Multi-Tenancy', desc: 'Isolated tenants with separate users, repos, environments, and secrets.' },
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
            <h1 className="section-title">Everything You Need to Understand Your Operations</h1>
            <p className="section-subtitle">
              CI/CD intelligence, infrastructure automation, configuration management,
              incident management, and deployment tracking — all in one platform.
            </p>
          </div>
        </div>
      </section>

      {featureSections.map((section, idx) => (
        <section key={section.label} className="section" style={{ background: idx % 2 === 1 ? 'var(--surface)' : 'transparent' }}>
          <div className="container">
            <div className="section-header">
              <span className="section-label">{section.label}</span>
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
              <p>Docker Compose deployment. Your data stays on your servers. No SaaS dependency.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Shield size={20} /></div>
              <h3>MIT Licensed</h3>
              <p>Fully open source. No vendor lock-in. Contribute and customize.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Layers size={20} /></div>
              <h3>Multi-Database</h3>
              <p>SQLite for development. PostgreSQL for production. Seamless migration.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Zap size={20} /></div>
              <h3>Real-Time</h3>
              <p>WebSocket-powered live updates. No polling. Instant visibility.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Lock size={20} /></div>
              <h3>Secure</h3>
              <p>OAuth, HMAC webhooks, rate limiting, security headers. Enterprise-ready.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Terminal size={20} /></div>
              <h3>API-First</h3>
              <p>Everything available through APIs. Automate and integrate with anything.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to get started?</h2>
            <p>Free. Open source. Self-hosted. Connect your first tool in minutes.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noreferrer" className="btn btn-primary">
                Get Started Free
              </a>
              <Link to="/pricing" className="btn btn-secondary">
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
