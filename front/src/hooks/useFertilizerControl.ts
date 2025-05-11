import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FertilizerApiData, NutrientLevel, ScheduledApplication, ChartDataPoint } from '../types/fertilizerTypes';

export const useFertilizerControl = () => {
    // Функция для форматирования даты в формат YYYY-MM-DD для input
    const formatDateForInput = (date: Date | null): string => {
        if (!date) return '';
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    // Функция для форматирования даты в понятный пользователю формат DD.MM.YYYY
    const formatDateForDisplay = (date: Date | null): string => {
        if (!date) return '';
        return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    };

    // Форматирование выбранной даты для модального окна
    const formatSelectedDate = (date: Date): string => {
        try {
            // Создаем вспомогательные даты с тем же годом, что используется в приложении
            const testYear = 2025;
            const today = new Date();

            // Создаем тестовую дату "сегодня" с годом 2025, устанавливая время в 00:00:00
            const testToday = new Date(testYear, today.getMonth(), today.getDate(), 0, 0, 0);

            // Клонируем входную дату и установим год 2025, если текущий год не 2025
            // При этом сбрасываем время до 00:00:00
            const checkDate = new Date(
                date.getFullYear() !== testYear ? testYear : date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                0, 0, 0
            );

            // Проверяем, сегодня ли это
            if (checkDate.getDate() === testToday.getDate() &&
                checkDate.getMonth() === testToday.getMonth()) {
                return 'Сьогодні';
            }

            // Вычисляем разницу для будущих дат
            if (checkDate > testToday) {
                // Вычисляем разницу в миллисекундах
                const diffTime = checkDate.getTime() - testToday.getTime();
                // Конвертируем миллисекунды в дни (1000мс * 60с * 60м * 24ч)
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    return 'Завтра';
                }

                return `Через ${diffDays} дн${diffDays === 1 ? 'і' : 'ів'}`;
            }

            // Для прошедших дат
            if (checkDate < testToday) {
                const diffTime = testToday.getTime() - checkDate.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    return 'Вчора';
                }

                if (diffDays <= 30) {
                    return `${diffDays} дн${diffDays === 1 ? 'і' : 'ів'} тому`;
                }
            }

            // Для других дат используем стандартный формат
            return `${date.getDate()} ${date.toLocaleString('uk-UA', { month: 'long' })}`;
        } catch (error) {
            console.error('Помилка при форматуванні вибраної дати:', error);
            return date.toLocaleDateString('uk-UA');
        }
    };

    // Форматирование даты из строки в понятный формат
    const formatDate = (dateString: string): string => {
        if (!dateString || !dateString.trim()) {
            return '';
        }

        try {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return 'Неправильна дата';
            }

            return formatSelectedDate(date);
        } catch (error) {
            console.error('Помилка при форматуванні дати зі строки:', error);
            return dateString;
        }
    };

    // Основные состояния
    const [isActive, setIsActive] = useState(true);
    const [autoMode, setAutoMode] = useState(false);
    const [lastApplication, setLastApplication] = useState('3 дні тому');
    const [nextScheduled, setNextScheduled] = useState('25 березня');
    const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());
    const [fertilizerName, setFertilizerName] = useState<string>('NPK Суміш 20-10-10');

    // Состояния питательных веществ и расчетов
    const [nutrients, setNutrients] = useState<NutrientLevel[]>([
        { name: 'Азот (N)', current: 150, target: 200, unit: 'ppm', color: '#3B82F6' },
        { name: 'Фосфор (P)', current: 45, target: 50, unit: 'ppm', color: '#10B981' },
        { name: 'Калій (K)', current: 180, target: 200, unit: 'ppm', color: '#F59E0B' }
    ]);
    const [fieldSize, setFieldSize] = useState(5);
    const [applicationRate, setApplicationRate] = useState(25);

    // Состояния для API и UI
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    const timersRef = useRef<number[]>([]);

    // Исторические данные (статические)
    const [nitrogenHistory, setNitrogenHistory] = useState<ChartDataPoint[]>([
        { value: 140, timestamp: new Date(Date.now() - 11 * 86400000).toISOString() },
        { value: 145, timestamp: new Date(Date.now() - 10 * 86400000).toISOString() },
        { value: 150, timestamp: new Date(Date.now() - 9 * 86400000).toISOString() },
        { value: 148, timestamp: new Date(Date.now() - 8 * 86400000).toISOString() },
        { value: 152, timestamp: new Date(Date.now() - 7 * 86400000).toISOString() },
        { value: 158, timestamp: new Date(Date.now() - 6 * 86400000).toISOString() },
        { value: 155, timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
        { value: 160, timestamp: new Date(Date.now() - 4 * 86400000).toISOString() },
        { value: 165, timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
        { value: 168, timestamp: new Date(Date.now() - 2 * 86400000).toISOString() },
        { value: 170, timestamp: new Date(Date.now() - 1 * 86400000).toISOString() },
        { value: 175, timestamp: new Date().toISOString() }
    ]);

    // Состояние для запланированных применений
    const [scheduledApplications, setScheduledApplications] = useState<ScheduledApplication[]>([
        { id: 1, date: '2024-03-25', type: 'NPK Суміш', status: 'scheduled' },
        { id: 2, date: '2024-03-15', type: 'Підживлення азотом', status: 'completed' },
        { id: 3, date: '2024-03-10', type: 'NPK Суміш', status: 'completed' }
    ]);

    // Добавляем стейты для текстовых значений полей ввода
    const [fieldSizeText, setFieldSizeText] = useState<string>('5');
    const [applicationRateText, setApplicationRateText] = useState<string>('25');

    // Состояние для календаря и выбранной даты
    const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
        // Получаем текущую дату
        const today = new Date();
        // Тестовый год 2025 для согласованности с другими датами
        const testYear = 2025;

        // Создаем новую дату с годом 2025 и текущими днем/месяцем, обнуляя время
        return new Date(testYear, today.getMonth(), today.getDate(), 0, 0, 0);
    });

    // Состояние для редактирования существующей записи
    const [editingSchedule, setEditingSchedule] = useState<ScheduledApplication | null>(null);

    // Состояние для временных значений в модальном окне
    const [modalFertilizerName, setModalFertilizerName] = useState<string>('');
    const [modalFieldSize, setModalFieldSize] = useState<string>('');
    const [modalApplicationRate, setModalApplicationRate] = useState<string>('');

    // Состояния для модального окна сообщений
    const [modalMsgOpen, setModalMsgOpen] = useState(false);
    const [modalMsgType, setModalMsgType] = useState<'info' | 'success' | 'error' | 'confirm'>('info');
    const [modalMsgTitle, setModalMsgTitle] = useState<string>('');
    const [modalMsgText, setModalMsgText] = useState<string>('');
    const [modalMsgOnConfirm, setModalMsgOnConfirm] = useState<null | (() => void)>(null);

    // Состояние для планировщика
    const [schedulerModalOpen, setSchedulerModalOpen] = useState<boolean>(false);

    // Состояние для подтверждения внесения удобрений
    const [confirmingApply, setConfirmingApply] = useState(false);

    // Мемоизированное форматирование выбранной даты для отображения
    const formattedSelectedDate = useMemo(() => {
        if (!selectedDate) return '';
        return formatSelectedDate(selectedDate);
    }, [selectedDate]);

    // Мемоизированная дата для отображения
    const formattedFullDate = useMemo(() => {
        if (!selectedDate) return '';
        return `${selectedDate.getDate()} ${selectedDate.toLocaleString('uk-UA', { month: 'long' })} ${selectedDate.getFullYear()} р.`;
    }, [selectedDate]);

    // Расчет количества удобрений
    const calculatedAmount = useMemo(() => {
        const size = parseFloat(modalFieldSize) || 0;
        const rate = parseFloat(modalApplicationRate) || 0;
        return `${(size * rate).toFixed(1)} кг`;
    }, [modalFieldSize, modalApplicationRate]);

    // Инициализация компонента
    useEffect(() => {
        // Симуляция загрузки данных
        const timerId = setTimeout(() => {
            // Установка начальных данных
            const initialData = {
                isActive: true,
                autoMode: false,
                lastApplication: '3 дні тому',
                nextScheduled: '25 березня',
                nutrients: [
                    { name: 'Азот (N)', current: 150, target: 200, unit: 'ppm', color: '#3B82F6' },
                    { name: 'Фосфор (P)', current: 45, target: 50, unit: 'ppm', color: '#10B981' },
                    { name: 'Калій (K)', current: 180, target: 200, unit: 'ppm', color: '#F59E0B' }
                ],
                fertilizerName: 'NPK Суміш 20-10-10'
            };

            setIsInitialized(true);
            setIsLoading(false);
        }, 800);

        timersRef.current.push(timerId);

        // Очистка таймеров при размонтировании
        return () => {
            timersRef.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    // Простой вспомогательный метод для отображения модального окна сообщений
    const showModalMsg = useCallback((type: 'info' | 'success' | 'error' | 'confirm', message: string, title = '', onConfirm?: () => void) => {
        // Сначала закрываем предыдущее модальное окно, если оно открыто и не является окном подтверждения
        if (modalMsgOpen && modalMsgType !== 'confirm') {
            setModalMsgOpen(false);

            // Задержка перед открытием нового окна, чтобы React успел обработать закрытие предыдущего
            setTimeout(() => {
                setModalMsgType(type);
                setModalMsgTitle(title || (type === 'success' ? 'Успіх' : type === 'error' ? 'Помилка' : type === 'confirm' ? 'Підтвердження' : 'Інформація'));
                setModalMsgText(message);
                setModalMsgOnConfirm(onConfirm || null);
                setModalMsgOpen(true);
            }, 100);
        } else {
            // Если окно закрыто, просто открываем новое
            setModalMsgType(type);
            setModalMsgTitle(title || (type === 'success' ? 'Успіх' : type === 'error' ? 'Помилка' : type === 'confirm' ? 'Підтвердження' : 'Інформація'));
            setModalMsgText(message);
            setModalMsgOnConfirm(onConfirm || null);
            setModalMsgOpen(true);
        }
    }, [modalMsgOpen, modalMsgType]);

    // Функция-заглушка для получения данных с бэкенда
    const fetchData = useCallback(async (showLoader = true, updateAutoMode = true) => {
        if (showLoader) setIsLoading(true);

        try {
            // Здесь будет реальный запрос к API
            // Симулируем получение статических данных
            const mockData: FertilizerApiData = {
                isActive,
                autoMode,
                lastApplication,
                nextScheduled,
                nutrients,
                lastUpdated: new Date().toISOString(),
                fertilizerName
            };

            // Применяем полученные данные
            setIsActive(mockData.isActive);
            setLastApplication(mockData.lastApplication);
            setNextScheduled(mockData.nextScheduled);
            setNutrients(mockData.nutrients);
            setLastUpdated(mockData.lastUpdated);
            if (mockData.fertilizerName) setFertilizerName(mockData.fertilizerName);

            // Автоматический режим обновляем только если указано
            if (updateAutoMode) {
                setAutoMode(mockData.autoMode);
            }

            setIsError(false);
            setErrorMessage('');
        } catch (error) {
            console.error('Помилка отримання даних удобрення:', error);
            setIsError(true);
            setErrorMessage('Не вдалося отримати дані');
        } finally {
            if (showLoader) setIsLoading(false);
        }
    }, [isActive, autoMode, lastApplication, nextScheduled, nutrients, fertilizerName]);

    // Функция-заглушка для отправки данных на бэкенд
    const updateSettings = useCallback(async (data: Partial<FertilizerApiData>) => {
        try {
            setIsLoading(true);
            // Здесь будет реальный запрос к API
            // Применяем изменения локально
            if (data.isActive !== undefined) setIsActive(data.isActive);
            if (data.autoMode !== undefined) setAutoMode(data.autoMode);
            if (data.lastApplication !== undefined) setLastApplication(data.lastApplication);
            if (data.nextScheduled !== undefined) setNextScheduled(data.nextScheduled);
            if (data.nutrients !== undefined) setNutrients(data.nutrients);
            if (data.fertilizerName !== undefined) setFertilizerName(data.fertilizerName);

            // Обновляем временную метку
            const newTimestamp = new Date().toISOString();
            setLastUpdated(newTimestamp);

            setIsError(false);
            setErrorMessage('');
        } catch (error) {
            console.error('Помилка оновлення налаштувань удобрення:', error);
            setIsError(true);
            setErrorMessage('Не вдалося оновити налаштування');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Обработчик изменения целевого значения питательного вещества
    const handleTargetChange = useCallback((index: number, value: number) => {
        setNutrients(prev => prev.map((nutrient, i) =>
            i === index ? { ...nutrient, target: value } : nutrient
        ));
    }, []);

    // Обработчик включения/выключения системы
    const handleToggleSystem = useCallback((active: boolean) => {
        setIsActive(active);
        updateSettings({ isActive: active });
    }, [updateSettings]);

    // Обработчик включения/выключения автоматического режима
    const handleToggleAutoMode = useCallback((auto: boolean) => {
        setAutoMode(auto);
        updateSettings({ autoMode: auto });

        if (auto) {
            showModalMsg('success', 'Систему переведено в автоматичний режим. Удобрення буде вноситися відповідно до розкладу та потреб рослин.');
        }
    }, [updateSettings, showModalMsg]);

    // Обработчик отмены подтверждения
    const handleCancelConfirm = useCallback(() => {
        setConfirmingApply(false);
        setModalMsgOpen(false);
    }, []);

    // Обработчик ручного внесения удобрений сейчас
    const handleApplyNow = useCallback(() => {
        // Проверка активности системы
        if (!isActive) {
            showModalMsg('error', 'Система вимкнена. Увімкніть систему для внесення добрив.');
            return;
        }

        // Проверка автоматического режима
        if (autoMode) {
            showModalMsg('error', 'Система в автоматичному режимі. Переключіть на ручний режим для керування вручну.');
            return;
        }

        // Строгая проверка всех условий
        if (fieldSize === undefined || fieldSize === null || isNaN(fieldSize) || fieldSize <= 0) {
            showModalMsg('error', 'Введіть коректне значення площі поля');
            return;
        }

        if (applicationRate === undefined || applicationRate === null || isNaN(applicationRate) || applicationRate <= 0) {
            showModalMsg('error', 'Введіть коректне значення норми внесення');
            return;
        }

        // Начинаем процесс внесения удобрений без подтверждения
        // Показываем индикатор загрузки
        setIsLoading(true);

        // Имитация API-запроса и внесения
        const timerId = setTimeout(() => {
            // Обновляем текущий уровень питательных веществ и другие параметры
            const updatedNutrients = nutrients.map(nutrient => ({
                ...nutrient,
                current: Math.min(nutrient.target, nutrient.current + (Math.random() * 15 + 5))
            }));

            // Обновляем данные
            setNutrients(updatedNutrients);

            // Обновляем дату последнего внесения
            setLastApplication('Сьогодні');

            // Обновляем историю для графика (добавляем новую точку)
            const newDataPoint: ChartDataPoint = {
                value: Math.min(200, (nitrogenHistory[nitrogenHistory.length - 1]?.value || 150) + (Math.random() * 15 + 5)),
                timestamp: new Date().toISOString()
            };

            setNitrogenHistory(prev => [...prev, newDataPoint]);

            // Добавляем запись в историю внесений
            const newApplication: ScheduledApplication = {
                id: Date.now(),
                date: formatDateForInput(new Date()),
                type: fertilizerName,
                status: 'completed',
                amount: `${(fieldSize * applicationRate).toFixed(1)} кг`
            };
            setScheduledApplications(prev => [newApplication, ...prev]);

            setIsLoading(false);

            // Показываем сообщение об успехе
            showModalMsg(
                'success',
                'Добриво успішно внесено на поле. Рівні поживних речовин оновлено.',
                'Внесення виконано'
            );
        }, 1500);

        timersRef.current.push(timerId);
    }, [isActive, autoMode, fieldSize, applicationRate, fertilizerName, nutrients, nitrogenHistory, showModalMsg, formatDateForInput, setIsLoading, setNutrients, setLastApplication, setNitrogenHistory, setScheduledApplications]);

    // Обработчик открытия планировщика задач (новое задание или редактирование)
    const handleOpenScheduler = useCallback((existingSchedule?: ScheduledApplication) => {
        if (!isActive) {
            showModalMsg('error', 'Система вимкнена. Увімкніть систему для планування внесення добрив.');
            return;
        }

        if (existingSchedule) {
            // Редактирование существующего задания
            setEditingSchedule(existingSchedule);

            try {
                // Парсим дату
                const scheduledDate = new Date(existingSchedule.date);
                setSelectedDate(scheduledDate);

                // Парсим тип удобрения
                setModalFertilizerName(existingSchedule.type);

                // Парсим количество, если есть
                if (existingSchedule.amount) {
                    const match = existingSchedule.amount.match(/(\d+(\.\d+)?)/);
                    if (match) {
                        const total = parseFloat(match[0]);

                        // Пытаемся восстановить размер поля и норму внесения
                        setModalFieldSize(fieldSize.toString());
                        setModalApplicationRate((total / fieldSize).toFixed(1));
                    }
                } else {
                    setModalFieldSize(fieldSize.toString());
                    setModalApplicationRate(applicationRate.toString());
                }
            } catch (error) {
                console.error('Помилка при розборі даних розкладу:', error);
                setSelectedDate(new Date());
                setModalFertilizerName(fertilizerName);
                setModalFieldSize(fieldSize.toString());
                setModalApplicationRate(applicationRate.toString());
            }
        } else {
            // Новое задание
            setEditingSchedule(null);
            setSelectedDate(new Date());
            setModalFertilizerName(fertilizerName);
            setModalFieldSize(fieldSize.toString());
            setModalApplicationRate(applicationRate.toString());
        }

        setShowDatePicker(false);
        setSchedulerModalOpen(true);
    }, [isActive, fieldSize, applicationRate, fertilizerName, showModalMsg]);

    // Обработчик подтверждения планирования внесения удобрений
    const handleConfirmSchedule = useCallback(() => {
        if (!selectedDate || !modalFertilizerName) {
            showModalMsg('error', 'Виберіть дату та тип добрива');
            return;
        }

        const applicationDate = formatDateForInput(selectedDate);
        let applicationAmount: string | undefined;

        try {
            // Проверка на пустые значения или некорректные данные
            const size = modalFieldSize.trim() !== '' ? parseFloat(modalFieldSize) : fieldSize;
            const rate = modalApplicationRate.trim() !== '' ? parseFloat(modalApplicationRate) : applicationRate;

            if (isNaN(size) || isNaN(rate) || size <= 0 || rate <= 0) {
                showModalMsg('error', 'Введіть коректні значення площі та норми внесення');
                return;
            }

            applicationAmount = `${(size * rate).toFixed(1)} кг`;
        } catch (error) {
            console.error('Помилка обчислення кількості:', error);
            showModalMsg('error', 'Помилка обчислення кількості добрив');
            return;
        }

        if (editingSchedule) {
            // Обновление существующего задания
            setScheduledApplications(prev => prev.map(app =>
                app.id === editingSchedule.id
                    ? {
                        ...app,
                        date: applicationDate,
                        type: modalFertilizerName,
                        amount: applicationAmount
                    }
                    : app
            ));

            showModalMsg('success', 'Заплановане внесення добрив оновлено');
        } else {
            // Создание нового задания
            const newApplication: ScheduledApplication = {
                id: Date.now(),
                date: applicationDate,
                type: modalFertilizerName,
                status: 'scheduled',
                amount: applicationAmount
            };

            setScheduledApplications(prev => [newApplication, ...prev]);
            showModalMsg('success', 'Нове внесення добрив успішно заплановано');
        }

        // Очищаем состояние и закрываем модальное окно
        setSchedulerModalOpen(false);
        setEditingSchedule(null);

        // Обновляем следующее запланированное внесение
        updateNextScheduled();
    }, [selectedDate, modalFertilizerName, modalFieldSize, modalApplicationRate, editingSchedule, fieldSize, applicationRate, showModalMsg, formatDateForInput]);

    // Обработчик редактирования запланированного внесения
    const handleEditApplication = useCallback((id: number) => {
        const application = scheduledApplications.find(app => app.id === id);
        if (application) {
            handleOpenScheduler(application);
        }
    }, [scheduledApplications, handleOpenScheduler]);

    // Обработчик удаления запланированного внесения
    const handleDeleteApplication = useCallback((id: number) => {
        showModalMsg(
            'confirm',
            'Ви впевнені, що хочете видалити це заплановане внесення добрив?',
            'Підтвердження видалення',
            () => {
                setScheduledApplications(prev => prev.filter(app => app.id !== id));
                showModalMsg('success', 'Заплановане внесення добрив видалено');

                // Обновляем следующее запланированное внесение
                updateNextScheduled();
            }
        );
    }, [showModalMsg]);

    // Находим последнее выполненное внесение
    const findLastCompletedApplication = useCallback((): ScheduledApplication | undefined => {
        return [...scheduledApplications]
            .filter(app => app.status === 'completed')
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Сортировка по убыванию (самое новое первое)
            })[0];
    }, [scheduledApplications]);

    // Находим следующее запланированное внесение
    const findNextScheduledApplication = useCallback((): ScheduledApplication | undefined => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return [...scheduledApplications]
            .filter(app => app.status === 'scheduled' && new Date(app.date) >= today)
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateA.getTime() - dateB.getTime(); // Сортировка по возрастанию (самое ближайшее первое)
            })[0];
    }, [scheduledApplications]);

    // Обновляем дату следующего запланированного внесения
    const updateNextScheduled = useCallback(() => {
        const nextApp = findNextScheduledApplication();
        if (nextApp) {
            setNextScheduled(formatDate(nextApp.date));
        } else {
            setNextScheduled('Не заплановано');
        }
    }, [findNextScheduledApplication, formatDate]);

    return {
        // Состояния
        isActive,
        autoMode,
        nutrients,
        fieldSize,
        applicationRate,
        isLoading,
        isError,
        errorMessage,
        lastUpdated,
        isInitialized,
        nitrogenHistory,
        scheduledApplications,
        fieldSizeText,
        applicationRateText,
        fertilizerName,
        lastApplication,
        nextScheduled,
        modalMsgOpen,
        modalMsgType,
        modalMsgTitle,
        modalMsgText,
        modalMsgOnConfirm,
        schedulerModalOpen,
        editingSchedule,
        showDatePicker,
        selectedDate,
        modalFertilizerName,
        modalFieldSize,
        modalApplicationRate,
        formattedSelectedDate,
        formattedFullDate,
        calculatedAmount,
        confirmingApply,

        // Методы
        setModalMsgOpen,
        handleToggleSystem,
        handleToggleAutoMode,
        handleApplyNow,
        handleOpenScheduler,
        handleConfirmSchedule,
        handleEditApplication,
        handleDeleteApplication,
        formatDate,
        setFieldSizeText,
        setApplicationRateText,
        setFieldSize,
        setApplicationRate,
        setShowDatePicker,
        setSelectedDate,
        setModalFertilizerName,
        setModalFieldSize,
        setModalApplicationRate,
        showModalMsg,
        setSchedulerModalOpen,
        handleCancelConfirm,
        formatDateForInput,
        formatDateForDisplay
    };
}; 