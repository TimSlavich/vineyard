import { useState, useEffect, useRef, useCallback } from 'react';
import React from 'react';
import { useDeviceSettings } from '../context/DeviceSettingsContext';
import { RobotStatus, ScheduledTask } from '../types/robotTypes';
import { robotApi } from '../services/api/robotApi';
import { getUserData } from '../utils/storage';

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
    const [actionModalText, setActionModalText] = useState<React.ReactNode>('');
    const [actionModalPhotos, setActionModalPhotos] = useState<string[] | null>(null);
    const [actionProgress, setActionProgress] = useState<number | null>(null);
    const actionProgressRef = useRef<number | null>(null);

    // Для модалки навигации
    const [navigationModalOpen, setNavigationModalOpen] = useState(false);
    const [navigationRobot, setNavigationRobot] = useState<RobotStatus | null>(null);
    const [navigationStep, setNavigationStep] = useState<'select' | 'confirm'>('select');
    const [navigationTarget, setNavigationTarget] = useState<string>('');
    const [navigationPoints, setNavigationPoints] = useState<string[]>([
        'Блок 2',
        'Блок 3',
        'Станція зарядки',
        'Технічний відсік',
        'Повернення на базу',
    ]);

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
        { id: 3, device: 'Робот-сіяч 1', task: 'Висівання рядами', time: 'Завтра, 09:00', status: 'scheduled' },
        { id: 4, device: 'Робот-технік 1', task: 'Формування виноградних лоз', time: 'Сьогодні, 11:00', status: 'in-progress' }
    ]);

    // Добавим ref для хранения таймеров
    const timersRef = useRef<number[]>([]);

    // Загрузка данных при монтировании компонента и периодическое обновление
    useEffect(() => {
        // Первоначальная загрузка данных
        fetchRobotsData();
        fetchNavigationPoints();
        syncRobotLocationsWithSensors(); // Синхронизируем локации роботов с данными сенсоров
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

    // Функция для синхронизации локаций роботов с данными из localStorage
    const syncRobotLocationsWithSensors = useCallback(() => {
        try {
            const userKey = localStorage.getItem('user_id') || 'guest';

            // Сначала проверяем сохраненные локации роботов
            const robotLocationsKey = 'vineguard_robot_locations_' + userKey;
            const storedRobotLocations = localStorage.getItem(robotLocationsKey);
            let savedLocations: Record<string, { location: string, lastUpdated: string }> = {};

            if (storedRobotLocations) {
                try {
                    savedLocations = JSON.parse(storedRobotLocations);
                } catch (e) {
                    console.error('Ошибка при парсинге сохраненных локаций роботов:', e);
                }
            }

            // Получаем данные сенсоров из localStorage
            const storedSensorData = localStorage.getItem('vineguard_latest_sensor_data_' + userKey);

            // Список зон из данных сенсоров
            const zones: { id: string, name: string }[] = [];

            if (storedSensorData) {
                try {
                    const sensorData = JSON.parse(storedSensorData);

                    // Извлекаем информацию о зонах (блоках) из данных сенсоров
                    Object.values(sensorData).forEach((sensor: any) => {
                        if (sensor.type === 'soil_moisture' && sensor.metadata && sensor.metadata.zone_id) {
                            const zoneId = sensor.metadata.zone_id;
                            const zoneName = sensor.metadata.zone_name || `Блок ${zoneId.toUpperCase()}`;

                            // Проверяем, не добавлена ли уже такая зона
                            if (!zones.some(z => z.id === zoneId)) {
                                zones.push({ id: zoneId, name: zoneName });
                            }
                        }
                    });
                } catch (e) {
                    console.error('Ошибка при парсинге данных сенсоров:', e);
                }
            }

            // Если нет ни сохраненных локаций, ни данных о зонах, выходим
            if (Object.keys(savedLocations).length === 0 && zones.length === 0) return;

            // Распределяем роботы по найденным зонам и сохраненным локациям
            setRobots(prevRobots => {
                return prevRobots.map(robot => {
                    // Пропускаем роботы, которые находятся на зарядке или в техническом обслуживании
                    if (
                        robot.location === 'Станція зарядки' ||
                        robot.location === 'Технічний відсік' ||
                        robot.status === 'maintenance'
                    ) {
                        return robot;
                    }

                    // Сначала проверяем, есть ли сохраненная локация для этого робота
                    if (savedLocations[robot.id]) {
                        return { ...robot, location: savedLocations[robot.id].location };
                    }

                    // Если нет сохраненной локации, проверяем, есть ли текущая локация в списке зон
                    const isLocationValid = zones.length > 0 && zones.some(zone => zone.name === robot.location);

                    // Если локация недействительна и есть доступные зоны, присваиваем случайную зону
                    if (!isLocationValid && zones.length > 0) {
                        const randomZone = zones[Math.floor(Math.random() * zones.length)];
                        return { ...robot, location: randomZone.name };
                    }

                    return robot;
                });
            });

        } catch (error) {
            console.error('Ошибка при синхронизации локаций роботов с данными сенсоров:', error);
        }
    }, [setRobots]);

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

    // Новая функция для получения точек навигации
    const fetchNavigationPoints = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await robotApi.getNavigationPoints();
            if (response.success && response.data) {
                setNavigationPoints(response.data);

                // После обновления точек навигации, проверяем локации роботов
                // и обновляем их, если они больше не соответствуют существующим точкам
                setRobots(prevRobots => {
                    const updatedRobots = prevRobots.map(robot => {
                        // Если робот не на зарядке и не в техническом отсеке
                        if (
                            robot.location !== 'Станція зарядки' &&
                            robot.location !== 'Технічний відсік' &&
                            robot.status !== 'maintenance'
                        ) {
                            // Проверяем, есть ли текущая локация в обновленных точках навигации
                            const isLocationValid = response.data.includes(robot.location);

                            // Если локация недействительна, обновляем её до действительной
                            if (!isLocationValid && response.data.length > 0) {
                                // Находим все доступные блоки (точки, начинающиеся с "Блок")
                                const blocks = response.data.filter(point => point.includes('Блок'));

                                if (blocks.length > 0) {
                                    // Присваиваем случайный блок
                                    const randomBlock = blocks[Math.floor(Math.random() * blocks.length)];
                                    return { ...robot, location: randomBlock };
                                }
                            }
                        }
                        return robot;
                    });

                    return updatedRobots;
                });
            }
            setIsLoading(false);
        } catch (error) {
            console.error('Помилка отримання точок навігації:', error);
            setIsError(true);
            setErrorMessage('Не вдалося отримати точки навігації');
            setIsLoading(false);
        }
    }, [setRobots]);

    // Функция для обновления статуса робота
    const updateRobotStatus = useCallback((robotId: string, status: 'active' | 'idle' | 'charging' | 'maintenance') => {
        // Если это "Робот-сіяч 1", всегда сохраняем его в режиме обслуживания
        if (robotId === 'seeder-1') {
            status = 'maintenance';
        }

        setRobots(prevRobots =>
            prevRobots.map(robot =>
                robot.id === robotId ? { ...robot, status } : robot
            )
        );
    }, [setRobots]);

    // Функция для отправки команд роботам на бэкенд
    const sendRobotCommand = useCallback(async (robotId: string, command: string) => {
        try {
            // Проверяем, не является ли этот робот "Робот-сіяч 1" (seeder-1)
            // который всегда должен оставаться в режиме обслуживания
            if (robotId === 'seeder-1') {
                // Сразу возвращаемся для этого робота, не изменяя его состояние
                return;
            }

            // Обновляем статус робота в интерфейсе сразу
            if (command === 'start') {
                updateRobotStatus(robotId, 'active');
            } else if (command === 'stop') {
                updateRobotStatus(robotId, 'idle');
            } else if (command === 'charge') {
                updateRobotStatus(robotId, 'charging');
            }
        } catch (error) {
            console.error('Помилка відправки команди роботу:', error);
            setIsError(true);
            setErrorMessage('Не вдалося відправити команду');
        }
    }, [updateRobotStatus]);

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
            case 'Моніторинг посівів':
                setActionModalType('success');
                setActionModalTitle('Моніторинг посівів');
                setActionModalText(
                    'Моніторинг успішно виконано.\n' +
                    'Стан рослин: Здоровий\n' +
                    'Площа покриття: 16,8 га\n' +
                    'Виявлені проблеми: Немає'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Формування виноградних лоз':
                setActionModalType('info');
                setActionModalTitle('Формування виноградних лоз');
                // Определяем данные для процесса
                const vineFormationArea = robot.location.includes('Блок') ? robot.location : 'Блок';
                const vineFormationType = 'Двоплечий кордон';
                const vineVariety = 'Мерло';
                const vineCount = 120;
                const estimatedTime = '2 год 15 хв';

                // Информативное сообщение о процессе
                setActionModalText(
                    'Формування виноградних лоз почато:\n\n' +
                    '• Ділянка: ' + vineFormationArea + '\n' +
                    '• Сорт винограду: ' + vineVariety + '\n' +
                    '• Тип формування: ' + vineFormationType + '\n' +
                    '• Кількість лоз: ' + vineCount + '\n' +
                    '• Етап: Настройка обладнання\n' +
                    '• Розрахунковий час: ' + estimatedTime + '\n\n' +
                    'Поточний стан: Робот налаштовує ріжучі та формуючі механізми.'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);

                // Обновляем текущую задачу робота
                setRobots(prevRobots =>
                    prevRobots.map(r =>
                        r.id === robot.id
                            ? { ...r, currentTask: 'Формування лоз' }
                            : r
                    )
                );

                // Имитируем последовательность шагов процесса (каждые 10 секунд обновляем информацию)
                const formationSteps = [
                    'Налаштування ріжучих механізмів',
                    'Підготовка формуючих дротів',
                    'Початок формування центральних провідників',
                    'Формування бокових пагонів',
                    'Фіксація направляючих дротів'
                ];

                // Очищаем предыдущие таймеры, если они есть
                if (actionProgressRef.current) {
                    // @ts-ignore
                    clearInterval(actionProgressRef.current);
                    actionProgressRef.current = null;
                }

                let currentStep = 0;

                // Запускаем интервал для обновления информации о процессе
                // @ts-ignore
                const intervalId = setInterval(() => {
                    currentStep++;

                    if (currentStep < formationSteps.length) {
                        // Обновляем информацию о текущем шаге
                        setActionModalText(
                            'Формування виноградних лоз у процесі:\n\n' +
                            '• Ділянка: ' + vineFormationArea + '\n' +
                            '• Сорт винограду: ' + vineVariety + '\n' +
                            '• Тип формування: ' + vineFormationType + '\n' +
                            '• Кількість лоз: ' + vineCount + '\n' +
                            '• Етап ' + (currentStep + 1) + '/' + formationSteps.length + ': ' + formationSteps[currentStep] + '\n' +
                            '• Загальний прогрес: ' + Math.round((currentStep + 1) / formationSteps.length * 100) + '%\n\n' +
                            'Поточний стан: ' + formationSteps[currentStep]
                        );
                    } else {
                        // Завершаем процесс
                        clearInterval(intervalId);

                        setActionModalType('success');
                        setActionModalTitle('Формування виноградних лоз завершено');
                        setActionModalText(
                            'Формування лоз успішно завершено:\n\n' +
                            '• Ділянка: ' + vineFormationArea + '\n' +
                            '• Сформовано лоз: ' + vineCount + '\n' +
                            '• Тип формування: ' + vineFormationType + '\n' +
                            '• Фактичний час: ' + estimatedTime + '\n\n' +
                            'Всі лози сформовано згідно агротехнічних вимог. Система контролю схвалила якість виконання.'
                        );
                    }
                }, 10000); // Обновляем каждые 10 секунд

                // Сохраняем ID интервала для возможной очистки при размонтировании
                // @ts-ignore
                actionProgressRef.current = intervalId;

                // Добавляем ID таймера в массив для очистки при размонтировании
                timersRef.current.push(intervalId);
                break;
            case 'Обрізка':
                setActionModalType('info');
                setActionModalTitle('Обрізка виноградних лоз');

                // Определяем данные для процесса обрезки
                const pruningArea = robot.location.includes('Блок') ? robot.location : 'Блок 2';
                const pruningType = 'Коротка (на 2-4 вічка)';
                const plantStage = 'Період спокою';
                const vinesPlanned = 85;
                const pruningEstimatedTime = '1 год 40 хв';

                // Первое информативное сообщение о процессе
                setActionModalText(
                    'Підготовка до обрізки виноградних лоз:\n\n' +
                    '• Ділянка: ' + pruningArea + '\n' +
                    '• Тип обрізки: ' + pruningType + '\n' +
                    '• Стадія розвитку: ' + plantStage + '\n' +
                    '• Заплановано лоз: ' + vinesPlanned + '\n' +
                    '• Етап: Калібрування ріжучого механізму\n' +
                    '• Розрахунковий час: ' + pruningEstimatedTime + '\n\n' +
                    'Поточний стан: Робот налаштовує кут та силу різання.'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);

                // Обновляем текущую задачу робота
                setRobots(prevRobots =>
                    prevRobots.map(r =>
                        r.id === robot.id
                            ? { ...r, currentTask: 'Обрізка' }
                            : r
                    )
                );

                // Определяем шаги процесса обрезки
                const pruningSteps = [
                    'Сканування структури лози',
                    'Початок обрізки плодових пагонів',
                    'Формування вегетативних пагонів',
                    'Перевірка якості зрізу',
                    'Обробка зрізів захисним розчином'
                ];

                // Очищаем предыдущие таймеры, если они есть
                if (actionProgressRef.current) {
                    // @ts-ignore
                    clearInterval(actionProgressRef.current);
                    actionProgressRef.current = null;
                }

                let pruningStep = 0;

                // Запускаем интервал для обновления информации о процессе обрезки
                // @ts-ignore
                const pruningIntervalId = setInterval(() => {
                    pruningStep++;

                    if (pruningStep < pruningSteps.length) {
                        // Обновляем информацию о текущем шаге
                        setActionModalText(
                            'Обрізка виноградних лоз у процесі:\n\n' +
                            '• Ділянка: ' + pruningArea + '\n' +
                            '• Тип обрізки: ' + pruningType + '\n' +
                            '• Оброблено лоз: ' + Math.round(vinesPlanned * (pruningStep + 1) / pruningSteps.length) + ' з ' + vinesPlanned + '\n' +
                            '• Етап ' + (pruningStep + 1) + '/' + pruningSteps.length + ': ' + pruningSteps[pruningStep] + '\n' +
                            '• Загальний прогрес: ' + Math.round((pruningStep + 1) / pruningSteps.length * 100) + '%\n\n' +
                            'Поточний стан: ' + pruningSteps[pruningStep]
                        );
                    } else {
                        // Завершаем процесс
                        clearInterval(pruningIntervalId);

                        setActionModalType('success');
                        setActionModalTitle('Обрізка завершена');
                        setActionModalText(
                            'Обрізку виконано згідно з планом:\n\n' +
                            '• Ділянка: ' + pruningArea + '\n' +
                            '• Оброблено лоз: ' + vinesPlanned + '\n' +
                            '• Тип обрізки: ' + pruningType + '\n' +
                            '• Фактичний час: ' + pruningEstimatedTime + '\n\n' +
                            'Всі лози обрізано відповідно до агротехнічних вимог. Зрізи оброблено захисним розчином.'
                        );
                    }
                }, 8000); // Обновляем каждые 8 секунд

                // Сохраняем ID интервала для возможной очистки при размонтировании
                // @ts-ignore
                actionProgressRef.current = pruningIntervalId;

                // Добавляем ID таймера в массив для очистки при размонтировании
                timersRef.current.push(pruningIntervalId);
                break;
            case 'Фотографування':
                setActionModalType('info');
                setActionModalTitle('Останні знімки з дрона');
                setActionModalText('');
                setActionModalPhotos([
                    'https://elements-resized.envatousercontent.com/elements-video-cover-images/files/4f501f4b-3476-41cc-a4ab-528c83691dbc/inline_image_preview.jpg?w=500&cf_fit=cover&q=85&format=auto&s=821a9a3f2c63849fef83a0b6b9b758701f2889d369a97932ed7ec402116c529d',
                    'https://thumbs.dreamstime.com/b/%D0%B2%D0%B8%D0%B4-%D1%81-%D0%B4%D1%80%D0%BE%D0%BD%D0%B0-%D0%B4%D0%BB%D0%B8%D0%BD%D0%BD%D1%8B%D1%85-%D0%BF%D0%BB%D0%B0%D0%BD%D1%82%D0%B0%D1%86%D0%B8%D0%B9-%D1%81%D0%BF%D0%B5%D0%BB%D0%BE%D0%B3%D0%BE-%D0%B2%D0%B8%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%D0%B0-%D1%80%D0%B0%D1%81%D1%82%D1%8F%D0%BD%D1%83%D1%82%D0%BE%D0%B3%D0%BE-%D0%BF%D0%BE-%D1%88%D0%B8%D1%80%D0%B8%D0%BD%D0%B5-290020862.jpg',
                    'https://media.istockphoto.com/id/1837458117/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%B1%D0%B0%D1%80%D0%BE%D0%BB%D0%BE-%D0%BD%D0%B5%D0%B1%D0%B1%D0%B8%D0%BE%D0%BB%D0%BE-%D0%B3%D1%80%D0%BE%D0%B7%D0%B4%D1%8C-%D0%B2%D0%B8%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%D0%B0.jpg?s=612x612&w=0&k=20&c=CUYDNNXdD9qyMmiEQ4KIrTRZxW3TsnxKn1Pmdu6eBpM='
                ]);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Зробити знімки':
                setActionModalType('info');
                setActionModalTitle('Знімки з дрона');
                setActionModalText('');
                setActionModalPhotos([
                    'https://elements-resized.envatousercontent.com/elements-video-cover-images/files/4f501f4b-3476-41cc-a4ab-528c83691dbc/inline_image_preview.jpg?w=500&cf_fit=cover&q=85&format=auto&s=821a9a3f2c63849fef83a0b6b9b758701f2889d369a97932ed7ec402116c529d',
                    'https://thumbs.dreamstime.com/b/%D0%B2%D0%B8%D0%B4-%D1%81-%D0%B4%D1%80%D0%BE%D0%BD%D0%B0-%D0%B4%D0%BB%D0%B8%D0%BD%D0%BD%D1%8B%D1%85-%D0%BF%D0%BB%D0%B0%D0%BD%D1%82%D0%B0%D1%86%D0%B8%D0%B9-%D1%81%D0%BF%D0%B5%D0%BB%D0%BE%D0%B3%D0%BE-%D0%B2%D0%B8%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%D0%B0-%D1%80%D0%B0%D1%81%D1%82%D1%8F%D0%BD%D1%83%D1%82%D0%BE%D0%B3%D0%BE-%D0%BF%D0%BE-%D1%88%D0%B8%D1%80%D0%B8%D0%BD%D0%B5-290020862.jpg',
                    'https://media.istockphoto.com/id/1837458117/ru/%D1%84%D0%BE%D1%82%D0%BE/%D0%B1%D0%B0%D1%80%D0%BE%D0%BB%D0%BE-%D0%BD%D0%B5%D0%B1%D0%B1%D0%B8%D0%BE%D0%BB%D0%BE-%D0%B3%D1%80%D0%BE%D0%B7%D0%B4%D1%8C-%D0%B2%D0%B8%D0%BD%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%D0%B0.jpg?s=612x612&w=0&k=20&c=CUYDNNXdD9qyMmiEQ4KIrTRZxW3TsnxKn1Pmdu6eBpM='
                ]);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Підготовка до збору врожаю':
                setActionModalType('success');
                setActionModalTitle('Підготовка до збору врожаю');
                setActionModalText(
                    'Підготовку успішно завершено:\n\n' +
                    '• Перевірено систему збору: 100%\n' +
                    '• Калібровано ріжучі механізми\n' +
                    '• Перевірено бункери для зберігання\n' +
                    '• Підготовлено сортувальні конвеєри\n\n' +
                    'Блок готовий до збору. Очікувана продуктивність: 540 кг/год.'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);
                break;
            case 'Збір винограду':
                setActionModalType('info');
                setActionModalTitle('Збір винограду');
                setActionModalText(
                    'Розпочато збір винограду:\n\n' +
                    '• Сорт: Каберне Совіньйон\n' +
                    '• Ділянка: Блок ' + (robot.location.includes('Блок') ? robot.location.split(' ')[1] : 'B') + '\n' +
                    '• Запланована площа: 0.8 га\n' +
                    '• Очікуваний урожай: ~490 кг\n' +
                    '• Розрахунковий час: 1 год 15 хв\n\n' +
                    'Процес збору врожаю розпочато.'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);

                // Обновляем текущую задачу робота
                setRobots(prevRobots =>
                    prevRobots.map(r =>
                        r.id === robot.id
                            ? { ...r, currentTask: 'Збір винограду' }
                            : r
                    )
                );
                break;
            case 'Транспортування':
                setActionModalType('info');
                setActionModalTitle('Транспортування');
                setActionModalText(
                    'Підготовка до транспортування винограду:\n\n' +
                    '• Завантаження: 485 кг винограду\n' +
                    '• Місце призначення: Центр переробки\n' +
                    '• Встановлена температура: 14°C\n' +
                    '• Оптимальна вологість: 75%\n' +
                    '• Розрахунковий час доставки: 22 хв\n\n' +
                    'Транспортування розпочато. Робот вирушає до центру переробки.'
                );
                setActionModalPhotos(null);
                setActionProgress(null);
                setActionModalOpen(true);

                // Обновляем текущую задачу робота
                setRobots(prevRobots =>
                    prevRobots.map(r =>
                        r.id === robot.id
                            ? { ...r, currentTask: 'Транспортування винограду' }
                            : r
                    )
                );
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
        // Получаем все имеющиеся блоки, включая "Блок 2", "Блок 3" и т.д.
        const availableBlocks = navigationPoints.filter(point => point.includes('Блок'));

        // Обновляем текущую задачу для всех роботов и случайно распределяем по блокам
        setRobots(prev => prev.map(r => {
            // Если есть доступные блоки и робот не на обслуживании
            if (availableBlocks.length > 0 && r.status !== 'maintenance' &&
                r.location !== 'Станція зарядки' && r.location !== 'Технічний відсік') {
                // Выбираем случайный блок
                const randomBlock = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];
                return {
                    ...r,
                    location: randomBlock,
                    currentTask: 'Перевірка системи'
                };
            }
            return {
                ...r,
                currentTask: 'Перевірка системи'
            };
        }));

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

                    // Сбрасываем задачу после завершения
                    setRobots(prev => prev.map(r =>
                        r.currentTask === 'Перевірка системи' ? { ...r, currentTask: undefined } : r
                    ));
                }, 500);
            } else {
                setActionProgress(progress);
            }
        }, 80);
    }, [setRobots]);

    const handleChargeAll = useCallback(() => {
        // Получаем все имеющиеся блоки, включая "Блок 2", "Блок 3" и т.д.
        const availableBlocks = navigationPoints.filter(point => point.includes('Блок'));

        setRobots(prev => prev.map(r => {
            // Если робот не на обслуживании и его батарея ниже 90%
            if (r.status !== 'maintenance' && r.battery < 90) {
                // Если есть доступные блоки и робот не на станции зарядки или в техническом отсеке
                if (availableBlocks.length > 0 &&
                    r.location !== 'Станція зарядки' &&
                    r.location !== 'Технічний відсік') {
                    // Выбираем случайный блок
                    const randomBlock = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];
                    return {
                        ...r,
                        status: 'charging',
                        currentTask: 'Зарядка',
                        location: randomBlock
                    };
                }
                return { ...r, status: 'charging', currentTask: 'Зарядка' };
            }
            return r;
        }));

        setActionModalType('success');
        setActionModalTitle('Зарядка розпочата');
        setActionModalText('Всі доступні роботи відправлені на зарядку та перерозподілені по блоках.');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);
    }, [setRobots, navigationPoints]);

    const handleLocateAll = useCallback(() => {
        // Получаем все имеющиеся блоки, включая "Блок 2", "Блок 3" и т.д.
        const availableBlocks = navigationPoints.filter(point => point.includes('Блок'));

        // Обновляем текущую задачу для всех роботов и перераспределяем по блокам
        setRobots(prev => prev.map(r => {
            // Если робот не на обслуживании
            if (r.status !== 'maintenance') {
                // Если есть доступные блоки и робот не на станции зарядки или в техническом отсеке
                if (availableBlocks.length > 0 &&
                    r.location !== 'Станція зарядки' &&
                    r.location !== 'Технічний відсік') {
                    // Выбираем случайный блок
                    const randomBlock = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];
                    return {
                        ...r,
                        currentTask: 'Локалізація',
                        location: randomBlock
                    };
                }
                return { ...r, currentTask: 'Локалізація' };
            }
            return r;
        }));

        setActionModalType('success');
        setActionModalTitle('Локалізація виконана');
        setActionModalText('Всі роботи локалізовано та перерозподілено по блоках. Останні координати отримано.');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);

        // Через 3 секунды убираем задачу локализации
        setTimeout(() => {
            setRobots(prev => prev.map(r =>
                r.currentTask === 'Локалізація' ? { ...r, currentTask: undefined } : r
            ));
        }, 3000);
    }, [setRobots, navigationPoints]);

    const handleEmergencyStop = useCallback(() => {
        // Получаем все имеющиеся блоки, включая "Блок 2", "Блок 3" и т.д.
        const availableBlocks = navigationPoints.filter(point => point.includes('Блок'));

        setRobots(prev => prev.map(r => {
            // Если робот не на обслуживании
            if (r.status !== 'maintenance') {
                // Если есть доступные блоки и робот не на станции зарядки или техническом отсеке
                if (availableBlocks.length > 0 &&
                    r.location !== 'Станція зарядки' &&
                    r.location !== 'Технічний відсік') {
                    // Выбираем случайный блок
                    const randomBlock = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];
                    return {
                        ...r,
                        status: 'idle',
                        currentTask: 'Аварійна зупинка',
                        location: randomBlock
                    };
                }
                return { ...r, status: 'idle', currentTask: 'Аварійна зупинка' };
            }
            return r;
        }));

        setActionModalType('error');
        setActionModalTitle('Аварійна зупинка');
        setActionModalText('Всі доступні роботи зупинено та перерозподілено!');
        setActionModalPhotos(null);
        setActionProgress(null);
        setActionModalOpen(true);
    }, [setRobots, navigationPoints]);

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

    // Функция для обновления локации робота после навигации
    const handleNavigationComplete = useCallback(() => {
        if (navigationRobot && navigationTarget && navigationStep === 'confirm') {
            // Обновляем локацию робота
            setRobots(prevRobots => {
                const updatedRobots = prevRobots.map(robot =>
                    robot.id === navigationRobot.id
                        ? { ...robot, location: navigationTarget, currentTask: `Рух до ${navigationTarget}` }
                        : robot
                );

                // Сохраняем обновленные локации в localStorage
                try {
                    const userKey = localStorage.getItem('user_id') || 'guest';
                    const robotLocationsKey = 'vineguard_robot_locations_' + userKey;

                    // Создаем объект с локациями роботов для сохранения
                    const robotLocations = updatedRobots.reduce((acc, robot) => {
                        acc[robot.id] = {
                            location: robot.location,
                            lastUpdated: new Date().toISOString()
                        };
                        return acc;
                    }, {} as Record<string, { location: string, lastUpdated: string }>);

                    localStorage.setItem(robotLocationsKey, JSON.stringify(robotLocations));
                } catch (error) {
                    console.error('Ошибка при сохранении локаций роботов в localStorage:', error);
                }

                return updatedRobots;
            });

            // После успешного обновления сбрасываем состояние навигации
            setNavigationRobot(null);
            setNavigationTarget('');
            setNavigationStep('select');
        }

        // Закрываем модальное окно навигации
        setNavigationModalOpen(false);
    }, [navigationRobot, navigationTarget, navigationStep, setRobots]);

    // Функция для фильтрации роботов по выбранной вкладке
    const getFilteredRobots = useCallback(() => {
        // Получаем данные пользователя
        const userData = getUserData();
        const isDemo = userData && userData.role === 'demo';

        // Если это демо-аккаунт, показываем только определенных роботов
        if (isDemo) {
            const allowedRobots = ['Дрон-розвідник 1', 'Робот-комбайн 1', 'Робот-сіяч 1'];
            const demoRobots = deviceRobots.filter(robot => allowedRobots.includes(robot.name));

            return selectedTab === 'all'
                ? demoRobots
                : demoRobots.filter(robot => robot.category === selectedTab);
        }

        // Обычная фильтрация для не-демо аккаунтов
        return selectedTab === 'all'
            ? deviceRobots
            : deviceRobots.filter(robot => robot.category === selectedTab);
    }, [selectedTab, deviceRobots]);

    // Эффект для установки робота "Робот-сіяч 1" в режим обслуживания при инициализации
    useEffect(() => {
        // Находим "Робот-сіяч 1" и обеспечиваем его нахождение в режиме обслуживания
        const seedRobot = deviceRobots.find(robot => robot.id === 'seeder-1');
        if (seedRobot && seedRobot.status !== 'maintenance') {
            updateRobotStatus('seeder-1', 'maintenance');
        }
    }, [deviceRobots, updateRobotStatus]);

    // Эффект для привязки роботов к Блоку 3
    useEffect(() => {
        // Проверяем "Дрон-розвідник 2" и "Робот-технік 1" и привязываем их к Блоку 3,
        // если они не находятся на зарядке или в техническом отсеке
        setRobots(prevRobots => {
            const updatedRobots = [...prevRobots];
            let changed = false;

            prevRobots.forEach((robot, index) => {
                // Проверяем только нужных роботов
                if (robot.name === 'Дрон-розвідник 2' || robot.name === 'Робот-технік 1') {
                    // Не меняем локацию, если робот на зарядке или в техническом отсеке
                    if (robot.location !== 'Станція зарядки' &&
                        robot.location !== 'Технічний відсік' &&
                        robot.location !== 'Блок 3') {

                        updatedRobots[index] = {
                            ...robot,
                            location: 'Блок 3'
                        };
                        changed = true;
                    }
                }
            });

            return changed ? updatedRobots : prevRobots;
        });
    }, [deviceRobots, setRobots]);

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
        handleNavigationComplete,
        getFilteredRobots,
        sendRobotCommand
    };
}; 