import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Book, Settings, Shield, Rocket, ExternalLink, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/Layout';

const GITHUB_RAW = 'https://raw.githubusercontent.com/hacrex/OpsSentinel/main';

const docs = [
  { id: 'documentation', title: 'Full Documentation', icon: Book, file: 'Documentation.md' },
  { id: 'contributing', title: 'Contributing Guide', icon: Settings, file: 'CONTRIBUTING.md' },
  { id: 'deployment', title: 'Deployment Guide', icon: Rocket, file: 'DEPLOYMENT.md' },
  { id: 'docker', title: 'Docker Guide', icon: Shield, file: 'DOCKER_GUIDE.md' },
];

export default function Docs() {
  const [activeDoc, setActiveDoc] = useState('documentation');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const doc = docs.find(d => d.id === activeDoc);
    if (!doc) return;

    setLoading(true);
    setError(null);

    fetch(`${GITHUB_RAW}/${doc.file}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch document');
        return res.text();
      })
      .then(text => {
        setContent(text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeDoc]);

  return (
    <Layout>
      <div className="doc-layout">
        {/* Sidebar */}
        <aside className="doc-sidebar">
          <nav className="doc-nav">
            <h4>Documentation</h4>
            {docs.map(doc => (
              <button
                key={doc.id}
                className={`doc-nav-item ${activeDoc === doc.id ? 'active' : ''}`}
                onClick={() => setActiveDoc(doc.id)}
              >
                <doc.icon size={18} />
                {doc.title}
              </button>
            ))}
            <h4 style={{ marginTop: '24px' }}>Quick Links</h4>
            <a
              href="https://github.com/hacrex/OpsSentinel"
              target="_blank"
              rel="noreferrer"
              className="doc-nav-item"
            >
              <ExternalLink size={18} />
              GitHub Repository
            </a>
            <a
              href="https://github.com/hacrex/OpsSentinel/issues"
              target="_blank"
              rel="noreferrer"
              className="doc-nav-item"
            >
              <ExternalLink size={18} />
              Report Issue
            </a>
          </nav>
        </aside>

        {/* Content */}
        <main className="doc-content">
          {loading ? (
            <div className="loading">
              <div className="loading-spinner" />
              <span style={{ marginLeft: '12px' }}>Loading documentation...</span>
            </div>
          ) : error ? (
            <div className="loading" style={{ color: 'var(--error)' }}>
              <p>Failed to load documentation. Please try again later.</p>
              <button
                className="btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => setActiveDoc(activeDoc)}
              >
                Retry
              </button>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          )}
        </main>
      </div>
    </Layout>
  );
}
