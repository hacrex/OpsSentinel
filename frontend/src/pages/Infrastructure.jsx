import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, BarChart3, LogOut, RotateCcw, Settings, RefreshCw, Search, Clock, Terminal, Plus, Trash2, Save, Play, Terminal as TerminalIcon } from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const ENGINES = ['tofu', 'terraform', 'ansible', 'pulumi', 'cloudformation', 'crossplane', 'aws-cdk', 'bicep', 'packer', 'vagrant'];
const OPERATIONS = ['plan', 'apply', 'destroy', 'refresh'];

const Infrastructure = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [stacks, setStacks] = useState([]);
  const [repos, setRepos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ repo: '', stack: '', engine: '', operation: '', conclusion: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rerunStatus, setRerunStatus] = useState({});
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [stackFormOpen, setStackFormOpen] = useState(false);
  const [newStack, setNewStack] = useState({ repo_name: '', stack_name: '', engine: 'tofu', working_dir: '', default_vars: '' });
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

  const fetchStacks = useCallback(async () => {
    try {
      const res = await api.get('/infrastructure/stacks');
      setStacks(res.data || []);
      const uniqueRepos = [...new Set((res.data || []).map((s) => s.repo_name))];
      setRepos(uniqueRepos);
    } catch { /* non-critical */ }
  }, []);

  const fetchRepos = useCallback(async () => {
    try {
      const res = await api.get('/infrastructure/runs', { params: { page: 1, limit: 1 } });
      setRepos([]);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => {
    fetchRuns(1, { repo: '', stack: '', engine: '', operation: '', conclusion: '', search: '' });
    fetchStacks();
  }, [fetchRuns, fetchStacks]);

  useSocket((msg) => {
    if (msg.type === 'new_infra_run') {
      const evt = msg.event;
      if (evt.conclusion === 'failure') {
        addToast(`Infra Failure: ${evt.stack_name} — ${evt.engine}:${evt.operation}`, 'error');
      } else {
        addToast(`Infra ${evt.conclusion}: ${evt.stack_name}`, 'success');
      }
      fetchRuns(1, filtersRef.current);
      fetchStacks();
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

  const handleDeleteStack = async (id) => {
    if (!window.confirm('Delete this stack configuration?')) return;
    try {
      await api.delete(`/infrastructure/stacks/${id}`);
      addToast('Stack deleted', 'success');
      fetchStacks();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete stack', 'error');
    }
  };

  const handleTriggerOpen = () => {
    setNewStack({ repo_name: '', stack_name: '', engine: 'tofu', working_dir: '', default_vars: '' });
    setTriggerOpen(true);
  };

  const handleTriggerClose = () => setTriggerOpen(false);

  const handleTriggerSubmit = async (e) => {
    e.preventDefault();
    setTriggerLoading(true);
    try {
      const defaultVars = newStack.default_vars ? JSON.parse(newStack.default_vars) : {};
      await api.post('/infrastructure/runs', {
        repo_name: newStack.repo_name,
        stack_name: newStack.stack_name,
        engine: newStack.engine,
        operation: 'apply',
        workingDir: newStack.working_dir,
        vars: defaultVars,
      });
      addToast('Infrastructure run triggered', 'success');
      setTriggerOpen(false);
      setTriggerLoading(false);
      fetchRuns(pagination.page, filtersRef.current);
      fetchStacks();
    } catch (err) {
      setTriggerLoading(false);
      addToast(err.response?.data?.error || 'Failed to trigger run', 'error');
    }
  };

  const handleStackOpen = () => {
    setNewStack({ repo_name: '', stack_name: '', engine: 'tofu', working_dir: '', default_vars: '' });
    setStackFormOpen(true);
  };

  const handleStackClose = () => setStackFormOpen(false);

  const handleStackChange = (key, value) => {
    setNewStack({ ...newStack, [key]: value });
  };

  const handleStackSubmit = async (e) => {
    e.preventDefault();
    try {
      const defaultVars = newStack.default_vars ? JSON.parse(newStack.default_vars) : {};
      await api.post('/infrastructure/stacks', {
        repo_name: newStack.repo_name,
        stack_name: newStack.stack_name,
        engine: newStack.engine,
        working_dir: newStack.working_dir,
        default_vars: defaultVars,
      });
      addToast('Stack saved', 'success');
      setStackFormOpen(false);
      fetchStacks();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to save stack', 'error');
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
          <button className="glowing-btn" onClick={handleTriggerOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> Trigger Run
          </button>
          <button className="glowing-btn" onClick={handleStackOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Save size={12} /> Stack Config
          </button>
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

        {/* Stack Config Panel */}
        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Stack Configurations</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{stacks.length} configured</span>
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Repo</th>
                    <th>Stack</th>
                    <th>Engine</th>
                    <th>Working Dir</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stacks.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No stacks configured. Add a stack to trigger runs by name.</td></tr>
                  ) : (
                    stacks.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontSize: '13px' }}>{s.repo_name}</td>
                        <td style={{ fontSize: '13px', fontWeight: '500' }}>{s.stack_name}</td>
                        <td style={{ fontSize: '12px' }}>{s.engine}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{s.working_dir}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }} onClick={() => handleDeleteStack(s.id)} title="Delete stack">
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Runs List */}
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
                No infrastructure runs found. Configure a stack and trigger a plan/apply.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      {/* Trigger Run Modal */}
      {triggerOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Trigger Infrastructure Run</h2>
            <form onSubmit={handleTriggerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Repository</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.repo_name} onChange={(e) => handleStackChange('repo_name', e.target.value)} placeholder="owner/repo" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Stack Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.stack_name} onChange={(e) => handleStackChange('stack_name', e.target.value)} placeholder="production" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Engine</label>
                <select required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.engine} onChange={(e) => handleStackChange('engine', e.target.value)}>
                  {ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Working Directory</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.working_dir} onChange={(e) => handleStackChange('working_dir', e.target.value)} placeholder="./infra/my-stack" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Default Variables (JSON)</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace' }} value={newStack.default_vars} onChange={(e) => handleStackChange('default_vars', e.target.value)} placeholder='{"region": "us-east-1"}' />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleTriggerClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={triggerLoading}>
                  {triggerLoading ? 'Triggering...' : <><Play size={12} /> Trigger Run</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stack Config Modal */}
      {stackFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Save Stack Configuration</h2>
            <form onSubmit={handleStackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Repository</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.repo_name} onChange={(e) => handleStackChange('repo_name', e.target.value)} placeholder="owner/repo" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Stack Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.stack_name} onChange={(e) => handleStackChange('stack_name', e.target.value)} placeholder="production" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Engine</label>
                <select required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.engine} onChange={(e) => handleStackChange('engine', e.target.value)}>
                  {ENGINES.map((eng) => <option key={eng} value={eng}>{eng}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Working Directory</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={newStack.working_dir} onChange={(e) => handleStackChange('working_dir', e.target.value)} placeholder="./infra/my-stack" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Default Variables (JSON)</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace' }} value={newStack.default_vars} onChange={(e) => handleStackChange('default_vars', e.target.value)} placeholder='{"region": "us-east-1"}' />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleStackClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Save Stack</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Infrastructure;
