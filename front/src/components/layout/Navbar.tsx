import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import Button from '../ui/Button';
import { isAuthenticated, logout, getUserData } from '../../utils/storage';
import NotificationCenter from '../ui/NotificationCenter';
import { userApi } from '../../services/api/userApi';
import UserAvatar from '../ui/UserAvatar';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Проверка для страницы логина
  const isLoginPage = location.pathname === '/login' || location.pathname === '/register';

  // Базовые состояния
  const isHomePage = location.pathname === '/';
  const isUserAuthenticated = isAuthenticated();
  const userData = isUserAuthenticated ? getUserData() : null;

  // Обработчик выхода из системы
  const handleLogout = async () => {
    try {
      // Сначала вызываем API для выхода
      try {
        await userApi.logout();
      } catch (apiError) {
        console.error('Ошибка API при выходе:', apiError);
      }

      // Затем очищаем локальное хранилище
      logout();
      navigate('/');
    } catch (err) {
      console.error('Ошибка при выходе из системы:', err);
      navigate('/');
    }
  };

  // Переключение профильного меню
  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  // Переключение мобильного меню
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Изменение стиля навбара при прокрутке
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Закрытие мобильного меню при смене маршрута
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Закрытие профильного меню при клике вне области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  // Классы навигации
  const getNavClasses = () => {
    const baseClasses = 'fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out';

    if (isHomePage) {
      return isScrolled
        ? `${baseClasses} bg-white shadow-md`
        : `${baseClasses} bg-transparent`;
    }

    return `${baseClasses} bg-white shadow-sm`;
  };

  // Классы ссылок
  const getLinkClasses = (path: string) => {
    const isActive = location.pathname === path;
    const baseClasses = 'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 font-inter';

    if (isHomePage && !isScrolled) {
      return isActive
        ? `${baseClasses} text-white bg-white bg-opacity-20`
        : `${baseClasses} text-white hover:bg-white hover:bg-opacity-10`;
    }

    return isActive
      ? `${baseClasses} text-primary bg-primary bg-opacity-10`
      : `${baseClasses} text-gray-700 hover:bg-gray-100`;
  };

  // Не рендерим навбар на страницах логина/регистрации
  if (isLoginPage) return null;

  return (
    <nav className={getNavClasses()}>
      <div className="px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link
                to="/"
                className={`text-xl font-bold font-inter ${isHomePage && !isScrolled ? 'text-white' : 'text-primary'}`}
              >
                VineGuard
              </Link>
            </div>

            <div className="hidden sm:ml-6 sm:flex sm:space-x-2 items-center">
              <Link to="/dashboard" className={getLinkClasses('/dashboard')}>
                Панель керування
              </Link>
              <Link to="/analytics" className={getLinkClasses('/analytics')}>
                Аналітика
              </Link>
              <Link to="/automation" className={getLinkClasses('/automation')}>
                Автоматизація
              </Link>
              <Link to="/settings" className={getLinkClasses('/settings')}>
                Налаштування
              </Link>
            </div>
          </div>

          {/* Правая секция */}
          <div className="hidden sm:flex items-center">
            {!isUserAuthenticated ? (
              <div className="flex space-x-4">
                <Link to="/login">
                  <Button
                    variant={isScrolled || !isHomePage ? 'outline' : 'ghost'}
                    className={!isScrolled && isHomePage ? 'text-white border-white hover:bg-white hover:bg-opacity-10' : ''}
                  >
                    Увійти
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant={isScrolled || !isHomePage ? 'primary' : 'ghost'}
                    className={!isScrolled && isHomePage ? 'bg-white text-primary hover:bg-gray-100' : ''}
                  >
                    Зареєструватися
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="notification-wrapper">
                  <NotificationCenter className="mr-2" />
                </div>

                <div className="relative ml-3" ref={profileMenuRef}>
                  <div>
                    <button
                      type="button"
                      className="flex items-center rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
                      onClick={toggleProfileMenu}
                      aria-expanded={profileMenuOpen}
                      aria-haspopup="true"
                      aria-label="Відкрити меню користувача"
                    >
                      <span className="sr-only">Відкрити меню користувача</span>
                      <div className="flex items-center">
                        <UserAvatar
                          name={userData?.first_name || userData?.username}
                          email={userData?.email}
                          size="sm"
                        />
                        <ChevronDown size={16} className="ml-1 text-gray-500" />
                      </div>
                    </button>
                  </div>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-component bg-white py-1 shadow-elevated ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{userData?.name}</p>
                        <p className="text-xs text-gray-500">{userData?.email}</p>
                      </div>
                      <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Налаштування</Link>
                      <div className="border-t border-gray-100">
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Вийти
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Кнопка мобильного меню */}
          <div className="flex items-center sm:hidden">
            {isUserAuthenticated && <NotificationCenter className="mr-2" />}
            <button
              type="button"
              className={`inline-flex items-center justify-center p-2 rounded-md ${isHomePage && !isScrolled ? 'text-white hover:bg-white hover:bg-opacity-10' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
              onClick={toggleMobileMenu}
            >
              <span className="sr-only">Відкрити головне меню</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link to="/dashboard" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary">
              Панель керування
            </Link>
            <Link to="/analytics" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary">
              Аналітика
            </Link>
            <Link to="/automation" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary">
              Автоматизація
            </Link>
            <Link to="/settings" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary">
              Налаштування
            </Link>
          </div>

          {isUserAuthenticated && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <UserAvatar
                    name={userData?.first_name || userData?.username}
                    email={userData?.email}
                    size="md"
                  />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{userData?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{userData?.email}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <Link to="/settings" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary">
                  Налаштування
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100 hover:text-primary"
                >
                  Вийти
                </button>
              </div>
            </div>
          )}

          {!isUserAuthenticated && (
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-4 flex flex-col space-y-2">
                <Link to="/login" className="w-full">
                  <Button variant="outline" fullWidth>
                    Увійти
                  </Button>
                </Link>
                <Link to="/register" className="w-full">
                  <Button variant="primary" fullWidth>
                    Зареєструватися
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default React.memo(Navbar);