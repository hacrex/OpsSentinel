import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RepoDetail from './pages/RepoDetail';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
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
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/repo/:repo(*)" element={<PrivateRoute><RepoDetail /></PrivateRoute>} />
          <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />

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
