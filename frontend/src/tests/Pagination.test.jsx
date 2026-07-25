import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../components/Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    pagination: { page: 1, limit: 25, total: 100, pages: 4 },
    onChange: vi.fn(),
  };

  it('should not render when there is only 1 page', () => {
    render(<Pagination pagination={{ ...defaultProps.pagination, pages: 1 }} onChange={defaultProps.onChange} />);
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('should render pagination info', () => {
    render(<Pagination {...defaultProps} />);
    expect(screen.getByText('1–25 of 100 events')).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 4')).toBeInTheDocument();
  });

  it('should disable previous button on first page', () => {
    render(<Pagination {...defaultProps} />);
    const prevButton = screen.getByRole('button', { name: /chevronleft/i });
    expect(prevButton).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    render(<Pagination {...defaultProps} pagination={{ ...defaultProps.pagination, page: 4 }} />);
    const nextButton = screen.getByRole('button', { name: /chevronright/i });
    expect(nextButton).toBeDisabled();
  });

  it('should call onChange with next page when next button clicked', () => {
    render(<Pagination {...defaultProps} />);
    const nextButton = screen.getByRole('button', { name: /chevronright/i });
    fireEvent.click(nextButton);
    expect(defaultProps.onChange).toHaveBeenCalledWith(2);
  });

  it('should call onChange with previous page when prev button clicked', () => {
    render(<Pagination {...defaultProps} pagination={{ ...defaultProps.pagination, page: 2 }} />);
    const prevButton = screen.getByRole('button', { name: /chevronleft/i });
    fireEvent.click(prevButton);
    expect(defaultProps.onChange).toHaveBeenCalledWith(1);
  });
});
