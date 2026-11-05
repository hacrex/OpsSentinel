import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal, LogOut, RotateCcw, Settings, Plus,
  Edit2, Trash2, Eye, EyeOff, Boxes, KeyRound, Clock4
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const ENGINES = ['tofu', 'terraform', 'pulumi', 'crossplane', 'bicep', 'packer'];
const OPERATIONS = ['plan', 'refresh', 'apply'];

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px',
};
const labelStyle = {
  display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px',
};

const sectionHeaderStyle = {
  padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)',
};

const ToggleSwitch = ({ checked, disabled, onClick, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width: '36px', height: '18px', minWidth: '36px', borderRadius: '999px', border: 'none', padding: 0,
      background: checked ? 'var(--accent-color)' : 'rgba(148,163,184,0.3)', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, position: 'relative', transition: 'background 0.2s', display: 'inline-block',
    }}
  >
    <span style={{
      position: 'absolute', top: '2px', left: checked ? '20px' : '2px', width: '14px', height: '14px',
      borderRadius: '50%', background: 'var(--text)', transition: 'left 0.2s', boxShadow: '0 0 4px rgba(0,0,0,0.4)',
    }} />
  </button>
);

const humanizeInterval = (minutes) => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

const StackConfig = () => {
  const navigate = useNavigate();

  // Stacks (top strip selector)
  const [stacks, setStacks] = useState([]);
  const [stacksLoading, setStacksLoading] = useState(true);
  const [selectedStackId, setSelectedStackId] = useState('');
  const selectedStack = stacks.find((s) => String(s.id) === String(selectedStackId));

  // Variables
  const [variables, setVariables] = useState([]);
  const [variablesLoading, setVariablesLoading] = useState(false);
  const [showValue, setShowValue] = useState({});
  const [varCreateOpen, setVarCreateOpen] = useState(false);
  const [varEditOpen, setVarEditOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState(null);
  const [varForm, setVarForm] = useState({ key: '', value: '', sensitive: false });
  const [varSubmitLoading, setVarSubmitLoading] = useState(false);
  const [deleting, setDeleting] = useState({});

  // Modules
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [moduleCreateOpen, setModuleCreateOpen] = useState(false);
  const [moduleForm, setModuleForm] = useState({ name: '', source: '', version: 'latest', engine: 'tofu', checksum: '' });
  const [moduleSubmitLoading, setModuleSubmitLoading] = useState(false);

  // Schedules
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [scheduleCreateOpen, setScheduleCreateOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ stack_id: '', operation: 'plan', interval_minutes: 1440, description: '' });
  const [scheduleSubmitLoading, setScheduleSubmitLoading] = useState(false);
  const [toggling, setToggling] = useState({});

  const { toasts, addToast, removeToast } = useToast();

  const selectedStackRef = useRef(selectedStackId);
  selectedStackRef.current = selectedStackId;

  const fetchStacks = useCallback(async () => {
    try {
      const res = await api.get('/infrastructure/stacks');
      setStacks(res.data || []);
      setStacksLoading(false);
    } catch (err) {
      console.error('Failed to fetch stacks:', err);
      setStacksLoading(false);
    }
  }, []);

  const fetchVariables = useCallback(async (stackId, isRefresh = false) => {
    if (!stackId) { setVariables([]); return; }
    try {
      if (isRefresh) setVariablesLoading(true);
      const res = await api.get(`/stacks/${stackId}/variables`);
      setVariables(res.data?.data || []);
      setVariablesLoading(false);
    } catch (err) {
      console.error('Failed to fetch variables:', err);
      setVariablesLoading(false);
    }
  }, []);

  const fetchModules = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setModulesLoading(true);
      const res = await api.get('/modules');
      setModules(res.data?.data || []);
      setModulesLoading(false);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      setModulesLoading(false);
    }
  }, []);

  const fetchSchedules = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setSchedulesLoading(true);
      const res = await api.get('/schedules');
      setSchedules(res.data?.data || []);
      setSchedulesLoading(false);
    } catch (err) {
      console.error('Failed to fetch schedules:', err);
      setSchedulesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStacks();
    fetchModules();
    fetchSchedules();
  }, [fetchStacks, fetchModules, fetchSchedules]);

  useEffect(() => {
    if (selectedStackId) {
      setVariablesLoading(true);
      setShowValue({});
      fetchVariables(selectedStackId);
    }
  }, [selectedStackId, fetchVariables]);

  useSocket((msg) => {
    if (msg.type === 'new_infra_run') {
      fetchSchedules();
    }
  });

  const handleRefresh = () => {
    if (selectedStackRef.current) fetchVariables(selectedStackRef.current, true);
    fetchModules(true);
    fetchSchedules(true);
  };

  const handleStackChange = (e) => setSelectedStackId(e.target.value);

  // ----- Variables -----
  const handleVarCreateOpen = () => {
    setVarForm({ key: '', value: '', sensitive: false });
    setVarCreateOpen(true);
  };

  const handleVarEditOpen = (v) => {
    setEditingVariable(v);
    setVarForm({ key: v.key, value: v.value || '', sensitive: !!v.sensitive });
    setVarEditOpen(true);
  };

  const handleVarFormChange = (key, value) => setVarForm((f) => ({ ...f, [key]: value }));

  const handleVarCreateSubmit = async (e) => {
    e.preventDefault();
    setVarSubmitLoading(true);
    try {
      await api.post(`/stacks/${selectedStackId}/variables`, {
        key: varForm.key,
        value: varForm.value,
        sensitive: varForm.sensitive,
      });
      addToast('Variable created', 'success');
      setVarCreateOpen(false);
      setVarSubmitLoading(false);
      fetchVariables(selectedStackRef.current);
    } catch (err) {
      setVarSubmitLoading(false);
      addToast(err.response?.data?.error || 'Failed to create variable', 'error');
    }
  };

  const handleVarEditSubmit = async (e) => {
    e.preventDefault();
    setVarSubmitLoading(true);
    try {
      const updateData = { key: varForm.key, sensitive: varForm.sensitive };
      if (varForm.value.trim()) updateData.value = varForm.value;
      await api.patch(`/stacks/${selectedStackId}/variables/${editingVariable.id}`, updateData);
      addToast('Variable updated', 'success');
      setVarEditOpen(false);
      setVarSubmitLoading(false);
      fetchVariables(selectedStackRef.current);
    } catch (err) {
      setVarSubmitLoading(false);
      addToast(err.response?.data?.error || 'Failed to update variable', 'error');
    }
  };

  const handleVarDelete = async (id) => {
    if (!window.confirm('Delete this variable?')) return;
    setDeleting((s) => ({ ...s, [`var-${id}`]: true }));
    try {
      await api.delete(`/stacks/${selectedStackId}/variables/${id}`);
      addToast('Variable deleted', 'success');
      setDeleting((s) => ({ ...s, [`var-${id}`]: false }));
      fetchVariables(selectedStackRef.current);
    } catch (err) {
      setDeleting((s) => ({ ...s, [`var-${id}`]: false }));
      addToast(err.response?.data?.error || 'Failed to delete variable', 'error');
    }
  };

  // ----- Modules -----
  const handleModuleCreateOpen = () => {
    setModuleForm({ name: '', source: '', version: 'latest', engine: 'tofu', checksum: '' });
    setModuleCreateOpen(true);
  };

  const handleModuleFormChange = (key, value) => setModuleForm((f) => ({ ...f, [key]: value }));

  const handleModuleCreateSubmit = async (e) => {
    e.preventDefault();
    setModuleSubmitLoading(true);
    try {
      const payload = { name: moduleForm.name, source: moduleForm.source, engine: moduleForm.engine };
      if (moduleForm.version.trim()) payload.version = moduleForm.version.trim();
      if (moduleForm.checksum.trim()) payload.checksum = moduleForm.checksum.trim();
      await api.post('/modules', payload);
      addToast('Module registered', 'success');
      setModuleCreateOpen(false);
      setModuleSubmitLoading(false);
      fetchModules();
    } catch (err) {
      setModuleSubmitLoading(false);
      addToast(err.response?.data?.error || 'Failed to register module', 'error');
    }
  };

  const handleModuleDelete = async (id) => {
    if (!window.confirm('Delete this module?')) return;
    setDeleting((s) => ({ ...s, [`mod-${id}`]: true }));
    try {
      await api.delete(`/modules/${id}`);
      addToast('Module deleted', 'success');
      setDeleting((s) => ({ ...s, [`mod-${id}`]: false }));
      fetchModules();
    } catch (err) {
      setDeleting((s) => ({ ...s, [`mod-${id}`]: false }));
      addToast(err.response?.data?.error || 'Failed to delete module', 'error');
    }
  };

  // ----- Schedules -----
  const handleScheduleCreateOpen = () => {
    setScheduleForm({
      stack_id: selectedStackId || (stacks[0] ? String(stacks[0].id) : '') || '',
      operation: 'plan', interval_minutes: 1440, description: '',
    });
    setScheduleCreateOpen(true);
  };

  const handleScheduleFormChange = (key, value) => setScheduleForm((f) => ({ ...f, [key]: value }));

  const handleScheduleCreateSubmit = async (e) => {
    e.preventDefault();
    setScheduleSubmitLoading(true);
    try {
      await api.post('/schedules', {
        stack_id: Number(scheduleForm.stack_id),
        operation: scheduleForm.operation,
        interval_minutes: Number(scheduleForm.interval_minutes) || 1440,
        description: scheduleForm.description,
      });
      addToast('Schedule created', 'success');
      setScheduleCreateOpen(false);
      setScheduleSubmitLoading(false);
      fetchSchedules();
    } catch (err) {
      setScheduleSubmitLoading(false);
      addToast(err.response?.data?.error || 'Failed to create schedule', 'error');
    }
  };

  const handleScheduleToggle = async (sched) => {
    setToggling((s) => ({ ...s, [sched.id]: true }));
    try {
      await api.patch(`/schedules/${sched.id}`, { enabled: !sched.enabled });
      addToast(`Schedule ${!sched.enabled ? 'enabled' : 'disabled'}`, 'success');
      setToggling((s) => ({ ...s, [sched.id]: false }));
      fetchSchedules();
    } catch (err) {
      setToggling((s) => ({ ...s, [sched.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update schedule', 'error');
    }
  };

  const handleScheduleDelete = async (id) => {
    if (!window.confirm('Delete this schedule?')) return;
    setDeleting((s) => ({ ...s, [`sched-${id}`]: true }));
    try {
      await api.delete(`/schedules/${id}`);
      addToast('Schedule deleted', 'success');
      setDeleting((s) => ({ ...s, [`sched-${id}`]: false }));
      fetchSchedules();
    } catch (err) {
      setDeleting((s) => ({ ...s, [`sched-${id}`]: false }));
      addToast(err.response?.data?.error || 'Failed to delete schedule', 'error');
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

  const variablesDisabled = !selectedStackId;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <SlidersHorizontal size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Stack Variables & Automation
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={handleRefresh} style={{ padding: '6px 10px', fontSize: '11px' }}>
            <RotateCcw size={12} />
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

        {/* Top strip: stack selector */}
        <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <SlidersHorizontal size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.5px' }}>STACK</span>
          <select
            onChange={handleStackChange}
            value={selectedStackId}
            style={{
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '4px',
              color: 'var(--text-primary)', padding: '6px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)',
              cursor: 'pointer', outline: 'none', minWidth: '260px',
            }}
          >
            <option value="">{stacksLoading ? 'Loading stacks...' : 'Select a stack…'}</option>
            {stacks.map((s) => (
              <option key={s.id} value={s.id}>
                {s.repo_name}/{s.stack_name} ({s.engine})
              </option>
            ))}
          </select>
          {selectedStack && (
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              working dir: <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedStack.working_dir || '/'}</span>
            </span>
          )}
        </div>

        {/* Section: Managed Variables */}
        <div className="glass-panel" style={{ marginTop: '20px', opacity: variablesDisabled ? 0.65 : 1 }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={14} color="var(--accent-color)" /> Managed Variables
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {selectedStack ? `${selectedStack.stack_name} — ${variables.length} variables` : 'No stack selected'}
              </span>
            </div>
            {selectedStack && (
              <button className="glowing-btn" onClick={handleVarCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
                <Plus size={12} /> New Variable
              </button>
            )}
          </div>

          {variablesDisabled ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Select a stack above to manage its variables.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>ID</th>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Source</th>
                    <th>Updated</th>
                    <th style={{ width: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variablesLoading ? (
                    <SkeletonRows cols={6} rows={5} />
                  ) : (
                    variables.map((v) => (
                      <tr key={v.id}>
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(v.id).padStart(4, '0')}</td>
                        <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{v.key}</td>
                        <td>
                          {v.sensitive || showValue[v.id] === 'shown' ? (
                            showValue[v.id] === 'shown' ? (
                              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v.value}</span>
                            ) : (
                              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>••••••••</span>
                            )
                          ) : (
                            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v.value}</span>
                          )}
                        </td>
                        <td style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{v.source || 'manual'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(v.updated_at || v.created_at)}</td>
                        <td style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                            onClick={() => handleVarEditOpen(v)}
                            title="Edit variable"
                          >
                            <Edit2 size={10} />
                          </button>
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                            onClick={() => setShowValue((s) => ({ ...s, [v.id]: s[v.id] === 'shown' ? 'hidden' : 'shown' }))}
                            title="Toggle value visibility"
                          >
                            {showValue[v.id] === 'shown' ? <EyeOff size={10} /> : <Eye size={10} />}
                          </button>
                          <button
                            className="glowing-btn"
                            style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                            onClick={() => handleVarDelete(v.id)}
                            title="Delete variable"
                          >
                            <Trash2 size={10} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!variablesLoading && variables.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No variables for this stack yet. Add one to parameterize your stack runtimes.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Module Registry */}
        <div className="glass-panel" style={{ marginTop: '20px' }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Boxes size={14} color="var(--accent-color)" /> Module Registry
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{modules.length} modules</span>
            </div>
            <button className="glowing-btn" onClick={handleModuleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
              <Plus size={12} /> New Module
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Name</th>
                  <th>Source</th>
                  <th>Version</th>
                  <th>Engine</th>
                  <th>Created</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {modulesLoading ? (
                  <SkeletonRows cols={7} rows={4} />
                ) : (
                  modules.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(m.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{m.name}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{m.source}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{m.version || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{m.engine}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(m.created_at)}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleModuleDelete(m.id)}
                          title="Delete module"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!modulesLoading && modules.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No modules registered. Register shared infrastructure modules to reuse across stacks.
              </div>
            )}
          </div>
        </div>

        {/* Section: Scheduled Plans */}
        <div className="glass-panel" style={{ marginTop: '20px' }}>
          <div style={sectionHeaderStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock4 size={14} color="var(--accent-color)" /> Scheduled Plans
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{schedules.length} schedules</span>
            </div>
            <button className="glowing-btn" onClick={handleScheduleCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
              <Plus size={12} /> New Schedule
            </button>
          </div>

          <div style={{ overflowX: 'auto', maxHeight: '420px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Stack</th>
                  <th>Operation</th>
                  <th>Interval</th>
                  <th>Enabled</th>
                  <th>Last Run</th>
                  <th>Next Run</th>
                  <th>Created by</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedulesLoading ? (
                  <SkeletonRows cols={9} rows={4} />
                ) : (
                  schedules.map((sc) => (
                    <tr key={sc.id}>
                      <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(sc.id).padStart(4, '0')}</td>
                      <td style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{sc.repo_name}/{sc.stack_name}</td>
                      <td>
                        <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {sc.operation}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{humanizeInterval(sc.interval_minutes)}</td>
                      <td>
                        <ToggleSwitch
                          checked={!!sc.enabled}
                          disabled={!!toggling[sc.id]}
                          onClick={() => handleScheduleToggle(sc)}
                          title={sc.enabled ? 'Disable schedule' : 'Enable schedule'}
                        />
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(sc.last_run_at)}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(sc.next_run_at)}</td>
                      <td style={{ fontSize: '12px' }}>{sc.created_by || '—'}</td>
                      <td style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleScheduleDelete(sc.id)}
                          title="Delete schedule"
                        >
                          <Trash2 size={10} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!schedulesLoading && schedules.length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No scheduled plans. Create one to run plan, refresh, or apply operations on an interval.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Variable Modal */}
      {varCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>New Variable — {selectedStack?.stack_name}</h2>
            <form onSubmit={handleVarCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Key</label>
                <input required style={inputStyle} value={varForm.key} onChange={(e) => handleVarFormChange('key', e.target.value)} placeholder="e.g. instance_type" />
              </div>
              <div>
                <label style={labelStyle}>Value</label>
                <input
                  required
                  type={varForm.sensitive ? 'password' : 'text'}
                  style={inputStyle}
                  value={varForm.value}
                  onChange={(e) => handleVarFormChange('value', e.target.value)}
                  placeholder="variable value"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={varForm.sensitive}
                    onChange={(e) => handleVarFormChange('sensitive', e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)' }}
                  />
                  Sensitive (mask value in UI)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setVarCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={varSubmitLoading}>
                  {varSubmitLoading ? 'Creating...' : 'Create Variable'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Variable Modal */}
      {varEditOpen && editingVariable && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Edit Variable — {editingVariable.key}</h2>
            <form onSubmit={handleVarEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Key</label>
                <input required style={inputStyle} value={varForm.key} onChange={(e) => handleVarFormChange('key', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Value</label>
                <input
                  type={varForm.sensitive ? 'password' : 'text'}
                  style={inputStyle}
                  value={varForm.value}
                  onChange={(e) => handleVarFormChange('value', e.target.value)}
                  placeholder="leave blank to keep current"
                />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={varForm.sensitive}
                    onChange={(e) => handleVarFormChange('sensitive', e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)' }}
                  />
                  Sensitive (mask value in UI)
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setVarEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={varSubmitLoading}>
                  {varSubmitLoading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Module Modal */}
      {moduleCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '440px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Register Module</h2>
            <form onSubmit={handleModuleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input required style={inputStyle} value={moduleForm.name} onChange={(e) => handleModuleFormChange('name', e.target.value)} placeholder="e.g. vpc-network" />
              </div>
              <div>
                <label style={labelStyle}>Source (git url or registry path)</label>
                <input required style={inputStyle} value={moduleForm.source} onChange={(e) => handleModuleFormChange('source', e.target.value)} placeholder="e.g. github.com/org/modules//vpc" />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Version</label>
                  <input style={inputStyle} value={moduleForm.version} onChange={(e) => handleModuleFormChange('version', e.target.value)} placeholder="latest" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Engine</label>
                  <select style={inputStyle} value={moduleForm.engine} onChange={(e) => handleModuleFormChange('engine', e.target.value)}>
                    {ENGINES.map((en) => <option key={en} value={en}>{en}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Checksum (optional)</label>
                <input style={inputStyle} value={moduleForm.checksum} onChange={(e) => handleModuleFormChange('checksum', e.target.value)} placeholder="sha256:..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setModuleCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={moduleSubmitLoading}>
                  {moduleSubmitLoading ? 'Registering...' : 'Register Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {scheduleCreateOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '440px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>New Schedule</h2>
            <form onSubmit={handleScheduleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Stack</label>
                <select required style={inputStyle} value={scheduleForm.stack_id} onChange={(e) => handleScheduleFormChange('stack_id', e.target.value)}>
                  <option value="">Select a stack…</option>
                  {stacks.map((s) => (
                    <option key={s.id} value={s.id}>{s.repo_name}/{s.stack_name} ({s.engine})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Operation</label>
                  <select style={inputStyle} value={scheduleForm.operation} onChange={(e) => handleScheduleFormChange('operation', e.target.value)}>
                    {OPERATIONS.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Interval (minutes)</label>
                  <input
                    type="number" min="5" required
                    style={inputStyle}
                    value={scheduleForm.interval_minutes}
                    onChange={(e) => handleScheduleFormChange('interval_minutes', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={scheduleForm.description} onChange={(e) => handleScheduleFormChange('description', e.target.value)} placeholder="e.g. Nightly drift check plan" />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setScheduleCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={scheduleSubmitLoading}>
                  {scheduleSubmitLoading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default StackConfig;
