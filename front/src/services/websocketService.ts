import { isAuthenticated, getItem, getUserData, setItem } from '../utils/storage';
import { BaseApi } from './api/baseApi';
import { addAlert } from './notificationService';
import { SENSOR_TYPE_UA } from '../utils/translations';

type WebSocketMessageType = 'sensor_data' | 'alert' | 'notification' | 'system' | 'request_data' | 'request_completed' | 'welcome' | 'echo' | 'pong' | 'subscribed' | 'unsubscribed' | 'sensor_alert';

interface WebSocketMessage {
    type: WebSocketMessageType;
    data: any;
    timestamp: string;
}

interface WebSocketMessageListener {
    (message: WebSocketMessage): void;
}

/**
 * Сервис для работы с WebSocket соединением
 */
class WebSocketService {
    private socket: WebSocket | null = null;
    private url: string;
    private listeners: Map<WebSocketMessageType, WebSocketMessageListener[]> = new Map();
    private reconnectTimer: number | null = null;
    private reconnectDelay: number = 1000;
    private isConnecting: boolean = false;
    private heartbeatInterval: number | null = null;
    private baseApi: BaseApi;
    private maxReconnectAttempts: number = 10;
    private reconnectAttempts: number = 0;
    private tokenRefreshInProgress: boolean = false;

    /**
     * Конструктор
     * @param url - WebSocket URL
     */
    constructor(url: string) {
        this.url = url;
        this.baseApi = new BaseApi();

        // Обработчик изменения состояния сети
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Обработчик изменения видимости страницы
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }

    /**
     * Обработчик события online
     */
    private handleOnline() {
        if (isAuthenticated()) {
            this.resetReconnectAttempts();
            this.connect();
        }
    }

    /**
     * Обработчик события offline
     */
    private handleOffline() {
        this.disconnect();
    }

    /**
     * Обработчик изменения видимости страницы
     */
    private handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            if (isAuthenticated() && !this.isConnected()) {
                this.connect();
            }
        }
    }

    /**
     * Сбрасывает счетчик попыток переподключения
     */
    private resetReconnectAttempts() {
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
    }

    /**
     * Проверяет и обновляет токен при необходимости
     * @returns Промис с актуальным токеном
     */
    public async ensureValidToken(): Promise<string | null> {
        if (this.tokenRefreshInProgress) {
            // Ждем завершения текущего процесса обновления токена
            await new Promise(resolve => setTimeout(resolve, 500));
            return getItem<string>('accessToken');
        }

        try {
            this.tokenRefreshInProgress = true;
            const token = getItem<string>('accessToken');
            const refreshToken = getItem<string>('refreshToken');

            if (!token || !refreshToken) {
                return null;
            }

            // Проверка токена путем отправки запроса к API
            try {
                // Отправляем запрос к эндпойнту /auth/me для проверки валидности токена
                const response = await fetch(this.getApiUrl('/auth/me'), {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Если запрос успешен, значит токен действителен
                    return token;
                }

                throw new Error('Токен недійсний');
            } catch (error) {

                // Ошибка проверки токена, пробуем обновить
                const response = await fetch(this.getApiUrl('/auth/refresh'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh_token: refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Не вдалося оновити токен');
                }

                const data = await response.json();

                if (data.access_token && data.refresh_token) {
                    // Сохраняем новые токены
                    setItem('accessToken', data.access_token);
                    setItem('refreshToken', data.refresh_token);
                    return data.access_token;
                }
            }

            return token;
        } catch (error) {
            console.error('Помилка при оновленні токена:', error);
            return null;
        } finally {
            this.tokenRefreshInProgress = false;
        }
    }

    /**
     * Получает базовый URL API из BaseApi
     * @param endpoint Эндпоинт API
     * @returns Полный URL для API запроса
     */
    private getApiUrl(endpoint: string): string {
        // Используем тот же базовый URL, что и в baseApi, но без прямого доступа к свойству
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        return `${apiUrl}${endpoint}`;
    }

    /**
     * Подключается к WebSocket серверу
     */
    public async connect(): Promise<void> {
        if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
            return;
        }

        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            // Сначала проверяем и при необходимости обновляем токен
            const token = await this.ensureValidToken();

            if (!token) {
                this.isConnecting = false;
                console.error('Не вдалося отримати дійсний токен для WebSocket');
                return;
            }

            const userData = getUserData();
            const userId = userData?.id;

            let url = `${this.url}?token=${token}`;
            if (userId) {
                url += `&userId=${userId}`;
            }

            this.socket = new WebSocket(url);

            this.socket.onopen = this.handleOpen.bind(this);
            this.socket.onmessage = this.handleMessage.bind(this);
            this.socket.onclose = this.handleClose.bind(this);
            this.socket.onerror = this.handleError.bind(this);
        } catch (error) {
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Закрывает WebSocket соединение
     */
    public disconnect(): void {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.close();
            this.socket = null;
        }

        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Отправляет сообщение через WebSocket
     * @param message - сообщение для отправки
     * @returns boolean - успешность отправки
     */
    public send(message: any): boolean {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    /**
     * Проверяет, активно ли соединение
     * @returns boolean
     */
    public isConnected(): boolean {
        return this.socket?.readyState === WebSocket.OPEN;
    }

    /**
     * Добавляет слушателя для определенного типа сообщений
     * @param type - тип сообщения
     * @param listener - функция-обработчик
     */
    public addMessageListener(type: WebSocketMessageType, listener: WebSocketMessageListener): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }

        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.push(listener);
        }
    }

    /**
     * Удаляет слушателя для определенного типа сообщений
     * @param type - тип сообщения
     * @param listener - функция-обработчик для удаления
     */
    public removeMessageListener(type: WebSocketMessageType, listener: WebSocketMessageListener): void {
        const typeListeners = this.listeners.get(type);
        if (typeListeners) {
            const index = typeListeners.indexOf(listener);
            if (index !== -1) {
                typeListeners.splice(index, 1);
            }
        }
    }

    /**
     * Подписывается на определенный тип сообщений и возвращает функцию для отписки
     * @param type - тип сообщения
     * @param callback - функция-обработчик, которая будет вызываться при получении сообщения
     * @returns функция для отписки
     */
    public subscribe<T = any>(type: WebSocketMessageType, callback: (data: T) => void): () => void {
        const listener = (message: WebSocketMessage) => {
            if (message.data === undefined) return;

            if (Array.isArray(message.data) && message.data.length > 0) {
                message.data.forEach((item: any) => callback(item as T));
            } else if (typeof message.data === 'object' && message.data !== null) {
                if ('data' in message.data && Array.isArray(message.data.data)) {
                    message.data.data.forEach((item: any) => callback(item as T));
                } else {
                    callback(message.data as T);
                }
            } else {
                callback(message.data as T);
            }
        };

        this.addMessageListener(type, listener);
        return () => this.removeMessageListener(type, listener);
    }

    /**
     * Запрашивает данные с датчиков
     */
    public requestSensorData(): void {
        this.send({
            type: 'request_data',
            data: {
                target: 'sensor_data',
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Отправляет тестовое оповещение датчика для проверки системы оповещений
     */
    public sendTestAlert(): void {
        this.send({
            type: 'request_data',
            data: {
                target: 'test_alert',
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Обработчик открытия соединения
     */
    private handleOpen(): void {
        this.isConnecting = false;
        this.resetReconnectAttempts();
        this.startHeartbeat();

        setTimeout(() => this.requestSensorData(), 500);
    }

    /**
     * Обработчик получения сообщения
     * @param event - событие сообщения
     */
    private handleMessage(event: MessageEvent): void {
        try {
            const message = JSON.parse(event.data) as WebSocketMessage;

            // Обработка heartbeat
            if (message.type === 'system' && message.data === 'ping') {
                this.send({
                    type: 'system',
                    data: 'pong',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Вызываем обработчики для данного типа сообщения
            const listeners = this.listeners.get(message.type);
            if (listeners) {
                listeners.forEach(listener => listener(message));
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }

    /**
     * Обработчик закрытия соединения
     */
    private handleClose(event: CloseEvent): void {
        this.isConnecting = false;
        this.socket = null;
        this.stopHeartbeat();

        // Логирование причины закрытия
        let closeReason = '';
        switch (event.code) {
            case 1000:
                closeReason = 'Нормальне закриття';
                break;
            case 1001:
                closeReason = 'Виконання завершено';
                break;
            case 1002:
                closeReason = 'Помилка в протоколі';
                break;
            case 1003:
                closeReason = 'Отримано дані неприйнятного типу';
                break;
            case 1006:
                closeReason = 'З\'єднання неочікувано закрито';
                break;
            case 1007:
                closeReason = 'Дані не відповідають типу повідомлення';
                break;
            case 1008:
                closeReason = 'Порушення політики даних';
                break;
            case 1009:
                closeReason = 'Повідомлення завелике';
                break;
            case 1010:
                closeReason = 'Клієнт очікував на узгодження розширення';
                break;
            case 1011:
                closeReason = 'Сервер зіткнувся з неочікуваною помилкою';
                break;
            case 1015:
                closeReason = 'Помилка TLS';
                break;
            default:
                closeReason = `Невідома причина (код ${event.code})`;
        }


        // Проверяем код и определяем, нужно ли переподключаться
        if (
            event.code === 1000 || // Нормальное закрытие
            event.code === 1001 || // Выполнение завершено
            event.code === 1008    // Нарушение политики (обычно проблемы с аутентификацией)
        ) {
            return;
        }

        // Для неожиданного закрытия подключения пробуем переподключиться
        this.scheduleReconnect();
    }

    /**
     * Обработчик ошибки соединения
     */
    private handleError(): void {
        this.isConnecting = false;
        console.error('WebSocket помилка з\'єднання');

        // Проверяем текущий URL и логируем его для отладки

        // Проверяем, доступен ли сервер
        fetch(this.url.replace('ws:', 'http:').replace('wss:', 'https:').split('?')[0])
            .then(response => {
                if (!response.ok) {
                    console.error(`Сервер недоступний: ${response.status} ${response.statusText}`);
                }
            })
            .catch(error => {
                console.error('Сервер недоступний:', error);
            });

        // Планируем переподключение
        this.scheduleReconnect();
    }

    /**
     * Планирует переподключение
     */
    private scheduleReconnect(): void {
        // Если уже запланировано переподключение, ничего не делаем
        if (this.reconnectTimer !== null) {
            return;
        }

        // Если достигнуто максимальное количество попыток
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.warn(`Досягнуто максимальну кількість спроб переподключення (${this.maxReconnectAttempts})`);

            // Пробуем альтернативный URL
            if (this.reconnectAttempts === this.maxReconnectAttempts) {
                const originalUrl = this.getUrl();
                const alternativeUrl = originalUrl.includes('/api/ws') ?
                    originalUrl.replace('/api/ws', '/ws') :
                    originalUrl.replace('/ws', '/api/ws');

                this.setUrl(alternativeUrl);
                this.resetReconnectAttempts();
                this.reconnectTimer = window.setTimeout(() => {
                    this.reconnectTimer = null;
                    this.connect();
                }, this.reconnectDelay);
                return;
            }
            return;
        }

        // Увеличиваем счетчик попыток и задержку
        this.reconnectAttempts++;
        this.reconnectDelay = Math.min(30000, this.reconnectDelay * 1.5);  // Не более 30 секунд

        // Планируем переподключение
        this.reconnectTimer = window.setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * Запускает периодическую отправку heartbeat-сообщений
     */
    private startHeartbeat(): void {
        this.stopHeartbeat();

        this.heartbeatInterval = window.setInterval(() => {
            if (this.isConnected()) {
                this.send({
                    type: 'system',
                    data: 'ping',
                    timestamp: new Date().toISOString()
                });
            } else {
                this.stopHeartbeat();
            }
        }, 30000);
    }

    /**
     * Останавливает отправку heartbeat-сообщений
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Возвращает текущий URL WebSocket соединения
     */
    public getUrl(): string {
        return this.url;
    }

    /**
     * Устанавливает новый URL для WebSocket соединения
     * @param newUrl Новый URL для подключения
     */
    public setUrl(newUrl: string): void {
        this.url = newUrl;
    }

    /**
     * Преобразует числовое состояние WebSocket в строковое описание
     */
    private getSocketStateDescription(state: number): string {
        switch (state) {
            case WebSocket.CONNECTING:
                return 'CONNECTING (0) - підключення встановлюється';
            case WebSocket.OPEN:
                return 'OPEN (1) - підключення встановлено';
            case WebSocket.CLOSING:
                return 'CLOSING (2) - підключення закривається';
            case WebSocket.CLOSED:
                return 'CLOSED (3) - підключення закрито';
            default:
                return 'НЕВІДОМИЙ стан';
        }
    }
}

// Создаем экземпляр сервиса с URL из конфигурации
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
const websocketService = new WebSocketService(WS_URL);

/**
 * Инициализирует WebSocket подключение с обновлением токена
 * и добавляет обработчик оповещений датчиков
 */
export const initializeWebSocketConnection = async () => {
    try {
        // Обновляем токен перед подключением
        await websocketService.ensureValidToken();

        // Подключаемся к WebSocket
        await websocketService.connect();

        // Если подключение успешно, подписываемся на оповещения от датчиков
        if (websocketService.isConnected()) {
            websocketService.subscribe('sensor_alert', handleSensorAlert);

            // Запускаем периодическое обновление токена
            startTokenRefreshInterval();

            return true;
        } else {
            // Пробуем подключиться к альтернативному URL
            const originalUrl = websocketService.getUrl();
            const alternativeUrl = originalUrl.includes('/api/ws') ?
                originalUrl.replace('/api/ws', '/ws') :
                originalUrl.replace('/ws', '/api/ws');

            websocketService.setUrl(alternativeUrl);
            await websocketService.connect();

            if (websocketService.isConnected()) {
                websocketService.subscribe('sensor_alert', handleSensorAlert);
                startTokenRefreshInterval();
                return true;
            }

            // Возвращаем изначальный URL
            websocketService.setUrl(originalUrl);
            return false;
        }
    } catch (error) {
        console.error('Помилка ініціалізації WebSocket:', error);
        return false;
    }
};

/**
 * Обработчик оповещений от датчиков
 * @param alertData - данные оповещения
 */
const handleSensorAlert = (alertData: any) => {
    if (!alertData) return;

    // Формируем заголовок оповещения
    let title = 'Попередження датчика';
    let type: 'info' | 'warning' | 'critical' = 'warning';

    // Получаем понятное название типа датчика
    const sensorType = SENSOR_TYPE_UA[alertData.type] || alertData.type;

    // Определяем тип оповещения и заголовок
    if (alertData.alert_type === 'high') {
        title = `Високе значення датчика ${sensorType}`;
        type = 'critical';
    } else if (alertData.alert_type === 'low') {
        title = `Низьке значення датчика ${sensorType}`;
        type = 'warning';
    }

    // Формируем короткое сообщение, если полное сообщение слишком длинное
    let message = alertData.message;
    if (!message) {
        // Если сообщение не указано, генерируем его на основе данных
        const value = alertData.value.toFixed(1);
        const unit = alertData.unit;

        if (alertData.alert_type === 'high') {
            message = `Значення датчика ${sensorType} (${value} ${unit}) перевищило верхній поріг`;
        } else if (alertData.alert_type === 'low') {
            message = `Значення датчика ${sensorType} (${value} ${unit}) нижче мінімального порогу`;
        }
    }

    // Создаем оповещение
    addAlert({
        title: title,
        message: message,
        type: type,
        sensorId: alertData.sensor_id,
        locationId: alertData.location_id
    });
};

/**
 * Запускает периодическое обновление токена
 */
const startTokenRefreshInterval = () => {
    // Обновляем токен каждую минуту
    const intervalId = setInterval(async () => {
        if (isAuthenticated()) {
            try {
                await websocketService.ensureValidToken();
            } catch (error) {
                console.error('Помилка оновлення токена:', error);
                clearInterval(intervalId);
            }
        } else {
            clearInterval(intervalId);
        }
    }, 60000); // 1 минута

    // Очищаем интервал при переходе страницы в фоновый режим
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            clearInterval(intervalId);
        } else if (document.visibilityState === 'visible' && isAuthenticated()) {
            startTokenRefreshInterval();
        }
    });
};

export default websocketService;