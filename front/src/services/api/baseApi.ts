import { getItem } from '../../utils/storage';

// Базовый URL API (будет заменен на реальный при подключении к бэкенду)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.example.com/v1';

/**
 * Типы HTTP методов
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Интерфейс опций запроса
 */
export interface RequestOptions {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    requireAuth?: boolean;
}

/**
 * Базовый класс для работы с API
 */
export class BaseApi {
    /**
     * Базовый URL API
     * @protected
     */
    protected baseUrl: string;

    /**
     * Конструктор
     * @param baseUrl - базовый URL API (необязательный)
     */
    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || API_BASE_URL;
    }

    /**
     * Отправляет запрос к API
     * @param endpoint - конечная точка API
     * @param options - опции запроса
     * @returns результат запроса
     * @throws ошибку, если запрос не выполнен
     */
    protected async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const {
            method = 'GET',
            headers = {},
            body,
            requireAuth = true
        } = options;

        // Базовые заголовки
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers
        };

        // Добавляем авторизационный заголовок, если требуется
        if (requireAuth) {
            const token = getItem<string>('authToken', '');
            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
            } else if (requireAuth) {
                throw new Error('Требуется авторизация');
            }
        }

        // Формируем опции запроса
        const requestOptions: RequestInit = {
            method,
            headers: requestHeaders
        };

        // Добавляем тело запроса, если оно есть
        if (body !== undefined) {
            requestOptions.body = JSON.stringify(body);
        }

        try {
            // Выполняем запрос
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);

            // Если ответ не OK, выбрасываем ошибку
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(
                    errorData?.message || `Ошибка запроса: ${response.status} ${response.statusText}`
                );
            }

            // Если ответ пустой, возвращаем пустой объект
            if (response.status === 204) {
                return {} as T;
            }

            // Иначе парсим JSON
            return await response.json();
        } catch (error) {
            throw error;
        }
    }

    /**
     * Отправляет GET запрос
     * @param endpoint - конечная точка API
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async get<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    /**
     * Отправляет POST запрос
     * @param endpoint - конечная точка API
     * @param body - тело запроса
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async post<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'POST', body });
    }

    /**
     * Отправляет PUT запрос
     * @param endpoint - конечная точка API
     * @param body - тело запроса
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async put<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body });
    }

    /**
     * Отправляет PATCH запрос
     * @param endpoint - конечная точка API
     * @param body - тело запроса
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async patch<T>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
    }

    /**
     * Отправляет DELETE запрос
     * @param endpoint - конечная точка API
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
} 