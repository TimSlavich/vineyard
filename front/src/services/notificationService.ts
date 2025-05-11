import { useState, useEffect } from 'react';
import { Alert } from '../types';
import { alerts as mockAlerts } from '../data/mockData';
import { getUserData } from '../utils/storage';
import { isNotificationEnabled } from './userSettingsService';

// Ключи для localStorage
const ALERTS_STORAGE_KEY = 'vineguard_alerts';
const MAX_ALERTS = 50;  // Максимальное количество сохраняемых уведомлений

// Загрузка уведомлений из localStorage или использование моковых данных
const loadAlertsFromStorage = (): Alert[] => {
    try {
        // Получаем ID пользователя для создания уникального ключа
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const storageKey = `${ALERTS_STORAGE_KEY}_${userId}`;

        const storedAlerts = localStorage.getItem(storageKey);
        if (storedAlerts) {
            return JSON.parse(storedAlerts);
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
    const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...alert
    };

    // Добавляем уведомление в начало массива и ограничиваем его размер
    globalAlerts = [newAlert, ...globalAlerts].slice(0, MAX_ALERTS);

    // Показываем браузерное уведомление, если поддерживается и разрешено
    showBrowserNotification(newAlert);

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

// Функция для показа браузерных уведомлений
const showBrowserNotification = (alert: Alert): void => {
    // Проверяем поддержку браузерных уведомлений
    if (!('Notification' in window)) {
        return;
    }

    // Проверяем, разрешены ли уведомления этого типа в настройках пользователя
    if (!isNotificationEnabled('browser', alert.type)) {
        return;
    }

    // Проверяем, разрешены ли уведомления в браузере
    if (Notification.permission === 'granted') {
        // Создаем и показываем уведомление
        const iconPath = '/icons/notification-icon.png';
        const notification = new Notification(alert.title, {
            body: alert.message,
            icon: iconPath
        });

        // Обработка клика по уведомлению
        notification.onclick = () => {
            // Отмечаем уведомление как прочитанное
            markAlertAsRead(alert.id);
            // Фокусируем окно браузера
            window.focus();
            // Закрываем уведомление
            notification.close();
        };
    }
    // Запрашиваем разрешение на уведомления, если еще не запрашивали
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
}; 