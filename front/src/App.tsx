import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

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
import { isAuthenticated, isLocalStorageAvailable, setItem } from './utils/storage';
import { DeviceSettingsProvider } from './context/DeviceSettingsContext';
import { setRedirectCallback } from './services/api/baseApi';
import { loginAsDemoAndRedirect } from './utils/demoHelper';
import { initializeWebSocketConnection } from './services/websocketService';

// Защищенный маршрут, который проверяет аутентификацию
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Проверяем, авторизован ли пользователь
  if (!isAuthenticated()) {
    // Если пользователь не авторизован, автоматически логиним его в демо-режиме
    if (!loading) {
      // Устанавливаем флаг загрузки, чтобы избежать повторных вызовов
      setLoading(true);

      // Запускаем автоматический вход в демо-режим и перенаправление на dashboard
      loginAsDemoAndRedirect(navigate, setLoading);
    }

    // Пока идет процесс авторизации, можно показать загрузчик
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  // Если пользователь уже авторизован, показываем защищенный контент
  return <>{children}</>;
};

// Компонент для перенаправления аутентифицированных пользователей с логина на дашборд
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  return isAuthenticated() ? <Navigate to="/dashboard" /> : <>{children}</>;
};

// Внутренний компонент AppContent для использования хуков роутера
const AppContent = () => {
  const navigate = useNavigate();

  // Устанавливаем функцию редиректа при инициализации приложения
  useEffect(() => {
    setRedirectCallback(() => {
      // Перенаправляем на страницу логина при истечении сессии
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  // Инициализируем WebSocket соединение при загрузке приложения
  useEffect(() => {
    if (isAuthenticated()) {
      // Инициализируем соединение для получения данных с датчиков
      // Обратите внимание: логика оповещений удалена, осталась только визуализация
      initializeWebSocketConnection();
    }
  }, []);

  return (
    <>
      <Layout>
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
          {/* Удалены маршруты на несуществующие страницы */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Layout>
    </>
  );
};

function App() {
  useEffect(() => {
    try {
      // Проверка доступности localStorage
      if (!isLocalStorageAvailable()) {
        console.error('localStorage is not available. Authentication will not work properly.');
      }

      // Установка версии приложения в localStorage
      setItem('version', '1.0.0');
    } catch (error) {
      console.error('Error initializing application:', error);
    }
  }, []);

  return (
    <DeviceSettingsProvider>
      <Router>
        <AppContent />
      </Router>
    </DeviceSettingsProvider>
  );
}

export default App;