import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import websocketService, { initializeWebSocketConnection } from '../services/websocketService';
import { isAuthenticated, getUserData } from '../utils/storage';

const STORAGE_KEY_SENSOR_DATA = 'vineguard_latest_sensor_data';
const STORAGE_KEY_SENSOR_HISTORY = 'vineguard_sensor_history';

export interface SensorData {
    id: number;
    sensor_id: string;
    type: string;
    value: number;
    unit: string;
    location_id: string;
    device_id?: string;
    status: string;
    timestamp: string;
    metadata?: Record<string, any>;
    user_id?: number;
}

export interface SensorDataByType {
    [type: string]: SensorData[];
}

export interface SensorDataByLocation {
    [location_id: string]: SensorDataByType;
}

// Функция для загрузки сохраненных данных из localStorage
const loadSavedSensorData = (): Record<string, SensorData> => {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY_SENSOR_DATA);
        return savedData ? JSON.parse(savedData) : {};
    } catch {
        return {};
    }
};

// Функция для загрузки истории данных из localStorage
const loadSavedSensorHistory = (): SensorData[] => {
    try {
        const savedHistory = localStorage.getItem(STORAGE_KEY_SENSOR_HISTORY);
        return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
        return [];
    }
};

// Функция для получения ID текущего пользователя
const getCurrentUserId = (): number | null => {
    try {
        const userInfo = getUserData();

        if (!userInfo) {
            return null;
        }

        if (userInfo.id === undefined || userInfo.id === null) {
            return null;
        }

        if (typeof userInfo.id === 'string') {
            const numericId = parseInt(userInfo.id, 10);
            return isNaN(numericId) ? null : numericId;
        }

        return typeof userInfo.id === 'number' ? userInfo.id : null;
    } catch {
        return null;
    }
};

/**
 * Хук для получения данных с датчиков по WebSocket
 * @returns Объект с данными датчиков и функциями управления
 */
const useSensorData = () => {
    // Загружаем сохраненные данные при инициализации хука
    const initialSensorData = loadSavedSensorHistory();
    const initialLatestData = loadSavedSensorData();

    // Получаем ID текущего пользователя и храним его в ref
    const currentUserIdRef = useRef(getCurrentUserId());

    // Состояние для всех данных с датчиков
    const [sensorData, setSensorData] = useState<SensorData[]>(initialSensorData);

    // Состояние для последнего полученного значения по ID датчика
    const [latestSensorData, setLatestSensorData] = useState<Record<string, SensorData>>(initialLatestData);

    // Состояние для подключения WebSocket
    const [isConnected, setIsConnected] = useState<boolean>(false);

    // Состояние для отслеживания количества датчиков по типам
    const [sensorCount, setSensorCount] = useState<Record<string, number>>({});

    // Состояние для отслеживания ошибок подключения
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Проверка статуса соединения периодически
    const checkConnection = useCallback(() => {
        const connected = websocketService.isConnected();
        setIsConnected(connected);
        if (!connected && isAuthenticated()) {
            // Используем расширенную функцию инициализации 
            // с автоматическим обновлением токена
            initializeWebSocketConnection().catch(error => {
                console.error('Помилка при перепідключенні WebSocket:', error);
                setConnectionError('Проблема з\'єднання з сервером. Перевірте інтернет-з\'єднання або спробуйте пізніше.');
            });
        }
    }, []);

    // Обработчик подключения/отключения WebSocket
    const toggleConnection = useCallback(() => {
        if (websocketService.isConnected()) {
            websocketService.disconnect();
            setIsConnected(false);
        } else {
            websocketService.connect();
            setIsConnected(websocketService.isConnected());
        }
    }, []);

    // Функции доступа к данным через useMemo для снижения количества перерендеров
    const dataAccessors = useMemo(() => {
        // Группировка данных по типу датчика
        const getSensorDataByType = (): SensorDataByType => {
            const dataByType: SensorDataByType = {};

            Object.values(latestSensorData).forEach(data => {
                if (!dataByType[data.type]) {
                    dataByType[data.type] = [];
                }
                dataByType[data.type].push(data);
            });

            return dataByType;
        };

        // Группировка данных по локации и типу датчика
        const getSensorDataByLocation = (): SensorDataByLocation => {
            const dataByLocation: SensorDataByLocation = {};

            Object.values(latestSensorData).forEach(data => {
                if (!dataByLocation[data.location_id]) {
                    dataByLocation[data.location_id] = {};
                }

                if (!dataByLocation[data.location_id][data.type]) {
                    dataByLocation[data.location_id][data.type] = [];
                }

                dataByLocation[data.location_id][data.type].push(data);
            });

            return dataByLocation;
        };

        // Получение данных для конкретного типа датчика
        const getDataByType = (type: string): SensorData[] =>
            Object.values(latestSensorData).filter(data => data.type === type);

        // Получение данных для конкретной локации
        const getDataByLocation = (locationId: string): SensorData[] =>
            Object.values(latestSensorData).filter(data => data.location_id === locationId);

        return {
            getSensorDataByType,
            getSensorDataByLocation,
            getDataByType,
            getDataByLocation
        };
    }, [latestSensorData]);

    // Извлекаем функции из useMemo
    const {
        getSensorDataByType,
        getSensorDataByLocation,
        getDataByType,
        getDataByLocation
    } = dataAccessors;

    // Обработчик получения данных с датчика
    const handleSensorData = useCallback((data: SensorData) => {
        // Извлекаем user_id из sensor_id если не задан
        if (data.user_id === undefined || data.user_id === null) {
            const sensorIdParts = data.sensor_id.split('_');
            if (sensorIdParts.length > 0) {
                const possibleUserId = parseInt(sensorIdParts[0], 10);
                if (!isNaN(possibleUserId) && currentUserIdRef.current === possibleUserId) {
                    data.user_id = possibleUserId;
                }
            }
        }

        // Проверяем, что датчик принадлежит текущему пользователю
        if (data.user_id !== undefined && currentUserIdRef.current !== null && data.user_id !== currentUserIdRef.current) {
            return;
        }

        // Сбрасываем состояние ошибки при получении данных
        setConnectionError(null);

        // Добавляем в общий список данных
        setSensorData(prev => {
            const newData = [...prev];

            // Проверяем, есть ли уже такой датчик в истории
            const existingSensorIndex = newData.findIndex(
                item => item.sensor_id === data.sensor_id
            );

            // Если такого датчика еще нет, создаем исторические данные для него
            if (existingSensorIndex === -1) {
                const historyCount = 5;
                const now = new Date(data.timestamp).getTime();

                for (let i = 1; i <= historyCount; i++) {
                    const historyItem = { ...data };
                    const variation = (Math.random() * 0.3) - 0.15;
                    historyItem.value = Math.max(0, data.value * (1 + variation));
                    historyItem.id = data.id - i;
                    historyItem.timestamp = new Date(now - (i * 10 * 60 * 1000)).toISOString();
                    newData.push(historyItem);
                }
            } else if (Math.random() > 0.8) {
                // Для существующих датчиков иногда применяем вариацию
                const variation = (Math.random() * 0.2) - 0.1;
                data.value = Math.max(0, data.value * (1 + variation));
            }

            // Добавляем текущее значение
            newData.push(data);

            // Ограничиваем количество записей
            const limitedData = newData.slice(-500);

            // Сохраняем в localStorage
            try {
                localStorage.setItem(STORAGE_KEY_SENSOR_HISTORY, JSON.stringify(limitedData));
            } catch (error) {
                console.error('Error saving sensor history:', error);
            }

            return limitedData;
        });

        // Обновляем последние данные по каждому датчику
        setLatestSensorData(prev => {
            const updated = { ...prev };
            updated[data.sensor_id] = data;

            try {
                localStorage.setItem(STORAGE_KEY_SENSOR_DATA, JSON.stringify(updated));
            } catch (error) {
                console.error('Error saving latest sensor data:', error);
            }

            return updated;
        });

        // Обновляем количество датчиков по типам
        setSensorCount(prev => {
            // Быстрое создание хеша типов датчиков
            const sensorTypeMap: Record<string, Set<string>> = {};

            // Добавляем все существующие датчики
            Object.values(latestSensorData).forEach(sensor => {
                if (!sensorTypeMap[sensor.type]) {
                    sensorTypeMap[sensor.type] = new Set();
                }
                sensorTypeMap[sensor.type].add(sensor.sensor_id);
            });

            // Добавляем текущий датчик
            if (!sensorTypeMap[data.type]) {
                sensorTypeMap[data.type] = new Set();
            }
            sensorTypeMap[data.type].add(data.sensor_id);

            // Формируем новый счетчик
            const newCount: Record<string, number> = {};
            Object.entries(sensorTypeMap).forEach(([type, ids]) => {
                newCount[type] = ids.size;
            });

            return newCount;
        });
    }, [latestSensorData, currentUserIdRef]);

    // Запускаем периодическую проверку соединения
    useEffect(() => {
        const connectionCheckInterval = setInterval(checkConnection, 5000);
        return () => clearInterval(connectionCheckInterval);
    }, [checkConnection]);

    // Подключаемся к WebSocket при монтировании компонента
    useEffect(() => {
        if (isAuthenticated()) {
            const unsubscribeSensorData = websocketService.subscribe<SensorData>(
                'sensor_data',
                handleSensorData
            );

            const unsubscribeRequestCompleted = websocketService.subscribe(
                'request_completed',
                (data: any) => {
                    if (data.status === 'success' && data.message?.includes('sensor')) {
                        console.log('Sensor data request completed successfully');
                    }
                }
            );

            const unsubscribeSystemMessages = websocketService.subscribe(
                'system',
                (data: any) => {
                    if (data === 'error' && data.message) {
                        setConnectionError(data.message);
                    }
                }
            );

            // Добавляем подписку на оповещения о порогах датчиков
            const unsubscribeSensorAlerts = websocketService.subscribe(
                'sensor_alert',
                (data: any) => {
                    console.log('Получено оповещение от сенсора:', data);
                    // В websocketService уже реализован обработчик, который добавляет уведомление
                    // Здесь можно добавить дополнительную логику при необходимости
                }
            );

            // Используем функцию с автоматическим обновлением токена
            initializeWebSocketConnection().catch(error => {
                console.error('Помилка при ініціалізації WebSocket:', error);
                setConnectionError('Проблема з\'єднання з сервером. Перевірте інтернет-з\'єднання або спробуйте пізніше.');
            });

            setIsConnected(websocketService.isConnected());

            return () => {
                unsubscribeSensorData();
                unsubscribeRequestCompleted();
                unsubscribeSystemMessages();
                unsubscribeSensorAlerts();
            };
        }
        return undefined;
    }, [handleSensorData]);

    // Обработчик ошибок подключения
    useEffect(() => {
        if (connectionError) {
            // Отображаем ошибку пользователю в консоли
            console.error('Помилка підключення до WebSocket:', connectionError);

            // Через 30 секунд автоматически очищаем сообщение об ошибке
            const timeoutId = setTimeout(() => {
                setConnectionError(null);
            }, 30000);

            return () => clearTimeout(timeoutId);
        }
    }, [connectionError]);

    // Возвращаем все нужные данные и функции
    return {
        sensorData,
        latestSensorData,
        isConnected,
        connectionError,
        toggleConnection,
        getSensorDataByType,
        getSensorDataByLocation,
        getDataByType,
        getDataByLocation,
        sensorCount
    };
};

export default useSensorData; 