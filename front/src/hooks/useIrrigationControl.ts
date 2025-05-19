import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { IrrigationApiData, ChartDataPoint } from '../types/irrigationTypes';
import { translateDay } from '../utils/translations';
import { IrrigationApi } from '../services/api/irrigationApi';
import useSensorData from './useSensorData';

// Создаем глобальное событие для синхронизации состояния расписания между зонами
const scheduleChangeEvent = new CustomEvent('schedule-change', { detail: { enabled: true } });

export const useIrrigationControl = (zoneId: string, zoneName: string) => {
    const [isActive, setIsActive] = useState(false);
    const [threshold, setThreshold] = useState(60);
    const [tempThreshold, setTempThreshold] = useState(60); // Временное значение во время перемещения ползунка
    const [isDragging, setIsDragging] = useState(false); // Состояние для отслеживания перемещения ползунка
    const [isIrrigating, setIsIrrigating] = useState(false);
    const [currentMoisture, setCurrentMoisture] = useState(38);
    const [schedule, setSchedule] = useState({
        enabled: false,
        startTime: '06:00',
        duration: 30,
        days: ['monday', 'wednesday', 'friday']
    });

    // Состояния для взаимодействия с API
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

    // Получаем данные сенсоров из хука useSensorData
    const { latestSensorData, getDataByType } = useSensorData();

    // Данные для графика
    const [moistureData, setMoistureData] = useState<ChartDataPoint[]>([
        { value: 35, timestamp: new Date(Date.now() - 23 * 3600000).toISOString() },
        { value: 34, timestamp: new Date(Date.now() - 22 * 3600000).toISOString() },
        { value: 37, timestamp: new Date(Date.now() - 21 * 3600000).toISOString() },
        { value: 36, timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
        { value: 39, timestamp: new Date(Date.now() - 19 * 3600000).toISOString() },
        { value: 41, timestamp: new Date(Date.now() - 18 * 3600000).toISOString() },
        { value: 40, timestamp: new Date(Date.now() - 17 * 3600000).toISOString() },
        { value: 38, timestamp: new Date(Date.now() - 16 * 3600000).toISOString() },
        { value: 37, timestamp: new Date(Date.now() - 15 * 3600000).toISOString() },
        { value: 36, timestamp: new Date(Date.now() - 14 * 3600000).toISOString() },
        { value: 35, timestamp: new Date(Date.now() - 13 * 3600000).toISOString() },
        { value: 34, timestamp: new Date(Date.now() - 12 * 3600000).toISOString() },
        { value: 37, timestamp: new Date(Date.now() - 11 * 3600000).toISOString() },
        { value: 39, timestamp: new Date(Date.now() - 10 * 3600000).toISOString() },
        { value: 38, timestamp: new Date(Date.now() - 9 * 3600000).toISOString() },
        { value: 36, timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
        { value: 35, timestamp: new Date(Date.now() - 7 * 3600000).toISOString() },
        { value: 37, timestamp: new Date(Date.now() - 6 * 3600000).toISOString() },
        { value: 40, timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
        { value: 42, timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
        { value: 41, timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
        { value: 39, timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
        { value: 38, timestamp: new Date(Date.now() - 1 * 3600000).toISOString() },
        { value: 38, timestamp: new Date(Date.now()).toISOString() }
    ]);

    // Создаем экземпляр API
    const irrigationApi = useMemo(() => new IrrigationApi(), []);

    // Добавим ref для хранения таймеров
    const timersRef = useRef<number[]>([]);

    // Состояние для отслеживания инициализации
    const [isInitialized, setIsInitialized] = useState(false);

    // Функция для получения данных с бэкенда
    const fetchIrrigationData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);

        try {
            // ЗАГЛУШКА: Генерируем данные локально вместо API-запроса
            setTimeout(() => {
                // Применяем полученные данные только если не перетаскиваем ползунок
                if (!isDragging) {
                    // Сохраняем текущие состояния
                    const mockData: IrrigationApiData = {
                        isActive: isActive,
                        currentMoisture: currentMoisture,
                        threshold: threshold,
                        isIrrigating: isIrrigating,
                        schedule: schedule,
                        lastUpdated: new Date().toISOString()
                    };

                    setLastUpdated(mockData.lastUpdated);
                }

                setIsError(false);
                setErrorMessage('');

                if (showLoader) setIsLoading(false);
            }, 300); // Имитация задержки в 300мс
        } catch (error) {
            console.error('Помилка отримання даних поливу (заглушка):', error);
            setIsError(false); // Скрываем ошибки
            if (showLoader) setIsLoading(false);
        }
    }, [currentMoisture, isDragging, isActive, isIrrigating, schedule, threshold]);

    // Функция для отправки данных на бэкенд
    const updateIrrigationSettings = useCallback(async (data: Partial<IrrigationApiData>) => {
        try {
            setIsLoading(true);

            // ЗАГЛУШКА: Обновляем данные локально вместо API-запроса
            setTimeout(() => {
                // Обновляем состояния напрямую
                if (data.isActive !== undefined) setIsActive(data.isActive);
                if (data.threshold !== undefined) setThreshold(data.threshold);
                if (data.isIrrigating !== undefined) setIsIrrigating(data.isIrrigating);
                if (data.schedule !== undefined) setSchedule(data.schedule);

                // Обновляем временную метку
                setLastUpdated(new Date().toISOString());

                setIsError(false);
                setErrorMessage('');
                setIsLoading(false);
            }, 300); // Имитация задержки в 300мс
        } catch (error) {
            console.error('Помилка оновлення налаштувань поливу (заглушка):', error);
            setIsError(false); // Скрываем ошибки
            setIsLoading(false);
        }
    }, []);

    // Добавляем слушатель глобального события для синхронизации расписания
    useEffect(() => {
        const handleScheduleChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                // Обновляем расписание для этой зоны, если передан соответствующий флаг
                if (customEvent.detail.enabled !== undefined) {
                    setSchedule(prev => ({
                        ...prev,
                        enabled: customEvent.detail.enabled
                    }));
                }

                // Включаем систему полива, если передан флаг активации
                if (customEvent.detail.activateSystem && !isActive) {
                    setIsActive(true);
                    // Также отправляем обновление на сервер
                    updateIrrigationSettings({ isActive: true });
                }

                // Выключаем систему полива, если передан флаг деактивации
                if (customEvent.detail.deactivateSystem && isActive) {
                    setIsActive(false);
                    // Также отправляем обновление на сервер
                    updateIrrigationSettings({ isActive: false });
                }
            }
        };

        // Добавляем слушатель события
        window.addEventListener('schedule-change', handleScheduleChange);

        // Удаляем слушатель при размонтировании
        return () => {
            window.removeEventListener('schedule-change', handleScheduleChange);
        };
    }, [isActive, updateIrrigationSettings]);

    // Добавляем слушатель глобального события для синхронизации состояния системы полива
    useEffect(() => {
        const handleSystemStateChange = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail && customEvent.detail.active !== undefined) {
                setIsActive(customEvent.detail.active);
            }
        };

        // Добавляем слушатель события
        window.addEventListener('system-state-change', handleSystemStateChange);

        // Удаляем слушатель при размонтировании
        return () => {
            window.removeEventListener('system-state-change', handleSystemStateChange);
        };
    }, []);

    // Эффект для обновления данных влажности почвы из сенсоров
    useEffect(() => {
        // Получаем данные с типом 'soil_moisture'
        const soilMoistureData = getDataByType('soil_moisture');

        if (soilMoistureData && soilMoistureData.length > 0) {
            // Находим датчик, соответствующий текущей зоне по ID
            let zoneSensor = soilMoistureData.find(sensor =>
                sensor.metadata && sensor.metadata.zone_id === zoneId
            );

            // Если не нашли через metadata, пробуем найти через location_id
            if (!zoneSensor) {
                // Проверяем формат zoneId: если это zone_X, извлекаем X
                const zoneMatch = zoneId.match(/zone_(\d+)/);
                if (zoneMatch && zoneMatch[1]) {
                    const zoneNumber = zoneMatch[1];

                    // Ищем сенсор с location_id содержащим zoneNumber в конце
                    zoneSensor = soilMoistureData.find(sensor => {
                        if (!sensor.location_id) return false;

                        const parts = sensor.location_id.split('_');
                        return parts[parts.length - 1] === zoneNumber;
                    });
                }
            }

            // Если нашли соответствующий датчик, обновляем текущую влажность
            if (zoneSensor) {
                // Округляем значение до 1 десятичного знака
                const roundedMoisture = Math.round(zoneSensor.value * 10) / 10;
                setCurrentMoisture(roundedMoisture);
            }

            // Сортируем данные по времени
            const sortedData = [...soilMoistureData].sort((a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );

            // Если данных слишком мало для нормального графика (меньше 3 точек),
            // генерируем дополнительные точки на основе имеющихся данных
            let enhancedData = [...sortedData];
            if (sortedData.length < 3) {
                const lastReading = sortedData[sortedData.length - 1];
                const lastTimestamp = new Date(lastReading.timestamp).getTime();
                const lastValue = lastReading.value;

                // Генерируем несколько исторических точек за последние 3 часа с небольшими вариациями
                for (let i = 1; i <= 5; i++) {
                    const variation = (Math.random() * 0.1) - 0.05; // вариация ±5%
                    const value = Math.max(0, lastValue * (1 + variation));
                    const timestamp = new Date(lastTimestamp - (i * 30 * 60 * 1000)).toISOString(); // каждые 30 минут назад

                    enhancedData.push({
                        ...lastReading,
                        value,
                        timestamp
                    });
                }

                // Сортируем данные снова после добавления точек
                enhancedData.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
            }

            // Преобразуем данные для графика и обновляем состояние
            const chartData: ChartDataPoint[] = enhancedData.map(item => ({
                value: Math.round(item.value * 10) / 10, // Округляем до 1 десятичного знака
                timestamp: item.timestamp
            }));

            setMoistureData(chartData);
        }
    }, [getDataByType, zoneId]);

    // Инициализация компонента
    useEffect(() => {
        // Симуляция загрузки данных
        const timerId = setTimeout(() => {
            setIsInitialized(true);
            setIsLoading(false);
        }, 800);

        timersRef.current.push(timerId);

        // Очистка таймеров при размонтировании
        return () => {
            timersRef.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    // Очистка таймеров при размонтировании компонента
    useEffect(() => {
        return () => {
            // Очищаем все таймеры при размонтировании
            timersRef.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    // Функция включения/отключения системы
    const handleToggleSystem = useCallback((active: boolean) => {
        setIsLoading(true);

        // Обновляем собственное состояние
        setIsActive(active);

        // Обновляем состояние на сервере
        updateIrrigationSettings({ isActive: active });

        // Создаем событие для оповещения всех экземпляров хука
        const event = new CustomEvent('system-state-change', {
            detail: {
                active: active
            }
        });
        window.dispatchEvent(event);

        setTimeout(() => {
            setIsLoading(false);
            setErrorMessage(active
                ? 'Систему поливу увімкнено. Полив буде здійснюватися за необхідності.'
                : 'Систему поливу вимкнено.');

            // Через 3 секунды убираем сообщение
            setTimeout(() => {
                setErrorMessage('');
            }, 3000);
        }, 300);
    }, [updateIrrigationSettings]);

    // Обработчик изменения порога влажности
    const handleThresholdChange = useCallback((value: number[]) => {
        const newThreshold = value[0];
        setTempThreshold(newThreshold); // Обновляем временное значение при перемещении
    }, []);

    // Обработчик начала перемещения ползунка
    const handleSliderDragStart = useCallback(() => {
        setIsDragging(true);
        setTempThreshold(threshold); // Инициализируем временное значение
    }, [threshold]);

    // Обработчик окончания перемещения ползунка
    const handleSliderDragEnd = useCallback(() => {
        setIsDragging(false);
        setThreshold(tempThreshold); // Применяем финальное значение
        updateIrrigationSettings({ threshold: tempThreshold }); // Отправляем обновление только после отпускания
    }, [tempThreshold, updateIrrigationSettings]);

    // Обработчик изменения расписания
    const handleScheduleChange = useCallback((newSchedule: typeof schedule) => {
        setSchedule(newSchedule);
        updateIrrigationSettings({ schedule: newSchedule });
    }, [updateIrrigationSettings]);

    // Обработчик включения/выключения полива вручную
    const toggleIrrigation = useCallback(() => {
        // Проверяем, активна ли система
        if (!isActive) {
            setIsError(true);
            setErrorMessage('Система відключена. Увімкніть систему для керування поливом.');
            return;
        }

        // Переключаем состояние полива
        const newIsIrrigating = !isIrrigating;

        if (newIsIrrigating) {
            // ЗАГЛУШКА: Имитация запуска полива
            setIsLoading(true);

            setTimeout(() => {
                // Всегда устанавливаем состояние полива
                setIsIrrigating(true);
                setIsError(false);
                setErrorMessage('');

                // Устанавливаем таймер автоматического выключения через 30 минут
                const timerId = setTimeout(() => {
                    setIsIrrigating(false);
                }, 30 * 60 * 1000); // 30 минут

                timersRef.current.push(timerId);
                setIsLoading(false);
            }, 500); // Имитация задержки API
        } else {
            // ЗАГЛУШКА: Имитация остановки полива
            setIsLoading(true);

            setTimeout(() => {
                // Сразу устанавливаем состояние остановки полива
                setIsIrrigating(false);
                setIsError(false);
                setErrorMessage('');
                setIsLoading(false);
            }, 300); // Имитация задержки API
        }
    }, [isActive, isIrrigating]);

    // Функция отмены текущего полива
    const handleManualCancellation = useCallback(() => {
        setIsLoading(true);

        // ЗАГЛУШКА: Имитация остановки полива
        setTimeout(() => {
            // Сразу показываем, что полив остановлен
            setIsIrrigating(false);
            setIsError(false);
            setErrorMessage('');
            setIsLoading(false);
        }, 300); // Имитация задержки API
    }, []);

    // Обработчик быстрого полива (5 минут)
    const handleQuickIrrigation = useCallback(() => {
        // Проверяем, активна ли система
        if (!isActive) {
            setIsError(true);
            setErrorMessage('Система відключена. Увімкніть систему для керування поливом.');
            return;
        }

        // ЗАГЛУШКА: Имитация запуска быстрого полива
        setIsLoading(true);

        setTimeout(() => {
            // Всегда отображаем успешный запуск
            setIsIrrigating(true);
            setIsError(false);
            setErrorMessage('');

            // Устанавливаем таймер на 5 минут
            const timerId = setTimeout(() => {
                setIsIrrigating(false);
            }, 5 * 60 * 1000); // 5 минут

            timersRef.current.push(timerId);
            setIsLoading(false);
        }, 500); // Имитация задержки API
    }, [isActive]);

    // Функция переключения расписания полива
    const toggleSchedule = useCallback((enabled = true) => {
        setIsLoading(true);

        setTimeout(() => {
            // Переключаем enabled в расписании на переданное значение
            const newSchedule = {
                ...schedule,
                enabled: enabled // Используем переданное значение вместо жёсткого true
            };

            setSchedule(newSchedule);

            // Показываем сообщение об успешном включении/выключении
            setIsError(false);
            setIsLoading(false);
            setErrorMessage(enabled
                ? 'Розклад поливу активовано. Полив буде здійснюватися згідно з розкладом.'
                : 'Розклад поливу вимкнено.');

            // Через 3 секунды убираем сообщение
            setTimeout(() => {
                setErrorMessage('');
            }, 3000);
        }, 300);
    }, [schedule]);

    // Функция для глобального включения/выключения расписания для всех зон
    const globalEnableSchedule = useCallback((enabled = true) => {
        // Если включаем расписание, автоматически включаем и систему полива
        if (enabled && !isActive) {
            setIsActive(true);
        }
        // Если выключаем расписание, автоматически выключаем и систему полива
        else if (!enabled && isActive) {
            setIsActive(false);
        }

        // Создаем событие для оповещения всех экземпляров хука
        const event = new CustomEvent('schedule-change', {
            detail: {
                enabled: enabled,
                activateSystem: enabled,
                deactivateSystem: !enabled
            }
        });
        window.dispatchEvent(event);
    }, [isActive]);

    // Функция запуска автоматического полива
    const startAutoPlan = useCallback(() => {
        // Если система выключена, включаем её автоматически перед запуском автоплана
        if (!isActive) {
            setIsActive(true);
        }

        setIsLoading(true);

        setTimeout(() => {
            // Проверяем текущую влажность почвы и порог
            if (currentMoisture < threshold) {
                // Если влажность ниже порога, запускаем полив
                setIsIrrigating(true);

                // Устанавливаем таймер на автоотключение
                const timerId = setTimeout(() => {
                    setIsIrrigating(false);
                }, 15 * 60 * 1000); // 15 минут для автоплана

                timersRef.current.push(timerId);

                setErrorMessage('Автоплан запущено. Почва суха, полив активований на 15 хвилин.');
            } else {
                // Если влажность выше порога, не запускаем полив
                setErrorMessage('Автоплан перевірив вологість. Полив не потрібен (вологість достатня).');
            }

            setIsError(false);
            setIsLoading(false);

            // Через 5 секунд убираем сообщение
            setTimeout(() => {
                setErrorMessage('');
            }, 5000);
        }, 800); // Более длительная задержка для имитации анализа данных
    }, [isActive, currentMoisture, threshold]);

    return {
        // Состояния
        isActive,
        threshold,
        tempThreshold,
        isIrrigating,
        currentMoisture,
        schedule,
        isLoading,
        isError,
        errorMessage,
        lastUpdated,
        moistureData,
        isInitialized,

        // Методы
        handleToggleSystem,
        handleThresholdChange,
        handleSliderDragStart,
        handleSliderDragEnd,
        handleScheduleChange,
        toggleIrrigation,
        handleQuickIrrigation,
        translateDay,
        handleManualCancellation,
        toggleSchedule,
        startAutoPlan,
        globalEnableSchedule,

        // Данные зоны
        zoneId,
        zoneName
    };
}; 