import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, BarChart3, CloudRain, LogOut, RotateCcw, Settings, RefreshCw, Search, Clock, TrendingUp, TrendingDown, FileText, Users, GitBranch, Brain } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const Dashboard = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [repos, setRepos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [globalStats, setGlobalStats] = useState({ total: 0, failures: 0, lastUpdated: null });
  const [filters, setFilters] = useState({ repo: '', conclusion: '', workflow: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rerunStatus, setRerunStatus] = useState({});
  const [triageStatus, setTriageStatus] = useState({});
  const [analysisStatus, setAnalysisStatus] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchEvents = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.repo) params.repo = activeFilters.repo;
      if (activeFilters.conclusion) params.conclusion = activeFilters.conclusion;
      if (activeFilters.workflow) params.workflow = activeFilters.workflow;
      const res = await api.get('/events', { params });
      setEvents(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchGlobalStats = useCallback(async () => {
    try {
      const [totalRes, failRes] = await Promise.all([
        api.get('/events', { params: { page: 1, limit: 1 } }),
        api.get('/events', { params: { page: 1, limit: 1, conclusion: 'failure' } }),
      ]);
      setGlobalStats({
        total: totalRes.data.pagination.total,
        failures: failRes.data.pagination.total,
        lastUpdated: new Date(),
      });
    } catch { /* non-critical */ }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await api.get('/repos');
      setRepos(res.data);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchEvents(1, { repo: '', conclusion: '', workflow: '' });
    fetchRepos();
    fetchGlobalStats();
  }, [fetchEvents, fetchRepos, fetchGlobalStats]);

  useSocket((msg) => {
    if (msg.type === 'new_event') {
      const evt = msg.event;
      if (evt.conclusion === 'failure') {
        addToast(`Failure: ${evt.repo_name} — ${evt.workflow_name}`, 'error');
      } else {
        addToast(`${evt.repo_name} — ${evt.workflow_name} ${evt.conclusion}`, 'success');
      }
      fetchEvents(1, filtersRef.current);
      fetchRepos();
      fetchGlobalStats();
    }
  });

  const handleRefresh = () => {
    fetchEvents(pagination.page, filtersRef.current, true);
    fetchRepos();
    fetchGlobalStats();
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchEvents(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { repo: '', conclusion: '', workflow: '' };
    setFilters(reset);
    setLoading(true);
    fetchEvents(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchEvents(page, filters);
  };

  const handleRerun = async (run_url, eventId) => {
    setRerunStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      await api.post('/rerun', { run_url });
      setRerunStatus((s) => ({ ...s, [eventId]: 'success' }));
      addToast('Re-run triggered successfully', 'success');
    } catch (err) {
      setRerunStatus((s) => ({ ...s, [eventId]: 'error' }));
      addToast(err.response?.data?.error || 'Failed to trigger re-run', 'error');
    }
  };

  const handleTriage = async (run_url, eventId) => {
    setTriageStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      const res = await api.post('/triage', { run_url });
      const { triage } = res.data;
      
      if (triage.assignees.length > 0) {
        const assigneeList = triage.assignees.slice(0, 3).join(', ');
        const confidence = Math.round(triage.confidence * 100);
        addToast(`Triage: ${assigneeList} (${confidence}% confidence via ${triage.source})`, 'success');
      } else {
        addToast('No assignees found. Check if CODEOWNERS exists for this repo.', 'info');
      }
      
      setTriageStatus((s) => ({ ...s, [eventId]: 'success' }));
    } catch (err) {
      setTriageStatus((s) => ({ ...s, [eventId]: 'error' }));
      addToast(err.response?.data?.error || 'Triage failed', 'error');
    }
  };

  const handleAnalyze = async (run_url, eventId) => {
    setAnalysisStatus((s) => ({ ...s, [eventId]: 'loading' }));
    try {
      const res = await api.post('/analyze', { run_url });
      const { summary, success, error } = res.data;
      
      if (success && summary) {
        const msg = `Root Cause: ${summary.root_cause}\nCategory: ${summary.category}\nFix: ${summary.suggested_fix}`;
        addToast(msg, 'success');
      } else {
        addToast(error || 'Analysis failed', 'error');
      }
      
      setAnalysisStatus((s) => ({ ...s, [eventId]: success ? 'success' : 'error' }));
    } catch (err) {
      setAnalysisStatus((s) => ({ ...s, [eventId]: 'error' }));
      const errMsg = err.response?.data?.error || 'Analysis failed';
      addToast(errMsg, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    navigate('/login');
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try {
      return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss');
    } catch { return ts; }
  };

  const { total: totalRuns, failures: totalFailures, lastUpdated } = globalStats;
  const healthPct = totalRuns > 0
    ? (((totalRuns - totalFailures) / totalRuns) * 100).toFixed(1)
    : '100.0';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Activity size={24} />
          OpsSentinel
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {loading ? 'SYNCING' : 'LIVE'}
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: loading ? 'var(--pending-color)' : 'var(--success-color)' }} />
          </div>
          {lastUpdated && (
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />
              {format(lastUpdated, 'HH:mm:ss')}
            </span>
          )}
          <button className="glowing-btn" onClick={handleRefresh} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <RefreshCw size={12} className={refreshing ? 'spinning' : ''} />
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/settings')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Settings size={12} /> Settings
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/audit')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <FileText size={12} /> Audit
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/users')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Users size={12} /> Users
          </button>
          <button className="glowing-btn" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 24px 0' }}>
        {/* Metrics */}
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <CloudRain size={14} color="var(--text-secondary)" /> Total Workflows
            </div>
            <div className="metric-value">{totalRuns.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <ShieldAlert size={14} color="var(--error-color)" /> Failures
            </div>
            <div className="metric-value danger">{totalFailures}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label">
              <BarChart3 size={14} color="var(--success-color)" /> Success Rate
            </div>
            <div className="metric-value success">{healthPct}%</div>
          </div>
        </div>

        {/* Events Table */}
        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Recent Runs</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {pagination.total.toLocaleString()} total events
              </span>
            </div>
            <FilterBar repos={repos} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Repository</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Time</th>
                  <th style={{ width: '100px' }}>Actions</th>
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
                          if (e.key === 'Enter') navigate(`/dashboard/repo/${encodeURIComponent(evt.repo_name)}`);
                        }}
                        style={{ outline: 'none', cursor: 'pointer' }}
                        onClick={() => navigate(`/dashboard/repo/${encodeURIComponent(evt.repo_name)}`)}
                      >
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          #{String(evt.id).padStart(4, '0')}
                        </td>
                        <td style={{ color: 'var(--accent-color)', fontWeight: '500', fontSize: '13px' }}>
                          {evt.repo_name}
                        </td>
                        <td style={{ fontSize: '13px' }}>{evt.workflow_name}</td>
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
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(evt.created_at)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a href={evt.run_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px' }}>
                              Inspect
                            </a>
                            {['failure', 'cancelled'].includes(evt.conclusion) && (
                              <>
                                <button
                                  className="glowing-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px', opacity: analysisStatus[evt.id] === 'loading' ? 0.6 : 1 }}
                                  disabled={analysisStatus[evt.id] === 'loading'}
                                  onClick={() => handleAnalyze(evt.run_url, evt.id)}
                                  title="Analyze failure logs with AI"
                                >
                                  <Brain size={10} />
                                </button>
                                <button
                                  className="glowing-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px', opacity: triageStatus[evt.id] === 'loading' ? 0.6 : 1 }}
                                  disabled={triageStatus[evt.id] === 'loading' || triageStatus[evt.id] === 'success'}
                                  onClick={() => handleTriage(evt.run_url, evt.id)}
                                  title="Auto-triage failure"
                                >
                                  <GitBranch size={10} />
                                </button>
                                <button
                                  className="glowing-btn"
                                  style={{ padding: '4px 8px', fontSize: '10px', opacity: rerunStatus[evt.id] === 'loading' ? 0.6 : 1 }}
                                  disabled={rerunStatus[evt.id] === 'loading' || rerunStatus[evt.id] === 'success'}
                                  onClick={() => handleRerun(evt.run_url, evt.id)}
                                  title="Re-run workflow"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {!loading && events.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No events found. Configure webhooks to start receiving data.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
