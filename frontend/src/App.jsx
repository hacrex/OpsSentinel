import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RepoDetail from './pages/RepoDetail';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('github_token');
  return token ? children : <Navigate to="/login" />;
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

          {/* Redirect root to login or dashboard */}
          <Route path="/" element={
            localStorage.getItem('github_token')
              ? <Navigate to="/dashboard" />
              : <Navigate to="/login" />
          } />

          {/* Catch all - redirect to login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
