import { Link } from 'react-router-dom';
import { Terminal, Shield, Settings, Server, Zap, CheckCircle, FileCode, Workflow, Monitor } from 'lucide-react';
import Layout from '../components/Layout';

const tools = [
  {
    name: 'Ansible',
    badge: 'Roadmap',
    badgeColor: '#22c55e',
    description: 'A planned integration for agentless configuration workflows and playbook execution.',
    features: ['Playbook Execution', 'Inventory Management', 'Role Management', 'Vault Integration', 'Ad-Hoc Commands', 'Host-Level Results'],
    icon: <Terminal size={24} />,
  },
  {
    name: 'Chef',
    badge: 'Roadmap',
    badgeColor: '#f59e0b',
    description: 'A planned integration for cookbook-driven configuration and compliance workflows.',
    features: ['Cookbook Management', 'Recipe Execution', 'Node Convergence', 'InSpec Compliance', 'Policy Groups', 'Chef Automate'],
    icon: <Settings size={24} />,
  },
  {
    name: 'Puppet',
    badge: 'Roadmap',
    badgeColor: '#7b61ff',
    description: 'A planned integration for declarative configuration and desired-state management.',
    features: ['Manifest Management', 'Module System', 'Hiera Data', 'PuppetDB', 'Compliance Reporting', 'Bolt Tasks'],
    icon: <Shield size={24} />,
  },
  {
    name: 'SaltStack',
    badge: 'Roadmap',
    badgeColor: '#38bdf8',
    description: 'A planned integration for event-driven configuration and remote execution workflows.',
    features: ['State Management', 'Remote Execution', 'Pillar Data', 'Reactor System', 'Beacon Monitoring', 'Orchestration'],
    icon: <Server size={24} />,
  },
  {
    name: 'InSpec',
    badge: 'Roadmap',
    badgeColor: '#ef4444',
    description: 'A planned integration for compliance-as-code testing and audit workflows.',
    features: ['Profile Testing', 'Compliance Specs', 'Custom Resources', 'Chef Habitat', 'Audit Mode', 'Reporting'],
    icon: <FileCode size={24} />,
  },
  {
    name: 'PowerShell DSC',
    badge: 'Roadmap',
    badgeColor: '#0284c7',
    description: 'A planned integration for Windows and .NET configuration management at scale.',
    features: ['Desired State', 'Pull Server', 'Config Data', 'Resource Kits', 'Azure Auto-Import', 'Local Config Manager'],
    icon: <Terminal size={24} />,
  },
  {
    name: 'StackStorm',
    badge: 'Roadmap',
    badgeColor: '#f59e0b',
    description: 'A planned integration for event-driven automation and complex workflow orchestration.',
    features: ['Event Triggers', 'Action Chains', 'Workflows', 'Sensors', 'Rules Engine', 'Integrations Pack'],
    icon: <Zap size={24} />,
  },
  {
    name: 'Rudder',
    badge: 'Roadmap',
    badgeColor: '#16a34a',
    description: 'A planned integration for continuous configuration and compliance management across hybrid fleets.',
    features: ['Directives', 'Techniques', 'Compliance Reports', 'Dynamic Groups', 'Inventory', 'Change Validation'],
    icon: <Monitor size={24} />,
  },
];

const capabilities = [
  {
    title: 'Unified Configuration View',
    description: 'The roadmap envisions a unified configuration view alongside GitHub workflow events and deployment context.',
    icon: <Settings size={20} />,
  },
  {
    title: 'Configuration Drift Detection',
    description: 'Configuration drift detection is planned for a future release and is not part of the current GitHub-native product.',
    icon: <Shield size={20} />,
  },
  {
    title: 'Execution Monitoring',
    description: 'Real-time monitoring for configuration runs is a future capability that will build on the current event model.',
    icon: <Terminal size={20} />,
  },
  {
    title: 'Host-Level Results',
    description: 'Host-level results are planned for future configuration-management connectors.',
    icon: <Server size={20} />,
  },
  {
    title: 'Approval Workflows',
    description: 'Approval workflows for configuration changes are part of the longer-term operations roadmap.',
    icon: <CheckCircle size={20} />,
  },
  {
    title: 'Cross-Tool Correlation',
    description: 'Cross-tool correlation is planned as additional operations integrations become available.',
    icon: <Zap size={20} />,
  },
  {
    title: 'Compliance-as-Code Reporting',
    description: 'InSpec and Rudder compliance scanning integrated with CI/CD pipelines for automated audit trails.',
    icon: <FileCode size={20} />,
  },
  {
    title: 'Event-Driven Automation',
    description: 'StackStorm-style event triggers and rules engine for reactive configuration workflows.',
    icon: <Workflow size={20} />,
  },
  {
    title: 'Windows Configuration Management',
    description: 'PowerShell DSC integration for managing Windows and .NET environments alongside Linux infrastructure.',
    icon: <Monitor size={20} />,
  },
];

export default function Configuration() {
  return (
    <Layout>
      <section className="section page-hero">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Configuration Management</span>
            <h1 className="section-title">Configure Servers. Enforce Compliance.</h1>
            <p className="section-subtitle">
              The current release focuses on GitHub Actions observability. Ansible, Chef, Puppet, SaltStack,
              InSpec, PowerShell DSC, StackStorm, and Rudder integrations are roadmap areas for a future configuration-management layer.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Planned Tool Integrations</h2>
          </div>
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
          <div className="section-header">
            <h2 className="section-title">Roadmap Capabilities</h2>
          </div>
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
                <li>Ansible logs in one tool, Chef in another, Puppet elsewhere</li>
                <li>No visibility into configuration drift across your fleet</li>
                <li>Manual correlation of config changes to production incidents</li>
                <li>No unified approval workflow — each tool has its own process</li>
                <li>Windows DSC and Linux config tools exist in separate silos</li>
                <li>Compliance reporting scattered across InSpec, Rudder, and Chef</li>
              </ul>
            </div>
            <div className="problem-card problem-card--good">
              <h3>With OpsSentinel</h3>
              <ul className="feature-list">
                <li>A unified view across all configuration tools and GitHub workflows</li>
                <li>Drift detection with actionable alerts across hybrid environments</li>
                <li>Configuration changes correlated with deployments and incidents</li>
                <li>Approval workflows with a consistent audit trail</li>
                <li>Compliance-as-code scanning integrated into CI/CD pipelines</li>
                <li>Event-driven automation reacting to infrastructure and config changes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Help Shape Configuration Support</h2>
            <p>Follow the project and help prioritize the configuration-management integrations on the roadmap.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
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
