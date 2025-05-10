import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import SensorCard from '../components/ui/SensorCard';
import WeatherCard from '../components/dashboard/WeatherCard';
import AlertsCard from '../components/dashboard/AlertsCard';
import LineChart from '../components/charts/LineChart';
import ComparativeChart from '../components/charts/ComparativeChart';
import Card from '../components/ui/Card';
import { ChevronRight, ArrowUpRight, Settings, Bell } from 'lucide-react';
import { getLatestReadings, sensorData, weatherData } from '../data/mockData';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
    // Мемоизируем получение данных, чтобы избежать лишних вычислений при перерисовках
    const latestReadings = useMemo(() => getLatestReadings(), []);

    const [favoriteSensors, setFavoriteSensors] = useState<string[]>(() => {
        const saved = localStorage.getItem('favoriteSensors');
        return saved ? JSON.parse(saved) : [];
    });

    // Мемоизируем проверку валидности ключей для избранных сенсоров
    const validSensorKeys = useMemo(() => {
        return latestReadings.map(reading => `${reading.type}_${reading.location.id}`);
    }, [latestReadings]);

    // Проверка на корректность ключей при загрузке
    useEffect(() => {
        // Фильтруем избранные датчики, оставляя только те, которые присутствуют в системе
        const validFavorites = favoriteSensors.filter(favoriteId =>
            validSensorKeys.includes(favoriteId)
        );

        // Если есть недействительные ключи, обновляем список
        if (validFavorites.length !== favoriteSensors.length) {
            console.log('Удалены неактуальные ключи датчиков из избранного');
            setFavoriteSensors(validFavorites);
            localStorage.setItem('favoriteSensors', JSON.stringify(validFavorites));
        }
    }, [favoriteSensors, validSensorKeys]);

    // Получаем только избранные датчики
    const favoriteReadings = useMemo(() => {
        const selectedReadings = latestReadings.filter(reading => {
            const fullId = `${reading.type}_${reading.location.id}`;
            return favoriteSensors.includes(fullId);
        });

        // Если у пользователя нет избранных датчиков, показываем первые 5 датчиков
        if (favoriteSensors.length === 0) {
            return latestReadings.slice(0, 5);
        }

        return selectedReadings;
    }, [latestReadings, favoriteSensors]);

    // Прокрутка страницы вверх при загрузке компонента
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Фильтрация данных о температуре для графика
    const temperatureData = useMemo(() => {
        return sensorData
            .filter(reading => reading.type === 'temperature' && reading.location.id === 'loc1')
            .map(reading => ({
                value: reading.value,
                timestamp: reading.timestamp,
            }));
    }, []);

    // Фильтрация данных о влажности почвы для графика
    const soilMoistureData = useMemo(() => {
        return sensorData
            .filter(reading => reading.type === 'soil_moisture' && reading.location.id === 'loc1')
            .map(reading => ({
                value: reading.value,
                timestamp: reading.timestamp,
            }));
    }, []);

    // Фильтрация данных о влажности воздуха для сравнительного графика
    const humidityData = useMemo(() => {
        return sensorData
            .filter(reading => reading.type === 'humidity' && reading.location.id === 'loc1')
            .map(reading => ({
                value: reading.value,
                timestamp: reading.timestamp,
            }));
    }, []);

    // Данные для сравнительного графика
    const comparativeChartSeries = useMemo(() => [
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
    ], [temperatureData, humidityData]);

    return (
        <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
                    Панель керування виноградником
                </h1>
                <p className="text-gray-600 font-roboto">
                    Моніторинг стану вашого виноградника та даних датчиків у реальному часі
                </p>
            </div>

            {/* Сетка показаний датчиков */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 font-inter">
                            {favoriteSensors.length > 0 ? "Основні датчики" : "Поточні показники"}
                        </h2>
                        {favoriteSensors.length > 0 && (
                            <p className="text-gray-500 text-sm mt-1">
                                Обрано основних датчиків: <span className="font-medium">{favoriteSensors.length}/10</span>
                            </p>
                        )}
                    </div>
                    <Link to="/all-sensors" className="text-primary flex items-center text-sm hover:underline">
                        {favoriteSensors.length > 0 ? "Керувати датчиками" : "Переглянути всі датчики"} <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {favoriteReadings.map((reading, index) => (
                        <SensorCard key={`sensor-${reading.id}-${index}`} data={reading} />
                    ))}
                    {favoriteReadings.length === 0 && (
                        <div className="col-span-full text-center py-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-600 font-medium">Немає обраних датчиків</p>
                            <p className="text-gray-500 mt-2">Перейдіть до списку всіх датчиків, щоб обрати основні</p>
                            <Link
                                to="/all-sensors"
                                className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                            >
                                Обрати датчики
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
                    />
                </div>

                <div>
                    <WeatherCard data={weatherData} />
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
                />
            </div>

            {/* Сравнительный график температуры и влажности воздуха */}
            <div className="mb-12">
                <ComparativeChart
                    key="dashboard-comparative-chart"
                    title="Порівняння температури та вологості повітря (Останні 24 години)"
                    series={comparativeChartSeries}
                    height={300}
                />
            </div>

            {/* Оповещения и статус устройств */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AlertsCard />
                </div>

                <div>
                    <Card
                        title="Швидкі дії"
                        className="h-full"
                    >
                        <div className="space-y-3">
                            <Link to="/diagnostics" className="block">
                                <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                    <span className="font-medium text-gray-700 font-roboto">Запустити діагностику системи</span>
                                    <ArrowUpRight size={16} className="text-gray-500" />
                                </button>
                            </Link>

                            <Link to="/calibrate" className="block">
                                <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                    <span className="font-medium text-gray-700 font-roboto">Калібрувати датчики</span>
                                    <ArrowUpRight size={16} className="text-gray-500" />
                                </button>
                            </Link>

                            <Link to="/reports" className="block">
                                <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                    <span className="font-medium text-gray-700 font-roboto">Створити звіти</span>
                                    <ArrowUpRight size={16} className="text-gray-500" />
                                </button>
                            </Link>

                            <Link to="/settings" className="block">
                                <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                    <span className="font-medium text-gray-700 font-roboto">Налаштувати пороги</span>
                                    <Settings size={16} className="text-gray-500" />
                                </button>
                            </Link>

                            <Link to="/notifications" className="block">
                                <button className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
                                    <span className="font-medium text-gray-700 font-roboto">Переглянути сповіщення</span>
                                    <Bell size={16} className="text-gray-500" />
                                </button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default memo(DashboardPage);