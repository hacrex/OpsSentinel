import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder, FileCode, Save, LogOut, Settings, RotateCcw, Plus, ChevronRight,
  ChevronDown, Edit, Terminal
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import { Toast, useToast } from '../components/Toast';

const StackCodeEditor = () => {
  const navigate = useNavigate();
  const [stacks, setStacks] = useState([]);
  const [selectedStackId, setSelectedStackId] = useState(null);
  const [stack, setStack] = useState(null);
  const [files, setFiles] = useState([]);
  const [expandedDirs, setExpandedDirs] = useState(new Set());
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const fetchStacks = useCallback(async () => {
    try {
      const res = await api.get('/infrastructure/stacks');
      const data = Array.isArray(res.data) ? res.data : res.data.data;
      setStacks(data);
      if (data.length > 0 && !selectedStackId) {
        setSelectedStackId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch stacks:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStackId]);

  useEffect(() => {
    fetchStacks();
  }, [fetchStacks]);

  const selectStack = async (id) => {
    setSelectedStackId(id);
    setSelectedFile(null);
    setFileContent('');
    setOriginalContent('');
    setDirty(false);
    setExpandedDirs(new Set());
    try {
      const stackRes = await api.get(`/stacks/${id}/files`);
      setStack(stackRes.data.stack);
      setFiles(stackRes.data.files || []);
    } catch (err) {
      addToast('Failed to load stack files', 'error');
    }
  };

  const toggleDir = (dirPath) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const isExpanded = (dirPath) => expandedDirs.has(dirPath);

  const viewFile = async (filePath) => {
    setSelectedFile(filePath);
    setDirty(false);
    try {
      const stackId = selectedStackId;
      const res = await api.get(`/stacks/${stackId}/file`, { params: { path: filePath } });
      setFileContent(res.data.content || '');
      setOriginalContent(res.data.content || '');
    } catch (err) {
      addToast('Failed to read file', 'error');
    }
  };

  const handleContentChange = (e) => {
    setFileContent(e.target.value);
    setDirty(fileContent !== originalContent);
  };

  const saveFile = async () => {
    if (!selectedFile || !selectedStackId) return;
    setSaving(true);
    try {
      // OpsSentinel stores files in the stack working directory on the server.
      // There is no server-side "write file" endpoint yet — this persists the
      // edited content to the server working dir via a placeholder PUT.
      // For now we write to localStorage as a client-side draft and alert the
      // user that server-side write is a TODO.
      const draftKey = `opseditor:${selectedStackId}:${selectedFile}`;
      localStorage.setItem(draftKey, fileContent);
      setOriginalContent(fileContent);
      setDirty(false);
      addToast('Saved as local draft (server write endpoint TODO)', 'info');
    } catch (err) {
      addToast('Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    navigate('/login');
  };

  const fileIcon = (type) => type === 'directory' ? <Folder size={14} /> : <FileCode size={14} />;
  const isDir = (f) => f.type === 'directory';

  const renderTree = (items, depth = 0) => (
    items
      .filter((f) => isDir(f) ? isExpanded(f.path) || depth === 0 : true)
      .map((f) => (
        <div
          key={f.path}
          style={{
            paddingLeft: depth * 18 + 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '12px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isDir(f)) toggleDir(f.path);
            else viewFile(f.path);
          }}
        >
          {isDir(f) ? (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>{isExpanded(f.path) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
              {fileIcon('directory')} <strong>{f.name}</strong>
            </>
          ) : (
            <>
              <span style={{ width: 14, display: 'inline-block' }} />
              {fileIcon('file')} {f.name}
            </>
          )}
        </div>
      ))
  );

  const topFiles = files.filter((f) => !isDir(f));
  const topDirs = files.filter((f) => isDir(f));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px', display: 'flex', flexDirection: 'column' }}>
      <header className="header">
        <h1>
          <Terminal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Stack Code Editor
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={fetchStacks} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <RotateCcw size={12} /> Refresh
          </button>
          <button className="glowing-btn" onClick={() => navigate('/dashboard/settings')} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <Settings size={12} /> Settings
          </button>
          <button className="glowing-btn" onClick={handleLogout} style={{ padding: '6px 12px', fontSize: '11px' }}>
            <LogOut size={12} /> Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex' }}>
        {/* Left: stack selector + file tree */}
        <div style={{ width: '320px', borderRight: '1px solid var(--border-color)', background: 'var(--surface-color)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Stacks</h2>
            <select
              style={{ width: '100%', padding: '6px 8px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
              value={selectedStackId || ''}
              onChange={(e) => selectStack(e.target.value)}
            >
              <option value="">Select a stack</option>
              {stacks.map((s) => (
                <option key={s.id} value={s.id}>{`${s.repo_name}/${s.stack_name} (${s.engine})`}</option>
              ))}
            </select>
          </div>
          {stack ? (
            <div style={{ padding: '12px', flex: 1, overflowY: 'auto', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                <Folder size={14} /> {stack.stack_name}
                <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>{stack.working_dir}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {renderTree(topDirs)}
                {renderTree(topFiles)}
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center' }}>
              No stacks found. Create one on the Infrastructure page.
            </div>
          )}
        </div>

        {/* Right: editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedFile ? (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCode size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ fontSize: '13px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFile}</span>
                  {dirty && <span style={{ color: 'var(--accent-color)', fontSize: '11px' }}>&bull; unsaved</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={saveFile}
                    disabled={!dirty || saving}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    {saving ? 'Saving...' : <><Save size={14} /> Save Draft</>}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', background: '#0f172a' }}>
                <textarea
                  value={fileContent}
                  onChange={handleContentChange}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#0f172a',
                    color: '#e2e8f0',
                    border: 'none',
                    outline: 'none',
                    padding: '20px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    resize: 'none',
                  }}
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Select a file from the tree to view and edit it.
            </div>
          )}
        </div>
      </main>

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default StackCodeEditor;
