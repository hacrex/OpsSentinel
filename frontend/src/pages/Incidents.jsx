import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock, LogOut, RotateCcw, Settings, Search, Plus,
  Edit2, Trash2, AlertTriangle, CheckCircle, Terminal
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES = ['open', 'investigating', 'resolved', 'closed'];

const severityColor = (severity) => {
  switch (severity) {
    case 'critical': return 'var(--error-color)';
    case 'high': return 'rgba(245,158,11,0.9)';
    case 'medium': return 'var(--accent-color)';
    case 'low': return 'var(--success-color)';
    default: return 'var(--text-secondary)';
  }
};

const statusColor = (status) => {
  switch (status) {
    case 'open': return 'var(--error-color)';
    case 'investigating': return 'rgba(245,158,11,0.9)';
    case 'resolved': return 'var(--success-color)';
    case 'closed': return 'var(--text-secondary)';
    default: return 'var(--text-secondary)';
  }
};

const Incidents = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: '', severity: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', severity: '', status: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchIncidents = useCallback(async (page, activeFilters, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const params = { page, limit: 25 };
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeFilters.severity) params.severity = activeFilters.severity;
      if (activeFilters.search) params.search = activeFilters.search;
      const res = await api.get('/incidents', { params });
      setIncidents(res.data.data);
      setPagination(res.data.pagination);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents(1, { status: '', severity: '', search: '' });
  }, [fetchIncidents]);

  useSocket((msg) => {
    if (msg.type === 'new_incident') {
      addToast(`New Incident: ${msg.incident.title}`, 'error');
      fetchIncidents(1, filtersRef.current);
    }
  });

  const handleRefresh = () => {
    fetchIncidents(pagination.page, filtersRef.current, true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setLoading(true);
    fetchIncidents(1, newFilters);
  };

  const handleFilterReset = () => {
    const reset = { status: '', severity: '', search: '' };
    setFilters(reset);
    setLoading(true);
    fetchIncidents(1, reset);
  };

  const handlePageChange = (page) => {
    setLoading(true);
    fetchIncidents(page, filters);
  };

  const handleCreateOpen = () => {
    setEditForm({ title: '', description: '', severity: 'medium', status: 'open' });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/incidents', {
        title: editForm.title,
        description: editForm.description,
        severity: editForm.severity,
        status: editForm.status,
      });
      addToast('Incident created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchIncidents(pagination.page, filtersRef.current);
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || 'Failed to create incident', 'error');
    }
  };

  const handleEditOpen = (incident) => {
    setEditingIncident(incident);
    setEditForm({
      title: incident.title,
      description: incident.description || '',
      severity: incident.severity,
      status: incident.status,
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingIncident(null);
    setEditForm({ title: '', description: '', severity: '', status: '' });
  };

  const handleEditChange = (key, value) => {
    setEditForm({ ...editForm, [key]: value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setUpdateLoading((s) => ({ ...s, [editingIncident.id]: true }));
    try {
      await api.patch(`/incidents/${editingIncident.id}`, {
        status: editForm.status,
        severity: editForm.severity,
        description: editForm.description,
      });
      addToast('Incident updated', 'success');
      setEditOpen(false);
      setUpdateLoading((s) => ({ ...s, [editingIncident.id]: false }));
      fetchIncidents(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [editingIncident.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update incident', 'error');
    }
  };

  const handleResolve = async (id) => {
    setUpdateLoading((s) => ({ ...s, [id]: true }));
    try {
      await api.patch(`/incidents/${id}`, { status: 'resolved', resolved_at: new Date().toISOString() });
      addToast('Incident resolved', 'success');
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      fetchIncidents(pagination.page, filtersRef.current);
    } catch (err) {
      setUpdateLoading((s) => ({ ...s, [id]: false }));
      addToast(err.response?.data?.error || 'Failed to resolve incident', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this incident?')) return;
    try {
      await api.delete(`/incidents/${id}`);
      addToast('Incident deleted', 'success');
      fetchIncidents(pagination.page, filtersRef.current);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete incident', 'error');
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

  const totalIncidents = pagination.total;
  const openCount = incidents.filter((i) => i.status === 'open').length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <ShieldAlert size={24} style={{ color: 'var(--error-color)' }} />
          OpsSentinel — Incidents
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Incident
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
            <div className="metric-label"><ShieldAlert size={14} color="var(--text-secondary)" /> Total Incidents</div>
            <div className="metric-value">{totalIncidents.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Clock size={14} color="var(--error-color)" /> Open</div>
            <div className="metric-value danger">{openCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><AlertTriangle size={14} color="rgba(245,158,11,0.9)" /> Critical</div>
            <div className="metric-value danger">{criticalCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><CheckCircle size={14} color="var(--success-color)" /> Resolved</div>
            <div className="metric-value success">{resolvedCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Incidents</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
            </div>
            <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Repo / Stack</th>
                  <th>Created</th>
                  <th style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={7} rows={8} />
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(inc.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500' }}>{inc.title}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: severityColor(inc.severity), border: `1px solid ${severityColor(inc.severity)}` }}>
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: statusColor(inc.status), border: `1px solid ${statusColor(inc.status)}` }}>
                          {inc.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {inc.repo_name || '—'}{inc.stack_name ? ` / ${inc.stack_name}` : ''}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(inc.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', opacity: updateLoading[inc.id] ? 0.6 : 1 }}
                          disabled={updateLoading[inc.id]}
                          onClick={() => handleEditOpen(inc)}
                          title="Edit incident"
                        >
                          <Edit2 size={10} />
                        </button>
                        {inc.status !== 'resolved' && (
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)', opacity: updateLoading[inc.id] ? 0.6 : 1 }}
                            disabled={updateLoading[inc.id]}
                            onClick={() => handleResolve(inc.id)}
                            title="Resolve incident"
                          >
                            <CheckCircle size={10} />
                          </button>
                        )}
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(inc.id)}
                          title="Delete incident"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && incidents.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No incidents found. Create one to track a failure or outage.
              </div>
            )}
          </div>

          <Pagination pagination={pagination} onChange={handlePageChange} />
        </div>
      </main>

      {/* Create Incident Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Create Incident</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Title</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.title} onChange={(e) => handleEditChange('title', e.target.value)} placeholder="e.g. Production API outage" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', minHeight: '80px' }} value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} placeholder="What happened and impact" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Severity</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.severity} onChange={(e) => handleEditChange('severity', e.target.value)}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.status} onChange={(e) => handleEditChange('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Incident Modal */}
      {editOpen && editingIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Incident #{String(editingIncident.id).padStart(4, '0')}</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Title</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.title} onChange={(e) => handleEditChange('title', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', minHeight: '80px' }} value={editForm.description} onChange={(e) => handleEditChange('description', e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Severity</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.severity} onChange={(e) => handleEditChange('severity', e.target.value)}>
                  {SEVERITIES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Status</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.status} onChange={(e) => handleEditChange('status', e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={updateLoading[editingIncident.id]}>
                  {updateLoading[editingIncident.id] ? 'Updating...' : 'Save Changes'}
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

export default Incidents;
