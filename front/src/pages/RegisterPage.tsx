import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Mail, Lock, User, EyeOff, Eye, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { setAuthenticated, getItem, setItem } from '../utils/storage';
import { userApi } from '../services/api/userApi';
import debounce from 'lodash/debounce';

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Simple validation
    if (!username || !email || !password || !passwordConfirm) {
      setError('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Пароли не совпадают');
      return;
    }

    if (!acceptTerms) {
      setError('Необходимо принять условия использования');
      return;
    }

    try {
      setLoading(true);

      // Подготавливаем данные пользователя
      const userData = {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      };

      // Регистрация пользователя через API
      const registerResponse = await userApi.register(userData);

      // Получаем сохраненные данные
      const accessToken = getItem('accessToken');
      let userInfo = getItem('user');

      // Если после регистрации нет токена, выводим предупреждение
      if (!accessToken) {
        console.warn('Токен доступа не был сохранен после регистрации!');
        // Попробуем сохранить снова, если токен есть в ответе
        if (registerResponse && registerResponse.access_token) {
          setItem('accessToken', registerResponse.access_token);
          setItem('refreshToken', registerResponse.refresh_token || '');
        } else {
          console.warn('В ответе отсутствуют токены, но регистрация считается успешной');
        }
      }

      // Если у нас уже есть данные пользователя, используем их
      // Иначе пытаемся получить профиль
      if (!userInfo) {
        try {
          userInfo = await userApi.getProfile();
        } catch (profileError) {
          console.warn('Не удалось получить профиль пользователя:', profileError);
          // Здесь мы НЕ создаем базовый профиль, полагаемся на данные из ответа API
        }
        }

      // Сохраняем данные и устанавливаем флаг авторизации
      setAuthenticated(true, userInfo);

      // Перенаправление на dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Ошибка при регистрации:', err);

      // Устанавливаем понятную ошибку для пользователя
      let errorMessage = 'Произошла ошибка при регистрации. Попробуйте еще раз.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      setError(errorMessage);

      // Проверка на конкретные ошибки
      if (errorMessage.includes('имя') || errorMessage.includes('существует')) {
        setUsernameError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для проверки доступности имени пользователя
  const checkUsernameAvailability = debounce(async (name: string) => {
    if (!name || name.length < 3) return;

    try {
      setIsCheckingUsername(true);
      // Создаем временного пользователя для проверки ошибок регистрации, связанных с именем
      const testUser = {
        username: name,
        email: 'test@example.com',
        password: 'Test12345',
        password_confirm: 'Test12345'
      };

      await userApi.checkUsername(testUser.username);
      setUsernameError('');
    } catch (err: any) {
      const errorMessage = err.message;
      if (errorMessage.includes('имя')) {
        setUsernameError(errorMessage);
      }
    } finally {
      setIsCheckingUsername(false);
    }
  }, 500);

  // Эффект для проверки имени пользователя при его изменении
  useEffect(() => {
    if (username && username.length >= 3) {
      checkUsernameAvailability(username);
    } else {
      setUsernameError('');
    }

    return () => {
      checkUsernameAvailability.cancel();
    };
  }, [username]);

  const passwordRequirements = [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'uppercase', label: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lowercase', label: 'At least one lowercase letter', met: /[a-z]/.test(password) },
    { id: 'number', label: 'At least one number', met: /\d/.test(password) },
  ];

  return (
    <div className="min-h-screen grid md:grid-cols-5">
      {/* Left panel - Illustration */}
      <div className="hidden md:flex md:col-span-3 bg-primary items-center justify-center p-8">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold text-white mb-4 font-inter">
            Join VineGuard Today
          </h1>
          <p className="text-white text-opacity-90 mb-8 font-roboto">
            Create your account and start monitoring your vineyard with our powerful IoT platform. Get insights, alerts, and optimize your operations.
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

      {/* Right panel - Registration form */}
      <div className="md:col-span-2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-component shadow-card p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 font-inter">
                Create your account
              </h2>
              <p className="text-gray-600 font-roboto">
                Start your 14-day free trial, no credit card required
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
                  Username *
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
                    className={`pl-10 block w-full rounded-component border-gray-300 ${usernameError ? 'border-error' : ''} bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto`}
                    placeholder="your_username"
                  />
                  {isCheckingUsername && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <Loader2 size={18} className="text-gray-400 animate-spin" />
                    </div>
                  )}
                </div>
                {usernameError ? (
                  <p className="mt-1 text-xs text-error">
                    {usernameError}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Вы будете использовать это имя пользователя для входа в систему
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Password *
                </label>
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

                {/* Password requirements */}
                <div className="mt-2 space-y-2">
                  {passwordRequirements.map((req) => (
                    <div key={req.id} className="flex items-center">
                      {req.met ? (
                        <CheckCircle2 size={14} className="text-success mr-2" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span className={`text-xs ${req.met ? 'text-success' : 'text-gray-500'} font-roboto`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-10 block w-full rounded-component border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center mb-6">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 font-roboto">
                  I accept the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                </label>
              </div>

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? 'Регистрация...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 font-roboto">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;