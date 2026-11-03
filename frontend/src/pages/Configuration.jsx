import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Save, Terminal, FileText
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const TOOLS = ['ansible', 'chef', 'puppet', 'saltstack', 'inspec', 'powershell-dsc', 'stackstorm', 'rudder'];

const toolLabel = (t) => {
  switch (t) {
    case 'ansible': return 'Ansible';
    case 'chef': return 'Chef';
    case 'puppet': return 'Puppet';
    case 'saltstack': return 'SaltStack';
    case 'inspec': return 'InSpec';
    case 'powershell-dsc': return 'PowerShell DSC';
    case 'stackstorm': return 'StackStorm';
    case 'rudder': return 'Rudder';
    default: return t;
  }
};

const Configuration = () => {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ repo: '', tool: '', conclusion: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchRuns = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.repo) params.repo = activeFilters.repo;
      if (activeFilters.tool) params.tool = activeFilters.tool;
      if (activeFilters.conclusion) params.conclusion = activeFilters.conclusion;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/configuration/runs', { params });
      setRuns(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch config runs:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns(1, { repo: '', tool: '', conclusion: '', search: '' });
  }, [fetchRuns]);

  useSocket((msg) => {
    if (msg.type === 'new_config_run') {
      const evt = msg.event;
      if (evt.conclusion === 'failure') {
        addToast(`Config Failure: ${evt.playbook} — ${evt.tool}`, 'error');
      } else {
        addToast(`Config ${evt.conclusion}: ${evt.playbook}`, 'success');
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
    const reset = { repo: '', tool: '', conclusion: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchRuns(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchRuns(page, filters);
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
          <FileText size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Configuration
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleRefresh} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <RotateCcw size={12} className={refreshing ? 'spinning' : ''} />
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
            <div className="metric-label"><FileText size={14} color="var(--text-secondary)" /> Total Config Runs</div>
            <div className="metric-value">{totalRuns.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldAlert size={14} color="var(--error-color)" /> Failures</div>
            <div className="metric-value danger">{totalFailures}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Shield size={14} color="var(--success-color)" /> Success Rate</div>
            <div className="metric-value success">{healthPct}%</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Configuration Runs</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total runs</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Repository</th>
                  <th>Tool</th>
                  <th>Playbook</th>
                  <th>Inventory</th>
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
                  runs.map((run) => (
                    <tr key={run.id} style={{ outline: 'none', cursor: 'pointer' }}
                        onClick={() => run.output_url && window.open(run.output_url, '_blank')}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(run.id).padStart(4, '0')}</td>
                      <td style={{ color: 'var(--accent-color)', fontWeight: '500', fontSize: '13px' }}>{run.repo_name}</td>
                      <td style={{ fontSize: '13px' }}>{toolLabel(run.tool)}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{run.playbook}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{run.inventory || '—'}</td>
                      <td><span className={`status-badge ${run.status === 'completed' ? 'status-success' : 'status-pending'}`}>{run.status}</span></td>
                      <td><span className={`status-badge ${run.conclusion === 'failure' ? 'status-failure' : 'status-success'}`}>{run.conclusion || 'PENDING'}</span></td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(run.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        {run.output_url && (
                          <a href={run.output_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={(e) => e.stopPropagation()}>
                            Logs
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && runs.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No configuration runs found. Run Ansible/Chef/Puppet playbooks and report results to OpsSentinel.
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

export default Configuration;
