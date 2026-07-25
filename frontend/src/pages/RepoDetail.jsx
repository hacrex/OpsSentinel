import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, ShieldAlert, BarChart3, RotateCcw, Clock, AlertTriangle, Settings, TrendingUp, Workflow } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import TrendChart from '../components/TrendChart';

const RERUNNABLE = ['failure', 'cancelled'];

function formatMttr(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function RepoDetail() {
  const { repo } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rerunStatus, setRerunStatus] = useState({});

  useEffect(() => {
    Promise.all([
      api.get(`/repos/${encodeURIComponent(repo)}/stats`),
      api.get(`/repos/${encodeURIComponent(repo)}/trend`),
    ])
      .then(([statsRes, trendRes]) => {
        setStats(statsRes.data);
        setTrend(trendRes.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [repo]);

  const handleRerun = async (run_url, eventId) => {
    setRerunStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      await api.post('/rerun', { run_url });
      setRerunStatus((s) => ({ ...s, [eventId]: 'success' }));
    } catch {
      setRerunStatus((s) => ({ ...s, [eventId]: 'error' }));
    }
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss');
    } catch { return ts; }
  };

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Activity size={24} />
          OpsSentinel
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/settings')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Settings size={12} /> Settings
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <ArrowLeft size={12} /> Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div style={{ marginBottom: '20px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent-color)' }}>
          {decodeURIComponent(repo)}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
        ) : !stats ? (
          <div style={{ color: 'var(--error-color)', padding: '48px', textAlign: 'center' }}>Failed to load repo stats.</div>
        ) : (
          <>
            {/* Metrics */}
            <div className="metrics-grid" style={{ marginBottom: '24px' }}>
              <div className="glass-panel metric-card">
                <div className="metric-label"><Activity size={14} /> Total Runs</div>
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
              <div className="glass-panel metric-card">
                <div className="metric-label"><Clock size={14} color="var(--pending-color)" /> Avg MTTR</div>
                <div className="metric-value" style={{ color: 'var(--pending-color)' }}>
                  {formatMttr(stats.avg_mttr_seconds)}
                </div>
              </div>
            </div>

            {/* Flaky Workflows */}
            {stats.flaky_workflows?.length > 0 && (
              <div className="glass-panel" style={{ marginBottom: '20px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderColor: 'rgba(245,158,11,0.4)' }}>
                <AlertTriangle size={14} color="var(--pending-color)" />
                <span style={{ fontSize: '12px', color: 'var(--pending-color)', fontWeight: '600' }}>Flaky:</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {stats.flaky_workflows.join(', ')}
                </span>
              </div>
            )}

            {/* Trend Chart */}
            <div className="glass-panel" style={{ marginBottom: '20px' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={14} />
                <h2 style={{ fontSize: '13px', fontWeight: '600' }}>30-Day Trend</h2>
              </div>
              <div style={{ padding: '16px 8px' }}>
                <TrendChart data={trend} />
              </div>
            </div>

            {/* Recent Runs */}
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
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Conclusion</th>
                      <th>MTTR</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_runs.map((evt) => {
                      const rs = rerunStatus[evt.id];
                      const canRerun = RERUNNABLE.includes(evt.conclusion);
                      const isFlaky = stats.flaky_workflows?.includes(evt.workflow_name);
                      return (
                        <tr key={evt.id}>
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            #{String(evt.id).padStart(4, '0')}
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                              {evt.workflow_name}
                              {isFlaky && (
                                <span className="status-badge status-pending" style={{ fontSize: '9px', padding: '2px 6px' }}>
                                  FLAKY
                                </span>
                              )}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${evt.status === 'completed' ? 'status-success' : 'status-pending'}`}>
                              {evt.status}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${evt.conclusion === 'failure' ? 'status-failure' : 'status-success'}`}>
                              {evt.conclusion || 'PENDING'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                            {formatMttr(evt.mttr_seconds)}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(evt.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a href={evt.run_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                Inspect
                              </a>
                              {canRerun && (
                                <button
                                  className="glowing-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px', opacity: rs === 'loading' ? 0.6 : 1 }}
                                  disabled={rs === 'loading' || rs === 'success'}
                                  onClick={() => handleRerun(evt.run_url, evt.id)}
                                  title="Re-run workflow"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {stats.recent_runs.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>No runs found.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
