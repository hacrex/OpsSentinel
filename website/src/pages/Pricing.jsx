import { Link } from 'react-router-dom';
import { CheckCircle, Shield, Server, Lock, Github } from 'lucide-react';
import Layout from '../components/Layout';

const plans = [
  {
    name: 'Self-Hosted',
    price: '$0',
    period: 'forever',
    badge: 'Open Source',
    badgeColor: '#22c55e',
    description: 'Full control. Your data. Your infrastructure. No hosted signup or subscription required.',
    features: [
      'GitHub Actions workflow observability',
      'Real-time dashboard updates',
      'AI-assisted failure analysis with your provider',
      'Failure pattern and flaky-workflow detection',
      'Workflow triage with repository context',
      'MTTR tracking and event history',
      'One-click GitHub workflow re-runs',
      'GitHub OAuth and verified webhooks',
      'Roles, permissions, and audit logging',
      'Docker Compose deployment',
      'SQLite for development and PostgreSQL for production',
      'Self-hosted data control',
    ],
    cta: 'Get Started Free',
    ctaLink: 'https://github.com/hacrex/OpsSentinel',
    ctaExternal: true,
  },
  {
    name: 'Cloud',
    price: '$49',
    period: '/month',
    badge: 'Roadmap',
    badgeColor: '#f59e0b',
    description: 'A future managed offering for teams that want hosted infrastructure and operational support.',
    features: [
      'Everything in Self-Hosted',
      'Managed infrastructure',
      'Automatic updates and backups',
      'Priority support',
      'Hosted team administration',
      'Additional integrations',
      'Availability and compliance options to be announced',
    ],
    cta: 'Follow Development',
    ctaLink: 'https://github.com/hacrex/OpsSentinel/issues',
    ctaExternal: true,
  },
];

const faq = [
  {
    q: 'Is OpsSentinel really free?',
    a: 'Yes. OpsSentinel is MIT licensed and free to self-host. No hosted signup or subscription is required. A managed offering remains on the roadmap.',
  },
  {
    q: 'What do I need to run OpsSentinel?',
    a: 'Docker and Docker Compose. Three containers: PostgreSQL, Backend, Frontend. Runs on any Linux, Mac, or Windows machine with Docker installed.',
  },
  {
    q: 'Does my data leave my server?',
    a: 'The current release is fully self-hosted. Your workflow data stays on your infrastructure. GitHub is used for OAuth, repository access, and webhook events; an LLM provider is only contacted when you configure AI analysis.',
  },
  {
    q: 'Which IaC tools are supported?',
    a: 'The current release focuses on GitHub Actions observability. IaC and configuration-management integrations are roadmap areas for future releases.',
  },
  {
    q: 'Can I use GitHub Enterprise?',
    a: 'Yes. OpsSentinel works with GitHub.com and GitHub Enterprise (cloud and self-hosted). Webhook and OAuth configuration follows the same process.',
  },
  {
    q: 'How does AI failure analysis work?',
    a: 'OpsSentinel fetches failed job logs, extracts error patterns, and sends them to an LLM (GPT-4o-mini or Claude 3 Haiku). It returns a category, likely root cause, suggested fix, and confidence score. You bring your own API key.',
  },
  {
    q: 'Can I contribute?',
    a: 'Absolutely. OpsSentinel is open source and community-driven. Check the Contributing Guide in the docs or open a PR on GitHub.',
  },
];

export default function Pricing() {
  return (
    <Layout>
      <section className="section" style={{ paddingTop: '120px' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">Pricing</span>
            <h1 className="section-title">Free to Self-Host. No Catch.</h1>
              <p className="section-subtitle">
              OpsSentinel is open source. Deploy the current GitHub-native observability release yourself with Docker Compose.
              No hosted signup is required.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.name} className={`pricing-card ${plan.disabled ? 'pricing-card-disabled' : ''}`}>
                <span className="pricing-badge" style={{ backgroundColor: plan.badgeColor + '20', color: plan.badgeColor }}>
                  {plan.badge}
                </span>
                <h3 className="pricing-name">{plan.name}</h3>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  <span className="pricing-period">{plan.period}</span>
                </div>
                <p className="pricing-description">{plan.description}</p>
                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckCircle size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.ctaExternal ? (
                  <a
                    href={plan.ctaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Github size={16} />
                    {plan.cta}
                  </a>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center', opacity: plan.disabled ? 0.5 : 1, cursor: plan.disabled ? 'not-allowed' : 'pointer' }}
                    disabled={plan.disabled}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pricing-trust">
            <div className="pricing-trust-item">
              <Shield size={20} />
              <h4>Open Source</h4>
              <p>MIT licensed. Full source code on GitHub. Audit it, fork it, ship it.</p>
            </div>
            <div className="pricing-trust-item">
              <Server size={20} />
              <h4>Your Data, Your Rules</h4>
              <p>Self-hosted. Data stays on your servers. No external dependencies you don't choose.</p>
            </div>
            <div className="pricing-trust-item">
              <Lock size={20} />
              <h4>No Lock-in</h4>
              <p>Export your data anytime. Standard PostgreSQL. No proprietary formats. Leave whenever you want.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '48px' }}>Frequently Asked Questions</h2>
          <div className="faq-grid">
            {faq.map((item) => (
              <div key={item.q} className="faq-item">
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section cta">
        <div className="container">
          <div className="cta-content">
            <h2>Deploy the Current Release With Confidence.</h2>
            <p>Open source. Self-hosted. Connect GitHub and start investigating workflow failures.</p>
            <div className="hero-actions">
              <a href="https://github.com/hacrex/OpsSentinel" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Github size={16} />
                View on GitHub
              </a>
              <Link to="/features" className="btn btn-secondary">
                See Features
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
