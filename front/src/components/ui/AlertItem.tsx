import React from 'react';
import { Alert, SensorAlert } from '../../types';
import { AlertCircle, AlertTriangle, Info, X, Check } from 'lucide-react';
import { formatRelativeTimeShort } from '../../utils/dateUtils';
import websocketService from '../../services/websocketService';
import { formatSensorValue } from '../../utils/numberUtils';

interface AlertItemProps {
  alert: Alert;
  onClick?: () => void;
}

const AlertItem = ({ alert, onClick }: AlertItemProps) => {
  const getIcon = () => {
    switch (alert.type) {
      case 'critical':
        return <AlertCircle className="text-error" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-warning" size={20} />;
      case 'info':
        return <Info className="text-info" size={20} />;
      default:
        return null;
    }
  };

  const getItemClassName = () => {
    let className = 'p-4 rounded-component mb-3 border-l-4 flex items-start transition-all duration-200 hover:bg-gray-50 cursor-pointer';

    if (!alert.read) {
      className += ' bg-gray-50';
    } else {
      className += ' bg-white';
    }

    switch (alert.type) {
      case 'critical':
        return `${className} border-error`;
      case 'warning':
        return `${className} border-warning`;
      case 'info':
        return `${className} border-info`;
      default:
        return `${className} border-gray-300`;
    }
  };

  // Проверка, пришло ли оповещение от датчика (идентификатор начинается с "sensor-alert-")
  const isSensorAlert = alert.id.startsWith('sensor-alert-');

  // Получение числового ID оповещения датчика из строкового ID
  const getSensorAlertId = () => {
    if (isSensorAlert) {
      // Новый формат ID: sensor-alert-{id}-{timestamp}-{random}
      // Используем регулярное выражение для извлечения id
      const match = alert.id.match(/^sensor-alert-(\d+)-/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  };

  // Обработчик закрытия оповещения
  const handleResolveAlert = (e: React.MouseEvent) => {
    e.stopPropagation(); // Предотвращаем всплытие события

    const sensorAlertId = getSensorAlertId();
    if (sensorAlertId) {
      websocketService.resolveAlert(sensorAlertId);

      // Также отмечаем оповещение как прочитанное локально
      if (onClick) {
        onClick();
      }
    } else {
      console.error(`Не удалось извлечь ID из ${alert.id}`);
    }
  };

  // Форматирование текста сообщения для удаления длинных десятичных чисел
  const formatAlertMessage = (message: string): string => {
    // Регулярное выражение для поиска чисел с длинной десятичной частью
    return message.replace(/(\d+\.\d{3,})\s*(%|°C|м\/с|люкс|мм|ppm)/g, (match, number, unit) => {
      // Округляем число до 1 знака после запятой
      const formattedNumber = formatSensorValue(parseFloat(number), 1);
      return `${formattedNumber} ${unit}`;
    });
  };

  return (
    <div className={getItemClassName()} onClick={onClick}>
      <div className="mr-3 mt-1">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className={`font-inter font-medium ${!alert.read ? 'text-gray-900' : 'text-gray-700'}`}>
            {alert.title}
          </h4>
          <span className="text-xs text-gray-500 font-roboto ml-2">
            {formatRelativeTimeShort(alert.timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 font-roboto">
          {formatAlertMessage(alert.message)}
        </p>
      </div>

      {/* Кнопка закрытия оповещения, если это оповещение от датчика */}
      {isSensorAlert && (
        <button
          className="ml-3 p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          onClick={handleResolveAlert}
          title="Закрыть оповещение"
        >
          <Check size={16} className="text-green-600" />
        </button>
      )}
    </div>
  );
};

export default React.memo(AlertItem);