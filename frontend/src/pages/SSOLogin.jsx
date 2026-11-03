import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldAlert, Lock, LogOut, AlertTriangle, Info
} from 'lucide-react';
import api from '../api';

const SSO_LOGIN = () => {
  const [ssoConfig, setSsoConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSsoConfig();
  }, []);

  const fetchSsoConfig = async () => {
    try {
      const res = await api.get('/auth/sso/config');
      setSsoConfig(res.data);
    } catch (err) {
      // SSO not configured or not available
      setSsoConfig({ enabled: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = () => {
    navigate('/auth/sso');
  };

  const handleGithubLogin = () => {
    navigate('/login');
  };

  const ssoError = searchParams.get('error');
  if (ssoError === 'sso_denied') {
    setError('SSO login was cancelled by the identity provider.');
  } else if (ssoError === 'sso_failed') {
    setError('SSO login failed. Please contact your administrator.');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--accent-color)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: 'var(--text)' }}>
            OpsSentinel
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Sign in to your operational control plane
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: '8px', padding: '12px', marginBottom: '24px', color: 'var(--error-color)', fontSize: '13px' }}>
            <AlertTriangle size={14} style={{ marginRight: '8px' }} />
            {error}
          </div>
        )}

        {ssoConfig?.enabled && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleSsoLogin}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Lock size={14} />
              Sign in with {ssoConfig.provider.charAt(0).toUpperCase() + ssoConfig.provider.slice(1)}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px', textAlign: 'center' }}>
              Single Sign-On via {ssoConfig.provider}
            </p>
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleGithubLogin}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            GitHub
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
            Standard GitHub OAuth login
          </p>
        </div>

        {ssoConfig?.enabled && (
          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <Info size={14} style={{ color: 'var(--accent-color)', marginRight: '8px' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              SSO is configured for your organization. Use SSO for enterprise access.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SSO_LOGIN;
