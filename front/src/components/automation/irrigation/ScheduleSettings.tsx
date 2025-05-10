import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import * as Switch from '@radix-ui/react-switch';
import { IrrigationSchedule } from '../../../types/irrigationTypes';

interface ScheduleSettingsProps {
    schedule: IrrigationSchedule;
    isLoading: boolean;
    translateDay: (day: string) => string;
    onScheduleChange: (newSchedule: IrrigationSchedule) => void;
}

const ScheduleSettings: React.FC<ScheduleSettingsProps> = ({
    schedule,
    isLoading,
    translateDay,
    onScheduleChange
}) => {
    const handleEnableToggle = (enabled: boolean) => {
        onScheduleChange({ ...schedule, enabled });
    };

    const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onScheduleChange({ ...schedule, startTime: e.target.value });
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onScheduleChange({ ...schedule, duration: parseInt(e.target.value) });
    };

    const handleDayToggle = (day: string) => {
        const newDays = schedule.days.includes(day)
            ? schedule.days.filter(d => d !== day)
            : [...schedule.days, day];

        onScheduleChange({ ...schedule, days: newDays });
    };

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
        <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar size={16} className="mr-2 text-gray-500" />
                    Розклад поливу
                </h3>
                <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">
                        {schedule.enabled ? 'Увімкнено' : 'Вимкнено'}
                    </span>
                    <Switch.Root
                        checked={schedule.enabled}
                        onCheckedChange={handleEnableToggle}
                        disabled={isLoading}
                        className={`w-10 h-5 rounded-full relative ${schedule.enabled ? 'bg-primary' : 'bg-gray-300'} transition-colors`}
                    >
                        <Switch.Thumb className="block w-4 h-4 bg-white rounded-full transition-transform duration-100 transform will-change-transform data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center">
                    <Clock size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 w-24">Час початку:</span>
                    <input
                        type="time"
                        value={schedule.startTime}
                        onChange={handleStartTimeChange}
                        disabled={!schedule.enabled || isLoading}
                        className="ml-2 p-1 border border-gray-300 rounded text-sm"
                    />
                </div>

                <div className="flex items-center">
                    <Clock size={16} className="text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 w-24">Тривалість:</span>
                    <select
                        value={schedule.duration}
                        onChange={handleDurationChange}
                        disabled={!schedule.enabled || isLoading}
                        className="ml-2 p-1 border border-gray-300 rounded text-sm"
                    >
                        <option value="5">5 хвилин</option>
                        <option value="10">10 хвилин</option>
                        <option value="15">15 хвилин</option>
                        <option value="20">20 хвилин</option>
                        <option value="30">30 хвилин</option>
                        <option value="45">45 хвилин</option>
                        <option value="60">1 година</option>
                    </select>
                </div>

                <div>
                    <div className="text-sm text-gray-600 mb-2">Дні поливу:</div>
                    <div className="flex flex-wrap gap-2">
                        {days.map(day => (
                            <button
                                key={day}
                                onClick={() => handleDayToggle(day)}
                                disabled={!schedule.enabled || isLoading}
                                className={`px-2 py-1 text-xs rounded-full transition-colors ${schedule.days.includes(day)
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 text-gray-600'
                                    } ${!schedule.enabled ? 'opacity-50' : ''}`}
                            >
                                {translateDay(day)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleSettings; 