import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Pricing from './pages/Pricing';
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
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/dashboard/repo/:repo(*)" element={<PrivateRoute><RepoDetail /></PrivateRoute>} />
          <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
