import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrendChart from '../components/TrendChart';

// Mock recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  Legend: () => null,
}));

describe('TrendChart Component', () => {
  it('should show empty state when no data', () => {
    render(<TrendChart data={[]} />);
    expect(screen.getByText('Not enough data for trend chart yet.')).toBeInTheDocument();
  });

  it('should show empty state when data is null', () => {
    render(<TrendChart data={null} />);
    expect(screen.getByText('Not enough data for trend chart yet.')).toBeInTheDocument();
  });

  it('should render chart when data is provided', () => {
    const data = [
      { day: '2024-01-01', failures: 2, successes: 8 },
      { day: '2024-01-02', failures: 1, successes: 9 },
    ];
    render(<TrendChart data={data} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
