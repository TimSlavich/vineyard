import React from 'react';
import { Droplets, CloudRain } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import Button from '../../ui/Button';

interface MoistureControlProps {
    isActive: boolean;
    threshold: number;
    tempThreshold: number;
    currentMoisture: number;
    isIrrigating: boolean;
    isLoading: boolean;
    onThresholdChange: (value: number[]) => void;
    onSliderDragStart: () => void;
    onSliderDragEnd: () => void;
    onToggleIrrigation: () => void;
    onQuickIrrigation: () => void;
    onManualCancellation: () => void;
}

const MoistureControl: React.FC<MoistureControlProps> = ({
    isActive,
    threshold,
    tempThreshold,
    currentMoisture,
    isIrrigating,
    isLoading,
    onThresholdChange,
    onSliderDragStart,
    onSliderDragEnd,
    onToggleIrrigation,
    onQuickIrrigation,
    onManualCancellation
}) => {
    return (
        <div className="space-y-6">
            {/* Текущая влажность */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center">
                    <Droplets size={20} className="text-blue-500 mr-2" />
                    <span className="text-sm font-medium">Поточна вологість:</span>
                </div>
                <div className="text-xl font-bold text-blue-600">{currentMoisture}%</div>
            </div>

            {/* Порог срабатывания */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Поріг спрацювання:</span>
                    <span className="text-sm font-medium">{tempThreshold}%</span>
                </div>
                <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5"
                    value={[tempThreshold]}
                    max={100}
                    step={1}
                    disabled={!isActive || isLoading}
                    onValueChange={onThresholdChange}
                    onPointerDown={onSliderDragStart}
                    onPointerUp={onSliderDragEnd}
                >
                    <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                        <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                        className="block w-5 h-5 bg-white rounded-full border border-gray-300 shadow-md hover:bg-gray-50 focus:outline-none"
                        aria-label="Поріг вологості"
                    />
                </Slider.Root>
                <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-500">100%</span>
                </div>
            </div>

            {/* Состояние системы полива */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <CloudRain size={20} className={isIrrigating ? 'text-blue-500' : 'text-gray-400'} />
                    <span className="text-sm font-medium ml-2">
                        Полив: <span className={isIrrigating ? 'text-blue-500' : 'text-gray-500'}>
                            {isIrrigating ? 'Активний' : 'Неактивний'}
                        </span>
                    </span>
                </div>
                <div className="flex space-x-2">
                    {isIrrigating ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500"
                            disabled={!isActive || isLoading}
                            onClick={onManualCancellation}
                        >
                            Зупинити
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!isActive || isLoading}
                                onClick={onToggleIrrigation}
                            >
                                Увімкнути
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-blue-500 text-blue-500"
                                disabled={!isActive || isLoading}
                                onClick={onQuickIrrigation}
                            >
                                5хв
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MoistureControl; 