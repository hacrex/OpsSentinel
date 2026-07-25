import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';

export default function NotFound() {
  return (
    <Layout>
      <section className="hero" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h1 className="hero-title" style={{ fontSize: '120px', opacity: 0.3 }}>404</h1>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Page Not Found</h2>
        <p className="hero-subtitle" style={{ marginBottom: '32px' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/" className="btn-primary">
            <Home size={18} /> Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn-secondary">
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>
      </section>
    </Layout>
  );
}
