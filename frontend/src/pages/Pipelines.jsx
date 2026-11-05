import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitCommitVertical, Play, Plus, Edit2, Trash2, CheckCircle, XCircle,
  Clock, LogOut, Settings, Eye, Ban, Workflow, Terminal, RotateCcw
} from 'lucide-react';
import api from '../api';
import { format } from 'date-fns';
import Pagination from '../components/Pagination';
import SkeletonRows from '../components/SkeletonRows';
import { Toast, useToast } from '../components/Toast';
import { useSocket } from '../hooks/useSocket';

const STAGE_TYPES = ['provision', 'config', 'script', 'approval'];
const ENGINES = ['tofu', 'terraform', 'pulumi', 'cloudformation', 'crossplane', 'aws-cdk', 'bicep', 'packer', 'vagrant'];
const OPERATIONS = ['plan', 'apply', 'destroy', 'refresh'];

const inputStyle = {
  width: '100%', padding: '8px 10px', background: 'rgba(15,23,42,0.5)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px',
};
const labelStyle = {
  display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px',
};
const chipStyle = {
  display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)',
};

const statusColor = (status) => {
  switch (status) {
    case 'running': return 'var(--accent-color)';
    case 'awaiting_approval': return 'rgba(245,158,11,0.9)';
    case 'succeeded': return 'var(--success-color)';
    case 'failed': return 'var(--error-color)';
    case 'cancelled': return 'var(--text-secondary)';
    default: return 'var(--text-secondary)';
  }
};

const conclusionColor = (c) => {
  switch (c) {
    case 'success': return 'var(--success-color)';
    case 'failure': return 'var(--error-color)';
    case 'cancelled': return 'var(--text-secondary)';
    default: return 'var(--accent-color)';
  }
};

const stageChipLabel = (stage, i) => {
  const n = i + 1;
  switch (stage.stage_type) {
    case 'provision': return `${n} ${stage.operation || 'plan'} (${stage.engine || 'tofu'})`;
    case 'config': return `${n} Config (${stage.playbook ? stage.playbook.split('/').pop().replace(/\.ya?ml$/, '') : 'ansible'})`;
    case 'script': return `${n} Script`;
    case 'approval': return `${n} Approval`;
    default: return `${n} ${stage.name || stage.stage_type}`;
  }
};

const emptyStage = () => ({
  name: '',
  stage_type: 'provision',
  engine: 'tofu',
  operation: 'plan',
  working_dir: '',
  playbook: '',
  inventory: '',
  script: '',
  timeout_seconds: 3600,
  requires_approval: false,
});

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

const Pipelines = () => {
  const navigate = useNavigate();
  const [pipelines, setPipelines] = useState([]);
  const [pipelinesLoading, setPipelinesLoading] = useState(true);
  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [runsLoading, setRunsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pipeline create/edit modal
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [editingPipeline, setEditingPipeline] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({ name: '', repo_name: '', description: '', enabled: true });
  const [stages, setStages] = useState([emptyStage()]);
  const [pipelineSubmitLoading, setPipelineSubmitLoading] = useState(false);
  const [pipelineActionLoading, setPipelineActionLoading] = useState({});

  // Run detail modal
  const [runDetail, setRunDetail] = useState(null);
  const [runDetailOpen, setRunDetailOpen] = useState(false);
  const [runDetailLoading, setRunDetailLoading] = useState(false);

  const pageRef = useRef(1);
  const runsRef = useRef([]);
  runsRef.current = runs;

  const { toasts, addToast, removeToast } = useToast();

  const fetchPipelines = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const res = await api.get('/pipelines');
      setPipelines(res.data.data);
      setPipelinesLoading(false);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
      setPipelinesLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchRuns = useCallback(async (page = pageRef.current, isRefresh = false) => {
    try {
      if (isRefresh) setRunsLoading(true);
      const res = await api.get('/pipelines/runs', { params: { page, limit: 10 } });
      setRuns(res.data.data);
      if (res.data.pagination) setPagination(res.data.pagination);
      pageRef.current = page;
      setRunsLoading(false);
    } catch (err) {
      console.error('Failed to fetch pipeline runs:', err);
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
    fetchRuns(1);
  }, [fetchPipelines, fetchRuns]);

  // Poll every 5s while any run is running or awaiting approval
  useEffect(() => {
    const interval = setInterval(() => {
      const hasActive = (runsRef.current || []).some((r) => r.status === 'running' || r.status === 'awaiting_approval');
      if (hasActive) fetchRuns(pageRef.current);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  useSocket((msg) => {
    if (typeof msg.type === 'string' && msg.type.startsWith('pipeline_')) {
      fetchRuns(pageRef.current);
    }
  });

  const pipelineName = (pipelineId) => {
    const p = pipelines.find((pl) => pl.id === pipelineId);
    return p ? p.name : `#${pipelineId}`;
  };

  const handlePageChange = (page) => {
    setRunsLoading(true);
    fetchRuns(page);
  };

  // ----- Pipeline modal -----
  const handlePipelineCreateOpen = () => {
    setEditingPipeline(null);
    setPipelineForm({ name: '', repo_name: '', description: '', enabled: true });
    setStages([emptyStage()]);
    setPipelineModalOpen(true);
  };

  const handlePipelineEditOpen = (p) => {
    setEditingPipeline(p);
    setPipelineForm({
      name: p.name,
      repo_name: p.repo_name || '',
      description: p.description || '',
      enabled: !!p.enabled,
    });
    setStages((p.stages || []).map((s) => ({
      ...emptyStage(),
      ...s,
    })));
    setPipelineModalOpen(true);
  };

  const handlePipelineFormChange = (key, value) => setPipelineForm((f) => ({ ...f, [key]: value }));

  const handleStageChange = (idx, key, value) => {
    setStages((prev) => prev.map((st, i) => (i === idx ? { ...st, [key]: value } : st)));
  };

  const handleAddStage = () => setStages((prev) => [...prev, emptyStage()]);

  const handleRemoveStage = (idx) => setStages((prev) => prev.filter((_, i) => i !== idx));

  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    setPipelineSubmitLoading(true);
    try {
      const payload = {
        name: pipelineForm.name,
        repo_name: pipelineForm.repo_name,
        description: pipelineForm.description,
        enabled: pipelineForm.enabled,
        stages: stages.map((st, i) => ({
          name: st.name || `${st.stage_type} ${i + 1}`,
          stage_type: st.stage_type,
          stage_order: i + 1,
          engine: st.stage_type === 'provision' ? st.engine : null,
          operation: st.stage_type === 'provision' ? st.operation : null,
          working_dir: st.working_dir || null,
          playbook: st.stage_type === 'config' ? st.playbook : null,
          inventory: st.stage_type === 'config' ? st.inventory : null,
          script: st.stage_type === 'script' ? st.script : null,
          timeout_seconds: Number(st.timeout_seconds) || 3600,
          requires_approval: !!st.requires_approval,
        })),
      };
      if (editingPipeline) {
        await api.patch(`/pipelines/${editingPipeline.id}`, payload);
        addToast('Pipeline updated', 'success');
      } else {
        await api.post('/pipelines', payload);
        addToast('Pipeline created', 'success');
      }
      setPipelineModalOpen(false);
      setPipelineSubmitLoading(false);
      fetchPipelines();
    } catch (err) {
      setPipelineSubmitLoading(false);
      addToast(err.response?.data?.error || 'Failed to save pipeline', 'error');
    }
  };

  const handlePipelineDelete = async (id) => {
    if (!window.confirm('Delete this pipeline?')) return;
    try {
      await api.delete(`/pipelines/${id}`);
      addToast('Pipeline deleted', 'success');
      fetchPipelines();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to delete pipeline', 'error');
    }
  };

  const handleToggleEnabled = async (p) => {
    setPipelineActionLoading((s) => ({ ...s, [p.id]: true }));
    try {
      await api.patch(`/pipelines/${p.id}`, { enabled: !p.enabled });
      addToast(`Pipeline ${!p.enabled ? 'enabled' : 'disabled'}`, 'success');
      setPipelineActionLoading((s) => ({ ...s, [p.id]: false }));
      fetchPipelines();
    } catch (err) {
      setPipelineActionLoading((s) => ({ ...s, [p.id]: false }));
      addToast(err.response?.data?.error || 'Failed to update pipeline', 'error');
    }
  };

  const handleRunPipeline = async (p) => {
    setPipelineActionLoading((s) => ({ ...s, [p.id]: true }));
    try {
      const res = await api.post(`/pipelines/${p.id}/run`);
      addToast(`Run started: #${res.data.run_id}`, 'success');
      setPipelineActionLoading((s) => ({ ...s, [p.id]: false }));
      fetchRuns(pageRef.current);
    } catch (err) {
      setPipelineActionLoading((s) => ({ ...s, [p.id]: false }));
      addToast(err.response?.data?.error || 'Failed to start run', 'error');
    }
  };

  // ----- Run actions -----
  const refetchRunDetail = useCallback(async (runId) => {
    if (!runId) return;
    try {
      const res = await api.get(`/pipelines/runs/${runId}`);
      setRunDetail(res.data);
    } catch { /* ignore */ }
  }, []);

  const handleApprove = async (run, approved) => {
    setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: true }));
    try {
      await api.post(`/pipelines/runs/${run.id}/approve`, { approved });
      addToast(approved ? 'Run approved' : 'Run rejected', approved ? 'success' : 'warning');
      setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: false }));
      fetchRuns(pageRef.current);
      if (runDetailOpen && runDetail?.id === run.id) refetchRunDetail(run.id);
    } catch (err) {
      setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: false }));
      addToast(err.response?.data?.error || 'Failed to submit approval', 'error');
    }
  };

  const handleCancelRun = async (run) => {
    setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: true }));
    try {
      await api.post(`/pipelines/runs/${run.id}/cancel`);
      addToast('Run cancelled', 'success');
      setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: false }));
      fetchRuns(pageRef.current);
      if (runDetailOpen && runDetail?.id === run.id) refetchRunDetail(run.id);
    } catch (err) {
      setPipelineActionLoading((s) => ({ ...s, [`run-${run.id}`]: false }));
      addToast(err.response?.data?.error || 'Failed to cancel run', 'error');
    }
  };

  const handleRunClick = async (run) => {
    setRunDetailLoading(true);
    setRunDetailOpen(true);
    try {
      const res = await api.get(`/pipelines/runs/${run.id}`);
      setRunDetail(res.data);
      setRunDetailLoading(false);
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to fetch run detail', 'error');
      setRunDetailOpen(false);
      setRunDetailLoading(false);
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

  const totalPipelines = pipelines.length;
  const enabledCount = pipelines.filter((p) => p.enabled).length;
  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'awaiting_approval').length;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      <header className="header">
        <h1>
          <GitCommitVertical size={24} style={{ color: 'var(--accent-color)' }} />
          OpsSentinel — Pipelines
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="glowing-btn" onClick={() => fetchPipelines(true)} disabled={refreshing} style={{ padding: '6px 10px', fontSize: '11px' }}>
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

      <main style={{ maxWidth: '1480px', margin: '0 auto', padding: '24px 24px 0' }}>
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label"><Workflow size={14} color="var(--text-secondary)" /> Total Pipelines</div>
            <div className="metric-value">{totalPipelines.toLocaleString()}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><CheckCircle size={14} color="var(--text-secondary)" /> Enabled</div>
            <div className="metric-value success">{enabledCount}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Play size={14} color="var(--text-secondary)" /> Active Runs</div>
            <div className="metric-value">{activeRuns}</div>
          </div>
          <div className="glass-panel metric-card">
            <div className="metric-label"><Clock size={14} color="var(--text-secondary)" /> Recent Runs</div>
            <div className="metric-value">{pagination.total.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '24px', alignItems: 'flex-start' }}>

          {/* Left column: Pipelines */}
          <div className="glass-panel" style={{ flex: '1 1 520px', minWidth: '480px' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Pipelines</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{totalPipelines} defined</span>
              </div>
              <button className="glowing-btn" onClick={handlePipelineCreateOpen} style={{ padding: '6px 12px', fontSize: '11px' }}>
                <Plus size={12} /> New Pipeline
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '640px', overflowY: 'auto' }}>
              {pipelinesLoading ? (
                <div style={{ padding: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading pipelines…</div>
              ) : pipelines.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No pipelines defined. Create one to orchestrate provision, config, script, and approval stages.
                </div>
              ) : (
                pipelines.map((p) => (
                  <div key={p.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px 16px', background: 'rgba(15, 23, 42, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{p.repo_name || '—'}</div>
                        {p.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>{p.description}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--success-color)' }}
                          onClick={() => handleRunPipeline(p)}
                          title="Run pipeline"
                          disabled={!!pipelineActionLoading[p.id]}
                        >
                          <Play size={10} /> Run
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handlePipelineEditOpen(p)}
                          title="Edit pipeline"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handlePipelineDelete(p.id)}
                          title="Delete pipeline"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
                      {(p.stages || []).map((st, i) => (
                        <span key={st.id || i} style={chipStyle}>{stageChipLabel(st, i)}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                      <ToggleSwitch
                        checked={!!p.enabled}
                        disabled={!!pipelineActionLoading[p.id]}
                        onClick={() => handleToggleEnabled(p)}
                        title={p.enabled ? 'Disable pipeline' : 'Enable pipeline'}
                      />
                      <span style={{ fontSize: '11px', color: p.enabled ? 'var(--success-color)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {p.enabled ? 'enabled' : 'disabled'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column: Recent Runs */}
          <div className="glass-panel" style={{ flex: '1 1 520px', minWidth: '480px' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(15, 23, 42, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Recent Runs</h2>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pagination.total.toLocaleString()} total</span>
              </div>
              <button className="glowing-btn" onClick={() => fetchRuns(pageRef.current, true)} disabled={runsLoading} style={{ padding: '6px 10px', fontSize: '11px' }}>
                <RotateCcw size={12} />
              </button>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '560px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Run ID</th>
                    <th>Pipeline</th>
                    <th>Status</th>
                    <th>Triggered by</th>
                    <th>Started</th>
                    <th>Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {runsLoading ? (
                    <SkeletonRows cols={6} rows={6} />
                  ) : (
                    runs.map((r) => (
                      <tr
                        key={r.id}
                        onClick={() => handleRunClick(r)}
                        style={{ cursor: 'pointer' }}
                        title="View run detail"
                      >
                        <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>#{r.id}</td>
                        <td style={{ fontSize: '13px', fontWeight: '500', fontFamily: 'var(--font-mono)' }}>{pipelineName(r.pipeline_id)}</td>
                        <td>
                          <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>{r.triggered_by || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTs(r.started_at)}</td>
                        <td style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {formatTs(r.finished_at)}
                          {r.status === 'awaiting_approval' && (
                            <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                className="glowing-btn"
                                style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--success-color)' }}
                                onClick={() => handleApprove(r, true)}
                                title="Approve run"
                                disabled={!!pipelineActionLoading[`run-${r.id}`]}
                              >
                                <CheckCircle size={10} />
                              </button>
                              <button
                                className="glowing-btn"
                                style={{ padding: '4px 8px', fontSize: '10px', color: 'rgba(245,158,11,0.9)' }}
                                onClick={() => handleApprove(r, false)}
                                title="Reject run"
                                disabled={!!pipelineActionLoading[`run-${r.id}`]}
                              >
                                <XCircle size={10} />
                              </button>
                            </span>
                          )}
                          {(r.status === 'running' || r.status === 'awaiting_approval') && (
                            <span onClick={(e) => e.stopPropagation()}>
                              <button
                                className="glowing-btn"
                                style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                                onClick={() => handleCancelRun(r)}
                                title="Cancel run"
                                disabled={!!pipelineActionLoading[`run-${r.id}`]}
                              >
                                <Ban size={10} />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!runsLoading && runs.length === 0 && (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No pipeline runs yet. Hit Run on a pipeline to see execution history here.
                </div>
              )}
            </div>

            <Pagination pagination={pagination} onChange={handlePageChange} />
          </div>
        </div>
      </main>

      {/* Pipeline Create/Edit Modal */}
      {pipelineModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '560px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              {editingPipeline ? `Edit Pipeline — ${editingPipeline.name}` : 'New Pipeline'}
            </h2>
            <form onSubmit={handlePipelineSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name</label>
                  <input required style={inputStyle} value={pipelineForm.name} onChange={(e) => handlePipelineFormChange('name', e.target.value)} placeholder="e.g. infra-bootstrap" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Repo</label>
                  <input style={inputStyle} value={pipelineForm.repo_name} onChange={(e) => handlePipelineFormChange('repo_name', e.target.value)} placeholder="e.g. org/infra" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={pipelineForm.description} onChange={(e) => handlePipelineFormChange('description', e.target.value)} placeholder="What does this pipeline do?" />
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={pipelineForm.enabled}
                    onChange={(e) => handlePipelineFormChange('enabled', e.target.checked)}
                    style={{ accentColor: 'var(--accent-color)' }}
                  />
                  Enabled
                </label>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ ...labelStyle, marginBottom: 0, fontWeight: '600' }}>Stages</label>
                  <button type="button" className="glowing-btn" onClick={handleAddStage} style={{ padding: '6px 10px', fontSize: '11px' }}>
                    <Plus size={12} /> Add Stage
                  </button>
                </div>

                {stages.map((st, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(15, 23, 42, 0.3)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ ...chipStyle, minWidth: '26px', justifyContent: 'center' }}>{idx + 1}</span>
                      <input required style={{ ...inputStyle, flex: 1, width: 'auto' }} value={st.name} onChange={(e) => handleStageChange(idx, 'name', e.target.value)} placeholder="Stage name" />
                      <select style={{ ...inputStyle, width: '140px', cursor: 'pointer' }} value={st.stage_type} onChange={(e) => handleStageChange(idx, 'stage_type', e.target.value)}>
                        {STAGE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          className="glowing-btn"
                          style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--error-color)' }}
                          onClick={() => handleRemoveStage(idx)}
                          title="Remove stage"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>

                    {st.stage_type === 'provision' && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <select style={{ ...inputStyle, width: '160px', cursor: 'pointer' }} value={st.engine || 'tofu'} onChange={(e) => handleStageChange(idx, 'engine', e.target.value)}>
                          {ENGINES.map((en) => <option key={en} value={en}>{en}</option>)}
                        </select>
                        <select style={{ ...inputStyle, width: '130px', cursor: 'pointer' }} value={st.operation || 'plan'} onChange={(e) => handleStageChange(idx, 'operation', e.target.value)}>
                          {OPERATIONS.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                        <input style={{ ...inputStyle, flex: 1, width: 'auto' }} value={st.working_dir || ''} onChange={(e) => handleStageChange(idx, 'working_dir', e.target.value)} placeholder="Working dir (e.g. stacks/vpc)" />
                      </div>
                    )}

                    {st.stage_type === 'config' && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input style={{ ...inputStyle, flex: 1, width: 'auto' }} value={st.playbook || ''} onChange={(e) => handleStageChange(idx, 'playbook', e.target.value)} placeholder="Playbook (e.g. playbooks/web.yml)" />
                        <input style={{ ...inputStyle, flex: 1, width: 'auto' }} value={st.inventory || ''} onChange={(e) => handleStageChange(idx, 'inventory', e.target.value)} placeholder="Inventory (e.g. inventories/prod)" />
                        <input style={{ ...inputStyle, width: '200px' }} value={st.working_dir || ''} onChange={(e) => handleStageChange(idx, 'working_dir', e.target.value)} placeholder="Working dir" />
                      </div>
                    )}

                    {st.stage_type === 'script' && (
                      <textarea
                        style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                        value={st.script || ''}
                        onChange={(e) => handleStageChange(idx, 'script', e.target.value)}
                        placeholder="Script content or command"
                      />
                    )}

                    {st.stage_type === 'approval' && (
                      <label style={{ ...labelStyle, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!st.requires_approval}
                          onChange={(e) => handleStageChange(idx, 'requires_approval', e.target.checked)}
                          style={{ accentColor: 'var(--accent-color)' }}
                        />
                        Requires approval
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="glowing-btn" style={{ padding: '8px 16px', fontSize: '12px' }} onClick={() => setPipelineModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }} disabled={pipelineSubmitLoading}>
                  {pipelineSubmitLoading ? 'Saving...' : editingPipeline ? 'Save Changes' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Run Detail Modal */}
      {runDetailOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setRunDetailOpen(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', minWidth: '560px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>
                Run #{runDetail?.id} — {pipelineName(runDetail?.pipeline_id)}
              </h2>
              <button className="glowing-btn" style={{ padding: '4px 8px', fontSize: '10px' }} onClick={() => setRunDetailOpen(false)}>
                <XCircle size={12} />
              </button>
            </div>

            {runDetailLoading || !runDetail ? (
              <div style={{ padding: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>Loading run detail…</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: statusColor(runDetail.status), border: `1px solid ${statusColor(runDetail.status)}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {runDetail.status}
                  </span>
                  <span>Triggered by: <strong style={{ color: 'var(--text)' }}>{runDetail.triggered_by || '—'}</strong></span>
                  <span>Started: {formatTs(runDetail.started_at)}</span>
                  <span>Finished: {formatTs(runDetail.finished_at)}</span>
                  {runDetail.status === 'awaiting_approval' && (
                    <span style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        className="glowing-btn"
                        style={{ padding: '4px 10px', fontSize: '10px', color: 'var(--success-color)' }}
                        onClick={() => handleApprove(runDetail, true)}
                      >
                        <CheckCircle size={10} /> Approve
                      </button>
                      <button
                        className="glowing-btn"
                        style={{ padding: '4px 10px', fontSize: '10px', color: 'rgba(245,158,11,0.9)' }}
                        onClick={() => handleApprove(runDetail, false)}
                      >
                        <XCircle size={10} /> Reject
                      </button>
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(runDetail.stages || []).map((st, i) => (
                    <div key={st.id || i} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 14px', background: 'rgba(15, 23, 42, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ ...chipStyle, minWidth: '26px', justifyContent: 'center' }}>{st.stage_order != null ? st.stage_order : i + 1}</span>
                          <span style={{ fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{st.stage_name || st.name}</span>
                          {(st.engine || st.operation) && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{st.operation ? `${st.operation}` : ''}{st.engine ? ` (${st.engine})` : ''}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {st.output_url && (
                            <a href={st.output_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-color)', textDecoration: 'none' }}>
                              <Eye size={10} /> Output
                            </a>
                          )}
                          {st.logs && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              <Terminal size={10} /> Logs
                            </span>
                          )}
                          <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', fontSize: '11px', color: conclusionColor(st.conclusion || st.status), border: `1px solid ${conclusionColor(st.conclusion || st.status)}`, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {st.conclusion || st.status || 'pending'}
                          </span>
                        </div>
                      </div>
                      {(st.started_at || st.finished_at) && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          {formatTs(st.started_at)} → {formatTs(st.finished_at)}
                        </div>
                      )}
                    </div>
                  ))}
                  {(!runDetail.stages || runDetail.stages.length === 0) && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      No stage records for this run.
                    </div>
                  )}
                </div>
              </>
            )}
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

export default Pipelines;
