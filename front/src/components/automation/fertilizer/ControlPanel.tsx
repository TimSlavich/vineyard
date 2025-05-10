import React from 'react';
import { Leaf, Calculator } from 'lucide-react';
import Button from '../../ui/Button';
import * as Switch from '@radix-ui/react-switch';

interface ControlPanelProps {
    isActive: boolean;
    autoMode: boolean;
    fieldSize: number;
    applicationRate: number;
    fieldSizeText: string;
    applicationRateText: string;
    isLoading: boolean;
    fertilizerName: string;
    nextScheduled: string;
    lastApplication: string;

    onToggleSystem: (active: boolean) => void;
    onToggleAutoMode: (auto: boolean) => void;
    onFieldSizeTextChange: (value: string) => void;
    onApplicationRateTextChange: (value: string) => void;
    onFieldSizeChange: () => void;
    onApplicationRateChange: () => void;
    onApplyNow: () => void;
    onError?: (message: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
    isActive,
    autoMode,
    fieldSize,
    applicationRate,
    fieldSizeText,
    applicationRateText,
    isLoading,
    fertilizerName,
    nextScheduled,
    lastApplication,

    onToggleSystem,
    onToggleAutoMode,
    onFieldSizeTextChange,
    onApplicationRateTextChange,
    onFieldSizeChange,
    onApplicationRateChange,
    onApplyNow,
    onError
}) => {
    // Расчет количества удобрений
    const calculateAmount = () => {
        const size = parseFloat(fieldSizeText);
        const rate = parseFloat(applicationRateText);

        if (isNaN(size) || size <= 0 || isNaN(rate) || rate <= 0) {
            return "0.0 кг";
        }

        return `${(size * rate).toFixed(1)} кг`;
    };

    return (
        <div className="space-y-4">
            {/* Главный переключатель системы */}
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <Leaf size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
                    <span className="text-sm font-medium ml-2">Система внесення добрив</span>
                </div>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                        {isActive ? 'Увімкнено' : 'Вимкнено'}
                    </span>
                    <Switch.Root
                        checked={isActive}
                        onCheckedChange={onToggleSystem}
                        disabled={isLoading}
                        className={`w-10 h-5 rounded-full relative ${isActive ? 'bg-primary' : 'bg-gray-300'} transition-colors`}
                    >
                        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform will-change-transform data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                </div>
            </div>

            {/* Автоматический режим */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Автоматичний режим</span>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                        {autoMode ? 'Увімкнено' : 'Вимкнено'}
                    </span>
                    <Switch.Root
                        checked={autoMode}
                        onCheckedChange={onToggleAutoMode}
                        disabled={!isActive || isLoading}
                        className={`w-10 h-5 rounded-full relative ${autoMode ? 'bg-primary' : 'bg-gray-300'} transition-colors`}
                    >
                        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform will-change-transform data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                </div>
            </div>

            {/* Информация о текущих настройках */}
            <div className="p-3 bg-gray-50 rounded-component space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Поточне добриво:</span>
                    <span className="text-sm font-medium">{fertilizerName}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Останнє внесення:</span>
                    <span className="text-sm font-medium">{lastApplication}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Наступне заплановане:</span>
                    <span className="text-sm font-medium">{nextScheduled}</span>
                </div>
            </div>

            {/* Калькулятор */}
            <div className="p-3 bg-gray-50 rounded-component">
                <div className="flex items-center mb-3">
                    <Calculator size={18} className="text-primary mr-2" />
                    <span className="text-sm font-medium">Калькулятор добрив</span>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Площа поля (га)</label>
                        <div className="flex">
                            <input
                                type="number"
                                className="flex-1 p-2 rounded-l border border-gray-300 focus:border-primary"
                                value={fieldSizeText}
                                onChange={(e) => onFieldSizeTextChange(e.target.value)}
                                disabled={!isActive || isLoading}
                                min="0.1"
                                step="0.1"
                            />
                            <button
                                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-gray-700 text-sm font-medium hover:bg-gray-200"
                                onClick={() => {
                                    // Проверка наличия и корректности значения перед применением
                                    const value = parseFloat(fieldSizeText);
                                    if (!isNaN(value) && value > 0) {
                                        onFieldSizeChange();
                                    }
                                }}
                                disabled={!isActive || isLoading}
                            >
                                OK
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Норма внесення (кг/га)</label>
                        <div className="flex">
                            <input
                                type="number"
                                className="flex-1 p-2 rounded-l border border-gray-300 focus:border-primary"
                                value={applicationRateText}
                                onChange={(e) => onApplicationRateTextChange(e.target.value)}
                                disabled={!isActive || isLoading}
                                min="1"
                            />
                            <button
                                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r text-gray-700 text-sm font-medium hover:bg-gray-200"
                                onClick={() => {
                                    // Проверка наличия и корректности значения перед применением
                                    const value = parseFloat(applicationRateText);
                                    if (!isNaN(value) && value > 0) {
                                        onApplicationRateChange();
                                    }
                                }}
                                disabled={!isActive || isLoading}
                            >
                                OK
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Необхідна кількість:</span>
                            <span className="text-lg font-bold text-primary">{calculateAmount()}</span>
                        </div>
                    </div>

                    <Button
                        className="w-full"
                        variant={isActive ? 'primary' : 'outline'}
                        disabled={!isActive || autoMode || isLoading}
                        onClick={() => {
                            // Проверка значений в полях ввода
                            const sizeValue = parseFloat(fieldSizeText);
                            const rateValue = parseFloat(applicationRateText);

                            // Проверяем, что значения поля и нормы внесения корректны
                            if (isNaN(sizeValue) || sizeValue <= 0 || isNaN(rateValue) || rateValue <= 0) {
                                if (onError) {
                                    onError('Некорректные значения для внесения удобрений');
                                }
                                return; // Останавливаем выполнение, если какое-либо значение некорректно
                            }

                            // Убеждаемся, что обновляем значения перед вызовом onApplyNow
                            if (fieldSize !== sizeValue) {
                                onFieldSizeChange();
                            }

                            if (applicationRate !== rateValue) {
                                onApplicationRateChange();
                            }

                            // Вызываем onApplyNow только если у нас есть действительные значения
                            onApplyNow();
                        }}
                    >
                        Внести зараз
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ControlPanel; 