import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Send, CheckCircle, XCircle, Copy, ExternalLink, Webhook } from 'lucide-react';
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

function Field({ label, value, placeholder, readOnly, mono = true }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          style={{ ...inputStyle, opacity: readOnly ? 0.7 : 1, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)' }}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={() => {}}
        />
        {value && value !== '••••••••' && readOnly && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            title="Copy"
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [testStatus, setTestStatus] = useState({});
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    api.get('/settings')
      .then((r) => setConfig(r.data))
      .catch(() => setConfig({}));

    // Generate webhook URL based on current backend
    const backendUrl = import.meta.env.VITE_API_URL || window.location.origin.replace(':5173', ':3001');
    setWebhookUrl(`${backendUrl}/webhook`);
  }, []);

  const handleTest = async (channel) => {
    setTestStatus((s) => ({ ...s, [channel]: 'loading' }));
    try {
      await api.post('/settings/test', { channel });
      setTestStatus((s) => ({ ...s, [channel]: 'success' }));
    } catch (err) {
      setTestStatus((s) => ({ ...s, [channel]: err.response?.data?.error || 'error' }));
    }
  };

  const TestBtn = ({ channel }) => {
    const st = testStatus[channel];
    return (
      <button
        className="glowing-btn"
        style={{ padding: '6px 12px', fontSize: '11px', marginTop: '8px', opacity: st === 'loading' ? 0.6 : 1 }}
        disabled={st === 'loading'}
        onClick={() => handleTest(channel)}
      >
        {st === 'success' ? <CheckCircle size={12} color="var(--success-color)" /> :
         st && st !== 'loading' ? <XCircle size={12} color="var(--error-color)" /> :
         <Send size={12} />}
        {st === 'loading' ? 'Sending...' : st === 'success' ? 'Sent' : st && st !== 'loading' ? 'Failed' : 'Test'}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1><Activity size={24} /> OpsSentinel</h1>
        <button className="glowing-btn" onClick={() => navigate('/dashboard')} style={{ padding: '6px 12px', fontSize: '11px' }}>
          <ArrowLeft size={12} /> Back
        </button>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 24px 0' }}>
        {!config ? (
          <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Webhook Configuration */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Webhook size={16} color="var(--accent-color)" />
                <h2 style={{ fontSize: '13px', fontWeight: '600' }}>Webhook Configuration</h2>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Add this URL to your GitHub repository webhooks to start receiving events.
              </p>
              <Field
                label="Webhook URL"
                value={webhookUrl}
                placeholder="Your webhook endpoint"
                readOnly
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
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

            {/* Slack */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Slack</h2>
              <Field
                label="Webhook URL"
                value={config.slack_webhook_url || ''}
                placeholder="Not configured — set SLACK_WEBHOOK_URL in .env"
                readOnly
              />
              <TestBtn channel="slack" />
              {testStatus.slack && testStatus.slack !== 'loading' && testStatus.slack !== 'success' && (
                <p style={{ fontSize: '11px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.slack}</p>
              )}
            </div>

            {/* Teams */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Microsoft Teams</h2>
              <Field
                label="Webhook URL"
                value={config.teams_webhook_url || ''}
                placeholder="Not configured — set TEAMS_WEBHOOK_URL in .env"
                readOnly
              />
              <TestBtn channel="teams" />
              {testStatus.teams && testStatus.teams !== 'loading' && testStatus.teams !== 'success' && (
                <p style={{ fontSize: '11px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.teams}</p>
              )}
            </div>

            {/* Email */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Email (SMTP)</h2>
              <Field label="Recipient" value={config.alert_email_to} placeholder="Not configured" readOnly />
              <Field label="SMTP Host" value={config.smtp_host} placeholder="e.g. smtp.gmail.com" readOnly />
              <Field label="SMTP Port" value={config.smtp_port} placeholder="587" readOnly />
              <Field label="SMTP User" value={config.smtp_user} placeholder="Not configured" readOnly />
              <TestBtn channel="email" />
              {testStatus.email && testStatus.email !== 'loading' && testStatus.email !== 'success' && (
                <p style={{ fontSize: '11px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.email}</p>
              )}
            </div>

            {/* Retention */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px' }}>Data Retention</h2>
              <Field label="Retention Period" value={`${config.retention_days || 30} days`} readOnly />
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Events older than this are automatically deleted. Set RETENTION_DAYS in .env.
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
