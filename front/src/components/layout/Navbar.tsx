import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, ChevronDown } from 'lucide-react';
import { currentUser } from '../../data/mockData';
import Button from '../ui/Button';
import { isAuthenticated as checkAuth, logout, getUserData } from '../../utils/storage';
import NotificationCenter from '../ui/NotificationCenter';

// Helper function to check if the user is authenticated
function isAuthenticated() {
  return checkAuth();
}

const Navbar: React.FC = () => {
  const location = useLocation();

  // Проверка для страницы логина должна быть до использования хуков
  const isLoginPage = location.pathname === '/login' || location.pathname === '/register';

  // Don't render navbar on login/register pages
  if (isLoginPage) return null;

  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Мемоизация состояний страниц и пользовательских данных
  const pageAndUserState = useMemo(() => {
    const isHomePage = location.pathname === '/';
    const isUserAuthenticated = isAuthenticated();
    // Получаем данные пользователя только если авторизован, иначе null
    const userData = isUserAuthenticated ? getUserData() : null;

    return { isHomePage, isUserAuthenticated, userData };
  }, [location.pathname]);

  const { isHomePage, isUserAuthenticated, userData } = pageAndUserState;

  // Обработчик выхода из системы
  const handleLogout = useCallback(() => {
    try {
      const logoutSuccess = logout();
      if (logoutSuccess) {
        console.log('Вихід із системи виконано успішно');
      } else {
        console.error('Проблема при виході із системи');
      }
      navigate('/login');
    } catch (err) {
      console.error('Помилка при виході із системи:', err);
      // Все равно попробуем перенаправить на страницу входа
      navigate('/login');
    }
  }, [navigate]);

  // Обработчик переключения профильного меню
  const toggleProfileMenu = useCallback(() => {
    setProfileMenuOpen(prevState => !prevState);
  }, []);

  // Обработчик переключения мобильного меню
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prevState => !prevState);
  }, []);

  // Change navbar style when scrolling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when changing routes
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

    // Добавляем обработчик, если меню открыто
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Удаляем обработчик при размонтировании компонента или закрытии меню
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileMenuOpen]);

  // Мемоизация классов навигации
  const getNavClasses = useCallback(() => {
    const baseClasses = 'fixed top-0 left-0 right-0 z-30 transition-all duration-300 ease-in-out';

    if (isHomePage) {
      return isScrolled
        ? `${baseClasses} bg-white shadow-md`
        : `${baseClasses} bg-transparent`;
    }

    return `${baseClasses} bg-white shadow-sm`;
  }, [isHomePage, isScrolled]);

  // Мемоизация классов ссылок
  const getLinkClasses = useCallback((path: string) => {
    const isActive = location.pathname === path;
    const baseClasses = 'px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 font-inter';

    if (isHomePage && !isScrolled && path !== '/dashboard') {
      return isActive
        ? `${baseClasses} text-white bg-white bg-opacity-20`
        : `${baseClasses} text-white hover:bg-white hover:bg-opacity-10`;
    }

    return isActive
      ? `${baseClasses} text-primary bg-primary bg-opacity-10`
      : `${baseClasses} text-gray-700 hover:bg-gray-100`;
  }, [isHomePage, isScrolled, location.pathname]);

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

          {/* Right section */}
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
                <NotificationCenter className="mr-2" />

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
                        <img
                          className="h-8 w-8 rounded-full object-cover"
                          src={userData?.avatar}
                          alt="Аватар користувача"
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

          {/* Mobile menu button */}
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

      {/* Mobile menu */}
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
                  <img
                    className="h-10 w-10 rounded-full object-cover"
                    src={userData?.avatar}
                    alt="Аватар користувача"
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

export default memo(Navbar);