import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search,
  Edit2, Trash2, Terminal, AlertTriangle
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const CATEGORIES = ['dependency', 'test', 'build', 'docker', 'auth', 'network', 'infrastructure', 'deployment', 'timeout', 'configuration', 'resource', 'external', 'unknown'];

const categoryLabel = (c) => c.charAt(0).toUpperCase() + c.slice(1);

const Fingerprints = () => {
  const navigate = useNavigate();
  const [fingerprints, setFingerprints] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ category: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchFingerprints = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.category) params.category = activeFilters.category;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/fingerprints', { params });
      setFingerprints(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch fingerprints:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFingerprints(1, { category: '', search: '' });
  }, [fetchFingerprints]);

  useSocket((msg) => {
    if (msg.type === 'new_fingerprint') {
      addToast(`New Failure Fingerprint: ${msg.fingerprint.category_label || msg.fingerprint.category}`, 'warning');
      fetchFingerprints(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchFingerprints(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchFingerprints(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { category: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchFingerprints(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchFingerprints(page, filters);
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    try { return format(new Date(ts.endsWith('Z') ? ts : ts + 'Z'), 'MM/dd/yy HH:mm:ss'); } catch { return ts; }
  };

  const totalFingerprints = pagination.total;
  const totalOccurrences = fingerprints.reduce((acc, f) => acc + (parseInt(f.occurrence_count, 10) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <AlertTriangle size={24} style={{ color: 'rgba(245,158,11,0.9)' }} />
          OpsSentinel — Failure Fingerprints
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
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Fingerprints</div>
            <div className="metric-value">{totalFingerprints.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="var(--text-secondary)" /> Total Occurrences</div>
            <div className="metric-value danger">{totalOccurrences}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldAlert size={14} color="var(--accent-color)" /> Categories</div>
            <div className="metric-value">{fingerprints.length > 0 ? [...new Set(fingerprints.map((f) => f.category))].length : '0'}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Failure Fingerprints</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Category</th>
                  <th>Label</th>
                  <th>Occurrences</th>
                  <th>Repos</th>
                  <th>Workflows</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={9} rows={8} />
                ) : (
                  fingerprints.map((fp) => (
                    <tr key={fp.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(fp.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '12px', fontWeight: '500' }}>{categoryLabel(fp.category)}</td>
                      <td style={{ fontSize: '12px' }}>{fp.category_label || '—'}</td>
                      <td style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>{fp.occurrence_count}</td>
                      <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{(fp.repositories || '').split(',').filter(Boolean).length}</td>
                      <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{(fp.workflows || '').split(',').filter(Boolean).length}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(fp.first_seen)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(fp.last_seen)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => {
                            const rootCause = fp.root_cause || 'No root cause analysis available.';
                            const suggestedFix = fp.suggested_fix || 'No suggested fix available.';
                            addToast(`${fp.category_label || fp.category}: ${rootCause}\nFix: ${suggestedFix}`, 'info');
                          }}
                          title="View details"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => {
                            if (window.confirm('Delete this fingerprint?')) {
                              // No delete endpoint yet, just refresh
                              fetchFingerprints(pagination.page, filtersRef.current);
                            }
                          }}
                          title="Delete fingerprint"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && fingerprints.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No failure fingerprints found. Failures will be fingerprinted as they occur.
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

export default Fingerprints;
