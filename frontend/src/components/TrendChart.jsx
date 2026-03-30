import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

const tooltipStyle = {
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(56,189,248,0.2)',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#f8fafc',
};

export default function TrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Not enough data for trend chart yet.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    day: format(parseISO(d.day), 'MMM d'),
    Failures: parseInt(d.failures, 10) || 0,
    Successes: parseInt(d.successes, 10) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="day"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(56,189,248,0.1)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(56,189,248,0.05)' }} />
        <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
        <Bar dataKey="Successes" fill="var(--success-color)" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Failures" fill="var(--error-color)" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
