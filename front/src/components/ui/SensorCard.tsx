import React, { useState } from 'react';
import { SensorData } from '../../types';
import Card from './Card';
import { ArrowUp, ArrowDown, Thermometer, Droplets, CloudRain, Sun, Wind, Leaf, Wind as WindIcon, Ruler, Cloudy, MoreVertical } from 'lucide-react';
import SensorModal from './SensorModal';
import { formatSensorValue } from '../../utils/numberUtils';

interface SensorCardProps {
  data: SensorData;
  previousData?: SensorData[];
}

const SensorCard = ({ data, previousData = [] }: SensorCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  // Получение иконки в зависимости от типа датчика
  const getIcon = () => {
    switch (data.type) {
      case 'temperature':
        return <Thermometer className="text-red-500" />;
      case 'humidity':
        return <Droplets className="text-blue-500" />;
      case 'soil_moisture':
        return <CloudRain className="text-green-500" />;
      case 'soil_temperature':
        return <Thermometer className="text-orange-500" />;
      case 'light':
        return <Sun className="text-amber-500" />;
      case 'ph':
        return <Leaf className="text-emerald-500" />;
      case 'wind_speed':
        return <WindIcon className="text-sky-500" />;
      case 'wind_direction':
        return <Wind className="text-gray-500" />;
      case 'rainfall':
        return <Cloudy className="text-blue-400" />;
      case 'co2':
        return <Ruler className="text-purple-500" />;
      default:
        return null;
    }
  };

  // Получение цвета для статуса датчика
  const getStatusColor = () => {
    switch (data.status) {
      case 'critical':
        return 'text-error bg-red-50';
      case 'warning':
        return 'text-warning bg-amber-50';
      case 'normal':
        return 'text-success bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Форматирование заголовка
  const formatTitle = (type: string) => {
    // Переводим типы датчиков на русский
    const translations: Record<string, string> = {
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

    return translations[type] || type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Перевод статусов на русский
  const translateStatus = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Критичний';
      case 'warning':
        return 'Застереження';
      case 'normal':
        return 'Нормальний';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Максимальные проценты изменения для разных типов датчиков
  const getMaxChangePercent = (type: string): number => {
    const limits: Record<string, number> = {
      'temperature': 15,
      'humidity': 50,
      'soil_moisture': 30,
      'soil_temperature': 10,
      'light': 100,
      'ph': 5,
      'wind_speed': 80,
      'wind_direction': 50,
      'rainfall': 100,
      'co2': 20
    };
    return limits[type] || 30;
  };

  // Расчет тренда изменения
  const calculateTrend = () => {
    // Если нет предыдущих данных
    if (!previousData || previousData.length === 0) {
      return { trend: 'up', trendValue: '0.0' };
    }

    // Сортируем данные по времени (от новых к старым)
    const sortedData = [...previousData].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Текущее значение
    const currentValue = data.value;

    // Берем самое старое значение для сравнения
    const oldestReading = sortedData[sortedData.length - 1];

    // Если не нашли предыдущее значение или оно равно текущему
    if (!oldestReading || oldestReading.value === currentValue) {
      return { trend: 'up', trendValue: '0.0' };
    }

    // Рассчитываем изменение в процентах
    const previousValue = oldestReading.value;

    let percentChange;
    if (previousValue === 0) {
      // Если предыдущее значение было 0
      percentChange = currentValue > 0 ? getMaxChangePercent(data.type) : -getMaxChangePercent(data.type);
    } else {
      percentChange = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    }

    // Определяем направление изменения и форматируем значение
    const trendDirection = percentChange >= 0 ? 'up' : 'down';
    const formattedValue = Math.abs(percentChange).toFixed(1);

    return {
      trend: trendDirection,
      trendValue: formattedValue
    };
  };

  const { trend, trendValue } = calculateTrend();

  // Форматирование значения в зависимости от типа датчика
  const formatValue = (type: string, value: number): string => {
    // Для температурных значений используем только один знак после запятой
    if (type === 'temperature' || type === 'soil_temperature') {
      return formatSensorValue(value, 1);
    }

    // Для pH и других точных измерений можно использовать 2 знака
    if (type === 'ph') {
      return formatSensorValue(value, 2);
    }

    // Для остальных типов датчиков используем целые числа
    return formatSensorValue(Math.round(value), 0);
  };

  return (
    <>
      <Card
        className="flex flex-col h-full cursor-pointer relative"
        hoverable
        onClick={openModal}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <div className="p-2 rounded-full bg-gray-100 mr-3">
              {getIcon()}
            </div>
            <h4 className="font-inter font-medium text-gray-800">
              {formatTitle(data.type)}
            </h4>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {translateStatus(data.status)}
          </div>
        </div>

        <div className="flex flex-col mb-4">
          <div className="flex items-baseline">
            <span className="text-3xl font-semibold font-inter text-gray-800">
              {formatValue(data.type, data.value)}
            </span>
            <span className="ml-1 text-gray-500 font-roboto">
              {data.unit}
            </span>
          </div>
          <div className="flex items-center mt-1">
            {trend === 'up' ? (
              <ArrowUp size={14} className="text-success mr-1" />
            ) : (
              <ArrowDown size={14} className="text-error mr-1" />
            )}
            <span className={`text-xs ${trend === 'up' ? 'text-success' : 'text-error'}`}>
              {trendValue}% за останню годину
            </span>
          </div>
        </div>

        <div className="mt-auto text-xs text-gray-500 font-roboto">
          <div className="flex justify-between">
            <span>Розташування</span>
            <span className="font-medium text-gray-700">{data.location.name}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Останнє оновлення</span>
            <span className="font-medium text-gray-700">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Кнопка опций */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowOptions(!showOptions);
          }}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <MoreVertical size={16} className="text-gray-500" />
        </button>

        {/* Выпадающее меню с опциями */}
        {showOptions && (
          <div className="absolute top-10 right-3 bg-white shadow-md rounded-md z-10 py-1 border border-gray-200">
            <button
              onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Добавить в избранное
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowOptions(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
            >
              Настроить оповещения
            </button>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <SensorModal
          sensor={data}
          onClose={closeModal}
        />
      )}
    </>
  );
};

export default React.memo(SensorCard);