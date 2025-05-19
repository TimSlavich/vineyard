import React, { useEffect } from 'react';
import { AlertTriangle, Loader, Droplets } from 'lucide-react';
import Card from '../ui/Card';
import * as Switch from '@radix-ui/react-switch';
import { useIrrigationControl } from '../../hooks/useIrrigationControl';
import MoistureChart from './irrigation/MoistureChart';
import ScheduleSettings from './irrigation/ScheduleSettings';
import MoistureControl from './irrigation/MoistureControl';

interface IrrigationControlProps {
  zoneId: string;
  zoneName: string;
}

const IrrigationControl: React.FC<IrrigationControlProps> = ({ zoneId, zoneName }) => {
  const {
    // Состояния
    isActive,
    threshold,
    tempThreshold,
    isIrrigating,
    currentMoisture,
    schedule,
    isLoading,
    isError,
    errorMessage,
    lastUpdated,
    moistureData,
    isInitialized,

    // Методы
    handleToggleSystem,
    handleThresholdChange,
    handleSliderDragStart,
    handleSliderDragEnd,
    handleScheduleChange,
    toggleIrrigation,
    handleQuickIrrigation,
    translateDay,
    handleManualCancellation
  } = useIrrigationControl(zoneId, zoneName);

  // Находим текущую зону в глобальном состоянии и синхронизируем локальное состояние если нужно
  useEffect(() => {
    // Этот эффект будет вызываться при каждом рендере компонента
    // что позволит компоненту реагировать на внешние изменения состояния
    // Сам handleToggleSystem уже использует custom events для синхронизации всех зон
  }, [zoneId]);

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Droplets size={20} className="text-blue-500 mr-2" />
            <span>Система поливу - {zoneName}</span>
          </div>
          {isLoading && (
            <div className="flex items-center text-primary text-sm">
              <Loader size={12} className="animate-spin mr-1" />
              <span className="text-xs">Оновлення...</span>
            </div>
          )}
        </div>
      }
      className="h-full relative"
    >
      <div className="space-y-4">
        {isError && (
          <div className="p-2 bg-red-50 rounded-component text-center text-sm text-error flex items-center justify-center">
            <AlertTriangle size={14} className="mr-1" />
            {errorMessage || 'Сталася помилка'}
          </div>
        )}

        {!isInitialized ? (
          <div className="py-16 flex justify-center items-center">
            <Loader size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Главный переключатель системы */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Система поливу</span>
              <div className="flex items-center">
                <span className="text-sm text-gray-500 mr-2">
                  {isActive ? 'Увімкнено' : 'Вимкнено'}
                </span>
                <Switch.Root
                  checked={isActive}
                  onCheckedChange={handleToggleSystem}
                  disabled={isLoading}
                  className={`w-10 h-5 rounded-full relative ${isActive ? 'bg-primary' : 'bg-gray-300'} transition-colors`}
                >
                  <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform will-change-transform data-[state=checked]:translate-x-5" />
                </Switch.Root>
              </div>
            </div>

            {/* Компонент управления влажностью */}
            <MoistureControl
              isActive={isActive}
              threshold={threshold}
              tempThreshold={tempThreshold}
              currentMoisture={currentMoisture}
              isIrrigating={isIrrigating}
              isLoading={isLoading}
              onThresholdChange={handleThresholdChange}
              onSliderDragStart={handleSliderDragStart}
              onSliderDragEnd={handleSliderDragEnd}
              onToggleIrrigation={toggleIrrigation}
              onQuickIrrigation={handleQuickIrrigation}
              onManualCancellation={handleManualCancellation}
            />

            {/* График влажности */}
            <MoistureChart
              moistureData={moistureData}
              threshold={threshold}
            />

            {/* Настройки расписания */}
            <ScheduleSettings
              schedule={schedule}
              isLoading={isLoading}
              translateDay={translateDay}
              onScheduleChange={handleScheduleChange}
            />

            {lastUpdated && (
              <div className="text-xs text-gray-500 text-right">
                Останнє оновлення: {new Date(lastUpdated).toLocaleString('uk-UA')}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default IrrigationControl;