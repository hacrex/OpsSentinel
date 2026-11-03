import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, BarChart3, CloudRain, LogOut, RotateCcw, Settings, RefreshCw, Search, Clock, Terminal } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const Infrastructure = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [repos, setRepos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ repo: '', stack: '', engine: '', operation: '', conclusion: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rerunStatus, setRerunStatus] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchRuns = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.repo) params.repo = activeFilters.repo;
      if (activeFilters.stack) params.stack = activeFilters.stack;
      if (activeFilters.engine) params.engine = activeFilters.engine;
      if (activeFilters.operation) params.operation = activeFilters.operation;
      if (activeFilters.conclusion) params.conclusion = activeFilters.conclusion;
      if (activeFilters.search) params.stack = activeFilters.search;
      const res = await api.get('/infrastructure/runs', { params });
      setRuns(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch infra runs:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await api.get('/infrastructure/runs', { params: { page: 1, limit: 1 } });
      setRepos([]);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchRuns(1, { repo: '', stack: '', engine: '', operation: '', conclusion: '', search: '' });
  }, [fetchRuns]);

  useSocket((msg) => {
    if (msg.type === 'new_infra_run') {
      const evt = msg.event;
      if (evt.conclusion === 'failure') {
        addToast(`Infra Failure: ${evt.stack_name} — ${evt.engine}:${evt.operation}`, 'error');
      } else {
        addToast(`Infra ${evt.conclusion}: ${evt.stack_name}`, 'success');
      }
      fetchRuns(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchRuns(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchRuns(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { repo: '', stack: '', engine: '', operation: '', conclusion: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchRuns(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchRuns(page, filters);
  };

  const handleRerun = async (run_id, eventId) => {
    setRerunStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      await api.post('/infrastructure/rerun', { run_id });
      setRerunStatus((s) => ({ ...s, [eventId]: 'success' }));
      addToast('Infra re-run triggered', 'success');
      fetchRuns(pagination.page, filtersRef.current);
    } catch (err) {
      setRerunStatus((s) => ({ ...s, [eventId]: 'error' }));
      addToast(err.response?.data?.error || 'Failed to rerun', 'error');
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try { return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss'); } catch { return ts; }
  };

  const totalRuns = pagination.total;
  const totalFailures = runs.filter((r) => r.conclusion === 'failure').length;
  const healthPct = totalRuns > 0 ? (((totalRuns - totalFailures) / totalRuns) * 100).toFixed(1) : '100.0';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Infrastructure
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>LIVE</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success-color)' }} />
          </div>
          <button className="glowing-btn" onClick={handleRefresh} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <RefreshCw size={12} className={refreshing ? 'spinning' : ''} />
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/settings')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Settings size={12} /> Settings
          </button>
          <button className="glowing-btn" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Infra Runs</div>
            <div className="metric-value">{totalRuns.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldAlert size={14} color="var(--error-color)" /> Failures</div>
            <div className="metric-value danger">{totalFailures}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><BarChart3 size={14} color="var(--success-color)" /> Success Rate</div>
            <div className="metric-value success">{healthPct}%</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Infrastructure Runs</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total runs</span>
            </div>
            <FilterBar repos={repos} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} extraFields={['stack', 'engine', 'operation']} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Repository</th>
                  <th>Stack</th>
                  <th>Engine</th>
                  <th>Operation</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Time</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={9} rows={8} />
                ) : (
                  runs.map((run) => {
                    const rs = rerunStatus[run.id];
                    return (
                      <tr key={run.id} style={{ outline: 'none', cursor: 'pointer' }}
                          onClick={() => navigate(`/dashboard/infra/${encodeURIComponent(run.repo_name)}/${encodeURIComponent(run.stack_name)}`)}>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(run.id).padStart(4, '0')}</td>
                        <td style={{ color: 'var(--accent-color)', fontWeight: '500', fontSize: '13px' }}>{run.repo_name}</td>
                        <td style={{ fontSize: '13px' }}>{run.stack_name}</td>
                        <td style={{ fontSize: '13px' }}>{run.engine}</td>
                        <td style={{ fontSize: '13px' }}>{run.operation}</td>
                        <td><span className={`status-badge ${run.status === 'completed' ? 'status-success' : 'status-pending'}`}>{run.status}</span></td>
                        <td><span className={`status-badge ${run.conclusion === 'failure' ? 'status-failure' : 'status-success'}`}>{run.conclusion || 'PENDING'}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(run.created_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {run.output_url && (
                              <a href={run.output_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px' }}>Logs</a>
                            )}
                            {run.conclusion === 'failure' && (
                              <button className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px', opacity: rs === 'loading' ? 0.6 : 1 }}
                                disabled={rs === 'loading' || rs === 'success'}
                                onClick={() => handleRerun(run.id, run.id)} title="Re-run infrastructure operation">
                                <RotateCcw size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {!loading && runs.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No infrastructure runs found. Trigger a plan/apply from the CI/CD pipeline or UI.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Infrastructure;
