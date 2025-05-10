import React from 'react';
import { Calendar as CalendarIcon, CheckCircle, Clock, XCircle } from 'lucide-react';
import Button from '../../ui/Button';
import { ScheduledApplication } from '../../../types/fertilizerTypes';

interface ApplicationHistoryProps {
    scheduledApplications: ScheduledApplication[];
    isLoading: boolean;
    onScheduleNew: () => void;
    onEditApplication: (id: number) => void;
    onDeleteApplication: (id: number) => void;
    formatDate: (dateString: string) => string;
}

const ApplicationHistory: React.FC<ApplicationHistoryProps> = ({
    scheduledApplications,
    isLoading,
    onScheduleNew,
    onEditApplication,
    onDeleteApplication,
    formatDate
}) => {
    // Сортировка применений: будущие сверху, затем завершенные
    const sortedApplications = [...scheduledApplications].sort((a, b) => {
        // Сначала по статусу
        if (a.status === 'scheduled' && b.status !== 'scheduled') return -1;
        if (a.status !== 'scheduled' && b.status === 'scheduled') return 1;

        // Затем по дате (для запланированных - от ближайших к дальним, для завершенных - от последних к ранним)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);

        if (a.status === 'scheduled' && b.status === 'scheduled') {
            return dateA.getTime() - dateB.getTime(); // Ближайшие даты вверху
        } else {
            return dateB.getTime() - dateA.getTime(); // Последние даты вверху
        }
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={16} className="text-success" />;
            case 'scheduled':
                return <Clock size={16} className="text-primary" />;
            case 'cancelled':
                return <XCircle size={16} className="text-error" />;
            default:
                return null;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
                return 'Виконано';
            case 'scheduled':
                return 'Заплановано';
            case 'cancelled':
                return 'Скасовано';
            default:
                return status;
        }
    };

    return (
        <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center">
                    <CalendarIcon size={16} className="mr-2 text-gray-500" />
                    Історія та план внесення
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-primary"
                    disabled={isLoading}
                    onClick={onScheduleNew}
                >
                    Запланувати внесення
                </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
                {sortedApplications.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-component text-center text-sm text-gray-500">
                        Немає запланованих внесень добрив
                    </div>
                ) : (
                    sortedApplications.map((application) => (
                        <div
                            key={application.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-component"
                        >
                            <div>
                                <div className="flex items-center">
                                    {getStatusIcon(application.status)}
                                    <p className="text-sm font-medium ml-2 text-gray-900">
                                        {application.type}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                    {formatDate(application.date)}
                                    {application.amount && ` • ${application.amount}`}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs px-2 py-1 rounded-full 
                  ${application.status === 'completed' ? 'bg-success bg-opacity-10 text-success' :
                                        application.status === 'scheduled' ? 'bg-primary bg-opacity-10 text-primary' :
                                            'bg-error bg-opacity-10 text-error'}`}>
                                    {getStatusText(application.status)}
                                </span>
                                {application.status === 'scheduled' && (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-600"
                                            disabled={isLoading}
                                            onClick={() => onEditApplication(application.id)}
                                        >
                                            Редагувати
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-error"
                                            disabled={isLoading}
                                            onClick={() => onDeleteApplication(application.id)}
                                        >
                                            Видалити
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ApplicationHistory; 