/**
 * Конфигурация приложения
 */

// Базовый URL для API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.vineguard.example.com';

// Базовый URL для API веб-сокетов
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'wss://api.vineguard.example.com/ws';

// Таймаут для запросов API (в миллисекундах)
export const API_TIMEOUT = 30000;

// Интервал обновления данных с датчиков (в миллисекундах)
export const SENSOR_UPDATE_INTERVAL = 60000; // 1 минута

// Интервал обновления данных на странице (в миллисекундах)
export const UI_UPDATE_INTERVAL = 10000; // 10 секунд

// Максимальное количество попыток переподключения к WebSocket
export const MAX_RECONNECT_ATTEMPTS = 10; 