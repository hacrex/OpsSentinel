import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, BarChart3, CloudRain, LogOut, RotateCcw, Settings } from 'lucide-react';
import axios from 'axios';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Dashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [repos, setRepos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [globalStats, setGlobalStats] = useState({ total: 0, failures: 0 });
  const [filters, setFilters] = useState({ repo: '', conclusion: '' });
  const [loading, setLoading] = useState(true);
  const [rerunStatus, setRerunStatus] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  // Ref so WebSocket callback always has fresh filters without re-subscribing
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchEvents = useCallback(async (page, activeFilters) => {
    try {
      const params = { page, limit: 25 };
      if (activeFilters.repo) params.repo = activeFilters.repo;
      if (activeFilters.conclusion) params.conclusion = activeFilters.conclusion;
      const res = await axios.get(`${API}/events`, { params });
      setEvents(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setLoading(false);
    }
  }, []);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const [totalRes, failRes] = await Promise.all([
        axios.get(`${API}/events`, { params: { page: 1, limit: 1 } }),
        axios.get(`${API}/events`, { params: { page: 1, limit: 1, conclusion: 'failure' } }),
      ]);
      setGlobalStats({
        total: totalRes.data.pagination.total,
        failures: failRes.data.pagination.total,
      });
    } catch { /* non-critical */ }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/repos`);
      setRepos(res.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchEvents(1, { repo: '', conclusion: '' });
    fetchRepos();
    fetchGlobalStats();
  }, [fetchEvents, fetchRepos, fetchGlobalStats]);

  useSocket((msg) => {
    if (msg.type === 'new_event') {
      const evt = msg.event;
      if (evt.conclusion === 'failure') {
        addToast(`❌ Failure: ${evt.repo_name} — ${evt.workflow_name}`, 'error');
      } else {
        addToast(`✓ ${evt.repo_name} — ${evt.workflow_name} ${evt.conclusion}`, 'success');
      }
      fetchEvents(1, filtersRef.current);
      fetchRepos();
      fetchGlobalStats();
    }
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchEvents(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { repo: '', conclusion: '' };
    setFilters(reset);
    setLoading(true);
    fetchEvents(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchEvents(page, filters);
  };

  const handleRerun = async (run_url, eventId) => {
    const token = localStorage.getItem('github_token');
    setRerunStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      await axios.post(`${API}/rerun`, { run_url, token });
      setRerunStatus((s) => ({ ...s, [eventId]: 'success' }));
      addToast('Re-run triggered successfully', 'success');
    } catch (err) {
      setRerunStatus((s) => ({ ...s, [eventId]: 'error' }));
      addToast(err.response?.data?.error || 'Failed to trigger re-run', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
    navigate('/login');
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss');
    } catch { return ts; }
  };

  const { total: totalRuns, failures: totalFailures } = globalStats;
  const healthPct = totalRuns > 0
    ? (((totalRuns - totalFailures) / totalRuns) * 100).toFixed(1)
    : '100.0';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Activity size={24} />
          Ops Sentinel // CI Telemetry
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {loading ? 'SYNCING...' : 'LIVE'}
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', boxShadow: 'var(--accent-glow)' }} />
          <button className="glowing-btn" onClick={() => navigate('/settings')} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Settings size={14} /> Settings
          </button>
          <button className="glowing-btn" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 0' }}>

        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <CloudRain size={16} color="var(--text-secondary)" /> Total Workflows
            </div>
            <div className="metric-value">{totalRuns}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <ShieldAlert size={16} color="var(--error-color)" /> Detected Failures
            </div>
            <div className="metric-value danger">{totalFailures}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <BarChart3 size={16} color="var(--success-color)" /> System Health
            </div>
            <div className="metric-value success">{healthPct}%</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '32px' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600' }}>Global Run Stream</h2>
            <FilterBar repos={repos} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trace ID</th>
                  <th>Repository</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} rows={8} />
                ) : (
                  events.map((evt) => {
                    const rs = rerunStatus[evt.id];
                    return (
                      <tr
                        key={evt.id}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') navigate(`/repo/${encodeURIComponent(evt.repo_name)}`);
                        }}
                        style={{ outline: 'none' }}
                      >
                        <td style={{ color: 'var(--text-secondary)' }}>#{String(evt.id).padStart(4, '0')}</td>
                        <td
                          style={{ color: 'var(--accent-color)', fontWeight: '600', cursor: 'pointer' }}
                          onClick={() => navigate(`/repo/${encodeURIComponent(evt.repo_name)}`)}
                          title="View repo detail"
                        >
                          {evt.repo_name}
                        </td>
                        <td>{evt.workflow_name}</td>
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
                        <td style={{ color: 'var(--text-secondary)' }}>{formatTs(evt.created_at)}</td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <a href={evt.run_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '5px 10px', fontSize: '11px' }}>
                            Inspect
                          </a>
                          {['failure', 'cancelled'].includes(evt.conclusion) && (
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
                  })
                )}
              </tbody>
            </table>
            {!loading && events.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                No telemetry data found.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default Dashboard;
