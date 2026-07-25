import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { table } from '@testing-library/react';
import SkeletonRows from '../components/SkeletonRows';

describe('SkeletonRows Component', () => {
  it('should render default rows and columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRows />
        </tbody>
      </table>
    );
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(8); // default rows
  });

  it('should render custom number of rows', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRows rows={3} />
        </tbody>
      </table>
    );
    const rows = container.querySelectorAll('tr');
    expect(rows.length).toBe(3);
  });

  it('should render custom number of columns', () => {
    const { container } = render(
      <table>
        <tbody>
          <SkeletonRows cols={5} rows={1} />
        </tbody>
      </table>
    );
    const cells = container.querySelectorAll('td');
    expect(cells.length).toBe(5);
  });
});
