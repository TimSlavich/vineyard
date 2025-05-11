import React, { useRef, useEffect } from 'react';
import { SensorData } from '../../types';
import { X, Thermometer, Droplets, CloudRain, Sun, Wind, InfoIcon, Clock, MapPin, Leaf, Ruler, Cloudy } from 'lucide-react';
import { thresholds } from '../../data/mockData';
import useSensorData from '../../hooks/useSensorData';

interface SensorModalProps {
    sensor: SensorData;
    onClose: () => void;
}

const SensorModal: React.FC<SensorModalProps> = ({ sensor, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    // Получаем данные с датчиков
    const { sensorData: allSensorData } = useSensorData();

    // Добавляем обработчик клика вне области модального окна
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }

        // Добавляем обработчик
        document.addEventListener('mousedown', handleClickOutside);

        // Запрещаем прокрутку основного содержимого
        document.body.style.overflow = 'hidden';

        // Удаляем обработчик при размонтировании компонента
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const sensorThreshold = thresholds.find(t => t.sensorType === sensor.type);

    // Функция для получения иконки датчика
    const getIcon = () => {
        switch (sensor.type) {
            case 'temperature':
                return <Thermometer className="text-red-500" size={24} />;
            case 'humidity':
                return <Droplets className="text-blue-500" size={24} />;
            case 'soil_moisture':
                return <CloudRain className="text-green-500" size={24} />;
            case 'soil_temperature':
                return <Thermometer className="text-orange-500" size={24} />;
            case 'light':
                return <Sun className="text-amber-500" size={24} />;
            case 'ph':
                return <Leaf className="text-emerald-500" size={24} />;
            case 'wind_speed':
                return <Wind className="text-sky-500" size={24} />;
            case 'wind_direction':
                return <Wind className="text-gray-500" size={24} />;
            case 'rainfall':
                return <Cloudy className="text-blue-400" size={24} />;
            case 'co2':
                return <Ruler className="text-purple-500" size={24} />;
            default:
                return null;
        }
    };

    // Форматирование названия датчика
    const formatTitle = (type: string) => {
        const translations: Record<string, string> = {
            'temperature': 'Температура',
            'humidity': 'Вологість повітря',
            'soil_moisture': 'Вологість ґрунту',
            'soil_temperature': 'Температура ґрунту',
            'light': 'Освітленість',
            'ph': 'Кислотність pH',
            'wind_speed': 'Швидкість вітру',
            'wind_direction': 'Напрям вітру',
            'rainfall': 'Опади',
            'co2': 'Рівень CO₂'
        };

        return translations[type] || type;
    };

    // Получение цвета статуса
    const getStatusColor = () => {
        switch (sensor.status) {
            case 'critical':
                return 'text-white bg-red-500';
            case 'warning':
                return 'text-white bg-amber-500';
            case 'normal':
                return 'text-white bg-green-500';
            default:
                return 'text-white bg-gray-500';
        }
    };

    // Перевод статуса
    const translateStatus = (status: string) => {
        switch (status) {
            case 'critical':
                return 'Критичний';
            case 'warning':
                return 'Попередження';
            case 'normal':
                return 'Нормальний';
            default:
                return status;
        }
    };

    // Форматирование даты и времени
    const formatDateTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Получаем историю показаний для этого датчика
    const getSensorHistory = () => {
        // Фильтруем данные для текущего датчика
        const sensorHistory = allSensorData.filter(
            data => data.sensor_id === sensor.id && data.type === sensor.type
        );

        // Сортируем по времени от новых к старым
        const sortedHistory = [...sensorHistory].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Берем последние 10 значений (или меньше, если данных меньше)
        const limitedHistory = sortedHistory.slice(0, 10);

        // Форматируем данные для отображения и сортируем от старых к новым
        return limitedHistory.map(data => ({
            time: new Date(data.timestamp).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
            value: Number(data.value.toFixed(1)),
            status: data.status,
            unit: data.unit,
            timestamp: data.timestamp
        })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    };

    const historyData = getSensorHistory();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div ref={modalRef} className="bg-white rounded-component shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Заголовок с кнопкой закрытия */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <div className="flex items-center">
                        <div className="p-3 bg-gray-100 rounded-full mr-4">
                            {getIcon()}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 font-inter">
                                {formatTitle(sensor.type)}
                            </h3>
                            <p className="text-gray-600 font-roboto">
                                ID: {sensor.id}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Основное содержимое */}
                <div className="p-6">
                    {/* Текущее значение и статус */}
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-baseline">
                                <span className="text-4xl font-bold font-inter text-gray-800">
                                    {sensor.value}
                                </span>
                                <span className="ml-2 text-xl text-gray-500 font-roboto">
                                    {sensor.unit}
                                </span>
                            </div>
                            <div className="mt-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
                                    {translateStatus(sensor.status)}
                                </span>
                            </div>
                        </div>

                        {/* Информация о расположении */}
                        <div className="text-right">
                            <div className="flex items-center justify-end">
                                <MapPin size={16} className="text-gray-500 mr-1" />
                                <span className="font-medium text-gray-700">
                                    {sensor.location.name}
                                </span>
                            </div>
                            <div className="flex items-center justify-end mt-1">
                                <Clock size={16} className="text-gray-500 mr-1" />
                                <span className="text-gray-600 text-sm">
                                    {formatDateTime(sensor.timestamp)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Пороговые значения */}
                    {sensorThreshold && (
                        <div className="mb-8">
                            <h4 className="text-md font-medium text-gray-700 mb-3 font-inter flex items-center">
                                <InfoIcon size={16} className="mr-2 text-primary" />
                                Порогові значення
                            </h4>
                            <div className="bg-gray-50 p-4 rounded-lg flex justify-between">
                                <div className="text-center">
                                    <span className="text-sm text-gray-500 block mb-1">Мінімум</span>
                                    <span className="text-lg font-medium text-gray-700">{sensorThreshold.min} {sensorThreshold.unit}</span>
                                </div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-500 block mb-1">Оптимально</span>
                                    <span className="text-lg font-medium text-primary">
                                        {sensorThreshold.min} - {sensorThreshold.max} {sensorThreshold.unit}
                                    </span>
                                </div>
                                <div className="text-center">
                                    <span className="text-sm text-gray-500 block mb-1">Максимум</span>
                                    <span className="text-lg font-medium text-gray-700">{sensorThreshold.max} {sensorThreshold.unit}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* История показаний */}
                    <div>
                        <h4 className="text-md font-medium text-gray-700 mb-3 font-inter flex items-center">
                            <Clock size={16} className="mr-2 text-primary" />
                            Останні показники
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Час
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Значення
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Статус
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {historyData.length > 0 ? historyData.map((item, index) => {
                                        // Используем реальный статус из данных
                                        const status = item.status || 'normal';

                                        const statusClass = status === 'critical' ? 'bg-red-100 text-red-700' :
                                            status === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                'bg-green-100 text-green-700';

                                        return (
                                            <tr key={index}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-roboto">
                                                    {item.time}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 font-roboto">
                                                    {item.value} {item.unit}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                                                        {translateStatus(status)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                                Історія показань не знайдена. Натисніть кнопку "Оновити дані" на панелі керування.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Подвал */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                    >
                        Закрити
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SensorModal; 