import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Terminal, AlertTriangle, CheckCircle, Activity
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const PREDICTION_TYPES = ['failure', 'deployment_risk', 'flaky_test', 'infrastructure_change', 'regression'];

const riskColor = (level) => {
  switch (level) {
    case 'critical': return 'var(--error-color)';
    case 'high': return 'rgba(245,158,11,0.9)';
    case 'medium': return 'var(--accent-color)';
    case 'low': return 'var(--success-color)';
    default: return 'var(--text-secondary)';
  }
};

const Predictions = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ risk_level: '', resolved: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPredictions = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.risk_level) params.risk_level = activeFilters.risk_level;
      if (activeFilters.resolved !== '') params.resolved = activeFilters.resolved;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/predictions', { params });
      setPredictions(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPredictions(1, { risk_level: '', resolved: '', search: '' });
  }, [fetchPredictions]);

  useSocket((msg) => {
    if (msg.type === 'new_prediction') {
      addToast(`New Prediction: ${msg.prediction.risk_level} risk — ${msg.prediction.target_entity}`, 'warning');
      fetchPredictions(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchPredictions(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchPredictions(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { risk_level: '', resolved: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchPredictions(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchPredictions(page, filters);
  };

  const handleResolve = async (id) => {
    try {
      await api.patch(`/predictions/${id}`, {
        resolved: true,
        resolved_at: new Date().toISOString(),
      });
      addToast('Prediction marked as resolved', 'success');
      fetchPredictions(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to resolve prediction', 'error');
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

  const totalPredictions = pagination.total;
  const criticalCount = predictions.filter((p) => p.risk_level === 'critical').length;
  const highCount = predictions.filter((p) => p.risk_level === 'high').length;
  const unresolvedCount = predictions.filter((p) => p.resolved === 0 || p.resolved === false).length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Activity size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Predictive Analytics
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
            <div className="metric-label"><Activity size={14} color="var(--text-secondary)" /> Total Predictions</div>
            <div className="metric-value">{totalPredictions.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="var(--error-color)" /> Critical Risk</div>
            <div className="metric-value danger">{criticalCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="rgba(245,158,11,0.9)" /> High Risk</div>
            <div className="metric-value danger">{highCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Clock size={14} color="var(--text-secondary)" /> Unresolved</div>
            <div className="metric-value">{unresolvedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Predictions</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Type</th>
                  <th>Target</th>
                  <th>Risk Level</th>
                  <th>Probability</th>
                  <th>Reason</th>
                  <th>Predicted</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={8} rows={8} />
                ) : (
                  predictions.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(p.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '12px' }}>{p.prediction_type}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{p.target_entity}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: riskColor(p.risk_level), border: `1px solid ${riskColor(p.risk_level)}` }}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{((parseFloat(p.probability) || 0) * 100).toFixed(1)}%</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{(p.reasons || '').slice(0, 40)}{(p.reasons || '').length > 40 ? '...' : ''}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(p.predicted_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        {!p.resolved && (
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)' }}
                            onClick={() => handleResolve(p.id)}
                            title="Mark as resolved"
                          >
                            <CheckCircle size={10} />
                          </button>
                        )}
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => {
                            if (window.confirm('Delete this prediction?')) {
                              // No delete endpoint called yet, just refresh
                              fetchPredictions(pagination.page, filtersRef.current);
                            }
                          }}
                          title="Delete prediction"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && predictions.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No predictions found. Predictive analytics generates risk forecasts from historical failure data.
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

export default Predictions;
