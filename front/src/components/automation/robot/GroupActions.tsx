import React from 'react';
import { CheckCircle, Battery, MapPin, AlertTriangle } from 'lucide-react';
import Button from '../../ui/Button';

interface GroupActionsProps {
    isLoading: boolean;
    onSystemCheck: () => void;
    onChargeAll: () => void;
    onLocateAll: () => void;
    onEmergencyStop: () => void;
}

const GroupActions: React.FC<GroupActionsProps> = ({
    isLoading,
    onSystemCheck,
    onChargeAll,
    onLocateAll,
    onEmergencyStop
}) => {
    return (
        <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3 font-inter">
                Групові дії
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button
                    variant="outline"
                    className="border-success text-success"
                    icon={<CheckCircle size={14} />}
                    disabled={isLoading}
                    onClick={onSystemCheck}
                >
                    Перевірка системи
                </Button>
                <Button
                    variant="outline"
                    className="text-success border-success"
                    icon={<Battery size={14} />}
                    disabled={isLoading}
                    onClick={onChargeAll}
                >
                    Зарядити всіх
                </Button>
                <Button
                    variant="outline"
                    className="text-warning border-warning"
                    icon={<MapPin size={14} />}
                    disabled={isLoading}
                    onClick={onLocateAll}
                >
                    Локалізувати всіх
                </Button>
                <Button
                    variant="outline"
                    className="text-error border-error"
                    icon={<AlertTriangle size={14} />}
                    disabled={isLoading}
                    onClick={onEmergencyStop}
                >
                    Аварійна зупинка
                </Button>
            </div>
        </div>
    );
};

export default GroupActions; 