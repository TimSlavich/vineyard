import React, { useEffect, useState } from 'react';
import { getLatestReadings } from '../data/mockData';
import SensorCard from '../components/ui/SensorCard';
import { Filter, ArrowLeft, Search, Star, StarOff, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const AllSensorsPage: React.FC = () => {
    const [sensors, setSensors] = useState(getLatestReadings());
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [favoriteSensors, setFavoriteSensors] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('favoriteSensors');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading favorites:', error);
            return [];
        }
    });
    const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        localStorage.setItem('favoriteSensors', JSON.stringify(favoriteSensors));
    }, [favoriteSensors]);

    useEffect(() => {
        const allSensors = getLatestReadings();
        let filteredSensors = [...allSensors];

        // Фильтрация только избранных
        if (showOnlyFavorites) {
            filteredSensors = filteredSensors.filter(sensor => {
                const fullId = `${sensor.type}_${sensor.location.id}`;
                return favoriteSensors.includes(fullId);
            });
        }

        // Фильтрация по поисковому запросу
        if (searchTerm) {
            filteredSensors = filteredSensors.filter(
                sensor =>
                    sensor.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    getSensorTypeName(sensor.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
                    sensor.location.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Фильтрация по типу датчика
        if (filterType !== 'all') {
            filteredSensors = filteredSensors.filter(sensor => sensor.type === filterType);
        }

        // Фильтрация по статусу
        if (filterStatus !== 'all') {
            filteredSensors = filteredSensors.filter(sensor => sensor.status === filterStatus);
        }

        setSensors(filteredSensors);
    }, [searchTerm, filterType, filterStatus, favoriteSensors, showOnlyFavorites]);

    const getSensorTypeName = (type: string) => {
        const types: Record<string, string> = {
            'temperature': 'Температура',
            'humidity': 'Вологість повітря',
            'soil_moisture': 'Вологість ґрунту',
            'light': 'Освітлення',
            'wind': 'Вітер'
        };
        return types[type] || type;
    };

    const getStatusName = (status: string) => {
        const statuses: Record<string, string> = {
            'normal': 'Нормальний',
            'warning': 'Попередження',
            'critical': 'Критичний'
        };
        return statuses[status] || status;
    };

    const toggleFavorite = (sensor: any) => {
        const fullId = `${sensor.type}_${sensor.location.id}`;
        setFavoriteSensors(prev => {
            if (prev.includes(fullId)) {
                return prev.filter(id => id !== fullId);
            } else if (prev.length < 10) {
                return [...prev, fullId];
            }
            return prev;
        });
    };

    // Проверяем, является ли датчик избранным
    const isFavorite = (sensor: any) => {
        const fullId = `${sensor.type}_${sensor.location.id}`;
        return favoriteSensors.includes(fullId);
    };

    return (
        <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-inter">
                        Всі датчики
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Моніторинг всіх датчиків системи виноградника. Виберіть до 10 основних датчиків для швидкого доступу.
                </p>
            </div>

            {/* Панель поиска и фильтрации */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-8 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Поиск */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Пошук датчиків"
                            className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Фильтрация по типу */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter size={18} className="text-gray-400" />
                        </div>
                        <select
                            className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Всі типи датчиків</option>
                            <option value="temperature">Температура</option>
                            <option value="humidity">Вологість повітря</option>
                            <option value="soil_moisture">Вологість ґрунту</option>
                            <option value="light">Освітлення</option>
                            <option value="wind">Вітер</option>
                        </select>
                    </div>

                    {/* Фильтрация по статусу */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter size={18} className="text-gray-400" />
                        </div>
                        <select
                            className="pl-10 pr-4 py-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Всі статуси</option>
                            <option value="normal">Нормальний</option>
                            <option value="warning">Попередження</option>
                            <option value="critical">Критичний</option>
                        </select>
                    </div>

                    {/* Переключатель избранных датчиков */}
                    <button
                        className={`flex items-center justify-center px-4 py-2 rounded-md border ${showOnlyFavorites ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300'
                            }`}
                        onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                    >
                        {showOnlyFavorites ? (
                            <>
                                <Star size={18} className="mr-2" /> Основні датчики
                            </>
                        ) : (
                            <>
                                <StarOff size={18} className="mr-2" /> Всі датчики
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Информация о результатах и избранных */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <p className="text-gray-600">
                        Знайдено датчиків: <span className="font-medium">{sensors.length}</span>
                    </p>
                    {favoriteSensors.length > 0 && (
                        <p className="text-gray-500 text-sm mt-1">
                            Обрано основних датчиків: <span className="font-medium">{favoriteSensors.length}/10</span>
                        </p>
                    )}
                </div>
                <div className="flex gap-4">
                    {favoriteSensors.length > 0 && (
                        <button
                            className="text-gray-600 hover:text-red-500"
                            onClick={() => {
                                setFavoriteSensors([]);
                                localStorage.setItem('favoriteSensors', JSON.stringify([]));
                            }}
                        >
                            Очистити всі обрані
                        </button>
                    )}
                    {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                        <button
                            className="text-primary hover:underline"
                            onClick={() => {
                                setFilterType('all');
                                setFilterStatus('all');
                                setSearchTerm('');
                            }}
                        >
                            Скинути фільтри
                        </button>
                    )}
                </div>
            </div>

            {/* Сетка датчиков */}
            {sensors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {sensors.map((sensor, index) => (
                        <div key={`all-sensor-${sensor.id}-${index}`} className="relative">
                            <SensorCard data={sensor} />
                            <button
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-white shadow-md hover:bg-gray-100"
                                onClick={() => toggleFavorite(sensor)}
                                title={isFavorite(sensor) ? "Видалити з основних" : "Додати до основних"}
                            >
                                {isFavorite(sensor) ? (
                                    <Star size={18} className="text-yellow-500" />
                                ) : favoriteSensors.length < 10 ? (
                                    <Plus size={18} className="text-gray-500" />
                                ) : (
                                    <Plus size={18} className="text-gray-300" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 font-medium">Датчики не знайдені</p>
                    <p className="text-gray-500 mt-2">Спробуйте змінити параметри пошуку або фільтри</p>
                </div>
            )}
        </div>
    );
};

export default AllSensorsPage; 