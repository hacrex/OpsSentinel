import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import Layout from '../components/Layout';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Layout>
      <section className="hero not-found-hero">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page Not Found</h2>
        <p className="hero-subtitle">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="hero-actions">
          <Link to="/" className="btn btn-primary">
            <Home size={18} /> Go Home
          </Link>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>
      </section>
    </Layout>
  );
}
