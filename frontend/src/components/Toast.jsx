import React, { useEffect } from 'react';
import { XCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  error: <XCircle size={16} color="var(--error-color)" />,
  success: <CheckCircle size={16} color="var(--success-color)" />,
  warning: <AlertTriangle size={16} color="var(--pending-color)" />,
};

export function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 1000,
    }}>
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [onRemove, toast.duration]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)',
      borderRadius: '8px', padding: '12px 16px', minWidth: '280px', maxWidth: '380px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)',
      animation: 'slideIn 0.2s ease',
    }}>
      {ICONS[toast.type] || ICONS.warning}
      <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)' }}>{toast.message}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}>
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = React.useState([]);

  const addToast = React.useCallback((message, type = 'warning', duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
