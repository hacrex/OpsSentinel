import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Terminal, ShieldAlert, BarChart3, Clock, AlertTriangle, Settings, TrendingUp, Workflow } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import TrendChart from '../components/TrendChart';

export default function InfraDetail() {
  const { repo, stack } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/infrastructure/stats/${encodeURIComponent(repo)}/${encodeURIComponent(stack)}`),
      api.get(`/infrastructure/trend/${encodeURIComponent(repo)}/${encodeURIComponent(stack)}`),
    ])
      .then(([statsRes, trendRes]) => {
        setStats(statsRes.data);
        setTrend(trendRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [repo, stack]);

  const formatTs = (ts) => {
    if (!ts) return '—';
    try { return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss'); } catch { return ts; }
  };

  const formatMttr = (seconds) => {
    if (seconds == null) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Infrastructure
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/infrastructure')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ marginBottom: '20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-color)' }}>
          {decodeURIComponent(repo)} / {decodeURIComponent(stack)}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
        ) : !stats ? (
          <div style={{ color: 'var(--error-color)', padding: '48px', textAlign: 'center' }}>Failed to load stack stats.</div>
        ) : (
          <>
            <div className="metrics-grid" style={{ marginBottom: '24px' }}>
              <div className="glass-panel metric-card">
                <div className="metric-label"><Terminal size={14} /> Total Runs</div>
                <div className="metric-value">{stats.total_runs.toLocaleString()}</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-label"><ShieldAlert size={14} color="var(--error-color)" /> Failures</div>
                <div className="metric-value danger">{stats.failed_runs}</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-label"><BarChart3 size={14} color="var(--success-color)" /> Success Rate</div>
                <div className="metric-value success">{stats.success_rate}%</div>
              </div>
            </div>

            {stats.flaky_operations?.length > 0 && (
              <div className="glass-panel" style={{ marginBottom: '20px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderColor: 'rgba(245,158,11,0.4)' }}>
                <AlertTriangle size={14} color="var(--pending-color)" />
                <span style={{ fontSize: '12px', color: 'var(--pending-color)', fontWeight: '600' }}>Flaky ops:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{stats.flaky_operations.join(', ')}</span>
              </div>
            )}

            <div className="glass-panel" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={14} />
                <h2 style={{ fontSize: '13px', fontWeight: '600' }}>30-Day Trend</h2>
              </div>
              <div style={{ padding: '16px 8px' }}>
                <TrendChart data={trend} />
              </div>
            </div>

            <div className="glass-panel">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Workflow size={14} />
                <h2 style={{ fontSize: '13px', fontWeight: '600' }}>Recent Runs</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Engine</th>
                      <th>Operation</th>
                      <th>Status</th>
                      <th>Conclusion</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_runs.map((run) => (
                      <tr key={run.id}>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(run.id).padStart(4, '0')}</td>
                        <td style={{ fontSize: '13px' }}>{run.engine}</td>
                        <td style={{ fontSize: '13px' }}>{run.operation}</td>
                        <td><span className={`status-badge ${run.status === 'completed' ? 'status-success' : 'status-pending'}`}>{run.status}</span></td>
                        <td><span className={`status-badge ${run.conclusion === 'failure' ? 'status-failure' : 'status-success'}`}>{run.conclusion || 'PENDING'}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(run.created_at)}</td>
                      </tr>
                    ))}
                    {stats.recent_runs.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No runs found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
