import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Github, Activity, AlertTriangle } from 'lucide-react';

const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      fetch(`${API}/auth/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            localStorage.setItem('github_token', data.token);
            if (data.user) localStorage.setItem('github_user', JSON.stringify(data.user));
            navigate('/');
          }
        })
        .catch((err) => console.error('Auth error:', err));
    }
  }, [location, navigate]);

  const handleLogin = () => {
    const redirectUri = window.location.origin + '/login';
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', margin: '0 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '10px', borderBottom: '1px solid var(--border-color)', borderLeft: '1px solid var(--border-color)', color: 'var(--accent-color)', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
          SYS.LOGIN.AUTH
        </div>

        <Activity size={48} color="var(--accent-color)" style={{ marginBottom: '24px' }} />

        <h1 style={{ fontSize: '28px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '4px' }}>
          Ops <span style={{ color: 'var(--accent-color)' }}>Sentinel</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px', marginBottom: '32px', textTransform: 'uppercase', letterSpacing: '2px' }}>
          CI/CD Telemetry Array
        </p>

        {!clientId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', width: '100%' }}>
            <AlertTriangle size={14} color="var(--pending-color)" />
            <span style={{ fontSize: '12px', color: 'var(--pending-color)', textAlign: 'left' }}>
              VITE_GITHUB_CLIENT_ID is not set. Login will not work.
            </span>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="glowing-btn"
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={!clientId}
        >
          <Github size={18} />
          Authenticate with GitHub
        </button>
      </div>
    </div>
  );
};

export default Login;
