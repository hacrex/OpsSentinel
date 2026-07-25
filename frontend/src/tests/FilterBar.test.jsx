import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from '../components/FilterBar';

describe('FilterBar Component', () => {
  const defaultProps = {
    repos: ['owner/repo1', 'owner/repo2'],
    filters: { repo: '', conclusion: '' },
    onChange: vi.fn(),
    onReset: vi.fn(),
  };

  it('should render repo dropdown with all repos', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('All Repos')).toBeInTheDocument();
    expect(screen.getByText('owner/repo1')).toBeInTheDocument();
    expect(screen.getByText('owner/repo2')).toBeInTheDocument();
  });

  it('should render conclusion dropdown with options', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.getByText('All Conclusions')).toBeInTheDocument();
    expect(screen.getByText('Failure')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('should not show clear button when no filters active', () => {
    render(<FilterBar {...defaultProps} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('should show clear button when filters are active', () => {
    render(<FilterBar {...defaultProps} filters={{ repo: 'owner/repo1', conclusion: '' }} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should call onChange when repo filter changes', () => {
    render(<FilterBar {...defaultProps} />);
    const repoSelect = screen.getByDisplayValue('All Repos');
    fireEvent.change(repoSelect, { target: { value: 'owner/repo1' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ repo: 'owner/repo1', conclusion: '' });
  });

  it('should call onChange when conclusion filter changes', () => {
    render(<FilterBar {...defaultProps} />);
    const conclusionSelect = screen.getByDisplayValue('All Conclusions');
    fireEvent.change(conclusionSelect, { target: { value: 'failure' } });
    expect(defaultProps.onChange).toHaveBeenCalledWith({ repo: '', conclusion: 'failure' });
  });

  it('should call onReset when clear button clicked', () => {
    render(<FilterBar {...defaultProps} filters={{ repo: 'owner/repo1', conclusion: '' }} />);
    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);
    expect(defaultProps.onReset).toHaveBeenCalled();
  });
});
