import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, useToast } from '../components/Toast';

// Helper component to test useToast hook
function TestComponent() {
  const { toasts, addToast, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => addToast('Test message', 'success')}>Add Toast</button>
      <button onClick={() => addToast('Error message', 'error')}>Add Error</button>
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

describe('Toast Component', () => {
  it('should render toast with message', () => {
    const toasts = [{ id: 1, message: 'Test toast', type: 'success' }];
    render(<Toast toasts={toasts} removeToast={vi.fn()} />);
    expect(screen.getByText('Test toast')).toBeInTheDocument();
  });

  it('should render multiple toasts', () => {
    const toasts = [
      { id: 1, message: 'First toast', type: 'success' },
      { id: 2, message: 'Second toast', type: 'error' },
    ];
    render(<Toast toasts={toasts} removeToast={vi.fn()} />);
    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('should call removeToast when close button clicked', () => {
    const removeToast = vi.fn();
    const toasts = [{ id: 1, message: 'Test toast', type: 'success' }];
    render(<Toast toasts={toasts} removeToast={removeToast} />);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(removeToast).toHaveBeenCalledWith(1);
  });

  it('should auto-remove toast after duration', async () => {
    vi.useFakeTimers();
    const removeToast = vi.fn();
    const toasts = [{ id: 1, message: 'Test toast', type: 'success', duration: 1000 }];
    render(<Toast toasts={toasts} removeToast={removeToast} />);
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(removeToast).toHaveBeenCalledWith(1);
    vi.useRealTimers();
  });
});

describe('useToast Hook', () => {
  it('should add toast', () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should remove toast', async () => {
    vi.useFakeTimers();
    render(<TestComponent />);
    fireEvent.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
