import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, Save } from 'lucide-react';
import api from '../api';
import { Toast, useToast } from '../components/Toast';

const containerStyle = {
  padding: '24px',
  maxWidth: '1000px',
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

const selectStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: '12px',
  cursor: 'pointer',
};

const badgeStyle = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
};

const roleColors = {
  admin: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  developer: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
  viewer: { bg: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8' },
};

const emptyStyle = {
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text-secondary)',
};

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const { toasts, addToast, removeToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      if (err.response?.status === 403) {
        addToast('Access denied. Admin role required.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    setSaving(userId);
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      addToast('Role updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update role:', err);
      addToast(err.response?.data?.error || 'Failed to update role', 'error');
    } finally {
      setSaving(null);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div style={containerStyle}>
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <div style={headerStyle}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={titleStyle}>User Management</h1>
      </div>

      {loading ? (
        <div style={emptyStyle}>Loading...</div>
      ) : users.length === 0 ? (
        <div style={emptyStyle}>
          <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No users found</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>GitHub ID</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Joined</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const color = roleColors[user.role] || roleColors.viewer;
                return (
                  <tr key={user.id}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user.avatar_url && (
                          <img
                            src={user.avatar_url}
                            alt={user.username}
                            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                          />
                        )}
                        <span style={{ fontWeight: '500' }}>{user.username}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {user.github_id}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ ...badgeStyle, background: color.bg, color: color.color }}>
                        <Shield size={10} style={{ marginRight: '4px' }} />
                        {user.role}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td style={tdStyle}>
                      <select
                        style={selectStyle}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={saving === user.id}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="developer">Developer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
