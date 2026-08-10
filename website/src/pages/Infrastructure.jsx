import { Link } from 'react-router-dom';
import { Shield, Server, Cloud, GitBranch, Layers, Zap, CheckCircle, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';

const engines = [
  {
    name: 'OpenTofu',
    badge: 'Preferred',
    badgeColor: '#22c55e',
    description: 'The open-source IaC engine. Full support for plan, apply, destroy, state management, drift detection, and workspace operations.',
    features: ['Plan & Apply', 'State Management', 'Drift Detection', 'Module Registry', 'Workspace Management', 'Plan Approval'],
    icon: <Shield size={24} />,
  },
  {
    name: 'Terraform',
    badge: 'Full Support',
    badgeColor: '#7b61ff',
    description: 'Complete Terraform support including Terraform Cloud and Enterprise integration. Drop-in replacement for Terraform Cloud workflows.',
    features: ['Plan & Apply', 'Remote State', 'Terraform Cloud', 'Module Registry', 'Cost Estimation', 'Migration to OpenTofu'],
    icon: <Layers size={24} />,
  },
  {
    name: 'Pulumi',
    badge: 'Supported',
    badgeColor: '#f59e0b',
    description: 'Define infrastructure with TypeScript, Python, Go, C#, or Java. Full preview, update, and destroy support with state management.',
    features: ['TypeScript', 'Python', 'Go', 'C# / .NET', 'Java', 'Pulumi Cloud & Self-Managed Backends'],
    icon: <GitBranch size={24} />,
  },
  {
    name: 'CloudFormation',
    badge: 'AWS Native',
    badgeColor: '#f97316',
    description: 'AWS-native infrastructure management. Stack sets, change sets, drift detection, and nested stack support.',
    features: ['Stack Management', 'Change Sets', 'Stack Sets', 'Drift Detection', 'Nested Stacks', 'Resource Tracking'],
    icon: <Cloud size={24} />,
  },
  {
    name: 'Crossplane',
    badge: 'K8s Native',
    badgeColor: '#38bdf8',
    description: 'Kubernetes-native infrastructure management. Manage cloud resources as Kubernetes custom resources.',
    features: ['Compositions', 'Claims', 'Provider Config', 'Functions', 'Package Management', 'Drift Detection'],
    icon: <Server size={24} />,
  },
];

const capabilities = [
  {
    title: 'Unified Infrastructure View',
    description: 'See all your infrastructure across OpenTofu, Terraform, Pulumi, and CloudFormation in one dashboard.',
    icon: <Layers size={20} />,
  },
  {
    title: 'Cross-Engine Drift Detection',
    description: 'Detect configuration drift across all IaC engines on a schedule or on-demand.',
    icon: <Shield size={20} />,
  },
  {
    title: 'Plan Approval Workflows',
    description: 'Require approval before applying infrastructure changes. Policy gates for production environments.',
    icon: <CheckCircle size={20} />,
  },
  {
    title: 'Correlated Change Tracking',
    description: 'See how infrastructure changes relate to CI/CD deployments and configuration updates.',
    icon: <GitBranch size={20} />,
  },
  {
    title: 'State Management',
    description: 'Track state across all engines. Local, remote, and cloud backends supported.',
    icon: <Server size={20} />,
  },
  {
    title: 'Multi-Engine Orchestration',
    description: 'Run OpenTofu + Ansible in a single workflow. Provision infrastructure, then configure it.',
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
              OpsSentinel integrates with OpenTofu, Terraform, Pulumi, CloudFormation, and Crossplane.
              Manage all your infrastructure from a single control plane with unified drift detection,
              plan approval workflows, and cross-engine correlation.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Supported Engines</h2>
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
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Cross-Engine Capabilities</h2>
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
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '32px' }}>Multi-Engine Architecture</h2>
            <pre className="architecture-pre">{`
                    OpsSentinel Control Plane
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
   OpenTofu           Terraform           Pulumi
   (12 projects)      (8 projects)        (3 projects)
        |                  |                  |
        +------------------+------------------+
                           |
                  Unified State View
                  Cross-Engine Drift
                  Correlated Changes
            `}</pre>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to unify your infrastructure?</h2>
            <p>Connect your first IaC project in minutes. OpenTofu, Terraform, Pulumi, CloudFormation, or Crossplane.</p>
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
