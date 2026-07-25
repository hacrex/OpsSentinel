import { Search, Filter } from 'lucide-react';

const selectStyle = {
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

const inputStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  padding: '6px 10px',
  fontSize: '12px',
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  width: '140px',
};

export default function FilterBar({ repos, filters, onChange, onReset }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
        <input
          style={{ ...inputStyle, paddingLeft: '28px' }}
          placeholder="Workflow..."
          value={filters.workflow || ''}
          onChange={(e) => onChange({ ...filters, workflow: e.target.value })}
        />
      </div>

      <select
        style={selectStyle}
        value={filters.repo}
        onChange={(e) => onChange({ ...filters, repo: e.target.value })}
      >
        <option value="">All Repos</option>
        {repos.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>

      <select
        style={selectStyle}
        value={filters.conclusion}
        onChange={(e) => onChange({ ...filters, conclusion: e.target.value })}
      >
        <option value="">All Status</option>
        <option value="failure">Failure</option>
        <option value="success">Success</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {(filters.repo || filters.conclusion || filters.workflow) && (
        <button
          className="glowing-btn"
          style={{ padding: '6px 10px', fontSize: '11px' }}
          onClick={onReset}
        >
          Clear
        </button>
      )}
    </div>
  );
}
