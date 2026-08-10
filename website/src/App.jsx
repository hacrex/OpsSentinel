import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Features from './pages/Features';
import Infrastructure from './pages/Infrastructure';
import Configuration from './pages/Configuration';
import Pricing from './pages/Pricing';
import Docs from './pages/Docs';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/infrastructure" element={<Infrastructure />} />
          <Route path="/configuration" element={<Configuration />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
