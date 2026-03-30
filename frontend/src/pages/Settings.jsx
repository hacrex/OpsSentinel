import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Send, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const inputStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  width: '100%',
  outline: 'none',
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  fontWeight: '500',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

function Field({ label, value, placeholder, readOnly }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <input
        style={{ ...inputStyle, opacity: readOnly ? 0.6 : 1 }}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={() => {}}
      />
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [testStatus, setTestStatus] = useState({});

  useEffect(() => {
    axios.get(`${API}/settings`)
      .then((r) => setConfig(r.data))
      .catch(() => setConfig({}));
  }, []);

  const handleTest = async (channel) => {
    setTestStatus((s) => ({ ...s, [channel]: 'loading' }));
    try {
      await axios.post(`${API}/settings/test`, { channel });
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
        style={{ padding: '6px 14px', fontSize: '12px', marginTop: '8px', opacity: st === 'loading' ? 0.6 : 1 }}
        disabled={st === 'loading'}
        onClick={() => handleTest(channel)}
      >
        {st === 'success' ? <CheckCircle size={13} color="var(--success-color)" /> :
         st && st !== 'loading' ? <XCircle size={13} color="var(--error-color)" /> :
         <Send size={13} />}
        {st === 'loading' ? 'Sending...' : st === 'success' ? 'Sent' : st && st !== 'loading' ? 'Failed' : 'Send Test'}
      </button>
    );
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1><Activity size={24} /> Ops Sentinel // Settings</h1>
        <button className="glowing-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={14} /> Back
        </button>
      </header>

      <main style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 0' }}>
        {!config ? (
          <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Slack */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Slack</h2>
              <Field
                label="Webhook URL"
                value={config.slack_webhook_url || ''}
                placeholder="Not configured — set SLACK_WEBHOOK_URL in .env"
                readOnly
              />
              <TestBtn channel="slack" />
              {testStatus.slack && testStatus.slack !== 'loading' && testStatus.slack !== 'success' && (
                <p style={{ fontSize: '12px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.slack}</p>
              )}
            </div>

            {/* Teams */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Microsoft Teams</h2>
              <Field
                label="Webhook URL"
                value={config.teams_webhook_url || ''}
                placeholder="Not configured — set TEAMS_WEBHOOK_URL in .env"
                readOnly
              />
              <TestBtn channel="teams" />
              {testStatus.teams && testStatus.teams !== 'loading' && testStatus.teams !== 'success' && (
                <p style={{ fontSize: '12px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.teams}</p>
              )}
            </div>

            {/* Email */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Email (SMTP)</h2>
              <Field label="Alert Recipient" value={config.alert_email_to} placeholder="Not configured — set ALERT_EMAIL_TO in .env" readOnly />
              <Field label="SMTP Host" value={config.smtp_host} placeholder="e.g. smtp.gmail.com" readOnly />
              <Field label="SMTP Port" value={config.smtp_port} placeholder="587" readOnly />
              <Field label="SMTP User" value={config.smtp_user} placeholder="Not configured" readOnly />
              <TestBtn channel="email" />
              {testStatus.email && testStatus.email !== 'loading' && testStatus.email !== 'success' && (
                <p style={{ fontSize: '12px', color: 'var(--error-color)', marginTop: '6px' }}>{testStatus.email}</p>
              )}
            </div>

            {/* Retention */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: 'var(--text-primary)' }}>Data Retention</h2>
              <Field label="Retention Period (days)" value={config.retention_days} readOnly />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Events older than this are automatically deleted. Set RETENTION_DAYS in .env to change.
              </p>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
