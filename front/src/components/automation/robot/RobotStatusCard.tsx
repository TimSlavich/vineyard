import React from 'react';
import { Battery, MapPin, ExternalLink, Power, Map } from 'lucide-react';
import Button from '../../ui/Button';
import { RobotStatus } from '../../../types/robotTypes';

interface RobotStatusCardProps {
    robot: RobotStatus;
    isSelected: boolean;
    showControls: boolean;
    isLoading: boolean;
    onToggleControls: (robotId: string) => void;
    onPowerToggle: (robotId: string) => void;
    onShowDetails: (robot: RobotStatus) => void;
    onNavigate: (robot: RobotStatus) => void;
    onQuickAction: (robot: RobotStatus, capability: string) => void;
}

const RobotStatusCard: React.FC<RobotStatusCardProps> = ({
    robot,
    isSelected,
    showControls,
    isLoading,
    onToggleControls,
    onPowerToggle,
    onShowDetails,
    onNavigate,
    onQuickAction
}) => {
    // Вспомогательные функции
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-success bg-opacity-10 text-success';
            case 'idle':
                return 'bg-warning bg-opacity-10 text-warning';
            case 'maintenance':
                return 'bg-error bg-opacity-10 text-error';
            case 'charging':
                return 'bg-primary bg-opacity-10 text-primary';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active':
                return 'активний';
            case 'idle':
                return 'очікує';
            case 'maintenance':
                return 'обслуговування';
            case 'charging':
                return 'заряджається';
            default:
                return status;
        }
    };

    const getBatteryColor = (level: number) => {
        if (level > 60) return 'text-success';
        if (level > 20) return 'text-warning';
        return 'text-error';
    };

    const getRobotIcon = (type: string) => {
        switch (type) {
            case 'drone':
                return <span className="text-primary">🛸</span>;
            case 'harvester':
                return <span className="text-success">✂️</span>;
            case 'seeder':
                return <span className="text-success">🌱</span>;
            case 'maintenance':
                return <span className="text-warning">🚜</span>;
            default:
                return <span className="text-primary">🤖</span>;
        }
    };

    return (
        <div
            className={`p-4 bg-gray-50 rounded-component space-y-3 ${isSelected ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-full shadow-sm">
                        {getRobotIcon(robot.type)}
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 font-inter">
                            {robot.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(robot.status)}`}>
                            {getStatusText(robot.status)}
                        </span>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:bg-gray-200"
                    icon={<Power size={14} />}
                    onClick={() => onPowerToggle(robot.id)}
                    disabled={isLoading || robot.status === 'maintenance'}
                />
            </div>

            <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                    <Battery className={`mr-2 ${getBatteryColor(robot.battery)}`} size={16} />
                    <span className="font-roboto">{robot.battery}%</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="mr-2 text-gray-400" size={16} />
                    <span className="font-roboto">{robot.location}</span>
                </div>
                {robot.currentTask && (
                    <p className="text-sm text-gray-600 font-roboto">
                        Поточне: {robot.currentTask}
                    </p>
                )}
            </div>

            <div className="pt-2 flex space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    icon={<ExternalLink size={14} />}
                    disabled={isLoading}
                    onClick={() => onShowDetails(robot)}
                >
                    Деталі
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${isSelected && showControls ? 'bg-primary text-white' : ''}`}
                    onClick={() => onToggleControls(robot.id)}
                    disabled={isLoading}
                >
                    Керування
                </Button>
            </div>

            {/* Expanded Control Panel */}
            {isSelected && showControls && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Швидкі дії</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {robot.capabilities.map((cap, i) => (
                            <Button
                                key={cap + i}
                                size="sm"
                                className="text-xs"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => onQuickAction(robot, cap)}
                            >
                                {cap}
                            </Button>
                        ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-primary"
                            icon={<Map size={14} />}
                            disabled={isLoading}
                            onClick={() => onNavigate(robot)}
                        >
                            Навігація
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RobotStatusCard; 