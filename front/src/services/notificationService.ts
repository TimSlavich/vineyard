import { useState, useEffect } from 'react';
import { Alert, SensorAlert } from '../types';
import { alerts as mockAlerts } from '../data/mockData';
import { getUserData } from '../utils/storage';
import websocketService from './websocketService';

// Ключи для localStorage
const ALERTS_STORAGE_KEY = 'vineguard_alerts';
const MAX_ALERTS = 50;  // Максимальное количество сохраняемых уведомлений

// Загрузка уведомлений из localStorage или использование моковых данных
const loadAlertsFromStorage = (): Alert[] => {
    try {
        // Получаем данные пользователя
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const userRole = userData?.role || '';
        const storageKey = `${ALERTS_STORAGE_KEY}_${userId}`;

        const storedAlerts = localStorage.getItem(storageKey);
        if (storedAlerts) {
            return JSON.parse(storedAlerts);
        }

        // Для пользователей с ролью new_user не возвращаем моковые данные
        if (userRole === 'new_user') {
            return [];
        }
    } catch (error) {
        console.error('Помилка при завантаженні сповіщень:', error);
    }
    return [...mockAlerts];
};

// Сохранение уведомлений в localStorage
const saveAlertsToStorage = (alerts: Alert[]): void => {
    try {
        // Получаем ID пользователя для создания уникального ключа
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const storageKey = `${ALERTS_STORAGE_KEY}_${userId}`;

        // Ограничиваем количество сохраняемых уведомлений
        const limitedAlerts = alerts.slice(0, MAX_ALERTS);
        localStorage.setItem(storageKey, JSON.stringify(limitedAlerts));
    } catch (error) {
        console.error('Помилка при збереженні сповіщень:', error);
    }
};

// Создаем объект для хранения состояния, который будет использоваться всеми компонентами
let globalAlerts: Alert[] = loadAlertsFromStorage();
let subscribers: Function[] = [];

// Функция для оповещения всех подписчиков об изменении уведомлений
const notifySubscribers = () => {
    subscribers.forEach(subscriber => subscriber(globalAlerts));
    // Сохраняем уведомления при каждом изменении
    saveAlertsToStorage(globalAlerts);
};

// Функция для получения всех уведомлений
export const getAlerts = (): Alert[] => {
    return [...globalAlerts];
};

// Функция для получения непрочитанных уведомлений
export const getUnreadAlerts = (): Alert[] => {
    return globalAlerts.filter(alert => !alert.read);
};

// Функция для отметки уведомления как прочитанного
export const markAlertAsRead = (id: string): void => {
    globalAlerts = globalAlerts.map(alert =>
        alert.id === id ? { ...alert, read: true } : alert
    );
    notifySubscribers();
};

// Функция для отметки всех уведомлений как прочитанных
export const markAllAlertsAsRead = (): void => {
    globalAlerts = globalAlerts.map(alert => ({ ...alert, read: true }));
    notifySubscribers();
};

// Функция для фильтрации уведомлений по типу
export const filterAlertsByType = (type: 'all' | 'unread' | 'critical' | 'warning' | 'info'): Alert[] => {
    if (type === 'all') return [...globalAlerts];
    if (type === 'unread') return globalAlerts.filter(alert => !alert.read);
    return globalAlerts.filter(alert => alert.type === type);
};

// Хук, который позволяет компонентам подписаться на изменения уведомлений
export const useAlerts = (): [Alert[], (id: string) => void, () => void] => {
    const [alerts, setAlerts] = useState<Alert[]>(globalAlerts);

    useEffect(() => {
        // Добавляем подписчика
        const subscriber = (newAlerts: Alert[]) => {
            setAlerts([...newAlerts]);
        };

        subscribers.push(subscriber);

        // Удаляем подписчика при размонтировании компонента
        return () => {
            subscribers = subscribers.filter(sub => sub !== subscriber);
        };
    }, []);

    // Функция для отметки уведомления как прочитанного
    const markAsRead = (id: string) => {
        markAlertAsRead(id);
    };

    // Функция для отметки всех уведомлений как прочитанных
    const markAllAsRead = () => {
        markAllAlertsAsRead();
    };

    return [alerts, markAsRead, markAllAsRead];
};

// Функция для добавления нового уведомления
export const addAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>): void => {
    // Проверяем роль пользователя
    const userData = getUserData();
    if (userData?.role === 'new_user') {
        // Для new_user не добавляем оповещения
        console.debug('Оповещение скрыто для пользователя с ролью new_user');
        return;
    }

    const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...alert
    };

    // Добавляем уведомление в начало массива и ограничиваем его размер
    globalAlerts = [newAlert, ...globalAlerts].slice(0, MAX_ALERTS);

    // Оповещаем подписчиков
    notifySubscribers();
};

// Функция для удаления уведомления
export const removeAlert = (id: string): void => {
    globalAlerts = globalAlerts.filter(alert => alert.id !== id);
    notifySubscribers();
};

// Функция для удаления всех уведомлений
export const clearAllAlerts = (): void => {
    globalAlerts = [];
    notifySubscribers();
};

// Функция для преобразования SensorAlert в Alert
export const convertSensorAlertToAlert = (sensorAlert: SensorAlert): Alert => {
    // Определение типа оповещения на основе типа алерта датчика
    let alertType: 'info' | 'warning' | 'critical';

    switch (sensorAlert.alert_type) {
        case 'high':
            alertType = 'critical';
            break;
        case 'low':
            alertType = 'warning';
            break;
        case 'normal':
            alertType = 'info';
            break;
        default:
            alertType = 'info';
    }

    // Формирование заголовка оповещения
    const sensorTypeMap: Record<string, string> = {
        'temperature': 'Температура',
        'humidity': 'Вологість повітря',
        'soil_moisture': 'Вологість ґрунту',
        'soil_temperature': 'Температура ґрунту',
        'light': 'Освітленість',
        'ph': 'Рівень pH',
        'wind_speed': 'Швидкість вітру',
        'wind_direction': 'Напрямок вітру',
        'rainfall': 'Опади',
        'co2': 'Рівень CO₂'
    };

    const sensorName = sensorTypeMap[sensorAlert.sensor_type] || sensorAlert.sensor_type;
    const title = `${sensorName}: ${sensorAlert.alert_type === 'high' ? 'високе' : sensorAlert.alert_type === 'low' ? 'низьке' : 'нормальне'} значення`;

    // Создаем по-настоящему уникальный ID
    // Используем ID сенсора, тип оповещения, временную метку и случайное число для полной уникальности
    const timestamp = Date.now();
    const randomPart = Math.floor(Math.random() * 10000);
    const uniqueId = `sensor-alert-${sensorAlert.id}-${timestamp}-${randomPart}`;

    return {
        id: uniqueId,
        title,
        message: sensorAlert.message,
        type: alertType,
        timestamp: sensorAlert.timestamp,
        read: false,
        sensorId: sensorAlert.sensor_id,
        locationId: sensorAlert.location_id
    };
};

// Инициализация подписки на WebSocket-оповещения от датчиков
export const initSensorAlertSubscription = () => {
    const unsubscribe = websocketService.subscribe<SensorAlert>('sensor_alert', (sensorAlert) => {
        // Проверяем роль пользователя
        const userData = getUserData();
        if (userData?.role === 'new_user') {
            // Для new_user не добавляем оповещения
            console.debug('Оповещение скрыто для пользователя с ролью new_user');
            return;
        }

        // Проверяем, есть ли уже оповещения от этого датчика с тем же типом алерта
        const sensorIdStr = sensorAlert.id.toString();
        const existingAlerts = globalAlerts.filter(alert => {
            // Анализируем ID, чтобы извлечь ID датчика
            // Новый формат: sensor-alert-{id}-{timestamp}-{random}
            const match = alert.id.match(/^sensor-alert-(\d+)-/);

            if (match && match[1] === sensorIdStr) {
                // Определяем тип алерта для сравнения
                const alertType =
                    sensorAlert.alert_type === 'high' ? 'високе' :
                        sensorAlert.alert_type === 'low' ? 'низьке' :
                            'нормальне';

                return alert.title.includes(alertType);
            }
            return false;
        });

        // Удаляем существующие оповещения от этого датчика с тем же типом
        if (existingAlerts.length > 0) {
            const alertIdsToRemove = existingAlerts.map(alert => alert.id);
            globalAlerts = globalAlerts.filter(alert => !alertIdsToRemove.includes(alert.id));
        }

        // Преобразуем оповещение от датчика в формат Alert и добавляем его
        const alert = convertSensorAlertToAlert(sensorAlert);

        // Добавляем новое оповещение
        addAlert(alert);
    });

    return unsubscribe;
};

// Запускаем подписку при импорте модуля
const sensorAlertUnsubscribe = initSensorAlertSubscription(); 