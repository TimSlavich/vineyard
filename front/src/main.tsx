import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Проверяем доступность localStorage
const checkLocalStorage = () => {
  try {
    localStorage.setItem('test-access', 'test');
    localStorage.removeItem('test-access');
    return true;
  } catch (e) {
    return false;
  }
};

// Получаем root элемент
const rootElement = document.getElementById('root');

if (!rootElement) {
  // Элемент не найден
} else {
  const root = createRoot(rootElement);

  if (!checkLocalStorage()) {
    // Если localStorage недоступен, показываем сообщение об ошибке
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 2rem; text-align: center;">
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem; color: #4A4A4A;">Помилка доступу до localStorage</h1>
        <p style="color: #737373; max-width: 500px;">Для роботи додатку потрібен доступ до localStorage. Будь ласка, переконайтеся, що ваш браузер підтримує localStorage і що він не заблокований налаштуваннями приватності.</p>
      </div>
    `;
  } else {
    // Рендерим приложение
    try {
      root.render(
        // Временно отключаем StrictMode для отладки
        // <StrictMode>
        <App />
        // </StrictMode>
      );
    } catch (error) {
      rootElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 2rem; text-align: center;">
          <h1 style="font-size: 1.5rem; margin-bottom: 1rem; color: #4A4A4A;">Помилка завантаження додатку</h1>
          <p style="color: #737373; max-width: 500px;">Сталася помилка при завантаженні додатку. Будь ласка, оновіть сторінку або перевірте консоль на наявність помилок.</p>
          <p style="color: #F44336; margin-top: 1rem; font-family: monospace; text-align: left; padding: 1rem; background: #f5f5f5; border-radius: 4px; max-width: 500px; overflow: auto;">
            ${String(error)}
          </p>
        </div>
      `;
    }
  }
}
