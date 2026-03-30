import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onChange }) {
  const { page, pages, total, limit } = pagination;
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', borderTop: '1px solid var(--border-color)',
      fontSize: '13px', color: 'var(--text-secondary)',
    }}>
      <span>{from}–{to} of {total} events</span>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="glowing-btn"
          style={{ padding: '5px 10px' }}
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ color: 'var(--text-primary)', minWidth: '80px', textAlign: 'center' }}>
          Page {page} / {pages}
        </span>
        <button
          className="glowing-btn"
          style={{ padding: '5px 10px' }}
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
