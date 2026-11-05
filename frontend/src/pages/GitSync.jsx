import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, LogOut, Settings, RefreshCw, Plus, Edit2, Trash2,
  Download, Upload, CheckCircle, XCircle, Clock
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';

const KINDS = ['stacks', 'playbooks', 'both'];

const statusColor = (status) => {
  switch (status) {
    case 'synced': return 'var(--success-color)';
    case 'error': return 'var(--error-color)';
    default: return 'var(--text-secondary)';
  }
};

const GitSync = () => {
  const navigate = useNavigate();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', repo_url: '', branch: 'main', kind: 'stacks', path: '' });
  const [editOpen, setEditOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', repo_url: '', branch: '', kind: 'stacks', path: '' });
  const [pushOpen, setPushOpen] = useState(false);
  const [pushingSource, setPushingSource] = useState(null);
  const [pushForm, setPushForm] = useState({ stack_dir: '', message: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  const fetchSources = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/git/sources');
      setSources(res.data.data || []);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Failed to fetch git sources:', err);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleRefresh = () => {
    fetchSources(true);
  };

  const handleCreateOpen = () => {
    setForm({ name: '', repo_url: '', branch: 'main', kind: 'stacks', path: '' });
    setCreateOpen(true);
  };

  const handleCreateClose = () => setCreateOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/git/sources', {
        name: form.name,
        repo_url: form.repo_url,
        branch: form.branch || 'main',
        kind: form.kind,
        path: form.path,
      });
      addToast('Git source created', 'success');
      setCreateOpen(false);
      setCreateLoading(false);
      fetchSources();
    } catch (err) {
      setCreateLoading(false);
      addToast(err.response?.data?.error || 'Failed to create git source', 'error');
    }
  };

  const handleEditOpen = (source) => {
    setEditingSource(source);
    setEditForm({
      name: source.name,
      repo_url: source.repo_url,
      branch: source.branch,
      kind: source.kind,
      path: source.path || '',
    });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setEditOpen(false);
    setEditingSource(null);
    setEditForm({ name: '', repo_url: '', branch: '', kind: 'stacks', path: '' });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.patch(`/git/sources/${editingSource.id}`, {
        name: editForm.name,
        repo_url: editForm.repo_url,
        branch: editForm.branch,
        kind: editForm.kind,
        path: editForm.path,
      });
      addToast('Git source updated', 'success');
      setEditOpen(false);
      setEditLoading(false);
      handleEditClose();
      fetchSources();
    } catch (err) {
      setEditLoading(false);
      addToast(err.response?.data?.error || 'Failed to update git source', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this git source?')) return;
    try {
      await api.delete(`/git/sources/${id}`);
      addToast('Git source deleted', 'success');
      fetchSources();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete git source', 'error');
    }
  };

  const handleSyncNow = async (id) => {
    setSyncLoading((s) => ({ ...s, [id]: true }));
    try {
      const res = await api.post(`/git/sources/${id}/sync`);
      const commit = (res.data.last_commit || '').slice(0, 7);
      if (res.data.status === 'error') {
        addToast(res.data.message || 'Sync failed', 'error');
      } else {
        addToast(commit ? `Synced to ${commit}` : 'Synced', 'success');
      }
      setSyncLoading((s) => ({ ...s, [id]: false }));
      fetchSources();
    } catch (err) {
      setSyncLoading((s) => ({ ...s, [id]: false }));
      addToast(err.response?.data?.message || err.response?.data?.error || 'Failed to sync git source', 'error');
    }
  };

  const handlePushOpen = (source) => {
    setPushingSource(source);
    setPushForm({ stack_dir: '', message: '' });
    setPushOpen(true);
  };

  const handlePushClose = () => {
    setPushOpen(false);
    setPushingSource(null);
  };

  const handlePushSubmit = async (e) => {
    e.preventDefault();
    setPushLoading(true);
    try {
      const res = await api.post(`/git/sources/${pushingSource.id}/push`, {
        stack_dir: pushForm.stack_dir,
        message: pushForm.message,
      });
      addToast(res.data.message || (res.data.status === 'pushed' ? 'Pushed to git' : 'Push failed'), res.data.status === 'error' ? 'error' : 'success');
      setPushOpen(false);
      setPushLoading(false);
      handlePushClose();
      fetchSources();
    } catch (err) {
      setPushLoading(false);
      addToast(err.response?.data?.message || err.response?.data?.error || 'Failed to push to git', 'error');
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

  const totalSources = sources.length;
  const syncedCount = sources.filter((s) => s.status === 'synced').length;
  const errorCount = sources.filter((s) => s.status === 'error').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <GitBranch size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — GitOps Sync
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Plus size={12} /> New Source
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
            <div className="metric-label"><GitBranch size={14} color="var(--text-secondary)" /> Total Sources</div>
            <div className="metric-value">{totalSources.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><CheckCircle size={14} color="var(--success-color)" /> Synced</div>
            <div className="metric-value success">{syncedCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><XCircle size={14} color="var(--error-color)" /> Errors</div>
            <div className="metric-value danger">{errorCount}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Git Sources</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{totalSources.toLocaleString()} total</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Name</th>
                  <th>Repo URL</th>
                  <th>Branch</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Last Commit</th>
                  <th>Last Sync</th>
                  <th style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows cols={9} rows={8} />
                ) : (
                  sources.map((s) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(s.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{s.name}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{s.repo_url}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{s.branch}</td>
                      <td style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.kind}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: statusColor(s.status), border: `1px solid ${statusColor(s.status)}` }}>
                          {s.status || 'pending'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {s.last_commit ? (s.last_commit.length > 7 ? s.last_commit.slice(0, 7) : s.last_commit) : '—'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(s.last_sync_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)', opacity: syncLoading[s.id] ? 0.6 : 1 }}
                          disabled={syncLoading[s.id]}
                          onClick={() => handleSyncNow(s.id)}
                          title="Sync Now"
                        >
                          <Download size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handlePushOpen(s)}
                          title="Push to git"
                        >
                          <Upload size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handleEditOpen(s)}
                          title="Edit source"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleDelete(s.id)}
                          title="Delete source"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && sources.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No git sources found. Add a repository to sync stacks and playbooks via GitOps.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Source Modal */}
      {createOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>New Git Source</h2>
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. infra-repo" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Repo URL</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={form.repo_url} onChange={(e) => setForm({ ...form, repo_url: e.target.value })} placeholder="https://github.com/owner/repo.git or git@github.com:owner/repo.git" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Branch</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="main" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Kind</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Path (optional)</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="subdirectory within the repo" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleCreateClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Source Modal */}
      {editOpen && editingSource && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Git Source</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Repo URL</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={editForm.repo_url} onChange={(e) => setEditForm({ ...editForm, repo_url: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Branch</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={editForm.branch} onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Kind</label>
                <select style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={editForm.kind} onChange={(e) => setEditForm({ ...editForm, kind: e.target.value })}>
                  {KINDS.map((k) => <option key={k} value={k}>{k.charAt(0).toUpperCase() + k.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Path (optional)</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={editForm.path} onChange={(e) => setEditForm({ ...editForm, path: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleEditClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={editLoading}>
                  {editLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {pushOpen && pushingSource && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Push — {pushingSource.name}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Push a stack directory to <span style={{ fontFamily: 'var(--font-mono)' }}>{pushingSource.repo_url}</span>
            </p>
            <form onSubmit={handlePushSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Stack Directory</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={pushForm.stack_dir} onChange={(e) => setPushForm({ ...pushForm, stack_dir: e.target.value })} placeholder="./infra/my-stack" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Commit Message</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} value={pushForm.message} onChange={(e) => setPushForm({ ...pushForm, message: e.target.value })} placeholder="e.g. sync prod-vpc stack" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handlePushClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={pushLoading}>
                  {pushLoading ? 'Pushing...' : 'Push'}
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

export default GitSync;
