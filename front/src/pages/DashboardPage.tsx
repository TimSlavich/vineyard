import React, { useEffect, useState, useMemo } from 'react';
import SensorCard from '../components/ui/SensorCard';
import WeatherCard from '../components/dashboard/WeatherCard';
import AlertsCard from '../components/dashboard/AlertsCard';
import LineChart from '../components/charts/LineChart';
import ComparativeChart from '../components/charts/ComparativeChart';
import Card from '../components/ui/Card';
import { ChevronRight, ArrowUpRight, RefreshCw, ActivitySquare, Settings2, FileText } from 'lucide-react';
import { weatherData as mockWeatherData } from '../data/mockData';
import { Link } from 'react-router-dom';
import useSensorData, { SensorData } from '../hooks/useSensorData';
import websocketService from '../services/websocketService';
import { getUserData } from '../utils/storage';

// Типы датчиков
const SENSOR_TYPES = {
    TEMPERATURE: 'temperature',
    HUMIDITY: 'humidity',
    SOIL_MOISTURE: 'soil_moisture',
    SOIL_TEMPERATURE: 'soil_temperature',
    LIGHT: 'light',
    PH: 'ph',
    WIND_SPEED: 'wind_speed',
    WIND_DIRECTION: 'wind_direction',
    RAINFALL: 'rainfall',
    CO2: 'co2'
};

// Преобразование данных датчиков в удобный формат
const transformSensorData = (sensor: SensorData) => {
    return {
        id: sensor.sensor_id,
        type: sensor.type as string,
        value: Number(sensor.value.toFixed(2)),
        unit: sensor.unit,
        timestamp: sensor.timestamp,
        status: sensor.status,
        location: {
            id: sensor.location_id,
            name: `Локація ${sensor.location_id.split('_').pop()}`
        }
    };
};

const DashboardPage: React.FC = () => {
    const {
        latestSensorData,
        sensorData: allSensorData,
        isConnected
    } = useSensorData();

    // Состояние для отслеживания процесса обновления данных
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Функция для ручного обновления данных
    const handleRefreshData = () => {
        if (!isConnected) {
            return;
        }

        setIsRefreshing(true);
        websocketService.requestSensorData();

        setTimeout(() => {
            setIsRefreshing(false);
        }, 3000);
    };

    // Получаем список всех датчиков в формате для компонентов
    const allReadings = Object.values(latestSensorData).map(transformSensorData);

    const [favoriteSensors, setFavoriteSensors] = useState<string[]>(() => {
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const favoritesKey = `favoriteSensors_${userId}`;
        const saved = localStorage.getItem(favoritesKey);
        return saved ? JSON.parse(saved) : [];
    });

    // Валидные ключи сенсоров
    const validSensorKeys = allReadings.map(reading => `${reading.type}_${reading.location.id}`);

    // Проверка на корректность ключей при загрузке
    useEffect(() => {
        const userData = getUserData();
        const userId = userData?.id || 'guest';
        const favoritesKey = `favoriteSensors_${userId}`;

        const validFavorites = favoriteSensors.filter(favoriteId =>
            validSensorKeys.includes(favoriteId)
        );

        if (validFavorites.length !== favoriteSensors.length) {
            setFavoriteSensors(validFavorites);
            localStorage.setItem(favoritesKey, JSON.stringify(validFavorites));
        }
    }, [favoriteSensors, validSensorKeys]);

    // Получаем только избранные датчики
    const favoriteReadings = allReadings.filter(reading => {
        const fullId = `${reading.type}_${reading.location.id}`;
        return favoriteSensors.includes(fullId);
    });

    // Если у пользователя нет избранных датчиков, показываем первые 5 датчиков
    const displayReadings = favoriteReadings.length > 0 ? favoriteReadings : allReadings.slice(0, 5);

    // Прокрутка страницы вверх при загрузке компонента
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Обработка данных для графиков
    const processChartData = (sensorData: SensorData[], sensorType: string) => {
        const filteredSensors = sensorData.filter(reading => reading.type === sensorType);

        // Группируем данные по временной метке (округляем до минуты)
        const groupedByTimestamp: Record<string, number[]> = {};

        filteredSensors.forEach(reading => {
            const date = new Date(reading.timestamp);
            const timestampKey = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate(),
                date.getHours(),
                date.getMinutes()
            ).toISOString();

            if (!groupedByTimestamp[timestampKey]) {
                groupedByTimestamp[timestampKey] = [];
            }

            groupedByTimestamp[timestampKey].push(reading.value);
        });

        // Вычисляем среднее значение для каждой временной метки
        const averagedData = Object.entries(groupedByTimestamp).map(([timestamp, values]) => {
            const sum = values.reduce((acc, value) => acc + value, 0);
            const average = values.length > 0 ? sum / values.length : 0;

            return {
                value: Number(average.toFixed(2)),
                timestamp,
                count: values.length
            };
        });

        // Сортируем по времени и берем последние 24 записи
        return averagedData
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-24);
    };

    // Данные для графиков
    const temperatureData = processChartData(allSensorData, SENSOR_TYPES.TEMPERATURE);
    const soilMoistureData = processChartData(allSensorData, SENSOR_TYPES.SOIL_MOISTURE);
    const humidityData = processChartData(allSensorData, SENSOR_TYPES.HUMIDITY);

    // Данные для сравнительного графика
    const comparativeChartSeries = [
        {
            id: 'temperature',
            name: 'Температура',
            data: temperatureData,
            color: '#F59E0B',
            unit: '°C'
        },
        {
            id: 'humidity',
            name: 'Вологість повітря',
            data: humidityData,
            color: '#3B82F6',
            unit: '%'
        }
    ];

    // Ключ для збереження прогнозу погоди і часу його оновлення
    const WEATHER_FORECAST_KEY = 'vineguard_weather_forecast';
    const WEATHER_FORECAST_TIMESTAMP_KEY = 'vineguard_weather_forecast_timestamp';

    // Завантажуємо збережений прогноз погоди або використовуємо дані з mockWeatherData
    const [weatherData, setWeatherData] = useState(() => {
        try {
            // Отримуємо збережений прогноз погоди і timestamp останнього оновлення
            const savedForecast = localStorage.getItem(WEATHER_FORECAST_KEY);
            const savedTimestamp = localStorage.getItem(WEATHER_FORECAST_TIMESTAMP_KEY);

            if (savedForecast && savedTimestamp) {
                const forecast = JSON.parse(savedForecast);
                const timestamp = parseInt(savedTimestamp, 10);
                const now = new Date().getTime();

                // Перевіряємо, чи минуло менше 24 годин з моменту останнього оновлення
                // 86400000 = 24 години в мілісекундах
                if (now - timestamp < 86400000) {
                    return forecast;
                }
            }

            // Якщо немає збереженого прогнозу або він застарів, використовуємо mockWeatherData
            // І зберігаємо новий прогноз
            localStorage.setItem(WEATHER_FORECAST_KEY, JSON.stringify(mockWeatherData));
            localStorage.setItem(WEATHER_FORECAST_TIMESTAMP_KEY, new Date().getTime().toString());
            return mockWeatherData;
        } catch (error) {
            console.error('Помилка завантаження прогнозу погоди:', error);
            return mockWeatherData;
        }
    });

    // Перевіряємо необхідність оновлення прогнозу погоди при завантаженні компонента
    useEffect(() => {
        try {
            const savedTimestamp = localStorage.getItem(WEATHER_FORECAST_TIMESTAMP_KEY);
            if (savedTimestamp) {
                const timestamp = parseInt(savedTimestamp, 10);
                const now = new Date().getTime();

                // Якщо минуло більше 24 годин, оновлюємо прогноз
                if (now - timestamp >= 86400000) {
                    // В реальному додатку тут був би API запит
                    // Для прикладу просто оновлюємо з mockWeatherData з невеликими змінами
                    const updatedWeatherData = {
                        ...mockWeatherData,
                        forecast: mockWeatherData.forecast.map(day => ({
                            ...day,
                            temperature: {
                                min: day.temperature.min + Math.floor(Math.random() * 3) - 1,
                                max: day.temperature.max + Math.floor(Math.random() * 3) - 1
                            },
                            precipitation: Math.max(0, Math.min(100, day.precipitation + Math.floor(Math.random() * 20) - 10))
                        }))
                    };

                    setWeatherData(updatedWeatherData);
                    localStorage.setItem(WEATHER_FORECAST_KEY, JSON.stringify(updatedWeatherData));
                    localStorage.setItem(WEATHER_FORECAST_TIMESTAMP_KEY, now.toString());
                }
            }
        } catch (error) {
            console.error('Помилка оновлення прогнозу погоди:', error);
        }
    }, []);

    // Оновлюємо погодні дані з показань датчиків
    const weatherDataWithRealTemperature = useMemo(() => {
        // Отримуємо останні дані з датчика температури
        const temperatureSensors = Object.values(latestSensorData)
            .filter(sensor => sensor.type === SENSOR_TYPES.TEMPERATURE);

        // Отримуємо останні дані з датчика вологості
        const humiditySensors = Object.values(latestSensorData)
            .filter(sensor => sensor.type === SENSOR_TYPES.HUMIDITY);

        // Отримуємо останні дані з датчика швидкості вітру
        const windSensors = Object.values(latestSensorData)
            .filter(sensor => sensor.type === SENSOR_TYPES.WIND_SPEED);

        // Отримуємо останні дані з датчика напрямку вітру
        const windDirectionSensors = Object.values(latestSensorData)
            .filter(sensor => sensor.type === SENSOR_TYPES.WIND_DIRECTION);

        // Визначаємо середню температуру, якщо є дані з датчиків
        let currentTemperature = weatherData.current.temperature;
        if (temperatureSensors.length > 0) {
            const tempSum = temperatureSensors.reduce((sum, sensor) => sum + sensor.value, 0);
            currentTemperature = Math.round(tempSum / temperatureSensors.length);
        }

        // Визначаємо середню вологість, якщо є дані з датчиків
        let currentHumidity = weatherData.current.humidity;
        if (humiditySensors.length > 0) {
            const humiditySum = humiditySensors.reduce((sum, sensor) => sum + sensor.value, 0);
            currentHumidity = Math.round(humiditySum / humiditySensors.length);
        }

        // Визначаємо середню швидкість вітру, якщо є дані з датчиків
        let currentWindSpeed = weatherData.current.windSpeed;
        if (windSensors.length > 0) {
            const windSum = windSensors.reduce((sum, sensor) => sum + sensor.value, 0);
            currentWindSpeed = Math.round(windSum / windSensors.length);
        }

        // Визначаємо напрямок вітру, якщо є дані з датчиків
        let currentWindDirection = weatherData.current.windDirection;
        if (windDirectionSensors.length > 0) {
            // Беремо останній датчик напрямку вітру
            const lastWindDirectionSensor = windDirectionSensors[windDirectionSensors.length - 1];
            // Тут у нас може бути текстове значення або числове
            if (typeof lastWindDirectionSensor.value === 'number') {
                // Перетворюємо числове значення напрямку (градуси) в текстовий формат (N, NE, E, SE, S, SW, W, NW)
                const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
                const index = Math.round(lastWindDirectionSensor.value / 45) % 8;
                currentWindDirection = directions[index];
            } else {
                currentWindDirection = String(lastWindDirectionSensor.value);
            }
        }

        // Повертаємо оновлені погодні дані
        return {
            ...weatherData,
            current: {
                ...weatherData.current,
                temperature: currentTemperature,
                humidity: currentHumidity,
                windSpeed: currentWindSpeed,
                windDirection: currentWindDirection
            }
        };
    }, [latestSensorData, isConnected, weatherData]);

    return (
        <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
                    Панель керування виноградником
                </h1>
                <div className="flex justify-between items-center">
                    <p className="text-gray-600 font-roboto">
                        Моніторинг стану вашого виноградника та даних датчиків у реальному часі
                        {isConnected ?
                            <span className="ml-2 text-green-600 text-sm">(підключено)</span> :
                            <span className="ml-2 text-error text-sm">(не підключено)</span>
                        }
                    </p>
                    <button
                        onClick={handleRefreshData}
                        disabled={isRefreshing || !isConnected}
                        className={`flex items-center gap-2 px-4 py-2 rounded ${isRefreshing
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-primary-dark'
                            }`}
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        {isRefreshing ? 'Оновлення...' : 'Оновити дані'}
                    </button>
                </div>
            </div>

            {/* Показания датчиков */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 font-inter">
                            {favoriteSensors.length > 0 ? "Основні датчики" : "Поточні показники"}
                        </h2>
                        {favoriteSensors.length > 0 && (
                            <p className="text-gray-500 text-sm mt-1">
                                Вибрано основних датчиків: <span className="font-medium">{favoriteSensors.length}/10</span>
                            </p>
                        )}
                    </div>
                    <Link to="/all-sensors" className="text-primary flex items-center text-sm hover:underline">
                        {favoriteSensors.length > 0 ? "Керування датчиками" : "Переглянути всі датчики"} <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayReadings.map((reading, index) => {
                        // Получаем историю показаний для этого датчика
                        const sensorHistory = allSensorData.filter(
                            data => data.sensor_id === reading.id && data.type === reading.type
                        );

                        // Преобразуем историю показаний в формат для SensorCard
                        const formattedHistory = sensorHistory.map(data => ({
                            ...data,
                            id: data.sensor_id,
                            location: reading.location
                        }));

                        return (
                            <SensorCard
                                key={`sensor-${reading.id}-${index}`}
                                data={reading}
                                previousData={formattedHistory}
                            />
                        );
                    })}
                    {displayReadings.length === 0 && Object.keys(latestSensorData).length === 0 && (
                        <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600 font-medium">Очікування даних з датчиків...</p>
                            <p className="text-gray-500 mt-2">Дані оновлюються кожні 10 секунд</p>
                        </div>
                    )}
                    {displayReadings.length === 0 && Object.keys(latestSensorData).length > 0 && (
                        <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600 font-medium">Немає вибраних датчиків</p>
                            <p className="text-gray-500 mt-2">Перейдіть до списку всіх датчиків, щоб вибрати основні</p>
                            <Link
                                to="/all-sensors"
                                className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                            >
                                Вибрати датчики
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Графики и дополнительная информация */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                    <LineChart
                        key="dashboard-temperature-chart"
                        title="Температура (Останні 24 години)"
                        data={temperatureData}
                        color="#F59E0B"
                        unit="°C"
                        height={280}
                        noDataMessage="Очікування даних температури..."
                    />
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-1">
                    <WeatherCard data={weatherDataWithRealTemperature} />
                </div>
            </div>

            {/* График влажности почвы */}
            <div className="mb-12">
                <LineChart
                    key="dashboard-soilmoisture-chart"
                    title="Вологість ґрунту (Останні 24 години)"
                    data={soilMoistureData}
                    color="#10B981"
                    unit="%"
                    height={240}
                    noDataMessage="Очікування даних вологості ґрунту..."
                />
            </div>

            {/* Сравнительный график температуры и влажности воздуха */}
            <div className="mb-12">
                <ComparativeChart
                    key="dashboard-comparative-chart"
                    title="Порівняння температури та вологості повітря (Останні 24 години)"
                    series={comparativeChartSeries}
                    height={300}
                    noDataMessage="Очікування даних для порівняльного графіка..."
                />
            </div>

            {/* Уведомления и статус устройств */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AlertsCard />
                </div>

                <div>
                    <Card title="Статус системи" className="h-full">
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                                <div>
                                    <h4 className="font-medium text-gray-800">Онлайн датчики</h4>
                                    <p className="text-2xl font-semibold mt-1">{Object.keys(latestSensorData).length}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-success-50 flex items-center justify-center">
                                    <ArrowUpRight className="text-success-600" size={20} />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Link to="/diagnostics" className="text-primary flex items-center justify-center py-2 border border-primary rounded-md hover:bg-primary hover:text-white transition-colors">
                                    <ActivitySquare size={18} className="mr-2" />
                                    Переглянути діагностику
                                </Link>

                                <Link to="/calibrate" className="text-primary flex items-center justify-center py-2 border border-primary rounded-md hover:bg-primary hover:text-white transition-colors">
                                    <Settings2 size={18} className="mr-2" />
                                    Калібрування датчиків
                                </Link>

                                <Link to="/reports" className="text-primary flex items-center justify-center py-2 border border-primary rounded-md hover:bg-primary hover:text-white transition-colors">
                                    <FileText size={18} className="mr-2" />
                                    Створення звітів
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DashboardPage);