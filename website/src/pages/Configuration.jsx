import { Link } from 'react-router-dom';
import { Terminal, Shield, Settings, Server, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

const tools = [
  {
    name: 'Ansible',
    badge: 'Agentless',
    badgeColor: '#22c55e',
    description: 'Agentless automation over SSH/WinRM. Run playbooks, manage inventory, and configure servers without installing agents.',
    features: ['Playbook Execution', 'Inventory Management', 'Role Management', 'Vault Integration', 'Ad-Hoc Commands', 'Host-Level Results'],
    icon: <Terminal size={24} />,
  },
  {
    name: 'Chef',
    badge: 'Agent-Based',
    badgeColor: '#f59e0b',
    description: 'Infrastructure automation with Ruby recipes and cookbooks. Continuous convergence and compliance enforcement.',
    features: ['Cookbook Management', 'Recipe Execution', 'Node Convergence', 'InSpec Compliance', 'Policy Groups', 'Chef Automate'],
    icon: <Settings size={24} />,
  },
  {
    name: 'Puppet',
    badge: 'Agent-Based',
    badgeColor: '#7b61ff',
    description: 'Enterprise configuration management with declarative manifests. Enforce desired state across thousands of nodes.',
    features: ['Manifest Management', 'Module System', 'Hiera Data', 'PuppetDB', 'Compliance Reporting', 'Bolt Tasks'],
    icon: <Shield size={24} />,
  },
  {
    name: 'SaltStack',
    badge: 'Event-Driven',
    badgeColor: '#38bdf8',
    description: 'Event-driven automation with high performance. Remote execution, state management, and reactive automation.',
    features: ['State Management', 'Remote Execution', 'Pillar Data', 'Reactor System', 'Beacon Monitoring', 'Orchestration'],
    icon: <Server size={24} />,
  },
];

const capabilities = [
  {
    title: 'Unified Configuration View',
    description: 'See all your configuration management across Ansible, Chef, Puppet, and SaltStack in one dashboard.',
    icon: <Settings size={20} />,
  },
  {
    title: 'Configuration Drift Detection',
    description: 'Detect when servers drift from their desired configuration state across all tools.',
    icon: <Shield size={20} />,
  },
  {
    title: 'Execution Monitoring',
    description: 'Track playbook runs, Chef client runs, Puppet agent runs, and Salt state applications in real-time.',
    icon: <Terminal size={20} />,
  },
  {
    title: 'Host-Level Results',
    description: 'See per-host results for every configuration run. Know exactly which servers succeeded or failed.',
    icon: <Server size={20} />,
  },
  {
    title: 'Approval Workflows',
    description: 'Require approval before running configuration changes in production environments.',
    icon: <CheckCircle size={20} />,
  },
  {
    title: 'Cross-Tool Correlation',
    description: 'Correlate configuration changes with infrastructure changes and CI/CD deployments.',
    icon: <Zap size={20} />,
  },
];

export default function Configuration() {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Configuration Management</span>
            <h1 className="section-title">Configure Servers. Enforce Compliance.</h1>
            <p className="section-subtitle">
              OpsSentinel integrates with Ansible, Chef, Puppet, and SaltStack.
              Manage server configuration, enforce compliance, and detect drift
              from a single operational control plane.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Supported Tools</h2>
          <div className="engines-grid">
            {tools.map((tool) => (
              <div key={tool.name} className="engine-card">
                <div className="engine-header">
                  <div className="engine-icon">{tool.icon}</div>
                  <div>
                    <h3 className="engine-name">{tool.name}</h3>
                    <span className="engine-badge" style={{ backgroundColor: tool.badgeColor + '20', color: tool.badgeColor, borderColor: tool.badgeColor + '40' }}>
                      {tool.badge}
                    </span>
                  </div>
                </div>
                <p className="engine-description">{tool.description}</p>
                <div className="engine-features">
                  {tool.features.map((feature) => (
                    <span key={feature} className="engine-feature-tag">
                      <CheckCircle size={12} />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Cross-Tool Capabilities</h2>
          <div className="features-grid">
            {capabilities.map((cap) => (
              <div key={cap.title} className="card feature-card">
                <div className="card-icon">{cap.icon}</div>
                <h3>{cap.title}</h3>
                <p>{cap.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="problem-grid">
            <div className="problem-card">
              <h3>Without OpsSentinel</h3>
              <ul className="feature-list">
                <li>Ansible logs in one place, Chef in another</li>
                <li>No visibility into configuration drift</li>
                <li>Manual correlation of config changes to incidents</li>
                <li>No unified approval workflow</li>
                <li>Configuration and infrastructure are disconnected</li>
              </ul>
            </div>
            <div className="problem-card" style={{ borderColor: 'var(--accent)' }}>
              <h3>With OpsSentinel</h3>
              <ul className="feature-list">
                <li>Unified view across all config tools</li>
                <li>Automatic drift detection and alerts</li>
                <li>Config changes correlated with deployments</li>
                <li>Single approval workflow for all changes</li>
                <li>Infrastructure + Config + CI/CD connected</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to unify your configuration management?</h2>
            <p>Connect Ansible, Chef, Puppet, or SaltStack in minutes. See all your server configuration in one place.</p>
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
