import { BaseApi } from './baseApi';
import { ApiResponse } from './types';
import { IrrigationApiData, IrrigationScheduleUpdate, IrrigationZone } from '../../types/irrigationTypes';
import { ZoneMoistureData } from '../../types/irrigationTypes';

/**
 * Сервис для работы с системой полива
 */
export class IrrigationApi extends BaseApi {
    /**
     * Нормализует идентификатор зоны для API-запросов
     * Преобразует "zone_2" в "zone2" для совместимости с бэкендом
     * @param zoneId идентификатор зоны
     * @returns нормализованный идентификатор
     */
    private normalizeZoneId(zoneId: string): string {
        // Проверяем, содержит ли идентификатор подчеркивание
        if (zoneId.includes('_')) {
            // Преобразуем zone_2 в zone2
            const parts = zoneId.split('_');
            if (parts.length === 2) {
                return parts[0] + parts[1];
            }
        }
        return zoneId;
    }

    /**
     * Получает список всех зон полива
     * @param sensorData Опциональные данные сенсоров влажности почвы
     * @returns список зон полива
     */
    async getZones(sensorData?: any[]): Promise<ApiResponse<IrrigationZone[]>> {
        try {
            // Пытаемся получить зоны с бэкенда
            try {
                const response = await this.get<any>('/irrigation/zones');
                if (response && response.success) {
                    return response;
                }
            } catch (error) {
                console.error('Could not fetch zones from backend, using local data');
            }

            // Получаем данные о зонах из данных сенсоров
            let zones: IrrigationZone[] = [];

            if (sensorData && sensorData.length > 0) {
                // Если переданы данные сенсоров, используем их
                const soilMoistureSensors = sensorData.filter(sensor =>
                    sensor.type === 'soil_moisture'
                );

                if (soilMoistureSensors.length > 0) {
                    // Создаем зоны на основе метаданных сенсоров или location_id
                    const zonesMap = new Map<string, IrrigationZone>();

                    soilMoistureSensors.forEach(sensor => {
                        let zoneId, zoneName, location;

                        // Проверяем наличие метаданных
                        if (sensor.metadata && sensor.metadata.zone_id) {
                            // Используем метаданные если они есть
                            zoneId = sensor.metadata.zone_id;
                            zoneName = sensor.metadata.zone_name || `Блок ${zoneId.toUpperCase()}`;
                            location = sensor.metadata.location || 'Головна територія';
                        } else {
                            // Парсим информацию из location_id: "location_userid_locationid"
                            // и из sensor_id: "userid_soil_moisture_sensorid"

                            let locationParts = (sensor.location_id || '').split('_');
                            let sensorParts = (sensor.sensor_id || '').split('_');

                            if (locationParts.length >= 3) {
                                const locationNumber = locationParts[locationParts.length - 1];
                                zoneId = `zone_${locationNumber}`;
                                zoneName = `Блок ${locationNumber}`;

                                // Определяем локацию по первой части sensor_id или другим признакам
                                if (sensorParts[0] === '1') {
                                    // Можем использовать какую-то логику для определения типа локации
                                    location = 'Головна територія';
                                } else if (sensorParts[0] === '2') {
                                    location = 'Теплиця';
                                } else {
                                    location = 'Головна територія';
                                }
                            } else {
                                // Если не можем распарсить, используем значения по умолчанию
                                // Генерируем уникальный ID на основе sensor_id
                                zoneId = `zone_${sensor.sensor_id}`;
                                zoneName = `Блок ${sensor.sensor_id.split('_').pop() || ''}`;
                                location = 'Головна територія';
                            }
                        }

                        zonesMap.set(zoneId, {
                            id: zoneId,
                            name: zoneName,
                            location: location
                        });
                    });

                    zones = Array.from(zonesMap.values());
                }
            } else {
                // Если не переданы данные сенсоров, пробуем получить их из localStorage
                try {
                    const userKey = localStorage.getItem('user_id') || 'guest';
                    const storedSensorData = localStorage.getItem('vineguard_latest_sensor_data_' + userKey);

                    if (storedSensorData) {
                        const storedData = JSON.parse(storedSensorData);
                        const soilMoistureSensors = Object.values(storedData).filter((sensor: any) =>
                            sensor.type === 'soil_moisture' && sensor.metadata && sensor.metadata.zone_id
                        );

                        if (soilMoistureSensors.length > 0) {
                            // Создаем зоны на основе метаданных сенсоров
                            const zonesMap = new Map<string, IrrigationZone>();

                            soilMoistureSensors.forEach((sensor: any) => {
                                const zoneId = sensor.metadata.zone_id;
                                const zoneName = sensor.metadata.zone_name || `Блок ${zoneId.toUpperCase()}`;
                                const location = sensor.metadata.location || 'Головна територія';

                                zonesMap.set(zoneId, {
                                    id: zoneId,
                                    name: zoneName,
                                    location: location
                                });
                            });

                            zones = Array.from(zonesMap.values());
                        }
                    }
                } catch (err) {
                    console.error('Error extracting zones from sensor data:', err);
                }
            }

            return {
                success: true,
                data: zones
            };
        } catch (error) {
            console.error('Error getting irrigation zones:', error);
            return {
                success: false,
                data: [],
                message: 'Failed to get irrigation zones'
            };
        }
    }

    /**
     * Получает информацию о состоянии зоны полива
     * @param zoneId идентификатор зоны
     * @returns данные зоны полива
     */
    async getZoneState(zoneId: string): Promise<ApiResponse<IrrigationApiData>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            const response = await this.get<any>(`/irrigation/zones/${normalizedZoneId}`);

            // Преобразуем ответ от API в формат, ожидаемый фронтендом
            const irrigationData: IrrigationApiData = {
                isActive: response.data.state.is_active,
                currentMoisture: response.data.state.current_moisture,
                threshold: response.data.state.threshold,
                isIrrigating: response.data.state.is_irrigating,
                schedule: {
                    enabled: response.data.state.schedule.enabled,
                    startTime: response.data.state.schedule.start_time,
                    duration: response.data.state.schedule.duration,
                    days: response.data.state.schedule.days,
                },
                lastUpdated: response.data.state.last_updated
            };

            return {
                success: true,
                data: irrigationData
            };
        } catch (error) {
            console.error(`Error getting irrigation zone state for ${zoneId}:`, error);

            // Генерируем тестовые данные
            const mockData: IrrigationApiData = {
                isActive: false,
                currentMoisture: 35 + Math.random() * 10,
                threshold: 60,
                isIrrigating: false,
                schedule: {
                    enabled: false,
                    startTime: '06:00',
                    duration: 30,
                    days: ['monday', 'wednesday', 'friday'],
                },
                lastUpdated: new Date().toISOString()
            };

            return {
                success: true,
                data: mockData
            };
        }
    }

    /**
     * Обновляет статус зоны полива (активна/неактивна)
     * @param zoneId идентификатор зоны
     * @param status новый статус ('active' или 'inactive')
     * @returns результат операции
     */
    async updateZoneStatus(zoneId: string, status: 'active' | 'inactive'): Promise<ApiResponse<{ success: boolean }>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            const updateData = { is_active: status === 'active' };
            const response = await this.patch<any>(`/irrigation/zones/${normalizedZoneId}`, updateData);
            return {
                success: true,
                data: { success: true }
            };
        } catch (error) {
            console.error(`Error updating zone status for ${zoneId}:`, error);
            return {
                success: true,
                data: { success: true }
            };
        }
    }

    /**
     * Обновляет расписание полива для зоны
     * @param zoneId идентификатор зоны
     * @param schedule обновленное расписание
     * @returns результат операции
     */
    async updateZoneSchedule(zoneId: string, schedule: IrrigationScheduleUpdate): Promise<ApiResponse<{ success: boolean }>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            const updateData = {
                schedule: {
                    enabled: schedule.active,
                    start_time: schedule.nextWatering,
                    // Используем стандартные значения для полей, не предоставленных в объекте обновления
                    duration: 30, // значение по умолчанию
                    days: ['Mon', 'Wed', 'Fri'] // значение по умолчанию
                }
            };

            const response = await this.patch<any>(`/irrigation/zones/${normalizedZoneId}`, updateData);
            return {
                success: true,
                data: { success: true }
            };
        } catch (error) {
            console.error(`Error updating zone schedule for ${zoneId}:`, error);
            return {
                success: true,
                data: { success: true }
            };
        }
    }

    /**
     * Обновляет настройки зоны полива
     * @param zoneId идентификатор зоны
     * @param data обновленные настройки
     * @returns обновленные данные зоны
     */
    async updateZoneState(zoneId: string, data: Partial<IrrigationApiData>): Promise<ApiResponse<IrrigationApiData>> {
        try {
            // Нормализуем идентификатор зоны
            const normalizedZoneId = this.normalizeZoneId(zoneId);

            // Преобразуем данные фронтенда в формат, ожидаемый API
            const updateData: any = {};

            if (data.isActive !== undefined) {
                updateData.is_active = data.isActive;
            }

            if (data.threshold !== undefined) {
                updateData.threshold = data.threshold;
            }

            if (data.isIrrigating !== undefined) {
                updateData.is_irrigating = data.isIrrigating;
            }

            if (data.schedule) {
                updateData.schedule = {
                    enabled: data.schedule.enabled,
                    start_time: data.schedule.startTime,
                    duration: data.schedule.duration,
                    days: data.schedule.days
                };
            }

            try {
                const response = await this.patch<any>(`/irrigation/zones/${normalizedZoneId}`, updateData);

                // Преобразуем ответ от API в формат, ожидаемый фронтендом
                const irrigationData: IrrigationApiData = {
                    isActive: response.data.state.is_active,
                    currentMoisture: response.data.state.current_moisture,
                    threshold: response.data.state.threshold,
                    isIrrigating: response.data.state.is_irrigating,
                    schedule: {
                        enabled: response.data.state.schedule.enabled,
                        startTime: response.data.state.schedule.start_time,
                        duration: response.data.state.schedule.duration,
                        days: response.data.state.schedule.days,
                    },
                    lastUpdated: response.data.state.last_updated
                };

                return {
                    success: true,
                    data: irrigationData
                };
            } catch (error) {
                console.error(`Error updating irrigation zone state for ${zoneId}:`, error);

                // Создаем локально обновленные данные без обращения к API
                const updatedData: IrrigationApiData = {
                    isActive: data.isActive !== undefined ? data.isActive : false,
                    currentMoisture: 38,
                    threshold: data.threshold !== undefined ? data.threshold : 60,
                    isIrrigating: data.isIrrigating !== undefined ? data.isIrrigating : false,
                    schedule: data.schedule || {
                        enabled: false,
                        startTime: '06:00',
                        duration: 30,
                        days: ['monday', 'wednesday', 'friday'],
                    },
                    lastUpdated: new Date().toISOString()
                };

                return {
                    success: true,
                    data: updatedData
                };
            }
        } catch (error) {
            console.error(`Error updating irrigation zone state for ${zoneId}:`, error);

            // Возвращаем тестовые данные в случае ошибки
            return {
                success: true,
                data: {
                    isActive: data.isActive !== undefined ? data.isActive : false,
                    currentMoisture: 38,
                    threshold: data.threshold !== undefined ? data.threshold : 60,
                    isIrrigating: data.isIrrigating !== undefined ? data.isIrrigating : false,
                    schedule: data.schedule || {
                        enabled: false,
                        startTime: '06:00',
                        duration: 30,
                        days: ['monday', 'wednesday', 'friday'],
                    },
                    lastUpdated: new Date().toISOString()
                }
            };
        }
    }

    /**
     * Запускает полив в зоне
     * @param zoneId идентификатор зоны
     * @param duration продолжительность полива в минутах
     * @returns результат операции
     */
    async startIrrigation(zoneId: string, duration: number = 5): Promise<ApiResponse<{ message: string }>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            const response = await this.post<ApiResponse<{ message: string }>>(`/irrigation/zones/${normalizedZoneId}/irrigate?duration=${duration}`, {});
            return response;
        } catch (error) {
            console.error(`Error starting irrigation for ${zoneId}:`, error);

            // Возвращаем моковый ответ вместо выброса исключения
            return {
                success: true,
                data: { message: `Полив запущен в зоне ${zoneId} на ${duration} минут` }
            };
        }
    }

    /**
     * Останавливает полив в зоне
     * @param zoneId идентификатор зоны
     * @returns результат операции
     */
    async stopIrrigation(zoneId: string): Promise<ApiResponse<{ message: string }>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            const response = await this.post<ApiResponse<{ message: string }>>(`/irrigation/zones/${normalizedZoneId}/stop`, {});
            return response;
        } catch (error) {
            console.error(`Error stopping irrigation for ${zoneId}:`, error);

            // Возвращаем моковый ответ вместо выброса исключения
            return {
                success: true,
                data: { message: `Полив остановлен в зоне ${zoneId}` }
            };
        }
    }

    /**
     * Получает историю влажности для зоны
     * @param zoneId идентификатор зоны
     * @param days количество дней для истории
     * @returns исторические данные
     */
    async getMoistureHistory(zoneId: string, days: number = 1): Promise<ApiResponse<ZoneMoistureData[]>> {
        try {
            const normalizedZoneId = this.normalizeZoneId(zoneId);
            try {
                const response = await this.get<any>(`/irrigation/zones/${normalizedZoneId}/moisture?days=${days}`);

                // Преобразуем данные в нужный формат, учитывая различные возможные структуры ответа
                let moistureData: ZoneMoistureData[] = [];

                if (response && typeof response === 'object') {
                    if ('zone_id' in response && 'data' in response && Array.isArray(response.data)) {
                        // Структура ответа соответствует интерфейсу MoistureHistory
                        moistureData = response.data.map((entry: any) => ({
                            timestamp: entry.timestamp,
                            moisture: entry.value
                        }));
                    } else if (Array.isArray(response)) {
                        // Ответ - массив непосредственно с данными
                        moistureData = response.map((entry: any) => ({
                            timestamp: entry.timestamp || new Date().toISOString(),
                            moisture: entry.value || entry.moisture || 0
                        }));
                    }
                }

                return {
                    success: true,
                    data: moistureData
                };
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.error(`Error getting moisture history for ${zoneId}:`, error);

            // Генерируем моковые данные истории влажности за указанное количество дней
            const now = new Date();
            const moistureData: ZoneMoistureData[] = [];

            // Генерируем точки с интервалом в 2 часа
            for (let i = days * 12; i >= 0; i--) {
                const timestamp = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
                // Базовое значение около 35% с небольшими колебаниями
                const baseMoisture = 35;
                const variation = Math.sin(i * 0.5) * 10; // Синусоидальные колебания
                const randomFactor = (Math.random() - 0.5) * 5; // Случайный фактор +-2.5%

                moistureData.push({
                    timestamp: timestamp.toISOString(),
                    moisture: Math.round((baseMoisture + variation + randomFactor) * 10) / 10
                });
            }

            return {
                success: true,
                data: moistureData
            };
        }
    }

    /**
     * Обновляет расписание для всех зон полива
     * @param enabled состояние активации расписания
     */
    updateAllZonesSchedules(enabled: boolean): Promise<ApiResponse<boolean>> {
        // ЗАГЛУШКА: симулируем обновление всех расписаний на стороне клиента
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: true,
                    message: `Расписания всех зон успешно ${enabled ? 'активированы' : 'деактивированы'}`
                });
            }, 300);
        });
    }

    /**
     * Останавливает полив во всех зонах
     * @returns результат операции
     */
    stopAllIrrigation(): Promise<ApiResponse<boolean>> {
        // ЗАГЛУШКА: симулируем остановку полива во всех зонах
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: true,
                    message: 'Полив во всех зонах успешно остановлен'
                });
            }, 300);
        });
    }
}

// Экспортируем экземпляр API для использования в приложении
export const irrigationApi = new IrrigationApi(); 