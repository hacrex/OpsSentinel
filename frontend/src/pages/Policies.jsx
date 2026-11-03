import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Save, Terminal
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const Policies = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ enabled: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', condition: '', action: '', requires_approval: false, enabled: true });
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPolicies = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.enabled !== '') params.enabled = activeFilters.enabled;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/policies', { params });
      setPolicies(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch policies:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies(1, { enabled: '', search: '' });
  }, [fetchPolicies]);

  useSocket((msg) => {
    if (msg.type === 'new_policy') {
      addToast(`New Policy: ${msg.policy.name}`, 'info');
      fetchPolicies(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchPolicies(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchPolicies(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { enabled: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchPolicies(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchPolicies(page, filters);
  };

  const handleCreateOpen = () => {
    setEditForm({ name: '', description: '', condition: '', action: '', requires_approval: false, enabled: true });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/policies', {
        name: editForm.name,
        description: editForm.description,
        condition: editForm.condition,
        action: editForm.action,
        requires_approval: editForm.requires_approval,
        enabled: editForm.enabled,
      });
      addToast('Policy created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchPolicies(pagination.page, filtersRef.current);
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || 'Failed to create policy', 'error');
    }
  };

  const handleEditOpen = (policy) => {
    setEditingPolicy(policy);
    setEditForm({
      name: policy.name,
      description: policy.description || '',
      condition: policy.condition,
      action: policy.action,
      requires_approval: policy.requires_approval === 1 || policy.requires_approval === true,
      enabled: policy.enabled === 1 || policy.enabled === true,
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingPolicy(null);
    setEditForm({ name: '', description: '', condition: '', action: '', requires_approval: false, enabled: true });
  };

  const handleEditChange = (key, value) => {
    setEditForm({ ...editForm, [key]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading((s) => ({ ...s, [editingPolicy.id]: true }));
    try {
      await api.patch(`/policies/${editingPolicy.id}`, {
        name: editForm.name,
        description: editForm.description,
        condition: editForm.condition,
        action: editForm.action,
        requires_approval: editForm.requires_approval,
        enabled: editForm.enabled,
      });
      addToast('Policy updated', 'success');
      setEditOpen(false);
      setUpdateLoading((s) => ({ ...s, [editingPolicy.id]: false }));
      fetchPolicies(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [editingPolicy.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update policy', 'error');
    }
  };

  const handleToggleEnabled = async (id, currentEnabled) => {
    setUpdateLoading((s) => ({ ...s, [id]: true }));
    try {
      await api.patch(`/policies/${id}`, { enabled: !currentEnabled });
      addToast(`Policy ${!currentEnabled ? 'enabled' : 'disabled'}`, 'success');
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      fetchPolicies(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      addToast(err.response?.data?.error || 'Failed to update policy', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await api.delete(`/policies/${id}`);
      addToast('Policy deleted', 'success');
      fetchPolicies(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete policy', 'error');
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

  const totalPolicies = pagination.total;
  const enabledCount = policies.filter((p) => p.enabled === 1 || p.enabled === true).length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <ShieldAlert size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Policy Engine
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Policy
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
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Policies</div>
            <div className="metric-value">{totalPolicies.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Toggle size={14} color="var(--success-color)" /> Enabled</div>
            <div className="metric-value success">{enabledCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><ShieldAlert size={14} color="var(--text-secondary)" /> Require Approval</div>
            <div className="metric-value">{policies.filter((p) => p.requires_approval === 1 || p.requires_approval === true).length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Policies</h2>
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
                  <th>Condition</th>
                  <th>Action</th>
                  <th>Approval</th>
                  <th>Enabled</th>
                  <th>Created</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={8} rows={8} />
                ) : (
                  policies.map((pol) => (
                    <tr key={pol.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(pol.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500' }}>{pol.name}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pol.condition}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-color)' }}>{pol.action}</td>
                      <td style={{ fontSize: '12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '10px', color: 'rgba(245,158,11,0.9)' }}>
                          {pol.requires_approval === 1 || pol.requires_approval === true ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '2px 8px', fontSize: '10px', opacity: updateLoading[pol.id] ? 0.6 : 1 }}
                          disabled={updateLoading[pol.id]}
                          onClick={() => handleToggleEnabled(pol.id, pol.enabled === 1 || pol.enabled === true)}
                          title="Toggle enabled"
                        >
                          {pol.enabled === 1 || pol.enabled === true ? 'ON' : 'OFF'}
                        </button>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(pol.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', opacity: updateLoading[pol.id] ? 0.6 : 1 }}
                          disabled={updateLoading[pol.id]}
                          onClick={() => handleEditOpen(pol)}
                          title="Edit policy"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(pol.id)}
                          title="Delete policy"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && policies.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No policies found. Create one to define governance rules for infrastructure changes.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      {/* Create Policy Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '460px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create Policy</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} placeholder="e.g. Production Apply Approval" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', minHeight: '80px' }} value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} placeholder="What this policy governs" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Condition</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.condition} onChange={(e) => handleEditChange('condition', e.target.value)} placeholder="e.g. repo == 'prod' && engine == 'tofu' && operation == 'apply'" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action} onChange={(e) => handleEditChange('action', e.target.value)} placeholder="e.g. require_approval / block / notify" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="requires_approval"
                  type="checkbox"
                  checked={editForm.requires_approval}
                  onChange={(e) => handleEditChange('requires_approval', e.target.checked)}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="requires_approval">Require approval before execution</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="enabled"
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => handleEditChange('enabled', e.target.checked)}
                  style={{ accentColor: 'var(--success-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="enabled">Policy enabled</label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {editOpen && editingPolicy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '460px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Policy</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.name} onChange={(e) => handleEditChange('name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', minHeight: '80px' }} value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Condition</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.condition} onChange={(e) => handleEditChange('condition', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action} onChange={(e) => handleEditChange('action', e.target.value)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="requires_approval"
                  type="checkbox"
                  checked={editForm.requires_approval}
                  onChange={(e) => handleEditChange('requires_approval', e.target.checked)}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="requires_approval">Require approval before execution</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="enabled"
                  type="checkbox"
                  checked={editForm.enabled}
                  onChange={(e) => handleEditChange('enabled', e.target.checked)}
                  style={{ accentColor: 'var(--success-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="enabled">Policy enabled</label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={updateLoading[editingPolicy.id]}>
                  {updateLoading[editingPolicy.id] ? 'Updating...' : 'Save Changes'}
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

export default Policies;
