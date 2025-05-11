import { getUserData } from '../utils/storage';

// Ключи для localStorage
const USER_SETTINGS_KEY = 'vineguard_user_settings';

export interface NotificationChannelSetting {
    type: string;
    enabled: boolean;
    alertTypes: string[];
}

export interface UserSettings {
    notifications: {
        channels: NotificationChannelSetting[];
        showInApp: boolean;
        sound: boolean;
    };
    theme: 'light' | 'dark' | 'system';
    language: string;
    dashboardLayout: string[];
}

// Дефолтные настройки пользователя
const DEFAULT_SETTINGS: UserSettings = {
    notifications: {
        channels: [
            {
                type: 'browser',
                enabled: true,
                alertTypes: ['warning', 'critical']
            },
            {
                type: 'email',
                enabled: false,
                alertTypes: ['critical']
            },
            {
                type: 'push',
                enabled: false,
                alertTypes: ['warning', 'critical']
            },
            {
                type: 'sms',
                enabled: false,
                alertTypes: ['critical']
            }
        ],
        showInApp: true,
        sound: true
    },
    theme: 'system',
    language: 'uk',
    dashboardLayout: ['weather', 'sensors', 'charts', 'alerts']
};

// Загрузка настроек из localStorage
export const loadUserSettings = (): UserSettings => {
    try {
        // Получаем ID пользователя для создания уникального ключа
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const storageKey = `${USER_SETTINGS_KEY}_${userId}`;

        const storedSettings = localStorage.getItem(storageKey);
        if (storedSettings) {
            // Объединяем сохраненные настройки с дефолтными для обеспечения 
            // полного набора настроек даже при изменении структуры
            const parsedSettings = JSON.parse(storedSettings);
            return {
                ...DEFAULT_SETTINGS,
                ...parsedSettings,
                notifications: {
                    ...DEFAULT_SETTINGS.notifications,
                    ...parsedSettings.notifications,
                    channels: parsedSettings.notifications?.channels || DEFAULT_SETTINGS.notifications.channels
                }
            };
        }
    } catch (error) {
        console.error('Помилка при завантаженні налаштувань користувача:', error);
    }
    return { ...DEFAULT_SETTINGS };
};

// Сохранение настроек в localStorage
export const saveUserSettings = (settings: UserSettings): void => {
    try {
        // Получаем ID пользователя для создания уникального ключа
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const storageKey = `${USER_SETTINGS_KEY}_${userId}`;

        localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
        console.error('Помилка при збереженні налаштувань користувача:', error);
    }
};

// Функция для получения настроек канала уведомлений
export const getNotificationChannelSettings = (channelType: string): NotificationChannelSetting | undefined => {
    const settings = loadUserSettings();
    return settings.notifications.channels.find(channel => channel.type === channelType);
};

// Функция для проверки, включен ли канал уведомлений для данного типа уведомлений
export const isNotificationEnabled = (channelType: string, alertType: string): boolean => {
    const channelSettings = getNotificationChannelSettings(channelType);
    if (!channelSettings) return false;

    return channelSettings.enabled && channelSettings.alertTypes.includes(alertType);
};

// Функция для сброса настроек к значениям по умолчанию
export const resetUserSettings = (): UserSettings => {
    const settings = { ...DEFAULT_SETTINGS };
    saveUserSettings(settings);
    return settings;
};

// Функция для обновления настроек канала уведомлений
export const updateNotificationChannel = (
    channelType: string,
    updates: Partial<NotificationChannelSetting>
): UserSettings => {
    const settings = loadUserSettings();

    const updatedChannels = settings.notifications.channels.map(channel => {
        if (channel.type === channelType) {
            return { ...channel, ...updates };
        }
        return channel;
    });

    const updatedSettings = {
        ...settings,
        notifications: {
            ...settings.notifications,
            channels: updatedChannels
        }
    };

    saveUserSettings(updatedSettings);
    return updatedSettings;
}; 