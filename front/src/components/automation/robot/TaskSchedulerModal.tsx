import React from 'react';
import { X, Timer } from 'lucide-react';
import { RobotStatus, ScheduledTask } from '../../../types/robotTypes';

interface TaskSchedulerModalProps {
    open: boolean;
    robot: RobotStatus | null;
    robots: RobotStatus[];
    capability: string;
    time: string;
    editingTask: ScheduledTask | null;
    onClose: () => void;
    onRobotChange: (robotId: string) => void;
    onCapabilityChange: (capability: string) => void;
    onTimeChange: (time: string) => void;
    onConfirm: () => void;
}

const TaskSchedulerModal: React.FC<TaskSchedulerModalProps> = ({
    open,
    robot,
    robots,
    capability,
    time,
    editingTask,
    onClose,
    onRobotChange,
    onCapabilityChange,
    onTimeChange,
    onConfirm
}) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 relative animate-fade-in">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                >
                    <X size={22} />
                </button>
                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                    <Timer className="mr-2 text-primary" size={22} />
                    {editingTask ? 'Редагування завдання' : 'Планування завдання'}
                </h3>

                {/* Выбор робота */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-1">Оберіть робота</label>
                    <select
                        className="w-full p-3 rounded border border-gray-300 focus:border-primary"
                        value={robot?.id || ''}
                        onChange={e => onRobotChange(e.target.value)}
                    >
                        <option value="" disabled>Виберіть...</option>
                        {robots.map(r => (
                            <option key={r.id} value={r.id} disabled={r.status === 'maintenance'}>
                                {r.name} {r.status === 'maintenance' ? '(обслуговування)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Выбор задания */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-1">Оберіть завдання</label>
                    <select
                        className="w-full p-3 rounded border border-gray-300 focus:border-primary"
                        value={capability}
                        onChange={e => onCapabilityChange(e.target.value)}
                        disabled={!robot}
                    >
                        <option value="" disabled>Виберіть...</option>
                        {robot && robot.capabilities.map(cap => (
                            <option key={cap} value={cap}>{cap}</option>
                        ))}
                    </select>
                </div>

                {/* Время */}
                <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-1">Дата та час</label>
                    <input
                        type="datetime-local"
                        className="w-full p-3 rounded border border-gray-300 focus:border-primary"
                        value={time}
                        onChange={e => onTimeChange(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        disabled={!robot || !capability}
                    />
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        className="flex-1 px-4 py-2 rounded bg-gray-100 text-gray-700 font-medium"
                        onClick={onClose}
                    >
                        Скасувати
                    </button>
                    <button
                        className="flex-1 px-4 py-2 rounded bg-primary text-white font-medium disabled:opacity-50"
                        disabled={!robot || !capability || !time}
                        onClick={onConfirm}
                    >
                        Підтвердити
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaskSchedulerModal; 