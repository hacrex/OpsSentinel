import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, LogOut, RotateCcw, Settings, ShieldAlert,
  TrendingUp, TrendingDown, Activity, Terminal
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import TrendChart from '../components/TrendChart';

const DoraMetrics = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [repoFilter, setRepoFilter] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, [repoFilter]);

  const fetchMetrics = async () => {
    try {
      const params = repoFilter ? { repo: repoFilter } : {};
      const res = await api.get('/dora/metrics', { params });
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch DORA metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  };

  const formatMttr = (seconds) => {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const deployments = metrics?.deployment_frequency || [];
  const totalDeploys = metrics?.total_deployments || 0;
  const failedDeploys = metrics?.failed_deployments || 0;
  const cfRate = metrics?.change_failure_rate || '0.0';
  const avgMttr = metrics?.avg_mttr_formatted || '—';

  const deployTrend = deployments.map((d) => ({
    day: d.day,
    deployments: d.deployments,
  }));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <BarChart3 size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — DORA Metrics
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
            placeholder="Filter by repo..."
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
          />
          <button className="glowing-btn" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label"><TrendingUp size={14} color="var(--text-secondary)" /> Deployment Frequency</div>
            <div className="metric-value">{deployments.length > 0 ? (deployments.reduce((a, b) => a + b.deployments, 0) / deployments.length).toFixed(1) : '0'}/day</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Activity size={14} color="var(--text-secondary)" /> Change Failure Rate</div>
            <div className="metric-value" style={{ color: parseFloat(cfRate) > 15 ? 'var(--error-color)' : 'var(--success-color)' }}>{cfRate}%</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Clock size={14} color="var(--text-secondary)" /> MTTR</div>
            <div className="metric-value">{formatMttr(metrics?.avg_mttr_seconds || null)}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Deploys (30d)</div>
            <div className="metric-value">{totalDeploys}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Deployment Frequency (30 Days)</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{totalDeploys} total deployments</span>
          </div>
          <div style={{ padding: '16px 8px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
            ) : deployments.length === 0 ? (
              <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>No deployment data yet. Run infrastructure provisioning to generate DORA metrics.</div>
            ) : (
              <TrendChart data={deployTrend} />
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600' }}>DORA Summary</h2>
          </div>
          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Deployment Frequency</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)', marginTop: '8px' }}>
                {deployments.length > 0 ? (deployments.reduce((a, b) => a + b.deployments, 0) / deployments.length).toFixed(1) : '0'} / day
              </div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Change Failure Rate</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: parseFloat(cfRate) > 15 ? 'var(--error-color)' : 'var(--success-color)', marginTop: '8px' }}>{cfRate}%</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>MTTR</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--text)', marginTop: '8px' }}>{avgMttr}</div>
            </div>
            <div style={{ background: 'rgba(15,23,42,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Failed Deploys</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--error-color)', marginTop: '8px' }}>{failedDeploys}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoraMetrics;
