import React, { useEffect, useRef } from 'react';
import { X, Battery, MapPin, CheckCircle, Tractor, Plane, Scissors, Sprout, Loader, List } from 'lucide-react';

interface RobotDetailsModalProps {
    open: boolean;
    robot: {
        id: string;
        name: string;
        type: string;
        category: string;
        status: string;
        battery: number;
        location: string;
        currentTask?: string;
        capabilities: string[];
    } | null;
    onClose: () => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-success bg-opacity-10 text-success';
        case 'idle': return 'bg-warning bg-opacity-10 text-warning';
        case 'maintenance': return 'bg-error bg-opacity-10 text-error';
        case 'charging': return 'bg-primary bg-opacity-10 text-primary';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const getStatusText = (status: string) => {
    switch (status) {
        case 'active': return 'активний';
        case 'idle': return 'очікує';
        case 'maintenance': return 'обслуговування';
        case 'charging': return 'заряджається';
        default: return status;
    }
};

const getRobotIcon = (type: string) => {
    switch (type) {
        case 'drone': return <Plane size={28} className="text-primary" />;
        case 'harvester': return <Scissors size={28} className="text-success" />;
        case 'seeder': return <Sprout size={28} className="text-success" />;
        case 'maintenance': return <Tractor size={28} className="text-warning" />;
        default: return <Loader size={28} className="text-primary animate-spin" />;
    }
};

const RobotDetailsModal: React.FC<RobotDetailsModalProps> = ({ open, robot, onClose }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open || !robot) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div ref={modalRef} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                >
                    <X size={22} />
                </button>
                <div className="flex items-center mb-4">
                    <div className="p-3 bg-gray-100 rounded-full mr-4">
                        {getRobotIcon(robot.type)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 font-inter">{robot.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(robot.status)}`}>{getStatusText(robot.status)}</span>
                    </div>
                </div>
                <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                        <Battery className="mr-2 text-success" size={16} />
                        <span className="font-roboto">{robot.battery}%</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="mr-2 text-gray-400" size={16} />
                        <span className="font-roboto">{robot.location}</span>
                    </div>
                    {robot.currentTask && (
                        <div className="flex items-center text-sm text-gray-600">
                            <List className="mr-2 text-primary" size={16} />
                            <span className="font-roboto">Поточне завдання: {robot.currentTask}</span>
                        </div>
                    )}
                </div>
                <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 font-inter flex items-center">
                        <CheckCircle size={16} className="mr-2 text-success" />Можливості
                    </h4>
                    <ul className="list-disc pl-6 text-gray-700 text-sm">
                        {robot.capabilities.map((cap, i) => (
                            <li key={i}>{cap}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RobotDetailsModal; 