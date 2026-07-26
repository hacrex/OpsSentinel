import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, User, Activity, Filter } from 'lucide-react';
import api from '../api';

const containerStyle = {
  padding: '24px',
  maxWidth: '1200px',
  margin: '0 auto',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  marginBottom: '24px',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: '600',
  color: 'var(--text-primary)',
  margin: 0,
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle = {
  textAlign: 'left',
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  fontWeight: '500',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
};

const badgeStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
};

const actionColors = {
  user_login: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  workflow_rerun: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  notification_test: { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308' },
  settings_change: { bg: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
};

const filterContainerStyle = {
  display: 'flex',
  gap: '12px',
  marginBottom: '20px',
  alignItems: 'center',
};

const selectStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '8px 12px',
  fontSize: '13px',
  cursor: 'pointer',
};

const paginationStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '20px',
  fontSize: '13px',
  color: 'var(--text-secondary)',
};

const buttonStyle = {
  background: 'rgba(59, 130, 246, 0.2)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '4px',
  color: '#3b82f6',
  padding: '6px 12px',
  fontSize: '12px',
  cursor: 'pointer',
};

const emptyStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text-secondary)',
};

export default function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (actionFilter) params.set('action', actionFilter);
      const res = await api.get(`/audit-logs?${params}`);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const formatAction = (action) => {
    const labels = {
      user_login: 'User Login',
      workflow_rerun: 'Workflow Re-run',
      notification_test: 'Notification Test',
      settings_change: 'Settings Change',
    };
    return labels[action] || action;
  };

  const formatTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    return d.toLocaleString();
  };

  const getColor = (action) => actionColors[action] || { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={titleStyle}>Audit Logs</h1>
      </div>

      <div style={filterContainerStyle}>
        <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
        <select
          style={selectStyle}
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All Actions</option>
          <option value="user_login">User Login</option>
          <option value="workflow_rerun">Workflow Re-run</option>
          <option value="notification_test">Notification Test</option>
          <option value="settings_change">Settings Change</option>
        </select>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : logs.length === 0 ? (
        <div style={emptyStyle}>
          <Activity size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No audit logs found</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>User</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Resource</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const color = getColor(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={12} style={{ color: 'var(--text-secondary)' }} />
                          {formatTime(log.created_at)}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} style={{ color: 'var(--text-secondary)' }} />
                          {log.username || '-'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ ...badgeStyle, background: color.bg, color: color.color }}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td style={tdStyle}>{log.resource_id || '-'}</td>
                      <td style={tdStyle}>
                        {log.details ? (
                          <code style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                          </code>
                        ) : '-'}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={paginationStyle}>
            <span>
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                style={buttonStyle}
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                style={buttonStyle}
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
