import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { devices } from '../data/mockData';

const CalibratePage: React.FC = () => {
    const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [calibrated, setCalibrated] = useState<string[]>([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const startCalibration = () => {
        if (!selectedDevice) return;

        setIsCalibrating(true);
        setProgress(0);

        // Симуляция процесса калибровки
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsCalibrating(false);
                    setCalibrated(prev => [...prev, selectedDevice]);
                    return 100;
                }
                return prev + 10;
            });
        }, 300);

        return () => clearInterval(interval);
    };

    return (
        <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-inter">
                        Калібрування датчиків
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Налаштування та калібрування датчиків системи для підвищення точності вимірювань
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1">
                    <Card title="Доступні пристрої" className="h-full">
                        <div className="space-y-2">
                            {devices.map(device => (
                                <button
                                    key={device.id}
                                    onClick={() => setSelectedDevice(device.id)}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${selectedDevice === device.id
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                        }`}
                                    disabled={calibrated.includes(device.id) || isCalibrating}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{device.name}</span>
                                        {calibrated.includes(device.id) && (
                                            <CheckCircle size={18} className="text-green-500" />
                                        )}
                                    </div>
                                    <div className="text-sm mt-1 opacity-90">
                                        {device.type} • {device.status === 'online' ? 'В мережі' : 'Не в мережі'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card title="Калібрування" className="h-full">
                        {selectedDevice ? (
                            <div>
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium mb-2">
                                        {devices.find(d => d.id === selectedDevice)?.name}
                                    </h3>
                                    <p className="text-gray-600">
                                        Калібрування допоможе забезпечити точність показань датчика.
                                        Процес займає близько 1-2 хвилин.
                                    </p>
                                </div>

                                {isCalibrating ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center">
                                            <Loader2 className="animate-spin mr-2 text-primary" size={20} />
                                            <span>Калібрування в процесі... {progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {calibrated.includes(selectedDevice) ? (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle className="mr-2" size={20} />
                                                <span>Калібрування успішно завершено</span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={startCalibration}
                                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                                            >
                                                Почати калібрування
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-12">
                                Виберіть пристрій зі списку зліва для початку калібрування
                            </p>
                        )}
                    </Card>
                </div>
            </div>

            <Card title="Рекомендації з калібрування" className="mb-8">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        Для досягнення найкращих результатів, рекомендуємо:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-gray-600">
                        <li>Проводити калібрування кожні 3 місяці</li>
                        <li>Уникати калібрування під час екстремальних погодних умов</li>
                        <li>Переконатися, що батарея пристрою заряджена не менше ніж на 50%</li>
                        <li>Зберігати стабільне підключення пристрою до мережі під час калібрування</li>
                    </ul>
                </div>
            </Card>
        </div>
    );
};

export default CalibratePage; 