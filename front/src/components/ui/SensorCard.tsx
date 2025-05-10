import React, { useState } from 'react';
import { SensorData } from '../../types';
import Card from './Card';
import { ArrowUp, ArrowDown, Thermometer, Droplets, CloudRain, Sun, Wind } from 'lucide-react';
import SensorModal from './SensorModal';

interface SensorCardProps {
  data: SensorData;
}

const SensorCard: React.FC<SensorCardProps> = ({ data }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const getIcon = () => {
    switch (data.type) {
      case 'temperature':
        return <Thermometer className="text-red-500" />;
      case 'humidity':
        return <Droplets className="text-blue-500" />;
      case 'soil_moisture':
        return <CloudRain className="text-green-500" />;
      case 'light':
        return <Sun className="text-amber-500" />;
      case 'wind':
        return <Wind className="text-gray-500" />;
      default:
        return null;
    }
  };

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

  const formatTitle = (type: string) => {
    // Переводим названия типов датчиков на украинский
    const translations: Record<string, string> = {
      'temperature': 'Температура',
      'humidity': 'Вологість повітря',
      'soil_moisture': 'Вологість ґрунту',
      'light': 'Освітлення',
      'wind': 'Вітер'
    };

    return translations[type] || type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Переводим статусы на украинский
  const translateStatus = (status: string) => {
    switch (status) {
      case 'critical':
        return 'Критичний';
      case 'warning':
        return 'Попередження';
      case 'normal':
        return 'Нормальний';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Имитируем тренд, проверяя, является ли последняя цифра значения четной или нечетной
  const trend = Math.floor(data.value) % 2 === 0 ? 'up' : 'down';
  const trendValue = (Math.random() * 5).toFixed(1);

  return (
    <>
      <Card
        className="flex flex-col h-full cursor-pointer"
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
              {data.value}
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

export default SensorCard;