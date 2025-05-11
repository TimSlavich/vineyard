import React from 'react';
import { Alert } from '../../types';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { formatRelativeTime } from '../../utils/dateUtils';

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

  return (
    <div className={getItemClassName()} onClick={onClick}>
      <div className="mr-3 mt-1">{getIcon()}</div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className={`font-inter font-medium ${!alert.read ? 'text-gray-900' : 'text-gray-700'}`}>
            {alert.title}
          </h4>
          <span className="text-xs text-gray-500 font-roboto ml-2">
            {formatRelativeTime(alert.timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-600 mt-1 font-roboto">
          {alert.message}
        </p>
      </div>
    </div>
  );
};

export default React.memo(AlertItem);