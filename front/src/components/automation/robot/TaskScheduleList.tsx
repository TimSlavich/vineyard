import React from 'react';
import { List, Timer } from 'lucide-react';
import Button from '../../ui/Button';
import { ScheduledTask } from '../../../types/robotTypes';

interface TaskScheduleListProps {
    tasks: ScheduledTask[];
    isLoading: boolean;
    onScheduleTask: () => void;
    onEditTask: (task: ScheduledTask) => void;
}

const TaskScheduleList: React.FC<TaskScheduleListProps> = ({
    tasks,
    isLoading,
    onScheduleTask,
    onEditTask
}) => {
    const getStatusClass = (status: string) => {
        switch (status) {
            case 'in-progress':
                return 'bg-primary bg-opacity-10 text-primary';
            case 'pending':
                return 'bg-warning bg-opacity-10 text-warning';
            case 'completed':
                return 'bg-success bg-opacity-10 text-success';
            default:
                return 'bg-gray-200 text-gray-600';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'in-progress':
                return 'виконується';
            case 'pending':
                return 'очікує';
            case 'completed':
                return 'завершено';
            case 'scheduled':
                return 'заплановано';
            default:
                return status;
        }
    };

    return (
        <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 font-inter flex items-center">
                    <List size={16} className="mr-2 text-gray-500" />
                    Черга завдань
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-primary"
                    icon={<Timer size={14} />}
                    disabled={isLoading}
                    onClick={onScheduleTask}
                >
                    Запланувати завдання
                </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasks.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-component text-center text-sm text-gray-500">
                        Немає запланованих завдань
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-component"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-900 font-roboto">
                                    {task.task}
                                </p>
                                <p className="text-xs text-gray-600 font-roboto">
                                    {task.device} • {task.time}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(task.status)}`}>
                                    {getStatusText(task.status)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-600"
                                    disabled={isLoading}
                                    onClick={() => onEditTask(task)}
                                >
                                    {task.status === 'in-progress' ? 'Переглянути' : 'Редагувати'}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TaskScheduleList; 