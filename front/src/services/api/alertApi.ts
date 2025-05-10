import { Alert } from '../../types';
import { BaseApi } from './baseApi';
import { ApiResponse, AlertsRequest, PaginatedResponse } from './types';
import { alerts as mockAlerts } from '../../data/mockData';

/**
 * Сервис для работы с уведомлениями
 */
export class AlertApi extends BaseApi {
    /**
     * Получает список уведомлений
     * @param params параметры запроса
     * @returns список уведомлений
     */
    async getAlerts(params?: AlertsRequest): Promise<PaginatedResponse<Alert>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<PaginatedResponse<Alert>>('/alerts', { params });

            // Временное решение с использованием моковых данных
            let filteredAlerts = [...mockAlerts];

            if (params?.type) {
                filteredAlerts = filteredAlerts.filter(alert => alert.type === params.type);
            }

            if (params?.read !== undefined) {
                filteredAlerts = filteredAlerts.filter(alert => alert.read === params.read);
            }

            if (params?.startDate) {
                const startDate = new Date(params.startDate);
                filteredAlerts = filteredAlerts.filter(alert => new Date(alert.timestamp) >= startDate);
            }

            if (params?.endDate) {
                const endDate = new Date(params.endDate);
                filteredAlerts = filteredAlerts.filter(alert => new Date(alert.timestamp) <= endDate);
            }

            // Сортировка по времени (сначала новые)
            filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return {
                data: filteredAlerts,
                meta: {
                    total: filteredAlerts.length,
                    page: params?.page || 1,
                    perPage: params?.perPage || filteredAlerts.length,
                    totalPages: 1
                }
            };
        } catch (error) {
            console.error('Error getting alerts:', error);
            throw error;
        }
    }

    /**
     * Получает уведомление по ID
     * @param alertId ID уведомления
     * @returns уведомление
     */
    async getAlert(alertId: string): Promise<ApiResponse<Alert>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<Alert>>(`/alerts/${alertId}`);

            // Временное решение с использованием моковых данных
            const alert = mockAlerts.find(alert => alert.id === alertId);
            if (!alert) {
                throw new Error(`Уведомление с ID ${alertId} не найдено`);
            }

            return {
                success: true,
                data: alert
            };
        } catch (error) {
            console.error(`Error getting alert ${alertId}:`, error);
            throw error;
        }
    }

    /**
     * Отмечает уведомление как прочитанное
     * @param alertId ID уведомления
     * @returns обновленное уведомление
     */
    async markAsRead(alertId: string): Promise<ApiResponse<Alert>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<Alert>>(`/alerts/${alertId}/read`, {});

            // Временное решение с использованием моковых данных
            const alertIndex = mockAlerts.findIndex(alert => alert.id === alertId);
            if (alertIndex === -1) {
                throw new Error(`Уведомление с ID ${alertId} не найдено`);
            }

            const updatedAlert: Alert = {
                ...mockAlerts[alertIndex],
                read: true
            };

            return {
                success: true,
                data: updatedAlert
            };
        } catch (error) {
            console.error(`Error marking alert ${alertId} as read:`, error);
            throw error;
        }
    }

    /**
     * Отмечает все уведомления как прочитанные
     * @returns количество обновленных уведомлений
     */
    async markAllAsRead(): Promise<ApiResponse<{ count: number }>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<{ count: number }>>('/alerts/read-all', {});

            // Временное решение с использованием моковых данных
            const unreadCount = mockAlerts.filter(alert => !alert.read).length;

            return {
                success: true,
                data: { count: unreadCount }
            };
        } catch (error) {
            console.error('Error marking all alerts as read:', error);
            throw error;
        }
    }

    /**
     * Создает новое уведомление
     * @param alert данные нового уведомления
     * @returns созданное уведомление
     */
    async createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'read'>): Promise<ApiResponse<Alert>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<Alert>>('/alerts', alert);

            // Временное решение с использованием моковых данных
            const newAlert: Alert = {
                ...alert,
                id: `alert-${Date.now()}`,
                timestamp: new Date().toISOString(),
                read: false
            };

            return {
                success: true,
                data: newAlert
            };
        } catch (error) {
            console.error('Error creating alert:', error);
            throw error;
        }
    }

    /**
     * Удаляет уведомление
     * @param alertId ID уведомления
     * @returns результат операции
     */
    async deleteAlert(alertId: string): Promise<ApiResponse<null>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.delete<ApiResponse<null>>(`/alerts/${alertId}`);

            // Временное решение с использованием моковых данных
            const alertIndex = mockAlerts.findIndex(alert => alert.id === alertId);
            if (alertIndex === -1) {
                throw new Error(`Уведомление с ID ${alertId} не найдено`);
            }

            return {
                success: true,
                data: null,
                message: `Уведомление с ID ${alertId} успешно удалено`
            };
        } catch (error) {
            console.error(`Error deleting alert ${alertId}:`, error);
            throw error;
        }
    }
}

// Экспортируем экземпляр API для использования в приложении
export const alertApi = new AlertApi(); 