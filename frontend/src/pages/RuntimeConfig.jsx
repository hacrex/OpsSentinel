import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, Save, Copy, Eye, EyeOff, ExternalLink, ShieldCheck,
  Mail, Send, CheckCircle, XCircle, Settings as SettingsIcon
} from 'lucide-react';
import api from '../api';

const inputStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '12px',
  fontFamily: 'var(--font-mono)',
  width: '100%',
  outline: 'none',
};

const labelStyle = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  fontWeight: '500',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const FIELDS = [
  {
    key: 'github_client_id',
    label: 'GitHub OAuth Client ID',
    placeholder: 'e.g. Iv1.xxxxxxxxxxxxxxxx',
    encrypted: false,
    desc: 'Client ID from your GitHub OAuth App (Settings → Developer settings → OAuth Apps)',
  },
  {
    key: 'github_client_secret',
    label: 'GitHub OAuth Client Secret',
    placeholder: 'Not configured',
    encrypted: true,
    desc: 'Client Secret from your GitHub OAuth App',
  },
  {
    key: 'github_webhook_secret',
    label: 'GitHub Webhook Secret',
    placeholder: 'Not configured',
    encrypted: true,
    desc: 'Secret token used to verify GitHub webhook signatures',
  },
];

const RuntimeConfig = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState({});
  const [form, setForm] = useState({});
  const [showSecret, setShowSecret] = useState({});
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState({});
  const [saveStatus, setSaveStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const r = await api.get('/runtime-config');
      setConfig(r.data);
      // Initialize form with current values (masked values are just for display)
      const initial = {};
      for (const f of FIELDS) {
        initial[f.key] = config[f.key]?.value || '';
      }
      setForm(initial);
    } catch (err) {
      console.error('Failed to fetch runtime config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveStatus(null);
  };

  const toggleSecret = (key) => {
    setShowSecret((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyValue = async (key) => {
    const val = form[key];
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setSaveStatus({ type: 'success', message: 'Copied to clipboard' });
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus({ type: 'error', message: 'Failed to copy' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/runtime-config', {
        github_client_id: form.github_client_id,
        github_client_secret: form.github_client_secret,
        github_webhook_secret: form.github_webhook_secret,
      });
      setSaveStatus({ type: 'success', message: 'Configuration saved' });
      setTimeout(() => setSaveStatus(null), 3000);
      await fetchConfig();
    } catch (err) {
      setSaveStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestGitHub = async () => {
    setTestStatus('loading');
    try {
      await api.post('/runtime-config/test-github', {
        client_id: form.github_client_id,
        client_secret: form.github_client_secret,
      });
      setTestStatus('success');
      setSaveStatus({ type: 'success', message: 'GitHub OAuth credentials are valid' });
    } catch (err) {
      setTestStatus('error');
      setSaveStatus({
        type: 'error',
        message: err.response?.data?.error || 'Invalid GitHub OAuth credentials',
      });
    }
  };

  const webhookUrl = `${(import.meta.env.VITE_API_URL || window.location.origin).replace(':5173', ':3001')}/webhook`;

  const getDisplayValue = (key) => {
    const val = form[key];
    if (!val) return '';
    return config[key]?.encrypted ? '••••••••' : val;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', paddingBottom: '40px', color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <ShieldCheck size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Configuration
        </h1>
        <button className="glowing-btn" onClick={() => navigate('/dashboard')} style={{ padding: '6px 12px', fontSize: '11px' }}>
          <ArrowLeft size={12} /> Back
        </button>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 24px 0' }}>
        {saveStatus && (
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '12px',
              background: saveStatus.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: saveStatus.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
              border: `1px solid ${saveStatus.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`,
            }}
          >
            {saveStatus.message}
          </div>
        )}

        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Configure GitHub OAuth and webhook credentials directly in the app. Values are encrypted at rest before being stored.
        </div>

        {FIELDS.map((f) => (
          <div key={f.key} className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ShieldCheck size={14} color="var(--accent-color)" />
              <h2 style={{ fontSize: '13px', fontWeight: '600' }}>{f.label}</h2>
              {config[f.key]?.source === 'env' && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(15,23,42,0.5)', padding: '2px 6px', borderRadius: '3px', marginLeft: 'auto' }}>
                  Set via environment variable
                </span>
              )}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{f.desc}</p>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <input
                style={{ ...inputStyle, paddingRight: f.encrypted ? '34px' : '12px' }}
                value={getDisplayValue(f.key)}
                placeholder={config[f.key]?.configured ? '•••••••• (saved)' : f.placeholder}
                onChange={(e) => handleChange(f.key, e.target.value)}
                type={showSecret[f.key] ? 'text' : 'password'}
              />
              {f.encrypted && (
                <button
                  onClick={() => toggleSecret(f.key)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  title={showSecret[f.key] ? 'Hide' : 'Show'}
                >
                  {showSecret[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
              {config[f.key]?.configured && !config[f.key]?.encrypted && (
                <button
                  onClick={() => copyValue(f.key)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  title="Copy"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
              {config[f.key]?.configured
                ? `Currently configured (source: {config[f.key].source})`
                : 'Not configured'}
            </p>
          </div>
        ))}

        {/* Webhook URL info */}
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Mail size={14} color="var(--accent-color)" />
            <h2 style={{ fontSize: '13px', fontWeight: '600' }}>GitHub Webhook URL</h2>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Add this URL to your GitHub repository webhooks (Settings → Webhooks → Add webhook).
          </p>
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <input
              style={{ ...inputStyle, fontSize: '11px' }}
              value={webhookUrl}
              readOnly
            />
            <button
              onClick={() => copyValue('webhook')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="https://docs.github.com/en/webhooks/creating-webhooks"
              target="_blank"
              rel="noreferrer"
              className="glowing-btn"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              <ExternalLink size={12} /> GitHub Docs
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {saving ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Send size={12} /> Saving...</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Save size={14} /> Save Configuration</span>}
          </button>
          <button
            className="glowing-btn"
            onClick={handleTestGitHub}
            disabled={testStatus === 'loading'}
            style={{ padding: '8px 16px', fontSize: '13px', opacity: testStatus === 'loading' ? 0.6 : 1 }}
          >
            {testStatus === 'loading' ? 'Testing...' : testStatus === 'success' ? <><CheckCircle size={12} color="var(--success-color)" /> Valid</> : <><Send size={12} /> Test GitHub OAuth</>}
          </button>
          {testStatus === 'error' && (
            <p style={{ fontSize: '11px', color: 'var(--error-color)', marginLeft: '12px' }}>Invalid credentials</p>
          )}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px' }}>
          Note: Changes to OAuth credentials require restarting the backend container to take effect for new login sessions.
        </p>
      </main>
    </div>
  );
};

export default RuntimeConfig;
