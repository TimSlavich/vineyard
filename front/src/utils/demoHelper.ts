import { userApi } from '../services/api/userApi';
import { setAuthenticated, removeItem, clearStorage } from './storage';
import { NavigateFunction } from 'react-router-dom';
import websocketService, { initializeWebSocketConnection } from '../services/websocketService';

/**
 * Выполняет автоматический вход в демо-режим и перенаправляет на dashboard
 * @param navigate - функция для перенаправления (из хука useNavigate)
 * @param setLoading - функция для управления состоянием загрузки (опционально)
 * @param setError - функция для управления состоянием ошибки (опционально)
 */
export const loginAsDemoAndRedirect = async (
    navigate: NavigateFunction,
    setLoading?: (loading: boolean) => void,
    setError?: (error: string) => void
): Promise<void> => {
    try {
        // Устанавливаем состояние загрузки, если передана функция
        if (setLoading) setLoading(true);

        // Принудительно закрываем WebSocket соединение
        websocketService.disconnect();

        // Полностью очищаем localStorage от всех данных
        clearStorage();

        // Запускаем небольшую задержку, чтобы соединение успело закрыться полностью
        await new Promise(resolve => setTimeout(resolve, 300));

        // Выполняем вход в демо-режим
        await userApi.loginAsDemo();

        // Получаем профиль пользователя
        let userData;
        try {
            userData = await userApi.getProfile();
        } catch (profileError) {
            console.warn('Не удалось получить профиль демо-пользователя:', profileError);
            // Создаем базовый объект пользователя
            userData = {
                id: Math.floor(Math.random() * 10000) + 1, // Генерируем случайный ID
                username: 'demo_user',
                email: 'demo@example.com',
                first_name: 'Demo',
                last_name: 'User',
                is_active: true,
                is_admin: false,
                role: 'demo',
                sensor_count: 10,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }

        // Проверяем, что количество датчиков установлено правильно
        if (userData.sensor_count !== 10) {
            console.warn(`Обнаружено некорректное количество датчиков: ${userData.sensor_count}, исправляем на 10`);
            userData.sensor_count = 10;
        }

        // Сохраняем статус авторизации и данные пользователя
        setAuthenticated(true, userData);

        // Инициализируем WebSocket соединение для нового пользователя
        setTimeout(async () => {
            try {
                await initializeWebSocketConnection();

                // Запрашиваем новые данные датчиков
                setTimeout(() => {
                    if (websocketService.isConnected()) {
                        websocketService.requestSensorData();
                    }
                }, 1000);
            } catch (wsError) {
                console.error('Ошибка при инициализации WebSocket после входа в демо-режим:', wsError);
            }
        }, 500);

        // Перенаправляем на dashboard
        navigate('/dashboard');
    } catch (err: any) {
        console.error('Ошибка при входе в демо-режим:', err);
        if (setError) setError(err.message || 'Произошла ошибка при входе в демо-режим.');
    } finally {
        if (setLoading) setLoading(false);
    }
}; 