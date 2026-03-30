import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, ShieldAlert, BarChart3, RotateCcw, Clock, AlertTriangle, Settings } from 'lucide-react';
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
          Ops Sentinel // Repo Detail
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="glowing-btn" onClick={() => navigate('/settings')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Settings size={14} /> Settings
          </button>
          <button className="glowing-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 0' }}>
        <div style={{ marginBottom: '24px', fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--accent-color)' }}>
          {decodeURIComponent(repo)}
        </div>

        {loading ? (
          <div style={{ color: 'var(--text-secondary)', padding: '48px', textAlign: 'center' }}>Loading...</div>
        ) : !stats ? (
          <div style={{ color: 'var(--error-color)', padding: '48px', textAlign: 'center' }}>Failed to load repo stats.</div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="metrics-grid" style={{ marginBottom: '32px' }}>
              <div className="glass-panel metric-card">
                <div className="metric-label"><Activity size={16} /> Total Runs</div>
                <div className="metric-value">{stats.total_runs}</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-label"><ShieldAlert size={16} color="var(--error-color)" /> Failures</div>
                <div className="metric-value danger">{stats.failed_runs}</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-label"><BarChart3 size={16} color="var(--success-color)" /> Success Rate</div>
                <div className="metric-value success">{stats.success_rate}%</div>
              </div>
              <div className="glass-panel metric-card">
                <div className="metric-label"><Clock size={16} color="var(--pending-color)" /> Avg MTTR</div>
                <div className="metric-value" style={{ color: 'var(--pending-color)' }}>
                  {formatMttr(stats.avg_mttr_seconds)}
                </div>
              </div>
            </div>

            {/* Flaky workflows banner */}
            {stats.flaky_workflows?.length > 0 && (
              <div className="glass-panel" style={{ marginBottom: '24px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderColor: 'rgba(245,158,11,0.4)' }}>
                <AlertTriangle size={16} color="var(--pending-color)" />
                <span style={{ fontSize: '13px', color: 'var(--pending-color)', fontWeight: '600' }}>Flaky workflows detected:</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {stats.flaky_workflows.join(', ')}
                </span>
              </div>
            )}

            {/* Trend chart */}
            <div className="glass-panel" style={{ marginBottom: '24px' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600' }}>30-Day Failure Trend</h2>
              </div>
              <div style={{ padding: '16px 8px' }}>
                <TrendChart data={trend} />
              </div>
            </div>

            {/* Recent runs table */}
            <div className="glass-panel">
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(15,23,42,0.4)' }}>
                <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Recent Runs</h2>
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
                      <th>Timestamp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_runs.map((evt) => {
                      const rs = rerunStatus[evt.id];
                      const canRerun = RERUNNABLE.includes(evt.conclusion);
                      const isFlaky = stats.flaky_workflows?.includes(evt.workflow_name);
                      return (
                        <tr
                          key={evt.id}
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') window.open(evt.run_url, '_blank'); }}
                          style={{ outline: 'none' }}
                        >
                          <td style={{ color: 'var(--text-secondary)' }}>#{String(evt.id).padStart(4, '0')}</td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {evt.workflow_name}
                              {isFlaky && (
                                <span className="status-badge status-pending" style={{ fontSize: '10px', padding: '2px 7px' }}>
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
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            {formatMttr(evt.mttr_seconds)}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{formatTs(evt.created_at)}</td>
                          <td style={{ display: 'flex', gap: '8px' }}>
                            <a href={evt.run_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '5px 10px', fontSize: '11px' }}>
                              Inspect
                            </a>
                            {canRerun && (
                              <button
                                className="glowing-btn"
                                style={{ padding: '5px 10px', fontSize: '11px', opacity: rs === 'loading' ? 0.6 : 1 }}
                                disabled={rs === 'loading' || rs === 'success'}
                                onClick={() => handleRerun(evt.run_url, evt.id)}
                                title="Re-run workflow"
                              >
                                <RotateCcw size={12} />
                                {rs === 'loading' ? 'Running...' : rs === 'success' ? 'Triggered' : rs === 'error' ? 'Failed' : 'Re-run'}
                              </button>
                            )}
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
