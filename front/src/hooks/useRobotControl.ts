import { useState, useEffect, useRef, useCallback } from 'react';
import { useDeviceSettings } from '../context/DeviceSettingsContext';
import { RobotStatus, ScheduledTask } from '../types/robotTypes';

export const useRobotControl = () => {
    const [selectedTab, setSelectedTab] = useState('all');
    const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
    const [showControls, setShowControls] = useState(false);

    // Состояния для взаимодействия с API
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [lastUpdated, setLastUpdated] = useState<string>('');

    // Состояние для отслеживания инициализации
    const [isInitialized, setIsInitialized] = useState(false);

    // Состояния для модального окна деталей робота
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsRobot, setDetailsRobot] = useState<RobotStatus | null>(null);

    // Состояния для универсальной модалки действий
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [actionModalType, setActionModalType] = useState<'info' | 'success' | 'error'>('info');
    const [actionModalTitle, setActionModalTitle] = useState('');
    const [actionModalText, setActionModalText] = useState('');
    const [actionModalPhotos, setActionModalPhotos] = useState<string[] | null>(null);
    const [actionProgress, setActionProgress] = useState<number | null>(null);
    const actionProgressRef = useRef<number | null>(null);

    // Для модалки навигации
    const [navigationModalOpen, setNavigationModalOpen] = useState(false);
    const [navigationRobot, setNavigationRobot] = useState<RobotStatus | null>(null);
    const [navigationStep, setNavigationStep] = useState<'select' | 'confirm'>('select');
    const [navigationTarget, setNavigationTarget] = useState<string>('');
    const navigationPoints = [
        'Блок A',
        'Блок B',
        'Блок C',
        'Станція зарядки',
        'Технічний відсік',
        'Повернення на базу',
    ];

    // Состояния для планировщика заданий
    const [taskSchedulerOpen, setTaskSchedulerOpen] = useState(false);
    const [taskSchedulerRobot, setTaskSchedulerRobot] = useState<RobotStatus | null>(null);
    const [taskSchedulerCapability, setTaskSchedulerCapability] = useState<string>('');
    const [taskSchedulerTime, setTaskSchedulerTime] = useState<string>('');
    const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

    const { robots: deviceRobots, setRobots } = useDeviceSettings();

    const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([
        { id: 1, device: 'Дрон-розвідник 1', task: 'Моніторинг посівів', time: '14:30', status: 'pending' },
        { id: 2, device: 'Робот-комбайн 1', task: 'Підготовка до збору врожаю', time: '15:00', status: 'pending' },
        { id: 3, device: 'Дрон-розвідник 1', task: 'Картографування вологості', time: '16:00', status: 'pending' },
        { id: 4, device: 'Робот-сіяч 1', task: 'Висівання рядами', time: 'Завтра, 09:00', status: 'scheduled' },
        { id: 5, device: 'Робот-технік 1', task: 'Формування виноградних лоз', time: 'Сьогодні, 11:00', status: 'in-progress' }
    ]);

    // Добавим ref для хранения таймеров
    const timersRef = useRef<number[]>([]);

    // Загрузка данных при монтировании компонента и периодическое обновление
    useEffect(() => {
        // Первоначальная загрузка данных
        fetchRobotsData();
        setIsInitialized(true);

        // Настраиваем интервал обновления данных каждые 10 секунд
        const intervalId = setInterval(() => {
            fetchRobotsData(false); // передаем false, чтобы не показывать индикатор загрузки при обновлении
        }, 10000);

        // Очистка интервала при размонтировании
        return () => {
            clearInterval(intervalId);
            // Очищаем таймеры при размонтировании
            timersRef.current.forEach(timerId => clearTimeout(timerId));
        };
    }, []);

    // Функция для получения данных о роботах с бэкенда
    const fetchRobotsData = useCallback(async (showLoader = true) => {
        try {
            if (showLoader) {
                setIsLoading(true);
            }
            setIsError(false);

            // Здесь будет запрос к API, пока используем эмуляцию
            const timerId = setTimeout(() => {
                try {
                    // При периодическом обновлении обновляем только временную метку
                    // и не затрагиваем состояния роботов, которые пользователь мог изменить
                    setLastUpdated(new Date().toISOString());

                    // При периодическом обновлении можно было бы обновлять уровень заряда батареи и другие параметры,
                    // которые не являются настройками, установленными пользователем.
                    // Но в текущей реализации мы только обновляем метку времени.

                    setIsLoading(false);
                } catch (innerError) {
                    console.error('Помилка обробки даних роботів:', innerError);
                    setIsError(true);
                    setErrorMessage('Помилка обробки даних');
                    setIsLoading(false);
                }
            }, showLoader ? 1000 : 500); // для регулярных обновлений уменьшаем задержку

            // Сохраняем идентификатор таймера для очистки при размонтировании
            timersRef.current.push(timerId);
        } catch (error) {
            console.error('Помилка отримання даних роботів:', error);
            setIsError(true);
            setErrorMessage('Не вдалося отримати дані з сервера');
            setIsLoading(false);
        }
    }, []);

    // Функция для отправки команд роботам на бэкенд
    const sendRobotCommand = useCallback(async (robotId: string, command: string) => {
        try {
            setIsLoading(true);

            // Здесь будет запрос к API, пока используем эмуляцию
            console.log(`Відправка команди "${command}" на робота ${robotId}`);

            // Эмулируем задержку и успешный ответ
            const timerId = setTimeout(() => {
                try {
                    // Обновляем статус робота в соответствии с командой
                    if (command === 'start' || command.startsWith('move_')) {
                        updateRobotStatus(robotId, 'active');
                    } else if (command === 'stop' || command === 'return_to_base') {
                        updateRobotStatus(robotId, 'idle');
                    } else if (command === 'charge') {
                        updateRobotStatus(robotId, 'charging');
                    }

                    setIsLoading(false);
                } catch (innerError) {
                    console.error('Помилка оновлення статусу робота:', innerError);
                    setIsError(true);
                    setErrorMessage('Не вдалося оновити статус робота');
                    setIsLoading(false);
                }
            }, 800);

            // Сохраняем идентификатор таймера для очистки при размонтировании
            timersRef.current.push(timerId);
        } catch (error) {
            console.error('Помилка відправки команди роботу:', error);
            setIsError(true);
            setErrorMessage('Не вдалося відправити команду');
            setIsLoading(false);
        }
    }, []);

    // Функция для обновления статуса робота
    const updateRobotStatus = useCallback((robotId: string, status: 'active' | 'idle' | 'charging' | 'maintenance') => {
        setRobots(prevRobots =>
            prevRobots.map(robot =>
                robot.id === robotId ? { ...robot, status } : robot
            )
        );
    }, [setRobots]);

    // Функция для добавления новой запланированной задачи
    const scheduleNewTask = useCallback((deviceId: string, task: string, timeOffset: number = 60) => {
        const robot = deviceRobots.find(r => r.id === deviceId);
        if (!robot) return;

        const now = new Date();
        now.setMinutes(now.getMinutes() + timeOffset);
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        const newTask: ScheduledTask = {
            id: Math.max(0, ...scheduledTasks.map(t => t.id)) + 1,
            device: robot.name,
            task,
            time: timeStr,
            status: 'scheduled'
        };

        setScheduledTasks(prevTasks => [newTask, ...prevTasks]);
    }, [deviceRobots, scheduledTasks]);

    // Обработчик переключения контролов робота
    const toggleRobotControls = useCallback((robotId: string) => {
        if (selectedRobot === robotId) {
            setShowControls(!showControls);
        } else {
            setSelectedRobot(robotId);
            setShowControls(true);
        }
    }, [selectedRobot, showControls]);

    // Функция для обработки нажатия на кнопку действия робота
    const handleRobotAction = useCallback((robotId: string, action: string) => {
        sendRobotCommand(robotId, action);

        // Если это задача, запланируем её
        if (['monitoring', 'imaging', 'spraying', 'harvesting', 'seeding', 'pruning'].includes(action)) {
            scheduleNewTask(robotId, action, 15);
        }
    }, [sendRobotCommand, scheduleNewTask]);

    // Обработчик быстрых действий
    const handleRobotQuickAction = useCallback((robot: RobotStatus, capability: string) => {
        if (robot.status === 'maintenance') {
            setActionModalType('error');
            setActionModalTitle('Робот на обслуговуванні');
            setActionModalText('Робот знаходиться на обслуговуванні та тимчасово недоступний для виконання дій.');
            setActionModalPhotos(null);
            setActionProgress(null);
            setActionModalOpen(true);
            return;
        }

        // Список дій з прогрес-баром
        const progressActions = [
            'Обприскування',
            'Висівання',
            'Почати збір',
            'Обрізка',
            'Формування лози',
            "Видалення бур'янів",
            'Повернутись на базу',
        ];

        if (progressActions.includes(capability)) {
            setActionModalType('info');
            setActionModalTitle(capability);
            setActionModalText('Виконується...');
            setActionModalPhotos(null);
            setActionProgress(0);
            setActionModalOpen(true);

            // Плавне заповнення прогресу
            let progress = 0;
            if (actionProgressRef.current) clearInterval(actionProgressRef.current);

            // @ts-ignore
            actionProgressRef.current = setInterval(() => {
                progress += 5 + Math.random() * 10;
                if (progress >= 100) {
                    progress = 100;
                    setActionProgress(progress);
                    // @ts-ignore
                    clearInterval(actionProgressRef.current);

                    setTimeout(() => {
                        // Показуємо результат
                        let resultTitle = '';
                        let resultText = '';

                        switch (capability) {
                            case 'Обприскування':
                                resultTitle = 'Обприскування завершено';
                                resultText = 'Зону успішно обприскали.';
                                break;
                            case 'Висівання':
                                resultTitle = 'Висівання завершено';
                                resultText = 'Всі ряди засіяно.';
                                break;
                            case 'Почати збір':
                                resultTitle = 'Збір урожаю завершено';
                                resultText = 'Весь урожай зібрано та відправлено на склад.';
                                break;
                            case 'Обрізка':
                                resultTitle = 'Обрізка завершена';
                                resultText = 'Обрізку виконано згідно з планом.';
                                break;
                            case 'Формування лози':
                                resultTitle = 'Формування лози завершено';
                                resultText = 'Всі лози сформовано.';
                                break;
                            case "Видалення бур'янів":
                                resultTitle = 'Видалення бур\'янів завершено';
                                resultText = 'Бур\'яни успішно видалено.';
                                break;
                            case 'Повернутись на базу':
                                resultTitle = 'Повернення на базу завершено';
                                resultText = 'Робот повернувся на базу. Заряджання розпочато.';
                                break;
                            default:
                                resultTitle = capability;
                                resultText = 'Операцію виконано.';
                        }

                        setActionModalType('success');
                        setActionModalTitle(resultTitle);
                        setActionModalText(resultText);
                        setActionProgress(null);
                    }, 500);
                } else {
                    setActionProgress(progress);
                }
            }, 80);

            return;
        }

        // Інші дії без прогресу
        switch (capability) {
            case 'Моніторинг':
                setActionModalType('success');
                setActionModalTitle('Моніторинг завершено');
                setActionModalText('Проблем не виявлено. Всі показники в нормі.');
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Фотографування':
            case 'Зробити знімки':
                setActionModalType('info');
                setActionModalTitle('Останні знімки з дрона');
                setActionModalText('');
                setActionModalPhotos([
                    `https://picsum.photos/seed/${robot.id}1/400/200`,
                    `https://picsum.photos/seed/${robot.id}2/400/200`,
                    `https://picsum.photos/seed/${robot.id}3/400/200`
                ]);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Аналіз ґрунту':
                setActionModalType('info');
                setActionModalTitle('Результати аналізу ґрунту');
                setActionModalText(
                    `pH: ${(6 + Math.random() * 1.5).toFixed(2)}\n` +
                    `Вологість: ${(18 + Math.random() * 12).toFixed(1)}%\n` +
                    `Азот (N): ${(20 + Math.random() * 10).toFixed(1)} ppm\n` +
                    `Фосфор (P): ${(10 + Math.random() * 5).toFixed(1)} ppm\n` +
                    `Калій (K): ${(15 + Math.random() * 8).toFixed(1)} ppm\n` +
                    `Органіка: ${(1.5 + Math.random() * 1.5).toFixed(2)}%\n` +
                    `Температура: ${(12 + Math.random() * 8).toFixed(1)}°C`
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            default:
                setActionModalType('info');
                setActionModalTitle(capability);
                setActionModalText('Дію виконано.');
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);
        }
    }, []);

    // Открыть планировщик для редактирования задачи
    const openEditTaskScheduler = useCallback((task: ScheduledTask) => {
        const robot = deviceRobots.find(r => r.name === task.device) || null;
        setTaskSchedulerRobot(robot);
        setTaskSchedulerCapability(task.task);

        // Преобразуем строку времени обратно в формат datetime-local
        let dt = '';
        try {
            // Если строка в формате 'dd.mm.yyyy, hh:mm' или 'hh:mm'
            if (/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/.test(task.time)) {
                const [date, time] = task.time.split(', ');
                const [day, month, year] = date.split('.');
                dt = `${year}-${month}-${day}T${time}`;
            } else if (/\d{2}:\d{2}/.test(task.time)) {
                // Только время, ставим сегодняшнюю дату
                const now = new Date();
                dt = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${task.time}`;
            } else {
                dt = '';
            }
        } catch {
            dt = '';
        }

        setTaskSchedulerTime(dt);
        setEditingTask(task);
        setTaskSchedulerOpen(true);
    }, [deviceRobots]);

    // Добавить или обновить задание в очереди
    const addScheduledTask = useCallback(() => {
        if (!taskSchedulerRobot || !taskSchedulerCapability || !taskSchedulerTime) return;

        if (editingTask) {
            // Редактируем существующую задачу
            setScheduledTasks(prev => prev.map(t =>
                t.id === editingTask.id
                    ? {
                        ...t,
                        device: taskSchedulerRobot.name,
                        task: taskSchedulerCapability,
                        time: new Date(taskSchedulerTime).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
                    }
                    : t
            ));
            setEditingTask(null);
        } else {
            // Добавляем новую задачу
            setScheduledTasks(prev => [
                {
                    id: Math.max(0, ...prev.map(t => t.id)) + 1,
                    device: taskSchedulerRobot.name,
                    task: taskSchedulerCapability,
                    time: new Date(taskSchedulerTime).toLocaleString('uk-UA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
                    status: 'scheduled',
                },
                ...prev
            ]);
        }

        setTaskSchedulerOpen(false);
    }, [taskSchedulerRobot, taskSchedulerCapability, taskSchedulerTime, editingTask]);

    // Групповые действия
    const handleSystemCheck = useCallback(() => {
        setActionModalType('info');
        setActionModalTitle('Перевірка системи');
        setActionModalText('Виконується перевірка системи...');
        setActionModalPhotos(null);
        setActionProgress(0);
        setActionModalOpen(true);

        let progress = 0;
        if (actionProgressRef.current) clearInterval(actionProgressRef.current);

        // @ts-ignore
        actionProgressRef.current = setInterval(() => {
            progress += 7 + Math.random() * 10;
            if (progress >= 100) {
                progress = 100;
                setActionProgress(progress);
                // @ts-ignore
                clearInterval(actionProgressRef.current);

                setTimeout(() => {
                    setActionModalType('success');
                    setActionModalTitle('Система перевірена');
                    setActionModalText('Проблем не виявлено. Всі системи працюють коректно.');
                    setActionProgress(null);
                }, 500);
            } else {
                setActionProgress(progress);
            }
        }, 80);
    }, []);

    const handleChargeAll = useCallback(() => {
        setRobots(prev => prev.map(r =>
            r.status !== 'maintenance' && r.battery < 90 ? { ...r, status: 'charging' } : r
        ));

        setActionModalType('success');
        setActionModalTitle('Зарядка розпочата');
        setActionModalText('Всі доступні роботи відправлені на зарядку.');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);
    }, [setRobots]);

    const handleLocateAll = useCallback(() => {
        setActionModalType('success');
        setActionModalTitle('Локалізація виконана');
        setActionModalText('Всі роботи локалізовано. Останні координати отримано.');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);
    }, []);

    const handleEmergencyStop = useCallback(() => {
        setRobots(prev => prev.map(r =>
            r.status === 'active' ? { ...r, status: 'idle' } : r
        ));

        setActionModalType('error');
        setActionModalTitle('Аварійна зупинка');
        setActionModalText('Всі активні роботи зупинено!');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);
    }, [setRobots]);

    // Открыть планировщик с выбранным роботом (из карточки или кнопки)
    const openTaskScheduler = useCallback((robot: RobotStatus | null = null) => {
        if (robot && robot.status === 'maintenance') {
            setActionModalType('error');
            setActionModalTitle('Робот на обслуговуванні');
            setActionModalText('Робот знаходиться на обслуговуванні та недоступний для планування завдань.');
            setActionModalPhotos(null);
            setActionProgress(null);
            setActionModalOpen(true);
            return;
        }

        setTaskSchedulerRobot(robot);
        setTaskSchedulerCapability('');
        setTaskSchedulerTime('');
        setEditingTask(null);
        setTaskSchedulerOpen(true);
    }, []);

    // Функция для отображения деталей робота
    const showRobotDetails = useCallback((robot: RobotStatus) => {
        setDetailsRobot(robot);
        setDetailsModalOpen(true);
    }, []);

    // Функция для навигации робота
    const navigateRobot = useCallback((robot: RobotStatus) => {
        if (robot.status === 'maintenance') {
            setActionModalType('error');
            setActionModalTitle('Робот на обслуговуванні');
            setActionModalText('Робот знаходиться на обслуговуванні та тимчасово недоступний для виконання дій.');
            setActionModalPhotos(null);
            setActionProgress(null);
            setActionModalOpen(true);
            return;
        }

        setNavigationRobot(robot);
        setNavigationStep('select');
        setNavigationTarget('');
        setNavigationModalOpen(true);
    }, []);

    // Функция для выбора цели навигации
    const selectNavigationTarget = useCallback((target: string) => {
        setNavigationTarget(target);
        setNavigationStep('confirm');
    }, []);

    // Функция для фильтрации роботов по выбранной вкладке
    const getFilteredRobots = useCallback(() => {
        return selectedTab === 'all'
            ? deviceRobots
            : deviceRobots.filter(robot => robot.category === selectedTab);
    }, [selectedTab, deviceRobots]);

    return {
        // Состояния
        selectedTab,
        selectedRobot,
        showControls,
        isLoading,
        isError,
        errorMessage,
        lastUpdated,
        isInitialized,
        detailsModalOpen,
        detailsRobot,
        actionModalOpen,
        actionModalType,
        actionModalTitle,
        actionModalText,
        actionModalPhotos,
        actionProgress,
        navigationModalOpen,
        navigationRobot,
        navigationStep,
        navigationTarget,
        navigationPoints,
        taskSchedulerOpen,
        taskSchedulerRobot,
        taskSchedulerCapability,
        taskSchedulerTime,
        editingTask,
        scheduledTasks,
        deviceRobots,

        // Методы
        setSelectedTab,
        setDetailsModalOpen,
        setActionModalOpen,
        setNavigationModalOpen,
        setTaskSchedulerOpen,
        setTaskSchedulerRobot,
        setTaskSchedulerCapability,
        setTaskSchedulerTime,
        toggleRobotControls,
        handleRobotAction,
        handleRobotQuickAction,
        openEditTaskScheduler,
        addScheduledTask,
        handleSystemCheck,
        handleChargeAll,
        handleLocateAll,
        handleEmergencyStop,
        openTaskScheduler,
        showRobotDetails,
        navigateRobot,
        selectNavigationTarget,
        getFilteredRobots,
        sendRobotCommand
    };
}; 