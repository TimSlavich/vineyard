import { NotificationSetting, Threshold } from '../../types';
import { BaseApi } from './baseApi';
import { ApiResponse, NotificationSettingUpdateRequest, ThresholdUpdateRequest } from './types';
import { thresholds as mockThresholds, notificationSettings as mockNotificationSettings } from '../../data/mockData';

/**
 * Сервис для работы с порогами и настройками уведомлений
 */
export class ThresholdApi extends BaseApi {
    /**
     * Получает список порогов
     * @returns список порогов
     */
    async getThresholds(): Promise<ApiResponse<Threshold[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<Threshold[]>>('/thresholds');

            // Временное решение с использованием моковых данных
            return {
                success: true,
                data: [...mockThresholds]
            };
        } catch (error) {
            console.error('Error getting thresholds:', error);
            throw error;
        }
    }

    /**
     * Обновляет порог
     * @param thresholdId ID порога
     * @param data данные для обновления
     * @returns обновленный порог
     */
    async updateThreshold(thresholdId: string, data: ThresholdUpdateRequest): Promise<ApiResponse<Threshold>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<Threshold>>(`/thresholds/${thresholdId}`, data);

            // Временное решение с использованием моковых данных
            const thresholdIndex = mockThresholds.findIndex(t => t.id === thresholdId);
            if (thresholdIndex === -1) {
                throw new Error(`Порог с ID ${thresholdId} не найден`);
            }

            const updatedThreshold: Threshold = {
                ...mockThresholds[thresholdIndex],
                ...data
            };

            return {
                success: true,
                data: updatedThreshold
            };
        } catch (error) {
            console.error(`Error updating threshold ${thresholdId}:`, error);
            throw error;
        }
    }

    /**
     * Обновляет все пороги
     * @param thresholds список порогов
     * @returns обновленные пороги
     */
    async updateAllThresholds(thresholds: Threshold[]): Promise<ApiResponse<Threshold[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<Threshold[]>>('/thresholds', { thresholds });

            // Временное решение - возвращаем переданные пороги
            return {
                success: true,
                data: thresholds
            };
        } catch (error) {
            console.error('Error updating all thresholds:', error);
            throw error;
        }
    }

    /**
     * Сбрасывает все пороги до значений по умолчанию
     * @returns пороги по умолчанию
     */
    async resetThresholds(): Promise<ApiResponse<Threshold[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<Threshold[]>>('/thresholds/reset');

            // Временное решение - возвращаем моковые данные как значения по умолчанию
            return {
                success: true,
                data: [...mockThresholds]
            };
        } catch (error) {
            console.error('Error resetting thresholds:', error);
            throw error;
        }
    }

    /**
     * Получает настройки уведомлений
     * @returns настройки уведомлений
     */
    async getNotificationSettings(): Promise<ApiResponse<NotificationSetting[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<NotificationSetting[]>>('/notification-settings');

            // Временное решение с использованием моковых данных
            return {
                success: true,
                data: [...mockNotificationSettings]
            };
        } catch (error) {
            console.error('Error getting notification settings:', error);
            throw error;
        }
    }

    /**
     * Обновляет настройку уведомлений
     * @param type тип уведомления
     * @param data данные для обновления
     * @returns обновленная настройка
     */
    async updateNotificationSetting(type: string, data: NotificationSettingUpdateRequest): Promise<ApiResponse<NotificationSetting>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<NotificationSetting>>(`/notification-settings/${type}`, data);

            // Временное решение с использованием моковых данных
            const settingIndex = mockNotificationSettings.findIndex(s => s.type === type);
            if (settingIndex === -1) {
                throw new Error(`Настройка уведомлений для типа ${type} не найдена`);
            }

            const updatedSetting: NotificationSetting = {
                ...mockNotificationSettings[settingIndex],
                ...data
            };

            return {
                success: true,
                data: updatedSetting
            };
        } catch (error) {
            console.error(`Error updating notification setting ${type}:`, error);
            throw error;
        }
    }

    /**
     * Обновляет все настройки уведомлений
     * @param settings список настроек
     * @returns обновленные настройки
     */
    async updateAllNotificationSettings(settings: NotificationSetting[]): Promise<ApiResponse<NotificationSetting[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<NotificationSetting[]>>('/notification-settings', { settings });

            // Временное решение - возвращаем переданные настройки
            return {
                success: true,
                data: settings
            };
        } catch (error) {
            console.error('Error updating all notification settings:', error);
            throw error;
        }
    }

    /**
     * Сбрасывает все настройки уведомлений до значений по умолчанию
     * @returns настройки по умолчанию
     */
    async resetNotificationSettings(): Promise<ApiResponse<NotificationSetting[]>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<NotificationSetting[]>>('/notification-settings/reset');

            // Временное решение - возвращаем моковые данные как значения по умолчанию
            return {
                success: true,
                data: [...mockNotificationSettings]
            };
        } catch (error) {
            console.error('Error resetting notification settings:', error);
            throw error;
        }
    }
}

// Экспортируем экземпляр API для использования в приложении
export const thresholdApi = new ThresholdApi(); 