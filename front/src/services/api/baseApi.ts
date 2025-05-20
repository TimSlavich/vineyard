import { getItem, removeItem, setItem } from '../../utils/storage';

// Базовый URL API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Максимальное количество попыток обновления токена
const MAX_TOKEN_REFRESH_ATTEMPTS = 3;

// Текущее количество попыток обновления токена
let tokenRefreshAttempts = 0;

// Флаг для отслеживания текущего процесса обновления токена
let isRefreshingToken = false;

// Очередь ожидающих запросов, которые будут выполнены после обновления токена
let refreshQueue: Array<() => void> = [];

// Функция для перенаправления на страницу входа
let redirectToLogin: (() => void) | null = null;

/**
 * Устанавливает функцию для перенаправления на страницу входа
 * @param callback - функция перенаправления
 */
export function setRedirectCallback(callback: () => void): void {
    redirectToLogin = callback;
}

/**
 * Очищает все аутентификационные данные и перенаправляет на страницу входа
 * @param redirectNow - нужно ли сразу перенаправлять на страницу входа
 */
export function clearAuthAndRedirect(redirectNow = true): void {
    // Очищаем данные авторизации
    removeItem('accessToken');
    removeItem('refreshToken');
    removeItem('user');
    tokenRefreshAttempts = 0;

    // Очищаем очередь запросов
    processQueue(null);

    // Перенаправляем на страницу входа, если требуется
    if (redirectNow && redirectToLogin) {
        redirectToLogin();
    }
}

/**
 * Выполняет все запросы из очереди
 * @param newToken - новый токен для запросов
 */
function processQueue(newToken: string | null): void {
    refreshQueue.forEach(callback => callback());
    refreshQueue = [];
}

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
    retryCount?: number;
    skipRedirect?: boolean;
}

/**
 * Интерфейс ответа API
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    error?: string;
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
            requireAuth = true,
            retryCount = 0,
            skipRedirect = false,
        } = options;

        // Базовые заголовки
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers
        };

        // Добавляем авторизационный заголовок, если требуется
        if (requireAuth) {
            const token = getItem<string>('accessToken', '');
            const user = getItem<any>('user', null);

            if (token) {
                requestHeaders['Authorization'] = `Bearer ${token}`;
                console.debug(`Запрос с токеном к ${endpoint}`);
            } else if (user) {
                // Если нет токена, но есть пользователь, 
                // то предупреждаем о запросе без авторизации,
                // но не перенаправляем на страницу входа
                console.warn(`Запрос требует авторизации к ${endpoint}, но токен не найден. Есть только данные пользователя.`);
                // Можно добавить некоторые доп. данные для идентификации, если API их поддерживает
                if (user.id) {
                    requestHeaders['X-User-ID'] = String(user.id);
                }
                if (user.username) {
                    requestHeaders['X-Username'] = user.username;
                }
            } else {
                console.warn(`Требуется авторизация для запроса к ${endpoint}, но ни токен, ни данные пользователя не найдены`);
                if (!skipRedirect) {
                    clearAuthAndRedirect(true);
                    throw new Error('Требуется авторизация');
                }
            }
        } else {
            console.debug(`Запрос без токена к ${endpoint}`);
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
            // Таймаут для запроса (10 секунд)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            requestOptions.signal = controller.signal;

            // Выполняем запрос
            console.debug(`Отправка ${method} запроса к ${endpoint}`,
                body ? 'с данными' : 'без данных');
            const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
            clearTimeout(timeoutId);

            // Если получили 401 Unauthorized и у нас есть refreshToken
            if (response.status === 401 && getItem<string>('refreshToken')) {
                // Если это не запрос на обновление токена и мы не достигли максимального количества попыток
                if (!endpoint.includes('/auth/refresh') && retryCount < 3) {
                    console.debug('Получен 401, пытаемся обновить токен');
                    // Пытаемся обновить токен
                    const newToken = await this.refreshAccessToken();
                    if (newToken) {
                        console.debug('Токен успешно обновлен, повторяем запрос');
                        // Повторяем запрос с новым токеном
                        return this.request<T>(endpoint, {
                            ...options,
                            retryCount: retryCount + 1
                        });
                    } else if (!skipRedirect) {
                        console.warn('Не удалось обновить токен, перенаправляем на страницу входа');
                        // Если токен не обновился и это не запрос с skipRedirect
                        clearAuthAndRedirect(true);
                        throw new Error('Сессия истекла');
                    }
                } else if (!skipRedirect) {
                    console.warn('Превышено количество попыток обновления токена, перенаправляем на страницу входа');
                    // Если это запрос на обновление токена или превышено количество попыток
                    clearAuthAndRedirect(true);
                    throw new Error('Сессия истекла');
                }
            }

            // Проверка на пустой ответ
            if (response.status === 204) {
                console.debug(`Получен пустой ответ (204) от ${endpoint}`);
                return {} as T;
            }

            // Если ответ не OK, выбрасываем ошибку
            if (!response.ok) {
                // Пытаемся получить данные ошибки
                let errorData;
                try {
                    errorData = await response.json();
                } catch (_) {
                    errorData = null;
                }

                let errorMessage = errorData?.detail || `Ошибка запроса: ${response.status} ${response.statusText}`;

                // Преобразуем известные ошибки в более дружественные сообщения
                if (errorMessage.includes("Username already exists")) {
                    errorMessage = "Пользователь с таким именем уже существует";
                } else if (errorMessage.includes("Email already exists")) {
                    errorMessage = "Пользователь с таким email уже существует";
                } else if (errorMessage.includes("Passwords do not match")) {
                    errorMessage = "Пароли не совпадают";
                } else if (errorMessage.includes("Incorrect username or password")) {
                    errorMessage = "Неверное имя пользователя или пароль";
                }

                console.error(`Ошибка запроса к ${endpoint}: ${errorMessage}`);
                const error = new Error(errorMessage);
                (error as any).status = response.status;
                (error as any).response = response;
                throw error;
            }

            return this.parseResponse<T>(response);
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Запрос был прерван по тайм-ауту');
            }

            // Проверяем, является ли ошибка связанной с сетью (ERR_CONNECTION_REFUSED, CORS, etc)
            const isNetworkError = error instanceof Error && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('CORS') ||
                error.message.includes('ERR_CONNECTION_REFUSED')
            );

            if (isNetworkError && retryCount < 2) {
                // Задержка перед повторным запросом (экспоненциальный backoff)
                const delay = Math.pow(2, retryCount) * 1000;
                console.debug(`Сетевая ошибка, повторяем запрос через ${delay}мс`);
                await new Promise(resolve => setTimeout(resolve, delay));

                // Повторяем запрос
                return this.request<T>(endpoint, {
                    ...options,
                    retryCount: retryCount + 1
                });
            }

            throw error;
        }
    }

    /**
     * Обрабатывает ответ от API
     * @param response - ответ API
     * @returns обработанный ответ
     */
    private async parseResponse<T>(response: Response): Promise<T> {
        try {
            // Проверяем Content-Type заголовок
            const contentType = response.headers.get('Content-Type');

            // Проверка на пустой ответ
            if (response.status === 204 || response.headers.get('Content-Length') === '0') {
                console.debug('Обнаружен пустой ответ от сервера');
                return {} as T;
            }

            // Если ответ в формате JSON, парсим его
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (!text || text.trim() === '') {
                    console.debug('Получен пустой JSON ответ, возвращаем пустой объект');
                    return {} as T;
                }

                try {
                    return JSON.parse(text) as T;
                } catch (jsonError) {
                    console.error('Ошибка при разборе JSON:', jsonError, 'Исходный текст:', text);
                    throw new Error('Получен некорректный JSON от сервера');
                }
            }

            // Если ответ не в формате JSON, возвращаем текст
            const text = await response.text();

            if (!text || text.trim() === '') {
                console.debug('Получен пустой текстовый ответ, возвращаем пустой объект');
                return {} as T;
            }

            // Пытаемся распарсить как JSON (на случай, если сервер не установил правильный Content-Type)
            try {
                return JSON.parse(text) as T;
            } catch {
                // Если не получилось распарсить как JSON, возвращаем как есть
                return text as unknown as T;
            }
        } catch (error) {
            console.error('Ошибка при парсинге ответа:', error);
            throw new Error('Не удалось обработать ответ от сервера');
        }
    }

    /**
     * Обновляет access token с помощью refresh token
     * @returns новый access token или null, если обновление не удалось
     */
    private async refreshAccessToken(): Promise<string | null> {
        const refreshToken = getItem<string>('refreshToken', '');
        if (!refreshToken) {
            console.warn('Не найден refresh token');
            return null;
        }

        // Если уже идет процесс обновления токена, ждем его завершения
        if (isRefreshingToken) {
            return new Promise<string | null>((resolve) => {
                refreshQueue.push(() => {
                    resolve(getItem<string>('accessToken', null));
                });
            });
        }

        // Увеличиваем счетчик попыток
        tokenRefreshAttempts++;

        // Если превышено максимальное количество попыток, очищаем токены и выходим
        if (tokenRefreshAttempts > MAX_TOKEN_REFRESH_ATTEMPTS) {
            console.warn(`Превышено максимальное количество попыток обновления токена (${MAX_TOKEN_REFRESH_ATTEMPTS})`);
            clearAuthAndRedirect(false);
            return null;
        }

        try {
            isRefreshingToken = true;

            // Отправляем запрос на обновление токена
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            // Если сервер ответил ошибкой для несуществующего пользователя
            if (response.status === 401) {
                // Токен не действителен, нужно залогиниться заново
                clearAuthAndRedirect(false);
                throw new Error(`Ошибка при обновлении токена: ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(`Ошибка при обновлении токена: ${response.status}`);
            }

            const data = await response.json();

            if (data.access_token && data.refresh_token) {
                // Сохраняем новые токены
                setItem('accessToken', data.access_token);
                setItem('refreshToken', data.refresh_token);

                // Сбрасываем счетчик попыток при успешном обновлении
                tokenRefreshAttempts = 0;

                // Выполняем запросы из очереди
                processQueue(data.access_token);

                return data.access_token;
            } else {
                throw new Error('Не удалось получить новые токены');
            }
        } catch (error) {
            console.error('Ошибка при обновлении токена:', error);

            // Если ошибка не связана с сетью, очищаем токены
            const isNetworkError = error instanceof Error && (
                error.message.includes('Failed to fetch') ||
                error.message.includes('NetworkError') ||
                error.message.includes('CORS') ||
                error.message.includes('ERR_CONNECTION_REFUSED')
            );

            if (!isNetworkError) {
                // Явно очищаем только при неетевых ошибках
                clearAuthAndRedirect(false);
            }

            processQueue(null);
            return null;
        } finally {
            isRefreshingToken = false;
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
    protected async post<T>(
        endpoint: string,
        body?: any,
        options: Omit<RequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'POST', body });
    }

    /**
     * Отправляет PUT запрос
     * @param endpoint - конечная точка API
     * @param body - тело запроса
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async put<T>(
        endpoint: string,
        body?: any,
        options: Omit<RequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body });
    }

    /**
     * Отправляет PATCH запрос
     * @param endpoint - конечная точка API
     * @param body - тело запроса
     * @param options - опции запроса
     * @returns результат запроса
     */
    protected async patch<T>(
        endpoint: string,
        body?: any,
        options: Omit<RequestOptions, 'method' | 'body'> = {}
    ): Promise<T> {
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