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
    title: 'Know Why Builds Fail — Before You Start Digging',
    description: 'Go beyond "build failed." OpsSentinel fingerprints failures, clusters recurring issues, and uses AI to surface the root cause with a suggested fix.',
    features: [
      { icon: <BarChart3 size={18} />, name: 'Real-Time Dashboard', desc: 'WebSocket-powered live updates across all repositories and workflows. No refresh needed.' },
      { icon: <Brain size={18} />, name: 'AI Root Cause Analysis', desc: 'LLM-powered log analysis via GPT-4o-mini or Claude 3 Haiku. Returns category, likely cause, suggested fix, and confidence score.' },
      { icon: <FileCode size={18} />, name: 'Failure Fingerprinting', desc: 'Group similar failures across repos. Track patterns over time. Instantly identify known issues vs. new regressions.' },
      { icon: <AlertTriangle size={18} />, name: 'Flaky Test Detection', desc: 'Identify workflows with high failure rates. Track flakiness patterns over time. Get recommendations to stabilize.' },
      { icon: <Workflow size={18} />, name: 'Auto-Triage', desc: 'Parse CODEOWNERS, match changed files, and assign failure owners with confidence scores — automatically.' },
      { icon: <Target size={18} />, name: 'Pipeline Health Score', desc: 'Composite score from success rate, MTTR, flakiness, and duration. One number to gauge pipeline health.' },
    ],
  },
  {
    label: 'Infrastructure Automation',
    title: 'Every IaC Engine. One Control Plane.',
    description: 'OpenTofu, Terraform, Pulumi, CloudFormation, Crossplane — managed from OpsSentinel with unified drift detection, plan approval, and cross-engine correlation.',
    features: [
      { icon: <Layers size={18} />, name: 'Multi-Engine Support', desc: 'Five IaC engines in one dashboard: OpenTofu, Terraform, Pulumi, CloudFormation, and Crossplane.' },
      { icon: <Eye size={18} />, name: 'Drift Detection', desc: 'Scheduled and on-demand drift detection across all IaC engines. Catch unauthorized changes before they cascade.' },
      { icon: <Lock size={18} />, name: 'Plan Approval', desc: 'Require approval before applying infrastructure changes. Enforce policy gates for production environments.' },
      { icon: <GitBranch size={18} />, name: 'State Management', desc: 'Track state across all engines. Supports local, remote, and cloud backends without lock-in.' },
      { icon: <Zap size={18} />, name: 'Multi-Engine Orchestration', desc: 'Run OpenTofu + Ansible in a single workflow. Provision infrastructure, then configure it — atomically.' },
      { icon: <Shield size={18} />, name: 'Change Correlation', desc: 'See how infrastructure changes relate to CI/CD deployments and configuration updates in one timeline.' },
    ],
  },
  {
    label: 'Configuration Management',
    title: 'Configure Servers. Enforce Compliance. Detect Drift.',
    description: 'Ansible, Chef, Puppet, SaltStack — run playbooks, enforce desired state, and catch configuration drift across your entire fleet.',
    features: [
      { icon: <Terminal size={18} />, name: 'Ansible Integration', desc: 'Playbook execution, inventory management, Vault integration, and host-level results in one view.' },
      { icon: <Settings size={18} />, name: 'Chef Integration', desc: 'Cookbook management, recipe execution, InSpec compliance checks, and node convergence tracking.' },
      { icon: <Shield size={18} />, name: 'Puppet Integration', desc: 'Manifest management, Hiera data lookups, PuppetDB queries, and compliance reporting.' },
      { icon: <Server size={18} />, name: 'SaltStack Integration', desc: 'State management, remote execution, reactor system, and beacon monitoring — all unified.' },
      { icon: <Eye size={18} />, name: 'Configuration Drift', desc: 'Detect when servers drift from desired state. Get alerted before drift becomes an outage.' },
      { icon: <CheckCircle size={18} />, name: 'Approval Workflows', desc: 'Require approval before running configuration changes in production. Full audit trail.' },
    ],
  },
  {
    label: 'Incident Management',
    title: 'From Failure to Resolution — Automated.',
    description: 'Auto-create incidents from repeated failures. Track severity, timeline, and resolution. Integrate directly with GitHub Issues.',
    features: [
      { icon: <AlertTriangle size={18} />, name: 'Auto-Incident Creation', desc: 'Same failure 3+ times? Production failure? Multi-repo impact? OpsSentinel opens the incident for you.' },
      { icon: <Activity size={18} />, name: 'Incident Timeline', desc: 'Track every event from creation to resolution — comments, status changes, assignments, and actions.' },
      { icon: <GitBranch size={18} />, name: 'GitHub Issues Integration', desc: 'Create Issues from incidents. Auto-close when resolved. Keep your team in the tools they already use.' },
      { icon: <Target size={18} />, name: 'MTTR Tracking', desc: 'Mean Time To Recovery per incident, per repo, per team. Identify bottlenecks in your response.' },
      { icon: <Zap size={18} />, name: 'Recovery Actions', desc: 'Rerun a workflow, execute a playbook, trigger a rollback — all from the incident view. One click.' },
      { icon: <Lock size={18} />, name: 'Severity Classification', desc: 'Critical, High, Medium, Low — auto-classified based on blast radius and impact.' },
    ],
  },
  {
    label: 'Deployment Intelligence',
    title: 'Track Every Deployment. Measure What Matters.',
    description: 'Record deployments, correlate with infrastructure changes, and calculate DORA metrics — all automatically.',
    features: [
      { icon: <GitBranch size={18} />, name: 'Deployment Tracking', desc: 'Track the full chain: commit → workflow → build → deploy → health check. One timeline.' },
      { icon: <Target size={18} />, name: 'DORA Metrics', desc: 'Deployment frequency, lead time, change failure rate, MTTR. Industry benchmarks to measure your team.' },
      { icon: <BarChart3 size={18} />, name: 'Deployment Frequency', desc: 'Per repo, per environment, per team. Spot trends and identify bottlenecks in your release cadence.' },
      { icon: <Workflow size={18} />, name: 'Infrastructure Correlation', desc: 'See which infrastructure changes preceded a deployment — and whether they caused issues.' },
      { icon: <Eye size={18} />, name: 'Health Checks', desc: 'Track post-deployment health status. Know immediately if a deploy succeeded or needs attention.' },
      { icon: <Bell size={18} />, name: 'Rollback Tracking', desc: 'Track rollbacks and their reasons. Build a knowledge base of what went wrong and how it was fixed.' },
    ],
  },
  {
    label: 'Security & Governance',
    title: 'Enterprise-Grade Control. Open-Source Freedom.',
    description: 'RBAC, audit logging, policy engine, SSO — everything you need for compliance and governance, without the enterprise price tag.',
    features: [
      { icon: <Shield size={18} />, name: 'RBAC', desc: 'Viewer, Developer, Operator, Admin, Owner roles. Resource-level permissions for fine-grained access.' },
      { icon: <Lock size={18} />, name: 'Policy Engine', desc: 'Require approvals, enforce gates, audit all actions. OPA/Rego support for custom policies.' },
      { icon: <FileCode size={18} />, name: 'Audit Logging', desc: 'Track every action: login, workflow run, infrastructure change, incident creation. Full accountability.' },
      { icon: <Shield size={18} />, name: 'SSO/SAML', desc: 'Okta, Google Workspace, enterprise identity providers. One login for your entire team.' },
      { icon: <Lock size={18} />, name: 'Webhook Security', desc: 'HMAC SHA256 verification, replay protection, rate limiting. Your integrations are locked down.' },
      { icon: <Server size={18} />, name: 'Multi-Tenancy', desc: 'Isolated tenants with separate users, repos, environments, and secrets. Perfect for teams and orgs.' },
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
            <h1 className="section-title">Everything You Need to Own Your Operations</h1>
            <p className="section-subtitle">
              CI/CD intelligence, infrastructure automation, configuration management,
              incident response, and deployment tracking — unified in one platform.
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
              <p>Docker Compose deployment. Your data stays on your servers. No SaaS dependency, ever.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Shield size={20} /></div>
              <h3>MIT Licensed</h3>
              <p>Fully open source. Read the code. Fork it. Contribute. No black boxes.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Layers size={20} /></div>
              <h3>Multi-Database</h3>
              <p>SQLite for development. PostgreSQL for production. Seamless migration between the two.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Zap size={20} /></div>
              <h3>Real-Time</h3>
              <p>WebSocket-powered live updates. No polling. Instant visibility into every pipeline.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Lock size={20} /></div>
              <h3>Secure by Default</h3>
              <p>OAuth, HMAC webhooks, rate limiting, security headers. Enterprise-ready out of the box.</p>
            </div>
            <div className="card feature-card">
              <div className="card-icon"><Terminal size={20} /></div>
              <h3>API-First</h3>
              <p>Everything available through APIs. Automate, integrate, and extend without limits.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>See It in Action</h2>
            <p>Deploy in minutes. Connect your first tool in under an hour.</p>
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
