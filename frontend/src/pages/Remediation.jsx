import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, Save, Play, Terminal, AlertTriangle, CheckCircle
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const ACTION_TYPES = ['rerun_job', 'rollback_deployment', 'restart_service', 'scale_workload', 'refresh_credentials', 'run_playbook', 'apply_fix', 'custom'];
const STATUSES = ['pending', 'approved', 'executing', 'completed', 'failed', 'cancelled'];

const actionLabel = (a) => a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const Remediation = () => {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', action_type: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [editForm, setEditForm] = useState({ fingerprint_hash: '', incident_id: '', action_type: '', action_name: '', status: 'pending', requires_approval: false });
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchActions = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeFilters.action_type) params.action_type = activeFilters.action_type;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/remediation/actions', { params });
      setActions(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch remediation actions:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActions(1, { status: '', action_type: '', search: '' });
  }, [fetchActions]);

  useSocket((msg) => {
    if (msg.type === 'new_remediation_action') {
      addToast(`New Remediation Action: ${msg.action.action_name}`, 'info');
      fetchActions(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchActions(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchActions(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { status: '', action_type: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchActions(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchActions(page, filters);
  };

  const handleCreateOpen = () => {
    setEditForm({ fingerprint_hash: '', incident_id: '', action_type: 'custom', action_name: '', status: 'pending', requires_approval: false });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/remediation/actions', {
        fingerprint_hash: editForm.fingerprint_hash,
        incident_id: editForm.incident_id,
        action_type: editForm.action_type,
        action_name: editForm.action_name,
        status: editForm.status,
        requires_approval: editForm.requires_approval,
      });
      addToast('Remediation action created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchActions(pagination.page, filtersRef.current);
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || 'Failed to create remediation action', 'error');
    }
  };

  const handleEditOpen = (action) => {
    setEditingAction(action);
    setEditForm({
      fingerprint_hash: action.fingerprint_hash,
      incident_id: action.incident_id || '',
      action_type: action.action_type,
      action_name: action.action_name,
      status: action.status,
      requires_approval: action.requires_approval === 1 || action.requires_approval === true,
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingAction(null);
    setEditForm({ fingerprint_hash: '', incident_id: '', action_type: 'custom', action_name: '', status: 'pending', requires_approval: false });
  };

  const handleEditChange = (key, value) => {
    setEditForm({ ...editForm, [key]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading((s) => ({ ...s, [editingAction.id]: true }));
    try {
      await api.patch(`/remediation/actions/${editingAction.id}`, {
        fingerprint_hash: editForm.fingerprint_hash,
        incident_id: editForm.incident_id,
        action_type: editForm.action_type,
        action_name: editForm.action_name,
        status: editForm.status,
        requires_approval: editForm.requires_approval,
      });
      addToast('Remediation action updated', 'success');
      setEditOpen(false);
      setUpdateLoading((s) => ({ ...s, [editingAction.id]: false }));
      fetchActions(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [editingAction.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update remediation action', 'error');
    }
  };

  const handleExecute = async (id) => {
    setUpdateLoading((s) => ({ ...s, [id]: true }));
    try {
      await api.patch(`/remediation/actions/${id}`, {
        status: 'executing',
        executed_at: new Date().toISOString(),
      });
      addToast('Remediation action executed', 'success');
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      fetchActions(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      addToast(err.response?.data?.error || 'Failed to execute action', 'error');
    }
  };

  const handleApprove = async (id) => {
    setUpdateLoading((s) => ({ ...s, [id]: true }));
    try {
      await api.patch(`/remediation/actions/${id}`, {
        status: 'approved',
        approved_at: new Date().toISOString(),
      });
      addToast('Remediation action approved', 'success');
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      fetchActions(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      addToast(err.response?.data?.error || 'Failed to approve action', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this remediation action?')) return;
    try {
      await api.delete(`/remediation/actions/${id}`);
      addToast('Remediation action deleted', 'success');
      fetchActions(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete action', 'error');
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

  const totalActions = pagination.total;
  const pendingCount = actions.filter((a) => a.status === 'pending').length;
  const completedCount = actions.filter((a) => a.status === 'completed').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Automated Remediation
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Action
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
            <div className="metric-label"><Terminal size={14} color="var(--text-secondary)" /> Total Actions</div>
            <div className="metric-value">{totalActions.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="rgba(245,158,11,0.9)" /> Pending</div>
            <div className="metric-value danger">{pendingCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><CheckCircle size={14} color="var(--success-color)" /> Completed</div>
            <div className="metric-value success">{completedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Remediation Actions</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Action Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Fingerprint</th>
                  <th>Incident</th>
                  <th>Created</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={8} rows={8} />
                ) : (
                  actions.map((action) => (
                    <tr key={action.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(action.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500' }}>{action.action_name}</td>
                      <td style={{ fontSize: '12px' }}>{actionLabel(action.action_type)}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px',
                          color: action.status === 'completed' ? 'var(--success-color)' : action.status === 'failed' ? 'var(--error-color)' : 'rgba(245,158,11,0.9)' }}>
                          {action.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{action.fingerprint_hash ? action.fingerprint_hash.slice(0, 12) : '—'}</td>
                      <td style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{action.incident_id ? `#${String(action.incident_id).padStart(4, '0')}` : '—'}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(action.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', opacity: updateLoading[action.id] ? 0.6 : 1 }}
                          disabled={updateLoading[action.id]}
                          onClick={() => handleEditOpen(action)}
                          title="Edit action"
                        >
                          <Edit2 size={10} />
                        </button>
                        {action.status === 'pending' && (
                          <>
                            <button
                              className="glowing-btn"
                              style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)', opacity: updateLoading[action.id] ? 0.6 : 1 }}
                              disabled={updateLoading[action.id]}
                              onClick={() => handleApprove(action.id)}
                              title="Approve action"
                            >
                              <CheckCircle size={10} />
                            </button>
                            <button
                              className="glowing-btn"
                              style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--accent-color)', opacity: updateLoading[action.id] ? 0.6 : 1 }}
                              disabled={updateLoading[action.id]}
                              onClick={() => handleExecute(action.id)}
                              title="Execute action"
                            >
                              <Play size={10} />
                            </button>
                          </>
                        )}
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(action.id)}
                          title="Delete action"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && actions.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No remediation actions found. Create one to automate failure recovery.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      {/* Create Remediation Action Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '460px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create Remediation Action</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Fingerprint Hash</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.fingerprint_hash} onChange={(e) => handleEditChange('fingerprint_hash', e.target.value)} placeholder="Fingerprint hash" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Incident ID</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.incident_id} onChange={(e) => handleEditChange('incident_id', e.target.value)} placeholder="Optional incident ID" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action Type</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action_type} onChange={(e) => handleEditChange('action_type', e.target.value)}>
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{actionLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action_name} onChange={(e) => handleEditChange('action_name', e.target.value)} placeholder="e.g. Restart API service" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.status} onChange={(e) => handleEditChange('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="requires_approval"
                  type="checkbox"
                  checked={editForm.requires_approval}
                  onChange={(e) => handleEditChange('requires_approval', e.target.checked)}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="requires_approval">Requires approval before execution</label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Remediation Action Modal */}
      {editOpen && editingAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '460px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Remediation Action</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Fingerprint Hash</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.fingerprint_hash} onChange={(e) => handleEditChange('fingerprint_hash', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Incident ID</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.incident_id} onChange={(e) => handleEditChange('incident_id', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action Type</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action_type} onChange={(e) => handleEditChange('action_type', e.target.value)}>
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{actionLabel(t)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Action Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.action_name} onChange={(e) => handleEditChange('action_name', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.status} onChange={(e) => handleEditChange('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  id="requires_approval"
                  type="checkbox"
                  checked={editForm.requires_approval}
                  onChange={(e) => handleEditChange('requires_approval', e.target.checked)}
                  style={{ accentColor: 'var(--accent-color)' }}
                />
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 0, cursor: 'pointer' }} htmlFor="requires_approval">Requires approval before execution</label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={updateLoading[editingAction.id]}>
                  {updateLoading[editingAction.id] ? 'Updating...' : 'Save Changes'}
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

export default Remediation;
