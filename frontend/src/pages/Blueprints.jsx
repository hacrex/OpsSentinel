import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes, LogOut, Settings, FolderGit2, FileCode2
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import FilterBar from '../components/FilterBar';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const FILTER_SELECT_STYLE = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  outline: 'none',
};

const Blueprints = () => {
  const navigate = useNavigate();
  const [blueprints, setBlueprints] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [filters, setFilters] = useState({ category: '', repo: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [instantiateOpen, setInstantiateOpen] = useState(false);
  const [instantiating, setInstantiating] = useState(null);
  const [instantiateForm, setInstantiateForm] = useState({ repo_name: '', stack_name: '', working_dir: '', vars: '{}' });
  const [instantiateLoading, setInstantiateLoading] = useState(false);
  const [filesOpen, setFilesOpen] = useState({});
  const [fileDetails, setFileDetails] = useState({});
  const [filesLoading, setFilesLoading] = useState({});
  const { toasts, addToast, removeToast } = useToast();

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchBlueprints = useCallback(async () => {
    try {
      const res = await api.get('/blueprints');
      setBlueprints(res.data.data || []);
      setCatalog(res.data.catalog || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch blueprints:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  useSocket((msg) => {
    if (msg.type === 'stack_created') {
      addToast(`Stack created: ${msg.stack?.name || ''}`, 'info');
      fetchBlueprints();
    }
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    const reset = { category: '', repo: '', search: '' };
    setFilters(reset);
  };

  const handleUseBlueprint = (bp) => {
    setInstantiating(bp);
    setInstantiateForm({
      repo_name: '',
      stack_name: '',
      working_dir: '',
      vars: JSON.stringify(bp.default_vars || {}, null, 2),
    });
    setInstantiateOpen(true);
  };

  const handleInstantiateChange = (key, value) => {
    setInstantiateForm({ ...instantiateForm, [key]: value });
  };

  const handleInstantiateClose = () => {
    setInstantiateOpen(false);
    setInstantiating(null);
  };

  const handleInstantiateSubmit = async (e) => {
    e.preventDefault();
    let parsedVars;
    try {
      parsedVars = JSON.parse(instantiateForm.vars || '{}');
    } catch (err) {
      addToast('Variables must be valid JSON', 'error');
      return;
    }
    setInstantiateLoading(true);
    try {
      const res = await api.post(`/blueprints/${instantiating.id}/instantiate`, {
        repo_name: instantiateForm.repo_name,
        stack_name: instantiateForm.stack_name,
        working_dir: instantiateForm.working_dir,
        vars: parsedVars,
      });
      addToast(res.data.stack?.name ? `Blueprint deployed — stack created: ${res.data.stack.name}` : 'Blueprint deployed — stack created', 'success');
      setInstantiateOpen(false);
      setInstantiating(null);
      setInstantiateLoading(false);
    } catch (err) {
      setInstantiateLoading(false);
      addToast(err.response?.data?.error || 'Failed to deploy blueprint', 'error');
    }
  };

  const handleToggleFiles = async (bp) => {
    const open = !filesOpen[bp.id];
    setFilesOpen((s) => ({ ...s, [bp.id]: open }));
    if (open && !fileDetails[bp.id]) {
      setFilesLoading((s) => ({ ...s, [bp.id]: true }));
      try {
        const res = await api.get(`/blueprints/${bp.id}`);
        setFileDetails((s) => ({ ...s, [bp.id]: res.data.data?.files || res.data.files || [] }));
        setFilesLoading((s) => ({ ...s, [bp.id]: false }));
      } catch (err) {
        console.error('Failed to fetch blueprint files:', err);
        setFilesLoading((s) => ({ ...s, [bp.id]: false }));
        addToast(err.response?.data?.error || 'Failed to load blueprint files', 'error');
      }
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  };

  const categories = [...new Set(blueprints.map((b) => b.category).filter(Boolean))];
  const providers = [...new Set(blueprints.map((b) => b.provider).filter(Boolean))];

  const visible = blueprints.filter((b) => {
    if (filters.category && b.category !== filters.category) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hay = `${b.name || ''} ${b.description || ''} ${(b.tags || []).join(' ')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <Boxes size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Stack Blueprints
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <div className="metric-label"><Boxes size={14} color="var(--text-secondary)" /> Total Blueprints</div>
            <div className="metric-value">{blueprints.length.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Boxes size={14} color="var(--text-secondary)" /> Categories</div>
            <div className="metric-value">{categories.length}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><FolderGit2 size={14} color="var(--text-secondary)" /> Providers</div>
            <div className="metric-value">{providers.length}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ marginTop: '24px' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Blueprint Catalog</h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{blueprints.length.toLocaleString()} total{catalog.length ? ` · ${catalog.length} in catalog` : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <FilterBar repos={[]} filters={filters} onChange={handleFilterChange} onReset={handleFilterReset} />
              <select
                style={FILTER_SELECT_STYLE}
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ ...filters, category: e.target.value })}
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            {loading ? (
              <SkeletonRows cols={3} rows={6} />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {visible.map((bp) => (
                    <div key={bp.id} className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{bp.name}</span>
                        <span style={{ padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '10px', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {bp.category || 'general'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '10px' }}>
                        <span>engine: <span style={{ color: 'var(--text-primary)' }}>{bp.engine || '—'}</span></span>
                        <span>provider: <span style={{ color: 'var(--text-primary)' }}>{bp.provider || '—'}</span></span>
                      </div>
                      {bp.description && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{bp.description}</div>
                      )}
                      {(bp.tags || []).length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {bp.tags.map((t) => (
                            <span key={t} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.25)', color: 'var(--text-secondary)' }}>{t}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCode2 size={12} /> {bp.file_count ?? (bp.files || []).length} files
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button className="btn btn-primary" onClick={() => handleUseBlueprint(bp)} style={{ padding: '6px 12px', fontSize: '11px', flex: 1 }}>
                          Use Blueprint
                        </button>
                        <button
                          className="glowing-btn"
                          onClick={() => handleToggleFiles(bp)}
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          title="View template files"
                        >
                          {filesOpen[bp.id] ? 'Hide Files' : 'View Files'}
                        </button>
                      </div>
                      {filesOpen[bp.id] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                          {filesLoading[bp.id] ? (
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Loading files…</div>
                          ) : (
                            (fileDetails[bp.id] || []).map((f) => (
                              <div key={f.path}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <FileCode2 size={10} /> {f.path}
                                </div>
                                <pre style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', overflow: 'auto', maxHeight: '260px', margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {f.content || ''}
                                </pre>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {!loading && visible.length === 0 && (
                  <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    No blueprints found. Blueprints are reusable infrastructure templates for provisioning stacks.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Instantiate Blueprint Modal */}
      {instantiateOpen && instantiating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '480px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Use Blueprint — {instantiating.name}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Provisions this template into your repo and creates a stack.
            </p>
            <form onSubmit={handleInstantiateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Repo (owner/repo)</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={instantiateForm.repo_name} onChange={(e) => handleInstantiateChange('repo_name', e.target.value)} placeholder="e.g. acme/infra" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Stack Name</label>
                <input required style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={instantiateForm.stack_name} onChange={(e) => handleInstantiateChange('stack_name', e.target.value)} placeholder="e.g. prod-vpc" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Working Directory</label>
                <input style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px', fontFamily: 'var(--font-mono)' }} value={instantiateForm.working_dir} onChange={(e) => handleInstantiateChange('working_dir', e.target.value)} placeholder="./infra/my-stack" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Variables (JSON)</label>
                <textarea rows={8} style={{ width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', fontFamily: 'var(--font-mono)', resize: 'vertical' }} value={instantiateForm.vars} onChange={(e) => handleInstantiateChange('vars', e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={handleInstantiateClose}>Cancel</button>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => navigate('/dashboard/infrastructure')} title="Go to stacks to configure what you just deployed">
                  Configure stacks →
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={instantiateLoading}>
                  {instantiateLoading ? 'Deploying...' : 'Deploy Blueprint'}
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

export default Blueprints;
