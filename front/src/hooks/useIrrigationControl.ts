import { useState, useEffect, useRef, useCallback } from 'react';
import { IrrigationApiData, ChartDataPoint } from '../types/irrigationTypes';
import { translateDay } from '../utils/translations';

export const useIrrigationControl = (zoneId: string, zoneName: string) => {
    const [isActive, setIsActive] = useState(true);
    const [threshold, setThreshold] = useState(40);
    const [tempThreshold, setTempThreshold] = useState(40); // Временное значение во время перемещения ползунка
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

    // Статические данные для графика
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

    // Добавим ref для хранения таймеров
    const timersRef = useRef<number[]>([]);

    // Состояние для отслеживания инициализации
    const [isInitialized, setIsInitialized] = useState(false);

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

    // Функция-заглушка для получения данных с бэкенда
    const fetchIrrigationData = useCallback(async (showLoader = true) => {
        if (showLoader) setIsLoading(true);

        try {
            // Здесь будет реальный запрос к API
            // Симулируем получение статических данных
            const mockData: IrrigationApiData = {
                isActive: isActive,
                currentMoisture: currentMoisture,
                threshold: threshold,
                isIrrigating: isIrrigating,
                schedule: schedule,
                lastUpdated: new Date().toISOString()
            };

            // Применяем полученные данные только если не перетаскиваем ползунок
            if (!isDragging) {
                setIsActive(mockData.isActive);
                setCurrentMoisture(mockData.currentMoisture);
                setThreshold(mockData.threshold);
                setTempThreshold(mockData.threshold);
                setIsIrrigating(mockData.isIrrigating);
                setSchedule(mockData.schedule);
                setLastUpdated(mockData.lastUpdated);
            }

            setIsError(false);
            setErrorMessage('');
        } catch (error) {
            console.error('Помилка отримання даних поливу:', error);
            setIsError(true);
            setErrorMessage('Не вдалося отримати дані');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [currentMoisture, isDragging, isActive, isIrrigating, schedule, threshold]);

    // Функция-заглушка для отправки данных на бэкенд
    const updateIrrigationSettings = useCallback(async (data: Partial<IrrigationApiData>) => {
        try {
            setIsLoading(true);

            // Здесь будет реальный запрос к API
            // Применяем изменения локально
            if (data.isActive !== undefined) setIsActive(data.isActive);
            if (data.currentMoisture !== undefined) setCurrentMoisture(data.currentMoisture);
            if (data.threshold !== undefined) setThreshold(data.threshold);
            if (data.isIrrigating !== undefined) setIsIrrigating(data.isIrrigating);
            if (data.schedule !== undefined) setSchedule(data.schedule);

            // Обновляем временную метку
            const newTimestamp = new Date().toISOString();
            setLastUpdated(newTimestamp);

            setIsError(false);
            setErrorMessage('');
        } catch (error) {
            console.error('Помилка оновлення налаштувань поливу:', error);
            setIsError(true);
            setErrorMessage('Не вдалося оновити налаштування');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Обработчик включения/выключения системы полива
    const handleToggleSystem = useCallback((active: boolean) => {
        setIsActive(active);
        updateIrrigationSettings({ isActive: active });
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
        setIsIrrigating(newIsIrrigating);
        updateIrrigationSettings({ isIrrigating: newIsIrrigating });

        // Если включаем полив, устанавливаем таймер автоматического выключения через 30 минут
        if (newIsIrrigating) {
            const timerId = setTimeout(() => {
                setIsIrrigating(false);
                updateIrrigationSettings({ isIrrigating: false });
            }, 30 * 60 * 1000); // 30 минут

            timersRef.current.push(timerId);
        }
    }, [isActive, isIrrigating, updateIrrigationSettings]);

    // Обработчик быстрого полива (5 минут)
    const handleQuickIrrigation = useCallback(() => {
        // Проверяем, активна ли система
        if (!isActive) {
            setIsError(true);
            setErrorMessage('Система відключена. Увімкніть систему для керування поливом.');
            return;
        }

        // Включаем полив
        setIsIrrigating(true);
        updateIrrigationSettings({ isIrrigating: true });

        // Устанавливаем таймер на 5 минут
        const timerId = setTimeout(() => {
            setIsIrrigating(false);
            updateIrrigationSettings({ isIrrigating: false });
        }, 5 * 60 * 1000); // 5 минут

        timersRef.current.push(timerId);
    }, [isActive, updateIrrigationSettings]);

    // Функция отмены текущего полива
    const handleManualCancellation = useCallback(() => {
        setIsIrrigating(false);
        updateIrrigationSettings({ isIrrigating: false });
    }, [updateIrrigationSettings]);

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

        // Данные зоны
        zoneId,
        zoneName
    };
}; 