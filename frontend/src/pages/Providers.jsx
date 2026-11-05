import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cloud, Plus, ShieldCheck, RefreshCw, Edit2, Trash2, LogOut, Settings,
  CheckCircle, XCircle
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';

const statusColor = (status) => {
  switch (status) {
    case 'valid': return 'var(--success-color)';
    case 'invalid': return 'var(--error-color)';
    default: return 'rgba(245,158,11,0.9)';
  }
};

const Providers = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ provider: '', name: '', credentials: {} });
  const [editOpen, setEditOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', credentials: {} });
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const fetchProviders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const [catRes, provRes] = await Promise.all([
        api.get('/providers/catalog'),
        api.get('/providers'),
      ]);
      setCatalog(Array.isArray(catRes.data) ? catRes.data : []);
      setConnections(provRes.data?.data || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders(false);
  }, [fetchProviders]);

  const providerLabel = (id) => {
    const c = catalog.find((x) => x.id === id);
    return c ? c.label : id;
  };

  const catalogFields = (providerId) =>
    (catalog.find((x) => x.id === providerId)?.fields) || [];

  // For the Edit modal: prefer the per-connection field list (it carries the
  // 'present' / 'preview' flags the server returns alongside the catalog shape).
  const editFields = (conn) =>
    (conn.fields && conn.fields.length > 0 ? conn.fields : catalogFields(conn.provider));

  const handleCreateOpen = () => {
    const firstProvider = catalog.length ? catalog[0].id : '';
    setCreateForm({ provider: firstProvider, name: '', credentials: {} });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateFormChange = (key, value) => {
    setCreateForm((f) => ({ ...f, [key]: value }));
  };

  const handleCreateFieldChange = (key, value) => {
    setCreateForm((f) => ({ ...f, credentials: { ...f.credentials, [key]: value } }));
  };

  const handleCreateProviderChange = (providerId) => {
    setCreateForm((f) => ({ ...f, provider: providerId, credentials: {} }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(createForm.credentials).filter(([, v]) => v && String(v).trim() !== '')
    );
    if (catalogFields(createForm.provider).length > 0 && Object.keys(filled).length === 0) {
      addToast('Fill in at least one credential field', 'error');
      return;
    }
    setCreateLoading(true);
    try {
      await api.post('/providers', {
        provider: createForm.provider,
        name: createForm.name,
        credentials: filled,
      });
      addToast('Provider connection created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchProviders(false);
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to create connection', 'error');
    }
  };

  const handleEditOpen = (conn) => {
    setEditingConnection(conn);
    setEditForm({ name: conn.name || '', credentials: {} });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingConnection(null);
    setEditForm({ name: '', credentials: {} });
  };

  const handleEditFieldChange = (key, value) => {
    setEditForm((f) => ({ ...f, credentials: { ...f.credentials, [key]: value } }));
  };

  const handleEditNameChange = (value) => {
    setEditForm((f) => ({ ...f, name: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const filled = Object.fromEntries(
      Object.entries(editForm.credentials).filter(([, v]) => v && String(v).trim() !== '')
    );
    setUpdateLoading(true);
    try {
      await api.patch(`/providers/${editingConnection.id}`, {
        name: editForm.name,
        credentials: filled,
      });
      addToast('Connection updated — status reset to unvalidated, run Validate', 'success');
      setEditOpen(false);
      setUpdateLoading(false);
      handleEditClose();
      fetchProviders(false);
    } catch (err) {
      setUpdateLoading(false);
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to update connection', 'error');
    }
  };

  const handleValidate = async (conn) => {
    setValidateLoading((s) => ({ ...s, [conn.id]: true }));
    try {
      const res = await api.post(`/providers/${conn.id}/validate`);
      if (res.data.status === 'valid') {
        addToast('Credentials validated successfully', 'success');
      } else {
        const missing = (res.data.missing_fields || []).join(', ');
        addToast(missing ? `Validation failed — missing: ${missing}` : 'Validation failed', 'error');
      }
      fetchProviders(false);
    } catch (err) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to validate connection', 'error');
    } finally {
      setValidateLoading((s) => ({ ...s, [conn.id]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this provider connection?')) return;
    try {
      await api.delete(`/providers/${id}`);
      addToast('Connection deleted', 'success');
      fetchProviders(false);
    } catch (err) {
      addToast(err.response?.data?.error || err.response?.data?.message || 'Failed to delete connection', 'error');
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

  const filledCount = (conn) => ((conn.fields || []).filter((f) => f.present)).length;
  const totalCount = (conn) => (editFields(conn).length);
  const totalConnections = connections.length;
  const completeCount = connections.filter((c) => c.complete || (c.fields?.length && filledCount(c) === c.fields.length)).length;
  const validCount = connections.filter((c) => c.status === 'valid').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Cloud size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Provider Connections
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Connection
          </button>
          <button className="glowing-btn" onClick={() => fetchProviders(true)} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '11px' }}>
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
            <div className="metric-label"><Cloud size={14} color="var(--text-secondary)" /> Total Connections</div>
            <div className="metric-value">{totalConnections.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><CheckCircle size={14} color="var(--text-secondary)" /> Complete</div>
            <div className="metric-value">{completeCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldCheck size={14} color="var(--text-secondary)" /> Valid</div>
            <div className="metric-value success">{validCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '24px' }}>
          {catalog.map((c) => (
            <span
              key={c.id}
              style={{
                padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--border-color)',
                background: 'rgba(15,23,42,0.4)', fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)',
              }}
            >
              {c.label}
            </span>
          ))}
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Connections</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{totalConnections.toLocaleString()} total</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Provider</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Fields</th>
                  <th>Validated</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} rows={8} />
                ) : (
                  connections.map((conn) => (
                    <tr key={conn.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(conn.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '12px' }}>{providerLabel(conn.provider)}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{conn.name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: statusColor(conn.status), border: `1px solid ${statusColor(conn.status)}` }}>
                          {conn.status === 'valid' && <CheckCircle size={10} />}
                          {conn.status === 'invalid' && <XCircle size={10} />}
                          {conn.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: conn.complete ? 'var(--success-color)' : 'rgba(245,158,11,0.9)' }}>
                          {filledCount(conn)}/{totalCount(conn)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(conn.validated_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', opacity: validateLoading[conn.id] ? 0.6 : 1 }}
                          disabled={validateLoading[conn.id]}
                          onClick={() => handleValidate(conn)}
                          title="Validate credentials"
                        >
                          <ShieldCheck size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handleEditOpen(conn)}
                          title="Edit connection"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(conn.id)}
                          title="Delete connection"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && connections.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No provider connections found. Add one to connect cloud accounts and clusters.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Connection Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>New Provider Connection</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Provider</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={createForm.provider} onChange={(e) => handleCreateProviderChange(e.target.value)}>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={createForm.name} onChange={(e) => handleCreateFormChange('name', e.target.value)} placeholder="e.g. prod-aws-account" />
              </div>
              {catalogFields(createForm.provider).map((f) => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {f.label}
                    {f.secret ? <span style={{ marginLeft: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-color)' }}>secret</span> : null}
                  </label>
                  <input
                    type={f.secret ? 'password' : 'text'}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                    value={createForm.credentials[f.key] || ''}
                    onChange={(e) => handleCreateFieldChange(f.key, e.target.value)}
                    placeholder={f.label}
                    autoComplete="off"
                  />
                </div>
              ))}
              {catalogFields(createForm.provider).length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a provider to load its credential fields.</div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Connection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Connection Modal */}
      {editOpen && editingConnection && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Connection</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Provider</label>
                <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  {providerLabel(editingConnection.provider)}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={editForm.name} onChange={(e) => handleEditNameChange(e.target.value)} placeholder="connection name" />
              </div>
              {editFields(editingConnection).map((f) => (
                <div key={f.key}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {f.label}
                    {f.secret ? <span style={{ marginLeft: '6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--accent-color)' }}>secret</span> : null}
                  </label>
                  <input
                    type={f.secret ? 'password' : 'text'}
                    style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }}
                    value={editForm.credentials[f.key] || ''}
                    onChange={(e) => handleEditFieldChange(f.key, e.target.value)}
                    placeholder={f.present
                      ? (f.secret ? '•••••••• (keep existing: leave blank)' : (f.preview || 'stored'))
                      : `Enter ${f.label}`}
                    autoComplete="off"
                  />
                </div>
              ))}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(15,23,42,0.4)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 10px' }}>
                Leave a secret field empty to keep the stored value; blank non-secret fields are cleared. Saving resets the connection status to unvalidated until you Validate again.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={updateLoading}>
                  {updateLoading ? 'Saving...' : 'Save Changes'}
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

export default Providers;
