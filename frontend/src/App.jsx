import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import GeoReports from './pages/GeoReports';
import Campaigns from './pages/Campaigns';
import Sources from './pages/Sources';
import Settings from './pages/Settings';
import Profitability from './pages/Profitability';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Recommendations from './pages/Recommendations';
import Login from './pages/Login';
import SyncHistory from './pages/SyncHistory';
import CampaignProfitability from './pages/CampaignProfitability';
import AccountSettings from './pages/AccountSettings';
import { authService } from './services/api';
import { AccountProvider } from './context/AccountContext';

// Protected Route wrapper — redirects to /login if not authenticated
function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Validate existing token on app load
  useEffect(() => {
    const validateAuth = async () => {
      if (authService.isLoggedIn()) {
        try {
          const result = await authService.validateToken();
          setIsAuthenticated(true);
          setUser(result.user);
        } catch {
          // Token invalid — clear it
          localStorage.removeItem('arbitragex_token');
          localStorage.removeItem('arbitragex_user');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };
    validateAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darkBg flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-neonGreen/30 border-t-neonGreen rounded-full animate-spin" />
          <span className="text-slate-400">Loading ArbitrageX...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public: Login page */}
        <Route
          path="/login"
          element={
            isAuthenticated
              ? <Navigate to="/" replace />
              : <Login onLoginSuccess={handleLoginSuccess} />
          }
        />

        {/* Protected: All dashboard routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AccountProvider>
                <Layout user={user} onLogout={handleLogout} />
              </AccountProvider>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaign-profitability" element={<CampaignProfitability />} />
          <Route path="profitability" element={<Profitability />} />
          <Route path="geo" element={<GeoReports />} />
          <Route path="sources" element={<Sources />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="recommendations" element={<Recommendations />} />
          <Route path="sync-history" element={<SyncHistory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/accounts" element={<AccountSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
