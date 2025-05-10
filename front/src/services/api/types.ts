/**
 * Типы данных для работы с API
 */

/**
 * Базовый интерфейс для пагинированных ответов API
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        perPage: number;
        totalPages: number;
    };
}

/**
 * Базовый интерфейс для ответов API
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

/**
 * Параметры пагинации для запросов
 */
export interface PaginationParams {
    page?: number;
    perPage?: number;
}

/**
 * Параметры сортировки для запросов
 */
export interface SortParams {
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}

/**
 * Параметры фильтрации для запросов
 */
export interface FilterParams {
    [key: string]: any;
}

/**
 * Комбинированные параметры запроса (пагинация, сортировка, фильтрация)
 */
export interface QueryParams extends PaginationParams, SortParams, FilterParams { }

/**
 * Интерфейс авторизации
 */
export interface AuthRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

/**
 * Интерфейс регистрации
 */
export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

/**
 * Интерфейс запроса на получение устройств
 */
export interface DevicesRequest extends QueryParams {
    status?: 'online' | 'offline' | 'maintenance';
    type?: string;
    locationId?: string;
}

/**
 * Интерфейс запроса на получение уведомлений
 */
export interface AlertsRequest extends QueryParams {
    type?: 'info' | 'warning' | 'critical';
    read?: boolean;
    startDate?: string;
    endDate?: string;
}

/**
 * Интерфейс запроса на получение данных сенсоров
 */
export interface SensorDataRequest extends QueryParams {
    sensorType?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
    status?: 'normal' | 'warning' | 'critical';
}

/**
 * Интерфейс запроса на изменение настройки порогов
 */
export interface ThresholdUpdateRequest {
    id: string;
    min?: number;
    max?: number;
}

/**
 * Интерфейс запроса на изменение настроек уведомлений
 */
export interface NotificationSettingUpdateRequest {
    type: 'email' | 'sms' | 'push';
    enabled?: boolean;
    alertTypes?: ('info' | 'warning' | 'critical')[];
}

/**
 * Интерфейс запроса на изменение профиля пользователя
 */
export interface UserProfileUpdateRequest {
    name?: string;
    email?: string;
    timezone?: string;
}

/**
 * Интерфейс запроса на изменение пароля
 */
export interface PasswordChangeRequest {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/**
 * Интерфейс для команд роботам
 */
export interface RobotCommandRequest {
    robotId: string;
    command: string;
    params?: Record<string, any>;
} 