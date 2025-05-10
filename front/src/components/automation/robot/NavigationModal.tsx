import React from 'react';
import { X, Map, MapPin, CheckCircle } from 'lucide-react';
import { RobotStatus } from '../../../types/robotTypes';

interface NavigationModalProps {
    open: boolean;
    robot: RobotStatus | null;
    step: 'select' | 'confirm';
    target: string;
    navigationPoints: string[];
    onClose: () => void;
    onSelectTarget: (target: string) => void;
}

const NavigationModal: React.FC<NavigationModalProps> = ({
    open,
    robot,
    step,
    target,
    navigationPoints,
    onClose,
    onSelectTarget
}) => {
    if (!open || !robot) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 relative animate-fade-in">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                >
                    <X size={22} />
                </button>
                {step === 'select' ? (
                    <div className="flex flex-col items-center">
                        <Map className="text-primary mb-2" size={32} />
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Оберіть точку призначення</h3>
                        <div className="grid grid-cols-1 gap-3 w-full mb-4">
                            {navigationPoints.map((point) => (
                                <button
                                    key={point}
                                    className={`flex items-center w-full px-5 py-3 rounded-lg border-2 font-medium text-lg transition-all
                    ${target === point
                                            ? 'bg-primary text-white border-primary shadow'
                                            : 'bg-white text-primary border-primary/30 hover:bg-primary/10'}
                  `}
                                    onClick={() => onSelectTarget(point)}
                                >
                                    <MapPin className="mr-3" size={20} />
                                    {point}
                                </button>
                            ))}
                        </div>
                        <button
                            className="w-full px-4 py-2 rounded bg-gray-100 text-gray-700 font-medium mt-2"
                            onClick={onClose}
                        >
                            Скасувати
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="text-success mb-2" size={32} />
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Маршрут побудовано</h3>
                        <div className="mb-4 text-gray-700 text-center">
                            Робот <b>{robot.name}</b> рухається до точки <b>{target}</b>.
                        </div>
                        <button
                            className="w-full px-4 py-2 rounded bg-primary text-white font-medium"
                            onClick={onClose}
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NavigationModal; 