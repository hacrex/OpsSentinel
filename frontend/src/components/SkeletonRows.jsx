import React from 'react';

const pulse = {
  background: 'linear-gradient(90deg, rgba(56,189,248,0.05) 25%, rgba(56,189,248,0.1) 50%, rgba(56,189,248,0.05) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: '4px',
  height: '14px',
};

export default function SkeletonRows({ cols = 7, rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} style={{ padding: '14px 16px' }}>
              <div style={{ ...pulse, width: j === 0 ? '48px' : j === cols - 1 ? '64px' : '80%' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
