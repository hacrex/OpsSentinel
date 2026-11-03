import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RepoDetail from './pages/RepoDetail';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';
import Infrastructure from './pages/Infrastructure';
import InfraDetail from './pages/InfraDetail';
import Incidents from './pages/Incidents';
import Secrets from './pages/Secrets';
import Configuration from './pages/Configuration';
import DoraMetrics from './pages/DoraMetrics';
import Policies from './pages/Policies';
import Fingerprints from './pages/Fingerprints';
import Remediation from './pages/Remediation';
import Predictions from './pages/Predictions';
import Drift from './pages/Drift';
import SSOLogin from './pages/SSOLogin';
import ErrorBoundary from './components/ErrorBoundary';
import api from './api';
import './index.css';

const PrivateRoute = ({ children }) => {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'auth' | 'unauth'

  useEffect(() => {
    api.get('/auth/me')
      .then(() => setAuthState('auth'))
      .catch(() => setAuthState('unauth'));
  }, []);

  if (authState === 'checking') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    );
  }

  return authState === 'auth' ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          {/* App routes (require auth) */}
          <Route path="/login" element={<Login />} />
          <Route path="/sso" element={<SSOLogin />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/repo/:repo(*)" element={<PrivateRoute><RepoDetail /></PrivateRoute>} />
          <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
          <Route path="/dashboard/users" element={<PrivateRoute><UserManagement /></PrivateRoute>} />
          <Route path="/dashboard/infrastructure" element={<PrivateRoute><Infrastructure /></PrivateRoute>} />
          <Route path="/dashboard/infra/:repo(*)/:stack" element={<PrivateRoute><InfraDetail /></PrivateRoute>} />
          <Route path="/dashboard/incidents" element={<PrivateRoute><Incidents /></PrivateRoute>} />
          <Route path="/dashboard/secrets" element={<PrivateRoute><Secrets /></PrivateRoute>} />
          <Route path="/dashboard/configuration" element={<PrivateRoute><Configuration /></PrivateRoute>} />
          <Route path="/dashboard/dora" element={<PrivateRoute><DoraMetrics /></PrivateRoute>} />
          <Route path="/dashboard/policies" element={<PrivateRoute><Policies /></PrivateRoute>} />
          <Route path="/dashboard/fingerprints" element={<PrivateRoute><Fingerprints /></PrivateRoute>} />
          <Route path="/dashboard/remediation" element={<PrivateRoute><Remediation /></PrivateRoute>} />
          <Route path="/dashboard/predictions" element={<PrivateRoute><Predictions /></PrivateRoute>} />
          <Route path="/dashboard/drift" element={<PrivateRoute><Drift /></PrivateRoute>} />

          {/* Redirect root to login or dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
