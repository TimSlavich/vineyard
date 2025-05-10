import { Device } from '../../types';
import { BaseApi } from './baseApi';
import { ApiResponse, DevicesRequest, PaginatedResponse } from './types';
import { devices as mockDevices } from '../../data/mockData';

/**
 * Сервис для работы с устройствами
 */
export class DeviceApi extends BaseApi {
    /**
     * Получает список устройств
     * @param params параметры запроса
     * @returns список устройств
     */
    async getDevices(params?: DevicesRequest): Promise<PaginatedResponse<Device>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<PaginatedResponse<Device>>('/devices', { params });

            // Временное решение с использованием моковых данных
            const filteredDevices = mockDevices.filter(device => {
                if (params?.status && device.status !== params.status) return false;
                if (params?.type && device.type !== params.type) return false;
                if (params?.locationId && device.locationId !== params.locationId) return false;
                return true;
            });

            return {
                data: filteredDevices,
                meta: {
                    total: filteredDevices.length,
                    page: params?.page || 1,
                    perPage: params?.perPage || filteredDevices.length,
                    totalPages: 1
                }
            };
        } catch (error) {
            console.error('Error getting devices:', error);
            throw error;
        }
    }

    /**
     * Получает устройство по ID
     * @param deviceId ID устройства
     * @returns устройство
     */
    async getDevice(deviceId: string): Promise<ApiResponse<Device>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<Device>>(`/devices/${deviceId}`);

            // Временное решение с использованием моковых данных
            const device = mockDevices.find(device => device.id === deviceId);
            if (!device) {
                throw new Error(`Устройство с ID ${deviceId} не найдено`);
            }

            return {
                success: true,
                data: device
            };
        } catch (error) {
            console.error(`Error getting device ${deviceId}:`, error);
            throw error;
        }
    }

    /**
     * Создает новое устройство
     * @param device данные нового устройства
     * @returns созданное устройство
     */
    async createDevice(device: Omit<Device, 'id'>): Promise<ApiResponse<Device>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<Device>>('/devices', device);

            // Временное решение с использованием моковых данных
            const newDevice: Device = {
                ...device,
                id: `dev${mockDevices.length + 1}`,
                lastSyncTime: new Date().toISOString()
            };

            return {
                success: true,
                data: newDevice
            };
        } catch (error) {
            console.error('Error creating device:', error);
            throw error;
        }
    }

    /**
     * Обновляет устройство
     * @param deviceId ID устройства
     * @param device данные для обновления
     * @returns обновленное устройство
     */
    async updateDevice(deviceId: string, device: Partial<Device>): Promise<ApiResponse<Device>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<Device>>(`/devices/${deviceId}`, device);

            // Временное решение с использованием моковых данных
            const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
            if (deviceIndex === -1) {
                throw new Error(`Устройство с ID ${deviceId} не найдено`);
            }

            const updatedDevice: Device = {
                ...mockDevices[deviceIndex],
                ...device
            };

            return {
                success: true,
                data: updatedDevice
            };
        } catch (error) {
            console.error(`Error updating device ${deviceId}:`, error);
            throw error;
        }
    }

    /**
     * Удаляет устройство
     * @param deviceId ID устройства
     * @returns результат операции
     */
    async deleteDevice(deviceId: string): Promise<ApiResponse<null>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.delete<ApiResponse<null>>(`/devices/${deviceId}`);

            // Временное решение с использованием моковых данных
            const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
            if (deviceIndex === -1) {
                throw new Error(`Устройство с ID ${deviceId} не найдено`);
            }

            return {
                success: true,
                data: null,
                message: `Устройство с ID ${deviceId} успешно удалено`
            };
        } catch (error) {
            console.error(`Error deleting device ${deviceId}:`, error);
            throw error;
        }
    }
}

// Экспортируем экземпляр API для использования в приложении
export const deviceApi = new DeviceApi(); 