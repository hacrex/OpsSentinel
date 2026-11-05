import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Lock, Unlock, History, RotateCcw, Plus, LogOut, Settings,
  Eye, RefreshCw
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';

const errMsg = (err, fallback) =>
  err?.response?.data?.message || err?.response?.data?.error || fallback;

const StateManager = () => {
  const navigate = useNavigate();
  const [stacks, setStacks] = useState([]);
  const [selectedStack, setSelectedStack] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);

  const [pushOpen, setPushOpen] = useState(false);
  const [pushForm, setPushForm] = useState({ state_text: '', state_serial: '', notes: '' });
  const [pushLoading, setPushLoading] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewVersion, setViewVersion] = useState(null);
  const [viewText, setViewText] = useState('');
  const [viewLoading, setViewLoading] = useState(false);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  const [lockOpen, setLockOpen] = useState(false);
  const [lockForm, setLockForm] = useState({ note: '' });
  const [lockLoading, setLockLoading] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const selectedStackRef = useRef(selectedStack);
  selectedStackRef.current = selectedStack;

  const fetchStacks = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/infrastructure/stacks');
      const list = Array.isArray(res.data) ? res.data : (res.data.data || []);
      setStacks(list);
      setSelectedStack((cur) => {
        if (cur !== null && list.some((s) => s.id === cur)) return cur;
        return list.length ? list[0].id : null;
      });
    } catch (err) {
      console.error('Failed to fetch stacks:', err);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchBundle = useCallback(async (stackId) => {
    const id = stackId != null ? stackId : selectedStackRef.current;
    if (id == null || id === '') return;
    setBundleLoading(true);
    try {
      const res = await api.get(`/state/stacks/${id}`);
      setBundle(res.data);
    } catch (err) {
      console.error('Failed to fetch state bundle:', err);
      setBundle(null);
    }
    setBundleLoading(false);
  }, []);

  useEffect(() => {
    fetchStacks(false);
  }, [fetchStacks]);

  useEffect(() => {
    if (selectedStack !== null) {
      setBundle(null);
      fetchBundle(selectedStack);
    } else {
      setBundle(null);
    }
  }, [selectedStack, fetchBundle]);

  const handleRefresh = () => {
    fetchStacks(true);
    fetchBundle();
  };

  const handlePushOpen = () => {
    setPushForm({ state_text: '', state_serial: '', notes: '' });
    setPushOpen(true);
  };

  const handlePushSubmit = async (e) => {
    e.preventDefault();
    if (!pushForm.state_text.trim()) return;
    setPushLoading(true);
    try {
      const payload = { state_text: pushForm.state_text, notes: pushForm.notes };
      if (String(pushForm.state_serial).trim() !== '') {
        payload.state_serial = Number(pushForm.state_serial);
      }
      await api.put(`/state/stacks/${selectedStack}`, payload);
      addToast('State pushed', 'success');
      setPushOpen(false);
      setPushLoading(false);
      fetchBundle();
    } catch (err) {
      setPushLoading(false);
      addToast(errMsg(err, 'Failed to push state'), 'error');
    }
  };

  const openVersionView = async (version) => {
    setViewOpen(true);
    setViewVersion(version);
    setViewLoading(true);
    setViewText('');
    try {
      const res = await api.get(`/state/stacks/${selectedStack}/versions/${version}`);
      setViewText(res.data.state_text || '(empty state document)');
    } catch (err) {
      setViewText('');
      addToast(errMsg(err, 'Failed to load state text'), 'error');
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    if (!restoreVersion.trim()) return;
    setRestoreLoading(true);
    try {
      await api.post(`/state/stacks/${selectedStack}/restore/${restoreVersion}`);
      addToast(`Restore queued for version ${restoreVersion}`, 'success');
      setRestoreOpen(false);
      setRestoreLoading(false);
      fetchBundle();
    } catch (err) {
      setRestoreLoading(false);
      addToast(errMsg(err, 'Failed to restore version'), 'error');
    }
  };

  const handleLock = async (e) => {
    e.preventDefault();
    setLockLoading(true);
    try {
      await api.post(`/state/stacks/${selectedStack}/lock`, { note: lockForm.note });
      addToast('State locked', 'success');
      setLockOpen(false);
      setLockLoading(false);
      fetchBundle();
    } catch (err) {
      setLockLoading(false);
      addToast(errMsg(err, 'Failed to lock state'), 'error');
    }
  };

  const handleUnlock = async (attempt) => {
    setLockBusy(true);
    try {
      await api.post(`/state/stacks/${selectedStack}/unlock`, { force: attempt === 'force' });
      addToast('Lock released', 'success');
      setLockBusy(false);
      fetchBundle();
    } catch (err) {
      setLockBusy(false);
      if (attempt === 'normal' && err.response?.status === 409) {
        if (window.confirm('Force break lock?')) {
          handleUnlock('force');
        }
      } else {
        addToast(errMsg(err, 'Failed to unlock state'), 'error');
      }
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

  const formatSize = (bytes) => {
    if (bytes == null) return '—';
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const truncate = (text, max = 28) => {
    if (!text) return '—';
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };

  const latest = bundle?.latest || null;
  const lock = bundle?.lock || null;
  const sortedHistory = [...(bundle?.history || [])].sort((a, b) => Number(b.version) - Number(a.version));
  const stackLabel = (s) => `${s.repo_name}/${s.stack_name} (${s.engine})`;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Database size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — State Management
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        {loading ? (
          <div className="glass-panel">
            <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>Loading stacks…</div>
          </div>
        ) : stacks.length === 0 ? (
          <div className="glass-panel" style={{ marginTop: '0' }}>
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              No stacks found. Create a stack on the Infrastructure page first — its remote state will appear here.
            </div>
          </div>
        ) : (
          <>
            {/* Stack selector */}
            <div className="glass-panel">
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Database size={14} color="var(--text-secondary)" />
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>Stack</span>
                <select
                  style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-sans)', cursor: 'pointer', outline: 'none', minWidth: '280px' }}
                  value={selectedStack ?? ''}
                  onChange={(e) => setSelectedStack(e.target.value ? e.target.value : null)}
                >
                  {stacks.map((s) => <option key={s.id} value={s.id}>{stackLabel(s)}</option>)}
                </select>
                {bundle?.stack?.working_dir && (
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {bundle.stack.working_dir}
                  </span>
                )}
              </div>
            </div>

            {/* Latest State */}
            <div className="glass-panel" style={{ marginTop: '24px' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={14} style={{ color: 'var(--accent-color)' }} /> Latest State
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="glowing-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={handlePushOpen}>
                    <Plus size={12} /> Push State
                  </button>
                  <button
                    className="glowing-btn"
                    style={{ padding: '6px 12px', fontSize: '11px' }}
                    disabled={!latest}
                    onClick={() => openVersionView(latest.version)}
                  >
                    <Eye size={12} /> View
                  </button>
                  <button className="glowing-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => { setRestoreVersion(''); setRestoreOpen(true); }}>
                    <RotateCcw size={12} /> Restore Version…
                  </button>
                </div>
              </div>
              {bundleLoading || !latest ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {bundleLoading ? 'Loading state…' : 'No state pushed yet for this stack. Use Push State to store the first version.'}
                </div>
              ) : (
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Version</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--accent-color)' }}>v{latest.version}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>State Serial</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{latest.state_serial ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notes</div>
                    <div style={{ fontSize: '13px' }}>{truncate(latest.notes, 60)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created By</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{latest.created_by || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</div>
                    <div style={{ fontSize: '13px' }}>{latest.source || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Size</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{formatSize(latest.state_size)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created At</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatTs(latest.created_at)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* State Lock */}
            <div className="glass-panel" style={{ marginTop: '24px' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} style={{ color: 'var(--accent-color)' }} /> State Lock
                </h2>
                {lock && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="glowing-btn" style={{ padding: '6px 12px', fontSize: '11px' }} disabled={lockBusy} onClick={() => handleUnlock('normal')}>
                      <Unlock size={12} /> Unlock
                    </button>
                    <button
                      className="glowing-btn"
                      style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--error-color)' }}
                      disabled={lockBusy}
                      onClick={() => {
                        if (window.confirm('Force break this lock? Any concurrent state operation may be disrupted.')) {
                          handleUnlock('force');
                        }
                      }}
                    >
                      <Unlock size={12} /> Force Unlock
                    </button>
                  </div>
                )}
              </div>
              {lock ? (
                <div style={{ margin: '16px 20px', padding: '16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--error-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Locked By</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{lock.locked_by || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--error-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lock ID</div>
                    <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}>{lock.lock_id || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--error-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Note</div>
                    <div style={{ fontSize: '13px' }}>{lock.note || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--error-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Locked At</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{formatTs(lock.locked_at)}</div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Unlocked</span>
                  <button className="glowing-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => { setLockForm({ note: '' }); setLockOpen(true); }}>
                    <Lock size={12} /> Lock
                  </button>
                </div>
              )}
            </div>

            {/* State History */}
            <div className="glass-panel" style={{ marginTop: '24px' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <History size={14} style={{ color: 'var(--accent-color)' }} /> State History
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{sortedHistory.length} versions</span>
                </div>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px' }}>Version</th>
                      <th style={{ width: '110px' }}>Serial</th>
                      <th style={{ width: '120px' }}>Source</th>
                      <th style={{ width: '140px' }}>Created By</th>
                      <th>Notes</th>
                      <th style={{ width: '90px' }}>Size</th>
                      <th style={{ width: '150px' }}>At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundleLoading ? (
                      <SkeletonRows cols={7} rows={5} />
                    ) : (
                      sortedHistory.map((h) => (
                        <tr key={h.id} style={{ cursor: 'pointer' }} onClick={() => openVersionView(h.version)} title="View state text">
                          <td style={{ color: 'var(--accent-color)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>v{h.version}</td>
                          <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{h.state_serial ?? '—'}</td>
                          <td style={{ fontSize: '12px' }}>{h.source || '—'}</td>
                          <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{h.created_by || '—'}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{truncate(h.notes)}</td>
                          <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{formatSize(h.state_size)}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(h.created_at)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {!bundleLoading && sortedHistory.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    No state versions yet. Push state to create the first version.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Push State Modal */}
      {pushOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Push State</h2>
            <form onSubmit={handlePushSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>State Text (tfstate JSON)</label>
                <textarea
                  required
                  rows={12}
                  style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
                  value={pushForm.state_text}
                  onChange={(e) => setPushForm((f) => ({ ...f, state_text: e.target.value }))}
                  placeholder='{"version": 4, "resources": [...]}'
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>State Serial (optional)</label>
                <input type="number" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={pushForm.state_serial} onChange={(e) => setPushForm((f) => ({ ...f, state_serial: e.target.value }))} placeholder="auto" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notes</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={pushForm.notes} onChange={(e) => setPushForm((f) => ({ ...f, notes: e.target.value }))} placeholder="e.g. pushed after manual apply" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                The push is rejected with 409 stale_state when the serial is older than the latest stored version.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setPushOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={pushLoading}>
                  {pushLoading ? 'Pushing...' : 'Push State'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View State Modal */}
      {viewOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '520px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', width: '720px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600' }}>State — Version {viewVersion}</h2>
              <button type="button" className="glowing-btn" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => setViewOpen(false)}>
                <Eye size={12} /> Close
              </button>
            </div>
            {viewLoading ? (
              <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>Fetching state text…</div>
            ) : (
              <pre style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', maxHeight: '55vh', overflow: 'auto', whiteSpace: 'pre-wrap', margin: 0 }}>
                {viewText}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Restore Version Modal */}
      {restoreOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Restore Version</h2>
            <form onSubmit={handleRestoreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Version</label>
                <input required type="number" style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={restoreVersion} onChange={(e) => setRestoreVersion(e.target.value)} placeholder="e.g. 3" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                The historical state of the chosen version is stored as a new version — history is never rewritten.
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setRestoreOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={restoreLoading}>
                  {restoreLoading ? 'Restoring...' : 'Restore Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lock Modal */}
      {lockOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Lock State</h2>
            <form onSubmit={handleLock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Note</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '13px' }} value={lockForm.note} onChange={(e) => setLockForm({ note: e.target.value })} placeholder="e.g. manual maintenance" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setLockOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={lockLoading}>
                  {lockLoading ? 'Locking...' : 'Lock'}
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

export default StateManager;
