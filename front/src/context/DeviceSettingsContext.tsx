import React, { createContext, useContext, useState, useEffect } from 'react';
import { devices as initialDevices, notificationSettings as initialNotificationSettings } from '../data/mockData';
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
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
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

            // Запрашиваем пороговые значения через WebSocket
            await import('../services/websocketService').then(({ default: websocketService }) => {
                if (websocketService.isConnected()) {
                    websocketService.requestThresholds();

                    // Добавляем подписку на получение пороговых значений
                    const unsubscribe = websocketService.subscribe('thresholds_data', (data: any) => {

                        // Проверяем наличие поля thresholds в объекте data
                        if (data && data.thresholds && Array.isArray(data.thresholds)) {
                            setThresholds(data.thresholds);
                        } else if (Array.isArray(data)) {
                            // Обратная совместимость со старым форматом
                            setThresholds(data);
                        } else {
                            console.error("Unexpected thresholds data format:", data);
                        }
                        unsubscribe(); // Отписываемся после получения данных
                    });

                    // Таймаут для предотвращения бесконечного ожидания
                    setTimeout(() => {
                        unsubscribe();
                        setLoading(prev => ({ ...prev, thresholds: false }));
                    }, 3000);
                } else {
                    // Если нет соединения, используем старые данные или заглушки
                    setErrors(prev => ({
                        ...prev,
                        thresholds: new Error('WebSocket не подключен. Используем кэшированные данные.')
                    }));
                    setLoading(prev => ({ ...prev, thresholds: false }));
                }
            });
        } catch (error) {
            console.error("Error in fetchThresholds:", error);
            setErrors(prev => ({
                ...prev,
                thresholds: error instanceof Error ? error : new Error(String(error))
            }));
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
            // Отправляем пороговые значения через WebSocket
            await import('../services/websocketService').then(({ default: websocketService }) => {
                if (websocketService.isConnected()) {
                    // Отправляем данные на сервер
                    websocketService.saveThresholds(newThresholds);
                    // Устанавливаем локально новые пороговые значения
                    setThresholds(newThresholds);

                    // Подписываемся на обновление порогов после сохранения
                    const unsubscribe = websocketService.subscribe('thresholds_data', (data: any) => {
                        // Проверяем наличие поля thresholds в объекте data
                        if (data && data.thresholds && Array.isArray(data.thresholds)) {
                            setThresholds(data.thresholds);
                        } else if (Array.isArray(data)) {
                            // Обратная совместимость со старым форматом
                            console.log("Using updated thresholds from array data:", data);
                            setThresholds(data);
                        } else {
                            console.error("Unexpected updated thresholds data format:", data);
                        }
                        unsubscribe(); // Отписываемся после получения данных
                    });

                    // Таймаут для предотвращения бесконечного ожидания
                    setTimeout(() => {
                        unsubscribe();
                        setLoading(prev => ({ ...prev, thresholds: false }));
                    }, 3000);
                } else {
                    throw new Error('WebSocket не подключен. Невозможно сохранить пороговые значения.');
                }
            });
        } catch (error) {
            console.error("Error in updateAllThresholds:", error);
            throw error;
        }
    };

    // Проверяем, нужно ли создать пороговые значения по умолчанию
    useEffect(() => {
        const createDefaultThresholdsIfNeeded = async () => {
            // Если пороговые значения отсутствуют после определенного времени, создаем их
            if (thresholds.length === 0) {
                try {
                    await resetThresholds();
                } catch (error) {
                    console.error("Помилка при створенні стандартних порогових значень:", error);
                }
            }
        };

        // Проверяем через 3 секунды после монтирования компонента
        const timer = setTimeout(createDefaultThresholdsIfNeeded, 3000);

        return () => clearTimeout(timer);
    }, [thresholds]);

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
            setLoading(prev => ({ ...prev, thresholds: true }));
            setErrors(prev => ({ ...prev, thresholds: null }));

            // Запрашиваем сброс пороговых значений через WebSocket
            await import('../services/websocketService').then(({ default: websocketService }) => {
                if (websocketService.isConnected()) {
                    websocketService.resetThresholds();

                    // Добавляем подписку на получение обновленных пороговых значений
                    const unsubscribe = websocketService.subscribe('thresholds_data', (data: any) => {
                        // Проверяем наличие поля thresholds в объекте data
                        if (data && data.thresholds && Array.isArray(data.thresholds)) {
                            setThresholds(data.thresholds);
                        } else if (Array.isArray(data)) {
                            // Обратная совместимость со старым форматом
                            setThresholds(data);
                        }
                        unsubscribe(); // Отписываемся после получения данных
                    });

                    // Таймаут для предотвращения бесконечного ожидания
                    setTimeout(() => {
                        unsubscribe();
                        setLoading(prev => ({ ...prev, thresholds: false }));
                    }, 3000);
                } else {
                    throw new Error('WebSocket не подключен. Невозможно сбросить пороговые значения.');
                }
            });
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                thresholds: error instanceof Error ? error : new Error(String(error))
            }));
            setLoading(prev => ({ ...prev, thresholds: false }));
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

    // Автоматическая загрузка пороговых значений при инициализации
    useEffect(() => {
        fetchThresholds();
    }, []);

    // Автоматическая подписка на обновление порогов от сервера
    useEffect(() => {
        if (typeof window !== 'undefined') {
            import('../services/websocketService').then(({ default: websocketService }) => {
                // Подписываемся на обновления пороговых значений с сервера
                const unsubscribe = websocketService.subscribe('thresholds_data', (data: any) => {
                    // Проверяем наличие поля thresholds в объекте data
                    if (data && data.thresholds && Array.isArray(data.thresholds)) {
                        setThresholds(data.thresholds);
                    } else if (Array.isArray(data)) {
                        // Обратная совместимость со старым форматом
                        setThresholds(data);
                    }
                });

                // Отписываемся при размонтировании компонента
                return () => {
                    unsubscribe();
                };
            });
        }
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