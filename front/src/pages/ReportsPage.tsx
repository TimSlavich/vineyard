import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, Filter, Loader2, AlertCircle, PlusCircle, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import reportApi, { ReportParams, Report, ReportTemplate, ReportType, ReportFormat } from '../services/api/reportApi';
import useSensorData from '../hooks/useSensorData';

const ReportsPage: React.FC = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [reportParams, setReportParams] = useState<ReportParams>({
        type: 'daily',
        format: 'pdf',
        category: 'all',
        dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 дней назад
        dateTo: new Date().toISOString().split('T')[0] // сегодня
    });
    const [generatedReports, setGeneratedReports] = useState<Report[]>([]);
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    const [newTemplate, setNewTemplate] = useState<{ name: string, description: string }>({
        name: '',
        description: ''
    });

    // Получаем данные о сенсорах
    const { latestSensorData, isConnected } = useSensorData();

    // Сохраняем данные о сенсорах в localStorage для использования в отчетах
    useEffect(() => {
        if (isConnected && Object.keys(latestSensorData).length > 0) {
            localStorage.setItem('cached_sensor_data', JSON.stringify(latestSensorData));
            console.log('Данные сенсоров кэшированы в localStorage для отчетов:', Object.keys(latestSensorData).length);
        }
    }, [latestSensorData, isConnected]);

    useEffect(() => {
        window.scrollTo(0, 0);

        // Загружаем шаблоны отчетов и сохраненные отчеты при загрузке страницы
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Загружаем шаблоны отчетов
                const templatesResponse = await reportApi.getReportTemplates();
                if (templatesResponse.success && templatesResponse.data) {
                    setTemplates(templatesResponse.data);
                }

                // Загружаем сохраненные отчеты
                const reportsResponse = await reportApi.getSavedReports();
                if (reportsResponse.success && reportsResponse.data) {
                    setGeneratedReports(reportsResponse.data);
                }
            } catch (err) {
                console.error('Error loading report data:', err);
                setError('Помилка при завантаженні даних звітів');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const generateReport = async () => {
        setIsGenerating(true);
        setProgress(0);
        setError(null);

        try {
            // Проверяем корректность дат
            const startDate = new Date(reportParams.dateFrom);
            const endDate = new Date(reportParams.dateTo);

            if (endDate < startDate) {
                throw new Error('Дата кінця має бути пізніше за дату початку');
            }

            // Проверяем наличие данных сенсоров
            if (reportParams.category !== 'fertilizer' && Object.keys(latestSensorData).length === 0 && isConnected) {
                throw new Error('Немає даних з датчиків для створення звіту');
            }

            // Симулируем прогресс для лучшего UX
            const progressInterval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 5;
                });
            }, 200); // Увеличиваем интервал для более плавного обновления

            // Генерируем отчет через API
            const response = await reportApi.generateReport(reportParams);

            clearInterval(progressInterval);

            if (response.success && response.data) {
                // Добавляем сгенерированный отчет в список
                setGeneratedReports(prev => [response.data, ...prev]);
                setProgress(100);

                // Прокручиваем к списку отчетов
                setTimeout(() => {
                    const reportsSection = document.querySelector('.lg\\:col-span-2');
                    if (reportsSection) {
                        reportsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 500);
            } else {
                setError('Не вдалося згенерувати звіт');
            }
        } catch (err) {
            console.error('Error generating report:', err);
            setError(`Помилка при генерації звіту: ${err instanceof Error ? err.message : 'Невідома помилка'}`);
        } finally {
            setTimeout(() => {
                setIsGenerating(false);
            }, 700); // Увеличиваем задержку для плавности UI
        }
    };

    const handleParamChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setReportParams(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Функция сохранения текущих параметров как шаблона
    const saveAsTemplate = async () => {
        if (!newTemplate.name) {
            setError('Введіть назву шаблону');
            return;
        }

        // Проверяем наличие выбранных датчиков, если отчет по датчикам
        if (reportParams.category !== 'fertilizer' && Object.keys(latestSensorData).length === 0 && isConnected) {
            setError('Немає даних з датчиків для створення шаблону');
            return;
        }

        setIsLoading(true);
        try {
            // В реальном приложении здесь был бы запрос к API
            // В нашем случае просто добавляем шаблон к текущему списку
            const templateType = reportParams.category === 'fertilizer'
                ? 'fertilizer_applications'
                : reportParams.category === 'all' && reportParams.type === 'custom'
                    ? 'device_activity'
                    : 'sensor_data';

            const newTemplateObject: ReportTemplate = {
                id: templates.length + 1,
                name: newTemplate.name,
                type: templateType,
                description: newTemplate.description || 'Користувацький шаблон',
                parameters: ['start_date', 'end_date', 'sensor_type', 'location_id']
            };

            setTemplates(prev => [...prev, newTemplateObject]);
            setIsCreatingTemplate(false);
            setNewTemplate({ name: '', description: '' });
        } catch (err) {
            console.error('Error saving template:', err);
            setError('Помилка при збереженні шаблону');
        } finally {
            setIsLoading(false);
        }
    };

    // В разделе категорий добавим отображение реальных типов сенсоров
    const renderSensorCategories = () => {
        // Базовые категории
        const categories = [
            { value: 'all', label: 'Всі показники' },
            { value: 'temperature', label: 'Температура' },
            { value: 'soil_moisture', label: 'Вологість ґрунту' },
            { value: 'humidity', label: 'Вологість повітря' },
            { value: 'fertilizer', label: 'Внесення добрив' }
        ];

        // Добавляем уникальные типы сенсоров из реальных данных
        if (isConnected && Object.keys(latestSensorData).length > 0) {
            const sensorTypes = new Set(Object.values(latestSensorData).map(sensor => sensor.type));

            // Добавляем типы, которых еще нет в базовых категориях
            sensorTypes.forEach(type => {
                if (!categories.some(c => c.value === type) && type) {
                    const typeTranslations: Record<string, string> = {
                        'light': 'Освітленість',
                        'ph': 'Кислотність pH',
                        'wind_speed': 'Швидкість вітру',
                        'wind_direction': 'Напрямок вітру',
                        'rainfall': 'Опади',
                        'co2': 'Рівень CO₂'
                    };

                    categories.push({
                        value: type,
                        label: typeTranslations[type] || type.charAt(0).toUpperCase() + type.slice(1)
                    });
                }
            });
        }

        return categories;
    };

    return (
        <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Link to="/dashboard" className="mr-4 text-gray-600 hover:text-gray-900">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-inter">
                        Створення звітів
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Створіть звіти про показники датчиків, внесення добрив та іншу активність системи
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
                    <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
                    <div>{error}</div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-1">
                    <Card title="Параметри звіту" className="h-full">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Тип звіту
                                </label>
                                <select
                                    name="type"
                                    value={reportParams.type}
                                    onChange={handleParamChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    disabled={isGenerating}
                                >
                                    <option value="daily">Щоденний звіт</option>
                                    <option value="weekly">Тижневий звіт</option>
                                    <option value="monthly">Місячний звіт</option>
                                    <option value="custom">Користувацький звіт</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Формат звіту
                                </label>
                                <select
                                    name="format"
                                    value={reportParams.format}
                                    onChange={handleParamChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    disabled={isGenerating}
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="xlsx">Excel</option>
                                    <option value="csv">CSV</option>
                                    <option value="json">JSON</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Категорія даних
                                </label>
                                <select
                                    name="category"
                                    value={reportParams.category}
                                    onChange={handleParamChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    disabled={isGenerating}
                                >
                                    {renderSensorCategories().map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Дата початку
                                </label>
                                <input
                                    type="date"
                                    name="dateFrom"
                                    value={reportParams.dateFrom}
                                    onChange={handleParamChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    disabled={isGenerating}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Дата кінця
                                </label>
                                <input
                                    type="date"
                                    name="dateTo"
                                    value={reportParams.dateTo}
                                    onChange={handleParamChange}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    disabled={isGenerating}
                                />
                            </div>

                            {isGenerating ? (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center">
                                        <Loader2 className="animate-spin mr-2 text-primary" size={20} />
                                        <span>Генерація звіту... {progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        onClick={generateReport}
                                        className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                                    >
                                        Згенерувати звіт
                                    </button>
                                    <button
                                        onClick={() => setIsCreatingTemplate(true)}
                                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md flex items-center justify-center hover:bg-gray-50"
                                    >
                                        <Save className="mr-2" size={16} />
                                        Зберегти як шаблон
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card title="Згенеровані звіти" className="h-full">
                        {isLoading ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader2 className="animate-spin mr-2 text-primary" size={24} />
                                <span>Завантаження звітів...</span>
                            </div>
                        ) : generatedReports.length > 0 ? (
                            <div className="space-y-4">
                                {generatedReports.map((report, index) => (
                                    <div key={report.id} className="p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                                <FileText className="mr-3 text-primary" size={20} />
                                                <div>
                                                    <h3 className="font-medium">{report.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        {report.date} • {report.size}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                className="p-2 text-gray-600 hover:text-primary"
                                                title="Завантажити звіт"
                                                onClick={async () => {
                                                    try {
                                                        setIsLoading(true);
                                                        const response = await reportApi.downloadReport(report.id, report.format);
                                                        if (response.success && response.data) {
                                                            // Создаем ссылку и имитируем клик для скачивания
                                                            const link = document.createElement('a');
                                                            link.href = response.data;
                                                            link.download = report.name + '.' + report.format;
                                                            link.target = '_blank';
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        } else {
                                                            setError('Помилка при завантаженні звіту');
                                                        }
                                                    } catch (err) {
                                                        console.error('Ошибка при скачивании отчета:', err);
                                                        setError('Помилка при завантаженні звіту');
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                            >
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                                <h3 className="text-lg font-medium text-gray-700">Немає згенерованих звітів</h3>
                                <p className="text-gray-500 mt-1">
                                    Налаштуйте параметри та натисніть "Згенерувати звіт"
                                </p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Card title={
                <div className="flex justify-between items-center">
                    <span>Шаблони звітів</span>
                    <button
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md flex items-center text-gray-700"
                        onClick={() => setIsCreatingTemplate(true)}
                    >
                        <PlusCircle size={14} className="mr-1" />
                        Новий шаблон
                    </button>
                </div>
            } className="mb-8">
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="animate-spin mr-2 text-primary" size={24} />
                        <span>Завантаження шаблонів...</span>
                    </div>
                ) : templates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map(template => (
                            <div key={template.id} className="p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                                <h3 className="font-medium mb-1">{template.name}</h3>
                                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                                <div className="flex justify-end">
                                    <button
                                        className="text-sm text-primary hover:underline"
                                        onClick={() => {
                                            // Используем параметры шаблона для формирования отчета
                                            const newParams: Partial<ReportParams> = {
                                                type: template.type === 'sensor_data' ? 'daily' : 'custom',
                                                category: template.type === 'fertilizer_applications' ? 'fertilizer' :
                                                    template.type === 'device_activity' ? 'all' :
                                                        'temperature'
                                            };
                                            setReportParams(prev => ({ ...prev, ...newParams }));
                                            // Прокручиваем к форме параметров
                                            const paramsSection = document.querySelector('.lg\\:col-span-1');
                                            if (paramsSection) {
                                                paramsSection.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                    >
                                        Використати шаблон
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-8">
                        Шаблони звітів не знайдено
                    </p>
                )}
            </Card>

            {/* Модальное окно для создания шаблона */}
            {isCreatingTemplate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-medium mb-4">Створення шаблону звіту</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Назва шаблону *
                                </label>
                                <input
                                    type="text"
                                    value={newTemplate.name}
                                    onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    placeholder="Введіть назву шаблону"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Опис
                                </label>
                                <textarea
                                    value={newTemplate.description}
                                    onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                                    placeholder="Опис шаблону"
                                    rows={3}
                                />
                            </div>
                            <div className="flex space-x-3 pt-3">
                                <button
                                    onClick={() => {
                                        setIsCreatingTemplate(false);
                                        setNewTemplate({ name: '', description: '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex-1"
                                >
                                    Скасувати
                                </button>
                                <button
                                    onClick={saveAsTemplate}
                                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex-1"
                                >
                                    Зберегти
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage; 