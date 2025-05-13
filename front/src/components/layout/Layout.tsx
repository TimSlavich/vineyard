import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';
import { useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, isLocalStorageAvailable, getUserData } from '../../utils/storage';
import DemoBanner from '../ui/DemoBanner';
import NewUserBanner from '../ui/NewUserBanner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  // Определение типов страниц
  const pathname = location.pathname;
  const isHomePage = pathname === '/';
  const isAboutPage = pathname === '/about';
  const isContactPage = pathname === '/contact';
  const isPrivacyPage = pathname === '/privacy-policy';
  const isTermsPage = pathname === '/terms';
  const isCookiesPage = pathname === '/cookies-policy';
  const isLoginPage = pathname === '/login' || pathname === '/register';

  // Проверка публичной страницы (с футером)
  const isPublicPage = isHomePage || isAboutPage || isContactPage || isPrivacyPage || isTermsPage || isCookiesPage;

  // Классы для main
  const mainClasses = `flex-grow w-full ${isHomePage || isLoginPage ? '' : 'pt-16 bg-gray-100'}`;

  // Функция для обработки переходов по ссылкам
  const handleNavigation = (path: string) => {
    // Если мы уже на этой странице, просто прокручиваем вверх
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Иначе переходим на новую страницу
      navigate(path);
    }
  };

  // Проверка аутентификации и типа пользователя при изменении пути
  useEffect(() => {
    try {
      const isLSAvailable = isLocalStorageAvailable();
      if (isLSAvailable) {
        const isAuth = isAuthenticated();
        if (isAuth) {
          const userData = getUserData();
          // Проверяем, является ли пользователь демо-пользователем
          setIsDemoUser(userData && userData.role === 'demo');
          // Проверяем, является ли пользователь новым пользователем
          setIsNewUser(userData && userData.role === 'new_user');
        } else {
          setIsDemoUser(false);
          setIsNewUser(false);
        }
      }
    } catch (err) {
      // Ошибка при проверке аутентификации
      setIsDemoUser(false);
      setIsNewUser(false);
    }
  }, [location.pathname]);

  // Текущий год для футера
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen w-full">
      <Navbar />

      {/* Демо-баннер отображается на всех страницах кроме публичных, если пользователь в демо-режиме */}
      {isDemoUser && !isPublicPage && !isLoginPage &&
        <DemoBanner className="sticky top-16 z-10" />
      }

      {/* Баннер для новых пользователей */}
      {isNewUser && !isPublicPage && !isLoginPage &&
        <NewUserBanner className="sticky top-16 z-10" />
      }

      <main className={mainClasses}>
        {children}
      </main>

      {isPublicPage && (
        <footer className="bg-gray-900 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 font-inter">VineGuard</h3>
                <p className="text-gray-400 text-sm font-roboto">
                  Розумна система управління виноградником на базі IoT-технологій.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider font-inter">Компанія</h4>
                <ul className="space-y-2">
                  <li><button onClick={() => handleNavigation('/about')} className="text-left w-full text-gray-400 hover:text-white transition-colors duration-200 text-sm font-roboto">Про нас</button></li>
                  <li><button onClick={() => handleNavigation('/contact')} className="text-left w-full text-gray-400 hover:text-white transition-colors duration-200 text-sm font-roboto">Контакти</button></li>
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-4 uppercase tracking-wider font-inter">Правова інформація</h4>
                <ul className="space-y-2">
                  <li><button onClick={() => handleNavigation('/privacy-policy')} className="text-left w-full text-gray-400 hover:text-white transition-colors duration-200 text-sm font-roboto">Політика конфіденційності</button></li>
                  <li><button onClick={() => handleNavigation('/terms')} className="text-left w-full text-gray-400 hover:text-white transition-colors duration-200 text-sm font-roboto">Умови використання</button></li>
                  <li><button onClick={() => handleNavigation('/cookies-policy')} className="text-left w-full text-gray-400 hover:text-white transition-colors duration-200 text-sm font-roboto">Політика використання файлів cookie</button></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm font-roboto">
                © {currentYear} VineGuard. Усі права захищені.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="https://www.linkedin.com/in/slavich-timofii-78b344253/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/s_love.ich/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="tg://s_love_ich" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <span className="sr-only">Telegram</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default React.memo(Layout);