import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import calibrationApi, { CalibrationStatus } from '../services/api/calibrationApi';
import useSensorData from '../hooks/useSensorData';

interface SensorWithStatus {
    id: string;
    name: string;
    type: string;
    status: string;
    connectionStatus: 'online' | 'offline';
}

const CalibratePage: React.FC = () => {
    // Состояния страницы
    const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
    const [calibrated, setCalibrated] = useState<string[]>([]);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus | null>(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [pollingInterval, setPollingInterval] = useState<number | null>(null);

    // Получаем данные о датчиках из хука useSensorData
    const { latestSensorData, isConnected } = useSensorData();

    // Преобразуем данные датчиков в формат для отображения
    const sensors: SensorWithStatus[] = Object.values(latestSensorData).map(sensor => {
        // Перевод типов датчиков на украинский язык
        const typesTranslation: Record<string, string> = {
            'temperature': 'Температура',
            'humidity': 'Вологість повітря',
            'soil_moisture': 'Вологість ґрунту',
            'soil_temperature': 'Темп. ґрунту',
            'light': 'Освітленість',
            'ph': 'Кислотність pH',
            'wind_speed': 'Швидкість вітру',
            'wind_direction': 'Напрямок вітру',
            'rainfall': 'Опади',
            'co2': 'Рівень CO₂'
        };

        return {
            id: sensor.sensor_id,
            name: `${typesTranslation[sensor.type] || sensor.type} #${sensor.sensor_id.split('_').pop()}`,
            type: sensor.type,
            status: sensor.status,
            connectionStatus: 'online' // Все датчики, которые есть в latestSensorData, считаем онлайн
        };
    });

    // Получаем информацию о завершенных калибровках при загрузке страницы
    useEffect(() => {
        const loadCalibrations = async () => {
            try {
                console.log('Загрузка информации о калибровках...');
                const response = await calibrationApi.getAllCalibrations();
                console.log('Получен ответ о калибровках:', response);

                if (response.success && response.data) {
                    // Собираем ID датчиков с завершенной калибровкой
                    const completedSensorIds = response.data
                        .filter((cal: CalibrationStatus) => cal.status === 'completed')
                        .map((cal: CalibrationStatus) => cal.sensor_id);

                    console.log('Найдены завершенные калибровки для датчиков:', completedSensorIds);
                    setCalibrated(completedSensorIds);
                }
            } catch (err) {
                console.error('Error loading calibrations:', err);
            }
        };

        loadCalibrations();

        // Очистка интервалов при размонтировании
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        };
    }, [pollingInterval]);

    // Функция для периодического опроса статуса калибровки
    const startPollingStatus = useCallback((sensorId: string) => {
        // Сначала очищаем существующий интервал
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }

        // Создаем новый интервал для опроса
        const intervalId = window.setInterval(async () => {
            try {
                const response = await calibrationApi.getCalibrationStatus(sensorId);
                if (response.success && response.data) {
                    const status = response.data;

                    setCalibrationStatus(status);
                    setProgress(status.progress);

                    // Если калибровка завершена или провалена, останавливаем опрос
                    if (status.status === 'completed' || status.status === 'failed') {
                        clearInterval(intervalId);
                        setPollingInterval(null);
                        setIsCalibrating(false);

                        if (status.status === 'completed') {
                            setCalibrated(prev => [...prev, sensorId]);
                        }
                    }
                }
            } catch (err) {
                console.error(`Error polling calibration status for sensor ${sensorId}:`, err);
                clearInterval(intervalId);
                setPollingInterval(null);
                setIsCalibrating(false);
                setError(`Помилка при отриманні статусу калібрування: ${err}`);
            }
        }, 1000); // Уменьшаем интервал опроса с 3000 до 1000 мс для более плавного обновления

        setPollingInterval(intervalId);
    }, [pollingInterval]);

    // Функция запуска калибровки
    const startCalibration = async () => {
        if (!selectedSensor) return;

        try {
            setIsCalibrating(true);
            setProgress(0);
            setError(null);

            // Находим тип выбранного датчика
            const sensorType = sensors.find(s => s.id === selectedSensor)?.type;

            // Запускаем калибровку
            const response = await calibrationApi.startCalibration(selectedSensor, sensorType);

            if (response.success && response.data) {
                setCalibrationStatus(response.data);
                startPollingStatus(selectedSensor);
            } else {
                setError('Не вдалося запустити калібрування');
                setIsCalibrating(false);
            }
        } catch (err) {
            console.error(`Error starting calibration for sensor ${selectedSensor}:`, err);
            setError(`Помилка при запуску калібрування: ${err}`);
            setIsCalibrating(false);
        }
    };

    // Переводим статус состояния подключения на украинский
    const translateConnectionStatus = (status: string) => {
        return status === 'online' ? 'В мережі' : 'Не в мережі';
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-inter">
                        Калібрування датчиків
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Налаштування та калібрування датчиків системи для підвищення точності вимірювань
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
                    <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <div>{error}</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1">
                    <Card title="Доступні пристрої" className="h-full">
                        {!isConnected ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="animate-spin mr-2 text-primary" size={20} />
                                <span>Підключення до сервера...</span>
                            </div>
                        ) : sensors.length > 0 ? (
                            <div className="space-y-2">
                                {sensors.map(sensor => (
                                    <button
                                        key={sensor.id}
                                        onClick={() => setSelectedSensor(sensor.id)}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${selectedSensor === sensor.id
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                            }`}
                                        disabled={isCalibrating}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{sensor.name}</span>
                                            {calibrated.includes(sensor.id) && (
                                                <CheckCircle size={18} className="text-green-500" />
                                            )}
                                        </div>
                                        <div className="text-sm mt-1 opacity-90">
                                            {sensor.type} • {translateConnectionStatus(sensor.connectionStatus)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <AlertCircle className="mb-2" size={24} />
                                <p>Немає доступних датчиків</p>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card title="Калібрування" className="h-full">
                        {selectedSensor ? (
                            <div>
                                <h3 className="text-lg font-medium mb-2">
                                    {sensors.find(s => s.id === selectedSensor)?.name}
                                </h3>
                                {isCalibrating ? (
                                    <div>
                                        <div className="mb-4">
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between mt-1 text-sm text-gray-500">
                                                <span></span>
                                                <span>{progress}%</span>
                                                <span></span>
                                            </div>
                                        </div>
                                        <div className="text-gray-700 mb-4">
                                            {calibrationStatus?.message || 'Калібрування в процесі...'}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (pollingInterval) {
                                                    clearInterval(pollingInterval);
                                                    setPollingInterval(null);
                                                }
                                                setIsCalibrating(false);
                                                setCalibrationStatus(null);
                                            }}
                                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                                        >
                                            Скасувати
                                        </button>
                                    </div>
                                ) : calibrated.includes(selectedSensor) ? (
                                    <div>
                                        <div className="flex items-center text-green-600 mb-3">
                                            <CheckCircle className="mr-2" size={20} />
                                            <span>Калібрування успішно завершено</span>
                                        </div>
                                        {calibrationStatus?.adjustment_value && (
                                            <p className="text-gray-600 text-sm">
                                                Застосовано корегувальний коефіцієнт: {calibrationStatus.adjustment_value}
                                            </p>
                                        )}
                                        <button
                                            onClick={async () => {
                                                if (!selectedSensor) return;

                                                try {
                                                    const response = await calibrationApi.resetCalibration(selectedSensor);
                                                    if (response.success && response.data.success) {
                                                        setCalibrated(prev => prev.filter(id => id !== selectedSensor));
                                                        setCalibrationStatus(null);
                                                    } else {
                                                        setError('Не вдалося скинути калібрування');
                                                    }
                                                } catch (err) {
                                                    console.error(`Error resetting calibration for sensor ${selectedSensor}:`, err);
                                                    setError(`Помилка при скиданні калібрування: ${err}`);
                                                }
                                            }}
                                            className="mt-3 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                                        >
                                            Скинути калібрування
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={startCalibration}
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                                    >
                                        Почати калібрування
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-12">
                                Виберіть пристрій зі списку зліва для початку калібрування
                            </p>
                        )}
                    </Card>
                </div>
            </div>

            <Card title="Рекомендації з калібрування" className="mb-8">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Для досягнення найкращих результатів, рекомендуємо:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600">
                        <li>Проводити калібрування кожні 3 місяці</li>
                        <li>Уникати калібрування під час екстремальних погодних умов</li>
                        <li>Переконатися, що батарея пристрою заряджена не менше ніж на 50%</li>
                        <li>Зберігати стабільне підключення пристрою до мережі під час калібрування</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default CalibratePage; 