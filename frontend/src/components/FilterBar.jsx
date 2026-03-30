import React from 'react';
import { Search, Filter } from 'lucide-react';

const selectStyle = {
  background: 'rgba(15, 23, 42, 0.8)',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  color: 'var(--text-primary)',
  padding: '7px 12px',
  fontSize: '13px',
  fontFamily: 'var(--font-sans)',
  cursor: 'pointer',
  outline: 'none',
};

export default function FilterBar({ repos, filters, onChange, onReset }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <Filter size={14} color="var(--text-secondary)" />

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
        <option value="">All Conclusions</option>
        <option value="failure">Failure</option>
        <option value="success">Success</option>
        <option value="cancelled">Cancelled</option>
        <option value="skipped">Skipped</option>
      </select>

      {(filters.repo || filters.conclusion) && (
        <button className="glowing-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onReset}>
          Clear
        </button>
      )}
    </div>
  );
}
