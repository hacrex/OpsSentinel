import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, BarChart3, CloudRain } from 'lucide-react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('http://localhost:3001/events');
      setEvents(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setLoading(false);
    }
  };

  const totalRuns = events.length;
  const failedRuns = events.filter(e => e.conclusion === 'failure').length;
  const failRate = totalRuns > 0 ? ((failedRuns / totalRuns) * 100).toFixed(1) : 0;

  return (
    <div style={{minHeight: '100vh', paddingBottom: '40px'}}>
      <header className="header">
        <h1>
          <Activity size={24} />
          Ops Sentinel // CI Telemetry
        </h1>
        <div style={{display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px'}}>
          <span>{loading ? 'SYNCING...' : 'LIVE'}</span>
          <span style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-color)', boxShadow: 'var(--accent-glow)'}}></span>
        </div>
      </header>

      <main style={{maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 0'}}>
        
        <div className="metrics-grid">
          <div className="glass-panel metric-card">
            <div className="metric-label" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <CloudRain size={16} color="var(--accent-color)"/>
              Total Workflows
            </div>
            <div className="metric-value">{totalRuns}</div>
          </div>
          
          <div className="glass-panel metric-card">
            <div className="metric-label" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <ShieldAlert size={16} color="var(--error-color)"/>
              Detected Failures
            </div>
            <div className="metric-value" style={{color: 'var(--error-color)', textShadow: 'var(--error-glow)'}}>
              {failedRuns}
            </div>
          </div>

          <div className="glass-panel metric-card">
            <div className="metric-label" style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
              <BarChart3 size={16} color="var(--success-color)"/>
              System Health
            </div>
            <div className="metric-value" style={{color: 'var(--success-color)', textShadow: 'var(--success-glow)'}}>
              {100 - failRate}%
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{marginTop: '32px'}}>
          <div style={{padding: '16px', borderBottom: '1px solid rgba(64,196,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,11,20,0.5)'}}>
            <h2 style={{fontFamily: 'var(--font-mono)', color: 'var(--accent-color)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '4px'}}>Global Run Stream</h2>
            <div style={{fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)'}}>LIMIT: 100 EVENTS</div>
          </div>
          <div style={{overflowX: 'auto', maxHeight: '600px', overflowY: 'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Trace ID</th>
                  <th>Repository</th>
                  <th>Workflow Context</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => (
                  <tr key={evt.id}>
                    <td style={{color: 'var(--text-secondary)'}}>#{evt.id.toString().padStart(4, '0')}</td>
                    <td style={{color: 'var(--text-primary)', fontWeight: '600'}}>{evt.repo_name}</td>
                    <td>{evt.workflow_name}</td>
                    <td>
                      <span className={`status-badge ${evt.status === 'completed' ? 'status-success' : 'status-pending'}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${evt.conclusion === 'failure' ? 'status-failure' : 'status-success'}`}>
                        {evt.conclusion || 'PENDING'}
                      </span>
                    </td>
                    <td style={{color: 'var(--text-secondary)'}}>
                      {format(new Date(evt.created_at + 'Z'), 'MM/dd/yy HH:mm:ss')}
                    </td>
                    <td>
                      <a href={evt.run_url} target="_blank" rel="noreferrer" className="glowing-btn" style={{padding: '6px 12px', fontSize: '10px'}}>
                        Inspect
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {events.length === 0 && !loading && (
              <div style={{padding: '48px', textAlign: 'center', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '4px'}}>
                No telemetry data found locally.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
