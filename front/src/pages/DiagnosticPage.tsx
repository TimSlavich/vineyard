import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import diagnosticApi, { DiagnosticResult } from '../services/api/diagnosticApi';
import useSensorData from '../hooks/useSensorData';

const DiagnosticPage: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState<DiagnosticResult[]>([]);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Получаем данные о датчиках с помощью хука useSensorData
    const { latestSensorData, isConnected } = useSensorData();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Обработчик получения рекомендаций на основе результатов диагностики
    const fetchRecommendations = useCallback(async (diagnosticResults: DiagnosticResult[]) => {
        try {
            const response = await diagnosticApi.getRecommendations(diagnosticResults);
            if (response.success && response.data) {
                setRecommendations(response.data);
            } else {
                setError('Не вдалося отримати рекомендації');
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
            setError('Помилка при отриманні рекомендацій');
        }
    }, []);

    // Функция для очистки кэша диагностики
    const clearDiagnosticCache = () => {
        // Очищаем localStorage от диагностических данных
        try {
            localStorage.removeItem('diagnostic_results');
            localStorage.removeItem('diagnostic_recommendations');
            console.log("Диагностический кэш очищен");
            setResults([]);
            setRecommendations([]);
            setError(null);

            // Сброс существующих результатов
            if (window.caches) {
                window.caches.keys().then(keyList => {
                    return Promise.all(keyList.map(key => {
                        if (key.includes('diagnostic')) {
                            return window.caches.delete(key);
                        }
                        return Promise.resolve();
                    }));
                });
            }
        } catch (e) {
            console.error("Ошибка при очистке кэша:", e);
        }
    };

    const runDiagnostic = async () => {
        setIsRunning(true);
        setProgress(0);
        setResults([]);
        setRecommendations([]);
        setError(null);

        try {
            // Симулируем прогресс для лучшего UX
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 300);

            // Перед запросом очищаем кэш
            clearDiagnosticCache();

            // Запрашиваем диагностику с API, передавая данные о датчиках
            const response = await diagnosticApi.runDiagnostic(latestSensorData);

            clearInterval(progressInterval);

            if (response.success && response.data) {
                setResults(response.data);
                setProgress(100);

                // Получаем рекомендации на основе результатов
                await fetchRecommendations(response.data);
            } else {
                setError('Не вдалося виконати діагностику');
                setProgress(0);
            }
        } catch (err) {
            console.error('Error running diagnostic:', err);
            setError('Помилка при діагностиці');
            setProgress(0);
        } finally {
            setIsRunning(false);
        }
    };

    // Функция для перевода статуса в текст на украинском
    const translateStatus = (status: string) => {
        switch (status) {
            case 'success': return 'OK';
            case 'warning': return 'Увага';
            case 'error': return 'Помилка';
            default: return status;
        }
    };

    // Функция для определения класса цвета статуса
    const getStatusColorClass = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-50 text-green-600';
            case 'warning': return 'bg-amber-50 text-amber-600';
            case 'error': return 'bg-red-50 text-red-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-8">
                <div className="flex items-center mb-4 justify-between">
                    <div className="flex items-center">
                        <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-inter">
                            Діагностика системи
                        </h1>
                    </div>
                    <button
                        onClick={clearDiagnosticCache}
                        className="flex items-center text-gray-600 hover:text-gray-900"
                        title="Очистити кеш діагностики"
                    >
                        <RefreshCw size={20} className="mr-1" />
                        <span className="text-sm">Скинути кеш</span>
                    </button>
                </div>
                <p className="text-gray-600 font-roboto">
                    Запуск перевірки всіх компонентів системи моніторингу виноградника
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
                    <div>{error}</div>
                </div>
            )}

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
                            disabled={!isConnected}
                            className={`px-4 py-2 rounded-md ${isConnected
                                ? 'bg-primary text-white hover:bg-primary-dark'
                                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                }`}
                        >
                            {isConnected ? 'Запустити діагностику' : 'Очікування підключення...'}
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
                                        <span className={`text-sm px-2 py-1 rounded ${getStatusColorClass(result.status)}`}>
                                            {translateStatus(result.status)}
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
                        {recommendations.length > 0 ? (
                            <>
                                <p className="text-gray-700">
                                    На основі результатів діагностики, рекомендуємо наступні дії:
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                                    {recommendations.map((recommendation, index) => (
                                        <li key={index}>{recommendation}</li>
                                    ))}
                                </ul>
                                {recommendations.some(rec => rec.includes('калібрування')) && (
                                    <div className="pt-4">
                                        <Link
                                            to="/calibrate"
                                            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark inline-block"
                                        >
                                            Перейти до калібрування
                                        </Link>
                                    </div>
                                )}
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