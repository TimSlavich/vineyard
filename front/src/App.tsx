import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AutomationPage from './pages/AutomationPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import CookiesPolicyPage from './pages/CookiesPolicyPage';
import NotificationsPage from './pages/NotificationsPage';
import AllSensorsPage from './pages/AllSensorsPage';
import DiagnosticPage from './pages/DiagnosticPage';
import CalibratePage from './pages/CalibratePage';
import ReportsPage from './pages/ReportsPage';
import { isAuthenticated, getUserData, isLocalStorageAvailable } from './utils/storage';
import { DeviceSettingsProvider } from './context/DeviceSettingsContext';

// Компонент для отладки маршрутизации
const RouteDebugger = () => {
  const location = useLocation();

  useEffect(() => {
    // Проверяем авторизацию после изменения маршрута
    try {
      const isUserAuthenticated = isAuthenticated();
    } catch (err) {
      // Ошибка при проверке авторизации
    }
  }, [location]);

  return null;
};

// Защищенный маршрут, который проверяет аутентификацию
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // Проверка аутентификации
  const userAuthenticated = isAuthenticated();

  useEffect(() => {
    // Проверка аутентификации при загрузке
  }, [userAuthenticated]);

  if (!userAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Компонент для перенаправления аутентифицированных пользователей с логина на дашборд
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  // Проверка аутентификации
  const userAuthenticated = isAuthenticated();

  useEffect(() => {
    // Проверка аутентификации при загрузке
  }, [userAuthenticated]);

  if (userAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  useEffect(() => {
    try {
      const auth = isAuthenticated();
      if (auth) {
        const user = getUserData();
      }
    } catch (error) {
      // Ошибка при проверке авторизации
    }
  }, []);

  return (
    <DeviceSettingsProvider>
      <Router>
        <Layout>
          <RouteDebugger />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies-policy" element={<CookiesPolicyPage />} />
            <Route path="/login" element={
              <RedirectIfAuthenticated>
                <LoginPage />
              </RedirectIfAuthenticated>
            } />
            <Route path="/register" element={
              <RedirectIfAuthenticated>
                <RegisterPage />
              </RedirectIfAuthenticated>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } />
            <Route path="/automation" element={
              <ProtectedRoute>
                <AutomationPage />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            } />
            <Route path="/all-sensors" element={
              <ProtectedRoute>
                <AllSensorsPage />
              </ProtectedRoute>
            } />
            <Route path="/diagnostics" element={
              <ProtectedRoute>
                <DiagnosticPage />
              </ProtectedRoute>
            } />
            <Route path="/calibrate" element={
              <ProtectedRoute>
                <CalibratePage />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            } />
          </Routes>
        </Layout>
      </Router>
    </DeviceSettingsProvider>
  );
}

export default App;