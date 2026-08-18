import { Link } from 'react-router-dom';
import { Shield, Server, Cloud, GitBranch, Layers, Zap, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

const engines = [
  {
    name: 'OpenTofu',
    badge: 'Roadmap',
    badgeColor: '#22c55e',
    description: 'A planned integration for teams that want an open-source IaC engine connected to the OpsSentinel control plane.',
    features: ['Plan & Apply', 'State Management', 'Drift Detection', 'Module Registry', 'Workspace Management', 'Plan Approval'],
    icon: <Shield size={24} />,
  },
  {
    name: 'Terraform',
    badge: 'Roadmap',
    badgeColor: '#7b61ff',
    description: 'A planned integration for Terraform workflows, with future support shaped by community demand and implementation scope.',
    features: ['Plan & Apply', 'Remote State', 'Terraform Cloud', 'Module Registry', 'Cost Estimation', 'Migration to OpenTofu'],
    icon: <Layers size={24} />,
  },
  {
    name: 'Pulumi',
    badge: 'Roadmap',
    badgeColor: '#f59e0b',
    description: 'A planned integration for teams that define infrastructure with general-purpose programming languages.',
    features: ['TypeScript', 'Python', 'Go', 'C# / .NET', 'Java', 'Pulumi Cloud & Self-Managed Backends'],
    icon: <GitBranch size={24} />,
  },
  {
    name: 'CloudFormation',
    badge: 'Roadmap',
    badgeColor: '#f97316',
    description: 'A planned integration for AWS-native infrastructure workflows.',
    features: ['Stack Management', 'Change Sets', 'Stack Sets', 'Drift Detection', 'Nested Stacks', 'Resource Tracking'],
    icon: <Cloud size={24} />,
  },
  {
    name: 'Crossplane',
    badge: 'Roadmap',
    badgeColor: '#38bdf8',
    description: 'A planned integration for Kubernetes-native infrastructure workflows.',
    features: ['Compositions', 'Claims', 'Provider Config', 'Functions', 'Package Management', 'Drift Detection'],
    icon: <Server size={24} />,
  },
];

const capabilities = [
  {
    title: 'Future Unified Infrastructure View',
    description: 'The roadmap envisions a single view for infrastructure state alongside GitHub workflow events and deployments.',
    icon: <Layers size={20} />,
  },
  {
    title: 'Cross-Engine Drift Detection',
    description: 'Cross-engine drift detection is a future capability, not part of the current GitHub-native release.',
    icon: <Shield size={20} />,
  },
  {
    title: 'Plan Approval Workflows',
    description: 'Approval workflows for infrastructure changes are planned for a future control-plane release.',
    icon: <CheckCircle size={20} />,
  },
  {
    title: 'Correlated Change Tracking',
    description: 'Broader change correlation is planned as infrastructure and configuration connectors become available.',
    icon: <GitBranch size={20} />,
  },
  {
    title: 'State Management',
    description: 'State management across IaC engines is a roadmap area; the current release stores GitHub workflow events.',
    icon: <Server size={20} />,
  },
  {
    title: 'Multi-Engine Orchestration',
    description: 'Cross-domain orchestration is part of the longer-term GitOps vision and is not presented as shipped today.',
    icon: <Zap size={20} />,
  },
];

export default function Infrastructure() {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Infrastructure Automation</span>
            <h1 className="section-title">One Platform. Every IaC Engine.</h1>
            <p className="section-subtitle">
              The current release focuses on GitHub Actions observability. OpenTofu, Terraform, Pulumi, CloudFormation,
              and Crossplane connectors are roadmap areas for a future infrastructure control plane.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Planned Engine Integrations</h2>
          <div className="engines-grid">
            {engines.map((engine) => (
              <div key={engine.name} className="engine-card">
                <div className="engine-header">
                  <div className="engine-icon">{engine.icon}</div>
                  <div>
                    <h3 className="engine-name">{engine.name}</h3>
                    <span className="engine-badge" style={{ backgroundColor: engine.badgeColor + '20', color: engine.badgeColor, borderColor: engine.badgeColor + '40' }}>
                      {engine.badge}
                    </span>
                  </div>
                </div>
                <p className="engine-description">{engine.description}</p>
                <div className="engine-features">
                  {engine.features.map((feature) => (
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
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Roadmap Capabilities</h2>
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
          <div className="architecture-diagram">
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '32px' }}>Illustrative Future Architecture</h2>
            <div className="architecture-svg">
              <svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
                <rect x="200" y="20" width="300" height="50" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="2"/>
                <text x="350" y="52" text-anchor="middle" fill="#ffffff" fontSize="16" fontWeight="600">OpsSentinel Control Plane</text>

                <line x1="350" y1="70" x2="350" y2="100" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="75" y="100" width="130" height="55" rx="8" fill="#161616" stroke="#262626"/>
                <text x="140" y="132" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">OpenTofu</text>
                <text x="140" y="152" text-anchor="middle" fill="#a3a3a3" fontSize="11">planned connector</text>

                <rect x="285" y="100" width="130" height="55" rx="8" fill="#161616" stroke="#262626"/>
                <text x="350" y="132" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Terraform</text>
                <text x="350" y="152" text-anchor="middle" fill="#a3a3a3" fontSize="11">planned connector</text>

                <rect x="500" y="100" width="130" height="55" rx="8" fill="#161616" stroke="#262626"/>
                <text x="565" y="132" text-anchor="middle" fill="#ffffff" fontSize="14" fontWeight="600">Pulumi</text>
                <text x="565" y="152" text-anchor="middle" fill="#a3a3a3" fontSize="11">planned connector</text>

                <line x1="140" y1="155" x2="285" y2="155" stroke="#38bdf8" strokeWidth="2"/>
                <line x1="415" y1="155" x2="540" y2="155" stroke="#38bdf8" strokeWidth="2"/>

                <line x1="350" y1="155" x2="350" y2="190" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,4"/>

                <rect x="200" y="190" width="300" height="70" rx="8" fill="#161616" stroke="#38bdf8" strokeWidth="1"/>
                <text x="350" y="215" text-anchor="middle" fill="#38bdf8" fontSize="13" fontWeight="600">Unified State View</text>
                <text x="350" y="235" text-anchor="middle" fill="#a3a3a3" fontSize="11">Cross-Engine Drift Detection</text>
                <text x="350" y="252" text-anchor="middle" fill="#a3a3a3" fontSize="11">Correlated Change Tracking</text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Help Shape the Infrastructure Roadmap</h2>
            <p>Follow the project, review the current release, and help prioritize future infrastructure integrations.</p>
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
