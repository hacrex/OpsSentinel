import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Terminal, AlertTriangle, CheckCircle, GitBranch
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const DRIFT_TYPES = ['configuration', 'infrastructure', 'state', 'policy', 'security'];
const STATUSES = ['detected', 'investigating', 'remediated', 'dismissed'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const driftTypeLabel = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const riskColor = (level) => {
  switch (level) {
    case 'critical': return 'var(--error-color)';
    case 'high': return 'rgba(245,158,11,0.9)';
    case 'medium': return 'var(--accent-color)';
    case 'low': return 'var(--success-color)';
    default: return 'var(--text-secondary)';
  }
};

const Drift = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', severity: '', engine: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchDriftEvents = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeFilters.severity) params.severity = activeFilters.severity;
      if (activeFilters.engine) params.engine = activeFilters.engine;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/drift/events', { params });
      setEvents(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch drift events:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDriftEvents(1, { status: '', severity: '', engine: '', search: '' });
  }, [fetchDriftEvents]);

  useSocket((msg) => {
    if (msg.type === 'new_drift_event') {
      addToast(`New Drift: ${msg.event.severity} — ${msg.event.resource_name}`, 'warning');
      fetchDriftEvents(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchDriftEvents(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchDriftEvents(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { status: '', severity: '', engine: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchDriftEvents(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchDriftEvents(page, filters);
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/drift/events/${id}`, {
        status: 'remediated',
        resolved_at: new Date().toISOString(),
      });
      addToast('Drift event remediated', 'success');
      fetchDriftEvents(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to remediate drift', 'error');
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

  const totalEvents = pagination.total;
  const criticalCount = events.filter((e) => e.severity === 'critical').length;
  const unresolvedCount = events.filter((e) => e.status !== 'remediated' && e.status !== 'dismissed').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <GitBranch size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Drift Detection
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
            <div className="metric-label"><GitBranch size={14} color="var(--text-secondary)" /> Total Drift Events</div>
            <div className="metric-value">{totalEvents.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="var(--error-color)" /> Critical</div>
            <div className="metric-value danger">{criticalCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Clock size={14} color="var(--text-secondary)" /> Unresolved</div>
            <div className="metric-value">{unresolvedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Drift Events</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Engine</th>
                  <th>Stack</th>
                  <th>Drift Type</th>
                  <th>Resource</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Detected</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={9} rows={8} />
                ) : (
                  events.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(e.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px' }}>{e.engine}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{e.stack_name}</td>
                      <td style={{ fontSize: '12px' }}>{driftTypeLabel(e.drift_type)}</td>
                      <td style={{ fontSize: '12px' }}>{e.resource_type} / {e.resource_name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: riskColor(e.severity), border: `1px solid ${riskColor(e.severity)}` }}>
                          {e.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: e.status === 'remediated' ? 'var(--success-color)' : 'rgba(245,158,11,0.9)' }}>
                          {e.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(e.detected_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        {e.status !== 'remediated' && e.status !== 'dismissed' && (
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)' }}
                            onClick={() => handleResolve(e.id)}
                            title="Mark as remediated"
                          >
                            <CheckCircle size={10} />
                          </button>
                        )}
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => {
                            if (window.confirm('Delete this drift event?')) {
                              fetchDriftEvents(pagination.page, filtersRef.current);
                            }
                          }}
                          title="Delete drift event"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && events.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No drift events found. Drift detection compares desired state against actual infrastructure state.
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

export default Drift;
