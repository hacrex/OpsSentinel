import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Save, Eye, EyeOff, Terminal
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const PROVIDERS = ['vault', 'aws-secrets-manager', 'azure-key-vault', 'gcp-secret-manager', 'kubernetes', 'env'];
const SCOPES = ['global', 'repo', 'stack', 'environment'];

const providerLabel = (p) => {
  switch (p) {
    case 'vault': return 'HashiCorp Vault';
    case 'aws-secrets-manager': return 'AWS Secrets Manager';
    case 'azure-key-vault': return 'Azure Key Vault';
    case 'gcp-secret-manager': return 'GCP Secret Manager';
    case 'kubernetes': return 'Kubernetes Secrets';
    case 'env': return 'Environment Variable';
    default: return p;
  }
};

const Secrets = () => {
  const navigate = useNavigate();
  const [secrets, setSecrets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ provider: '', scope: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', value: '', provider: '', scope: '' });
  const [showValue, setShowValue] = useState({});
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchSecrets = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.provider) params.provider = activeFilters.provider;
      if (activeFilters.scope) params.scope = activeFilters.scope;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/secrets', { params });
      setSecrets(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch secrets:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSecrets(1, { provider: '', scope: '', search: '' });
  }, [fetchSecrets]);

  useSocket((msg) => {
    if (msg.type === 'new_secret') {
      addToast(`New Secret: ${msg.secret.name}`, 'info');
      fetchSecrets(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchSecrets(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchSecrets(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { provider: '', scope: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchSecrets(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchSecrets(page, filters);
  };

  const handleCreateOpen = () => {
    setEditForm({ name: '', value: '', provider: 'env', scope: 'global' });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/secrets', {
        name: editForm.name,
        value: editForm.value,
        provider: editForm.provider,
        scope: editForm.scope,
      });
      addToast('Secret created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchSecrets(pagination.page, filtersRef.current);
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || 'Failed to create secret', 'error');
    }
  };

  const handleEditOpen = (secret) => {
    setEditingSecret(secret);
    setEditForm({
      name: secret.name,
      value: secret.value || '',
      provider: secret.provider,
      scope: secret.scope,
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingSecret(null);
    setEditForm({ name: '', value: '', provider: '', scope: '' });
  };

  const handleEditChange = (key, value) => {
    setEditForm({ ...editForm, [key]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading((s) => ({ ...s, [editingSecret.id]: true }));
    try {
      await api.patch(`/secrets/${editingSecret.id}`, {
        name: editForm.name,
        value: editForm.value,
        provider: editForm.provider,
        scope: editForm.scope,
      });
      addToast('Secret updated', 'success');
      setEditOpen(false);
      setUpdateLoading((s) => ({ ...s, [editingSecret.id]: false }));
      fetchSecrets(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [editingSecret.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update secret', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this secret?')) return;
    try {
      await api.delete(`/secrets/${id}`);
      addToast('Secret deleted', 'success');
      fetchSecrets(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete secret', 'error');
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

  const totalSecrets = pagination.total;
  const byProvider = secrets.reduce((acc, s) => {
    acc[s.provider] = (acc[s.provider] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Secrets
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Secret
          </button>
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
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Secrets</div>
            <div className="metric-value">{totalSecrets.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Save size={14} color="var(--text-secondary)" /> Providers</div>
            <div className="metric-value">{Object.keys(byProvider).length}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldAlert size={14} color="var(--text-secondary)" /> Encrypted at Rest</div>
            <div className="metric-value success">Yes</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Secrets</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Name</th>
                  <th>Provider</th>
                  <th>Scope</th>
                  <th>Value</th>
                  <th>Updated</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} rows={8} />
                ) : (
                  secrets.map((sec) => (
                    <tr key={sec.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(sec.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{sec.name}</td>
                      <td style={{ fontSize: '12px' }}>{providerLabel(sec.provider)}</td>
                      <td style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{sec.scope}</td>
                      <td>
                        {showValue[sec.id] ? (
                          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{sec.value}</span>
                        ) : (
                          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>••••••••</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(sec.updated_at || sec.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', opacity: updateLoading[sec.id] ? 0.6 : 1 }}
                          disabled={updateLoading[sec.id]}
                          onClick={() => handleEditOpen(sec)}
                          title="Edit secret"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => setShowValue((s) => ({ ...s, [sec.id]: !showValue[sec.id] }))}
                          title="Toggle value visibility"
                        >
                          {showValue[sec.id] ? <EyeOff size={10} /> : <Eye size={10} />}
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(sec.id)}
                          title="Delete secret"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && secrets.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No secrets found. Add one to store infrastructure credentials.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      {/* Create Secret Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create Secret</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} placeholder="e.g. DB_PASSWORD" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Value</label>
                <input required type="password" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.value} onChange={(e) => handleEditChange('value', e.target.value)} placeholder="secret value" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Provider</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.provider} onChange={(e) => handleEditChange('provider', e.target.value)}>
                  {PROVIDERS.map((p) => <option key={p} value={p}>{providerLabel(p)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Scope</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.scope} onChange={(e) => handleEditChange('scope', e.target.value)}>
                  {SCOPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Secret'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Secret Modal */}
      {editOpen && editingSecret && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Secret</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Value</label>
                <input type="password" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.value} onChange={(e) => handleEditChange('value', e.target.value)} placeholder="leave blank to keep current" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Provider</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.provider} onChange={(e) => handleEditChange('provider', e.target.value)}>
                  {PROVIDERS.map((p) => <option key={p} value={p}>{providerLabel(p)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Scope</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.scope} onChange={(e) => handleEditChange('scope', e.target.value)}>
                  {SCOPES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={updateLoading[editingSecret.id]}>
                  {updateLoading[editingSecret.id] ? 'Updating...' : 'Save Changes'}
                </button>
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

export default Secrets;
