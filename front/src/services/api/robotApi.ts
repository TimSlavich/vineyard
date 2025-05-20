import { BaseApi } from './baseApi';
import { ApiResponse, PaginatedResponse, RobotCommandRequest } from './types';
import { RobotStatus } from '../../types/robotTypes';
import { irrigationApi } from './irrigationApi';

/**
 * Сервис для работы с роботами
 */
export class RobotApi extends BaseApi {
    /**
     * Получает список роботов
     * @param params параметры запроса
     * @returns список роботов
     */
    async getRobots(params?: { status?: string; type?: string; category?: string }): Promise<PaginatedResponse<RobotStatus>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<PaginatedResponse<RobotStatus>>('/robots', { params });

            // Временное решение - используем данные из контекста в компонентах
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    perPage: 10,
                    totalPages: 0
                }
            };
        } catch (error) {
            console.error('Error getting robots:', error);
            throw error;
        }
    }

    /**
     * Получает робота по ID
     * @param robotId ID робота
     * @returns робот
     */
    async getRobot(robotId: string): Promise<ApiResponse<RobotStatus>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<RobotStatus>>(`/robots/${robotId}`);

            // Временное решение - используем данные из контекста в компонентах
            return {
                success: true,
                data: {} as RobotStatus
            };
        } catch (error) {
            console.error(`Error getting robot ${robotId}:`, error);
            throw error;
        }
    }

    /**
     * Отправляет команду роботу
     * @param command команда для робота
     * @returns результат выполнения команды
     */
    async sendCommand(command: RobotCommandRequest): Promise<ApiResponse<{ status: string; message: string }>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<{ status: string; message: string }>>('/robots/command', command);

            return {
                success: true,
                data: {
                    status: 'success',
                    message: `Команда ${command.command} успешно отправлена роботу ${command.robotId}`
                }
            };
        } catch (error) {
            console.error('Error sending command to robot:', error);
            throw error;
        }
    }

    /**
     * Обновляет статус робота
     * @param robotId ID робота
     * @param status новый статус
     * @returns обновленный робот
     */
    async updateStatus(robotId: string, status: Partial<RobotStatus>): Promise<ApiResponse<RobotStatus>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<RobotStatus>>(`/robots/${robotId}/status`, status);

            // Временное решение - используем данные из контекста в компонентах
            return {
                success: true,
                data: {} as RobotStatus
            };
        } catch (error) {
            console.error(`Error updating robot ${robotId} status:`, error);
            throw error;
        }
    }

    /**
     * Получает список запланированных заданий для роботов
     * @param params параметры запроса
     * @returns список заданий
     */
    async getScheduledTasks(params?: { robotId?: string; status?: string }): Promise<PaginatedResponse<any>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<PaginatedResponse<any>>('/robots/tasks', { params });

            // Временное решение - используем данные из компонентов FertilizerControl и RobotControl
            return {
                data: [],
                meta: {
                    total: 0,
                    page: 1,
                    perPage: 10,
                    totalPages: 0
                }
            };
        } catch (error) {
            console.error('Error getting scheduled tasks:', error);
            throw error;
        }
    }

    /**
     * Создает новое запланированное задание
     * @param task данные задания
     * @returns созданное задание
     */
    async createTask(task: any): Promise<ApiResponse<any>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<any>>('/robots/tasks', task);

            // Временное решение - используем данные из компонентов FertilizerControl и RobotControl
            return {
                success: true,
                data: { ...task, id: `task-${Date.now()}` }
            };
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    }

    /**
     * Удаляет запланированное задание
     * @param taskId ID задания
     * @returns результат операции
     */
    async deleteTask(taskId: string): Promise<ApiResponse<null>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.delete<ApiResponse<null>>(`/robots/tasks/${taskId}`);

            // Временное решение - используем данные из компонентов FertilizerControl и RobotControl
            return {
                success: true,
                data: null,
                message: `Задание ${taskId} успешно удалено`
            };
        } catch (error) {
            console.error(`Error deleting task ${taskId}:`, error);
            throw error;
        }
    }

    /**
     * Выполняет групповую команду для всех роботов
     * @param command команда
     * @returns результат выполнения
     */
    async groupCommand(command: string): Promise<ApiResponse<{ success: number; failed: number }>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<{ success: number; failed: number }>>('/robots/group-command', { command });

            return {
                success: true,
                data: {
                    success: 5, // Количество роботов, для которых команда выполнена успешно
                    failed: 0
                }
            };
        } catch (error) {
            console.error(`Error executing group command ${command}:`, error);
            throw error;
        }
    }

    /**
     * Получает список точек навигации для роботов
     * @returns список точек навигации
     */
    async getNavigationPoints(): Promise<ApiResponse<string[]>> {
        try {
            // Базовые точки навигации
            let navigationPoints: string[] = [
                'Повернення на базу',
                'Станція зарядки',
                'Технічний відсік'
            ];

            try {
                const irrigationZonesResponse = await irrigationApi.getZones();

                if (irrigationZonesResponse.success) {
                    if (irrigationZonesResponse.data && irrigationZonesResponse.data.length > 0) {
                        // Получаем имена зон напрямую, без преобразований
                        const zoneNames = irrigationZonesResponse.data.map(zone => zone.name);

                        // Сначала получаем уникальный список зон
                        const uniqueZones = [...new Set([...zoneNames, ...navigationPoints])];

                        // Обновляем navigationPoints, но сохраняем базовые точки в конце
                        const basePoints = navigationPoints.filter(point =>
                            !point.includes('Блок')
                        );
                        const blockPoints = uniqueZones.filter(point =>
                            point.includes('Блок')
                        );

                        navigationPoints = [...blockPoints, ...basePoints];
                    }
                }
            } catch (error) {
                console.error('Ошибка при получении зон из irrigationApi:', error);
            }

            return {
                success: true,
                data: navigationPoints
            };
        } catch (error) {
            console.error('Error getting navigation points:', error);
            throw error;
        }
    }
}

// Экспортируем экземпляр API для использования в приложении
export const robotApi = new RobotApi(); 