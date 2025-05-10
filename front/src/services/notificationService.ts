import { useState, useEffect } from 'react';
import { Alert } from '../types';
import { alerts as mockAlerts } from '../data/mockData';

// Создаем объект для хранения состояния, который будет использоваться всеми компонентами
let globalAlerts: Alert[] = [...mockAlerts];
let subscribers: Function[] = [];

// Функция для оповещения всех подписчиков об изменении уведомлений
const notifySubscribers = () => {
    subscribers.forEach(subscriber => subscriber(globalAlerts));
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

// Функция для добавления нового уведомления (будет использоваться при интеграции с бэкендом)
export const addAlert = (alert: Omit<Alert, 'id' | 'timestamp' | 'read'>): void => {
    const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false,
        ...alert
    };

    globalAlerts = [newAlert, ...globalAlerts];
    notifySubscribers();
}; 