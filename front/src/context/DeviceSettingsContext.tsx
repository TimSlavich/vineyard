import React, { createContext, useContext, useState, useEffect } from 'react';
import { devices as initialDevices, thresholds as initialThresholds, notificationSettings as initialNotificationSettings } from '../data/mockData';
import { Device, Threshold, NotificationSetting, RobotStatus } from '../types';
import { deviceApi, thresholdApi, robotApi } from '../services/api';

interface DeviceSettingsContextType {
    devices: Device[];
    thresholds: Threshold[];
    notificationSettings: NotificationSetting[];
    robots: RobotStatus[];
    setDevices: React.Dispatch<React.SetStateAction<Device[]>>;
    setThresholds: React.Dispatch<React.SetStateAction<Threshold[]>>;
    setNotificationSettings: React.Dispatch<React.SetStateAction<NotificationSetting[]>>;
    setRobots: React.Dispatch<React.SetStateAction<RobotStatus[]>>;
    fetchDevices: () => Promise<void>;
    fetchThresholds: () => Promise<void>;
    fetchNotificationSettings: () => Promise<void>;
    fetchRobots: () => Promise<void>;
    updateDevice: (deviceId: string, data: Partial<Device>) => Promise<void>;
    updateThreshold: (thresholdId: string, data: Partial<Threshold>) => Promise<void>;
    updateAllThresholds: (thresholds: Threshold[]) => Promise<void>;
    updateNotificationSetting: (type: string, data: Partial<NotificationSetting>) => Promise<void>;
    updateAllNotificationSettings: (settings: NotificationSetting[]) => Promise<void>;
    resetThresholds: () => Promise<void>;
    resetNotificationSettings: () => Promise<void>;
    loading: {
        devices: boolean;
        thresholds: boolean;
        notificationSettings: boolean;
        robots: boolean;
    };
    errors: {
        devices: Error | null;
        thresholds: Error | null;
        notificationSettings: Error | null;
        robots: Error | null;
    };
}

const DeviceSettingsContext = createContext<DeviceSettingsContextType | undefined>(undefined);

export const DeviceSettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [thresholds, setThresholds] = useState<Threshold[]>(initialThresholds);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>(initialNotificationSettings);

    // Состояния загрузки
    const [loading, setLoading] = useState({
        devices: false,
        thresholds: false,
        notificationSettings: false,
        robots: false
    });

    // Состояния ошибок
    const [errors, setErrors] = useState({
        devices: null as Error | null,
        thresholds: null as Error | null,
        notificationSettings: null as Error | null,
        robots: null as Error | null
    });

    // Генерация случайной даты
    const randomDate = () => {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 7);
        now.setDate(now.getDate() - daysAgo);
        now.setHours(Math.floor(Math.random() * 24));
        now.setMinutes(Math.floor(Math.random() * 60));
        now.setSeconds(Math.floor(Math.random() * 60));
        return now.toISOString();
    };

    // Инициализация роботов
    const [robots, setRobots] = useState<RobotStatus[]>([
        {
            id: 'drone-1',
            name: 'Дрон-разведчик 1',
            type: 'drone',
            category: 'air',
            status: 'active',
            battery: 75,
            location: 'Блок A',
            currentTask: 'Мониторинг посевов',
            capabilities: ['Мониторинг', 'Фотографирование', 'Опрыскивание'],
            lastSyncTime: randomDate()
        },
        {
            id: 'drone-2',
            name: 'Дрон-опрыскиватель 1',
            type: 'drone',
            category: 'air',
            status: 'maintenance',
            battery: 90,
            location: 'Станция зарядки',
            capabilities: ['Опрыскивание', 'Посев', 'Мониторинг'],
            lastSyncTime: randomDate()
        },
        {
            id: 'robot-1',
            name: 'Робот-комбайн 1',
            type: 'harvester',
            category: 'ground',
            status: 'idle',
            battery: 90,
            location: 'Станция зарядки',
            capabilities: ['Начать сбор', 'Обрезка', 'Режим транспортировки', 'Выборочный сбор'],
            lastSyncTime: randomDate()
        },
        {
            id: 'robot-2',
            name: 'Робот-сеялка 1',
            type: 'seeder',
            category: 'ground',
            status: 'idle',
            battery: 45,
            location: 'Технический отсек',
            capabilities: ['Посев', 'Анализ почвы', 'Удаление сорняков'],
            lastSyncTime: randomDate()
        },
        {
            id: 'robot-3',
            name: 'Робот-техник 1',
            type: 'maintenance',
            category: 'ground',
            status: 'active',
            battery: 68,
            location: 'Блок C',
            currentTask: 'Формирование виноградных лоз',
            capabilities: ['Обрезка', 'Формирование лозы', 'Режим ремонта'],
            lastSyncTime: randomDate()
        }
    ]);

    // Получение устройств
    const fetchDevices = async () => {
        try {
            setLoading(prev => ({ ...prev, devices: true }));
            setErrors(prev => ({ ...prev, devices: null }));

            const response = await deviceApi.getDevices();
            setDevices(response.data);
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                devices: error instanceof Error ? error : new Error(String(error))
            }));
        } finally {
            setLoading(prev => ({ ...prev, devices: false }));
        }
    };

    // Получение порогов
    const fetchThresholds = async () => {
        try {
            setLoading(prev => ({ ...prev, thresholds: true }));
            setErrors(prev => ({ ...prev, thresholds: null }));

            const response = await thresholdApi.getThresholds();
            setThresholds(response.data);
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                thresholds: error instanceof Error ? error : new Error(String(error))
            }));
        } finally {
            setLoading(prev => ({ ...prev, thresholds: false }));
        }
    };

    // Получение настроек уведомлений
    const fetchNotificationSettings = async () => {
        try {
            setLoading(prev => ({ ...prev, notificationSettings: true }));
            setErrors(prev => ({ ...prev, notificationSettings: null }));

            const response = await thresholdApi.getNotificationSettings();
            setNotificationSettings(response.data);
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                notificationSettings: error instanceof Error ? error : new Error(String(error))
            }));
        } finally {
            setLoading(prev => ({ ...prev, notificationSettings: false }));
        }
    };

    // Получение роботов
    const fetchRobots = async () => {
        try {
            setLoading(prev => ({ ...prev, robots: true }));
            setErrors(prev => ({ ...prev, robots: null }));

            const response = await robotApi.getRobots();
            if (response.data.length > 0) {
                setRobots(response.data);
            }
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                robots: error instanceof Error ? error : new Error(String(error))
            }));
        } finally {
            setLoading(prev => ({ ...prev, robots: false }));
        }
    };

    // Обновление устройства
    const updateDevice = async (deviceId: string, data: Partial<Device>) => {
        try {
            const response = await deviceApi.updateDevice(deviceId, data);

            setDevices(prev =>
                prev.map(device =>
                    device.id === deviceId ? { ...device, ...response.data } : device
                )
            );
        } catch (error) {
            throw error;
        }
    };

    // Обновление порога
    const updateThreshold = async (thresholdId: string, data: Partial<Threshold>) => {
        try {
            const apiData = {
                id: thresholdId,
                min: data.min,
                max: data.max
            };
            const response = await thresholdApi.updateThreshold(thresholdId, apiData);

            setThresholds(prev =>
                prev.map(threshold =>
                    threshold.id === thresholdId ? { ...threshold, ...response.data } : threshold
                )
            );
        } catch (error) {
            throw error;
        }
    };

    // Обновление всех порогов
    const updateAllThresholds = async (newThresholds: Threshold[]) => {
        try {
            const response = await thresholdApi.updateAllThresholds(newThresholds);
            setThresholds(response.data);
        } catch (error) {
            throw error;
        }
    };

    // Обновление настройки уведомлений
    const updateNotificationSetting = async (type: string, data: Partial<NotificationSetting>) => {
        try {
            const apiData = {
                type: type as 'email' | 'sms' | 'push',
                enabled: data.enabled,
                alertTypes: data.alertTypes
            };
            const response = await thresholdApi.updateNotificationSetting(type, apiData);

            setNotificationSettings(prev =>
                prev.map(setting =>
                    setting.type === type ? { ...setting, ...response.data } : setting
                )
            );
        } catch (error) {
            throw error;
        }
    };

    // Обновление всех настроек уведомлений
    const updateAllNotificationSettings = async (newSettings: NotificationSetting[]) => {
        try {
            const response = await thresholdApi.updateAllNotificationSettings(newSettings);
            setNotificationSettings(response.data);
        } catch (error) {
            throw error;
        }
    };

    // Сброс порогов
    const resetThresholds = async () => {
        try {
            const response = await thresholdApi.resetThresholds();
            setThresholds(response.data);
        } catch (error) {
            throw error;
        }
    };

    // Сброс настроек уведомлений
    const resetNotificationSettings = async () => {
        try {
            const response = await thresholdApi.resetNotificationSettings();
            setNotificationSettings(response.data);
        } catch (error) {
            throw error;
        }
    };

    // Загрузка данных при первом рендере
    useEffect(() => {
        // Пока используем моковые данные
    }, []);

    return (
        <DeviceSettingsContext.Provider
            value={{
                devices,
                thresholds,
                notificationSettings,
                robots,
                setDevices,
                setThresholds,
                setNotificationSettings,
                setRobots,
                fetchDevices,
                fetchThresholds,
                fetchNotificationSettings,
                fetchRobots,
                updateDevice,
                updateThreshold,
                updateAllThresholds,
                updateNotificationSetting,
                updateAllNotificationSettings,
                resetThresholds,
                resetNotificationSettings,
                loading,
                errors
            }}
        >
            {children}
        </DeviceSettingsContext.Provider>
    );
};

export const useDeviceSettings = () => {
    const ctx = useContext(DeviceSettingsContext);
    if (!ctx) throw new Error('useDeviceSettings должен использоваться внутри DeviceSettingsProvider');
    return ctx;
}; 