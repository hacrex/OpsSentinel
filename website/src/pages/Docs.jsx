import { useState, useEffect } from 'react';
import { Book, Settings, Shield, Rocket, ExternalLink } from 'lucide-react';
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const doc = docs.find(d => d.id === activeDoc);
    if (!doc) return undefined;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${GITHUB_RAW}/${doc.file}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
        return res.text();
      })
      .then(text => {
        setContent(text);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeDoc, retryCount]);

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
                aria-pressed={activeDoc === doc.id}
              >
                <doc.icon size={18} />
                {doc.title}
              </button>
            ))}
            <h4 style={{ marginTop: '24px' }}>Quick Links</h4>
            <a
              href="https://github.com/hacrex/OpsSentinel"
              target="_blank"
              rel="noopener noreferrer"
              className="doc-nav-item"
            >
              <ExternalLink size={18} />
              GitHub Repository
            </a>
            <a
              href="https://github.com/hacrex/OpsSentinel/issues"
              target="_blank"
              rel="noopener noreferrer"
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
              <p>Failed to load documentation from GitHub. Check your connection and try again.</p>
              <button
                className="btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => setRetryCount((count) => count + 1)}
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
