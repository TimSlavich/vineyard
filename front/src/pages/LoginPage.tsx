import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Lock, EyeOff, Eye, AlertCircle, User } from 'lucide-react';
import { setAuthenticated } from '../utils/storage';
import { userApi } from '../services/api/userApi';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple validation
    if (!username || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    try {
      setLoading(true);

      // Вызываем метод логина
      await userApi.login({
        username,
        password
      });

      // После успешного входа пытаемся получить данные пользователя
      let userData;
      try {
        userData = await userApi.getProfile();
      } catch (profileError) {
        console.warn('Не удалось получить профиль пользователя, создаем базовый профиль:', profileError);
        // Создаем базовый объект пользователя на основе данных авторизации
        userData = {
          id: Math.floor(Math.random() * 10000) + 1, // Генерируем случайный ID вместо 0
          username,
          email: '',
          first_name: '',
          last_name: '',
          is_active: true,
          is_admin: false,
          role: 'new_user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      // Сохраняем статус авторизации и данные пользователя
      setAuthenticated(true, userData);

      // Перенаправление на dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Ошибка при входе:', err);
      setError(err.message || 'Произошла ошибка при входе. Проверьте имя пользователя и пароль.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-5">
      {/* Left panel - Illustration */}
      <div className="hidden md:flex md:col-span-3 bg-primary items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4 font-inter">
            Welcome to VineGuard
          </h1>
          <p className="text-white text-opacity-90 mb-8 font-roboto">
            The complete IoT solution for modern vineyard management. Monitor, analyze, and optimize your vineyard operations from anywhere.
          </p>
          <div className="relative">
            <img
              src="https://images.pexels.com/photos/5843432/pexels-photo-5843432.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="Smart vineyard monitoring"
              className="rounded-component shadow-elevated"
            />
            <div className="absolute -right-4 -bottom-4 p-3 bg-white rounded-component shadow-elevated">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-success rounded-full mr-2"></div>
                <span className="text-sm font-medium text-gray-800 font-roboto">16 Sensors Online</span>
              </div>
              <div className="flex items-center mt-2">
                <div className="w-3 h-3 bg-warning rounded-full mr-2"></div>
                <span className="text-sm font-medium text-gray-800 font-roboto">2 Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="md:col-span-2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-component shadow-card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-inter">
                Sign in to your account
              </h2>
              <p className="text-gray-600 font-roboto">
                Access your vineyard management dashboard
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 border-l-4 border-error rounded-md flex items-start">
                <AlertCircle className="text-error mr-2 flex-shrink-0" size={18} />
                <span className="text-sm text-error">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="your_username"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 font-roboto">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-dark transition-colors font-roboto">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} className="text-gray-400" />
                    ) : (
                      <Eye size={18} className="text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center mb-6">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 font-roboto">
                  Remember me
                </label>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? 'Вход...' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-roboto">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-component bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-component bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.386-1.335-1.755-1.335-1.755-1.09-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.3 1.23.956-.266 1.98-.398 3-.403 1.02.005 2.044.137 3 .403 2.29-1.552 3.297-1.23 3.297-1.23.654 1.652.243 2.873.118 3.176.768.84 1.235 1.91 1.235 3.22 0 4.61-2.805 5.625-5.475 5.92.43.37.81 1.096.81 2.22 0 1.604-.015 2.896-.015 3.292 0 .32.215.694.825.577C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12" />
                  </svg>
                  GitHub
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 font-roboto">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:text-primary-dark transition-colors font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;