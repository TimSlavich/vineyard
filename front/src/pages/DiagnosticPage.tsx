import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

const DiagnosticPage: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<Array<{ component: string; status: 'success' | 'warning' | 'error'; message: string }>>([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const runDiagnostic = () => {
        setIsRunning(true);
        setProgress(0);
        setResults([]);

        // Симуляция диагностики системы
        const components = [
            { component: 'Сервер бази даних', status: 'success' as const, message: 'З\'єднання стабільне, затримка 42мс' },
            { component: 'Датчики температури', status: 'success' as const, message: 'Всі пристрої в мережі' },
            { component: 'Датчики вологості', status: 'warning' as const, message: 'Датчик №247 потребує калібрування' },
            { component: 'Система моніторингу', status: 'success' as const, message: 'Працює нормально' },
            { component: 'Система оповіщень', status: 'success' as const, message: 'Налаштована правильно' },
            { component: 'Резервне копіювання', status: 'error' as const, message: 'Остання резервна копія створена більше 7 днів тому' },
        ];

        // Імітуємо поступову перевірку кожного компонента
        let step = 0;
        const interval = setInterval(() => {
            if (step < components.length) {
                setResults(prev => [...prev, components[step]]);
                setProgress(Math.round(((step + 1) / components.length) * 100));
                step++;
            } else {
                clearInterval(interval);
                setIsRunning(false);
            }
        }, 1000);

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
                        Діагностика системи
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Запуск перевірки всіх компонентів системи моніторингу виноградника
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card title="Запуск діагностики" className="h-full">
                    <p className="text-gray-600 mb-6">
                        Натисніть кнопку нижче, щоб запустити комплексну перевірку всіх компонентів системи.
                        Цей процес може зайняти кілька хвилин.
                    </p>

                    {isRunning ? (
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <Loader2 className="animate-spin mr-2 text-primary" size={20} />
                                <span>Діагностика в процесі... {progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={runDiagnostic}
                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                        >
                            Запустити діагностику
                        </button>
                    )}
                </Card>

                <Card title="Результати" className="h-full">
                    {results.length > 0 ? (
                        <div className="space-y-4">
                            {results.map((result, index) => (
                                <div key={index} className="border-b pb-3 last:border-b-0 last:pb-0">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{result?.component || 'Неизвестный компонент'}</span>
                                        <span className={`text-sm px-2 py-1 rounded ${result?.status === 'success' ? 'bg-green-50 text-green-600' :
                                            result?.status === 'warning' ? 'bg-amber-50 text-amber-600' :
                                                'bg-red-50 text-red-600'
                                            }`}>
                                            {result?.status === 'success' ? 'OK' :
                                                result?.status === 'warning' ? 'Увага' : 'Помилка'}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1">{result?.message || 'Информация недоступна'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            Запустіть діагностику, щоб побачити результати
                        </p>
                    )}
                </Card>
            </div>

            <Card title="Рекомендації" className="mb-8">
                {results.length > 0 ? (
                    <div className="space-y-4">
                        {results.filter(r => r?.status !== 'success').length > 0 ? (
                            <>
                                <p className="text-gray-700">
                                    На основі результатів діагностики, рекомендуємо наступні дії:
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                    {results.find(r => r?.component === 'Датчики вологості' && r?.status === 'warning') && (
                                        <li>Виконати калібрування датчика вологості №247</li>
                                    )}
                                    {results.find(r => r?.component === 'Резервне копіювання' && r?.status === 'error') && (
                                        <li>Налаштувати автоматичне резервне копіювання даних</li>
                                    )}
                                </ul>
                                <div className="pt-4">
                                    <Link
                                        to="/calibrate"
                                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark inline-block"
                                    >
                                        Перейти до калібрування
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <p className="text-green-600">
                                Всі системи працюють нормально. Додаткових дій не потрібно.
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">
                        Запустіть діагностику, щоб отримати рекомендації
                    </p>
                )}
            </Card>
        </div>
    );
};

export default DiagnosticPage; 