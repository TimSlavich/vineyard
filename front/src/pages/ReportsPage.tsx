import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, BarChart2, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';

type ReportType = 'daily' | 'weekly' | 'monthly';
type ReportFormat = 'pdf' | 'csv' | 'excel';
type ReportCategory = 'temperature' | 'humidity' | 'soil_moisture' | 'all';

interface ReportParams {
    type: ReportType;
    format: ReportFormat;
    category: ReportCategory;
    dateFrom: string;
    dateTo: string;
}

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
    const [generatedReports, setGeneratedReports] = useState<Array<{
        name: string;
        date: string;
        size: string;
        type: ReportType;
        format: ReportFormat;
    }>>([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const generateReport = () => {
        setIsGenerating(true);
        setProgress(0);

        // Симуляция генерации отчета
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsGenerating(false);

                    // Добавляем сгенерированный отчет в список
                    const newReport = {
                        name: `Звіт_${reportParams.category === 'all' ? 'всі_показники' : reportParams.category}_${new Date().toISOString().slice(0, 10)}`,
                        date: new Date().toLocaleString('uk-UA'),
                        size: `${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 90) + 10} MB`,
                        type: reportParams.type,
                        format: reportParams.format
                    };

                    setGeneratedReports(prev => [newReport, ...prev]);
                    return 100;
                }
                return prev + 5;
            });
        }, 200);

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
                        Створення звітів
                    </h1>
                </div>
                <p className="text-gray-600 font-roboto">
                    Генерація звітів про показники датчиків за обраний період та категорію
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-1">
                    <Card title="Параметри звіту" className="h-full">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Тип звіту</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.type === 'daily' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, type: 'daily' }))}
                                    >
                                        Щоденний
                                    </button>
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.type === 'weekly' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, type: 'weekly' }))}
                                    >
                                        Тижневий
                                    </button>
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.type === 'monthly' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, type: 'monthly' }))}
                                    >
                                        Місячний
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Формат файлу</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.format === 'pdf' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, format: 'pdf' }))}
                                    >
                                        PDF
                                    </button>
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.format === 'csv' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, format: 'csv' }))}
                                    >
                                        CSV
                                    </button>
                                    <button
                                        className={`p-2 rounded-md text-center text-sm ${reportParams.format === 'excel' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        onClick={() => setReportParams(prev => ({ ...prev, format: 'excel' }))}
                                    >
                                        Excel
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Категорія даних</label>
                                <select
                                    className="w-full p-2 border border-gray-300 rounded-md"
                                    value={reportParams.category}
                                    onChange={(e) => setReportParams(prev => ({ ...prev, category: e.target.value as ReportCategory }))}
                                >
                                    <option value="all">Всі показники</option>
                                    <option value="temperature">Температура</option>
                                    <option value="humidity">Вологість повітря</option>
                                    <option value="soil_moisture">Вологість ґрунту</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Період звіту</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-gray-600 text-sm mb-1">Від</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                            value={reportParams.dateFrom}
                                            max={reportParams.dateTo}
                                            onChange={(e) => setReportParams(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-600 text-sm mb-1">До</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 border border-gray-300 rounded-md"
                                            value={reportParams.dateTo}
                                            min={reportParams.dateFrom}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setReportParams(prev => ({ ...prev, dateTo: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {isGenerating ? (
                                <div className="space-y-4 mt-6">
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
                                <button
                                    onClick={generateReport}
                                    className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark flex items-center justify-center"
                                >
                                    <FileText size={18} className="mr-2" />
                                    Створити звіт
                                </button>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card title="Згенеровані звіти" className="h-full">
                        {generatedReports.length > 0 ? (
                            <div className="divide-y">
                                {generatedReports.map((report, index) => (
                                    <div key={index} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                {report.format === 'pdf' ? (
                                                    <FileText size={24} className="text-red-500 mr-3" />
                                                ) : report.format === 'csv' ? (
                                                    <BarChart2 size={24} className="text-green-500 mr-3" />
                                                ) : (
                                                    <BarChart2 size={24} className="text-blue-500 mr-3" />
                                                )}
                                                <div>
                                                    <h3 className="font-medium">{report.name}.{report.format}</h3>
                                                    <div className="text-gray-500 text-sm flex items-center">
                                                        <Calendar size={14} className="mr-1" />
                                                        {report.date} • {report.size}
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center text-gray-500">
                                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>Немає згенерованих звітів</p>
                                <p className="text-sm mt-1">Налаштуйте параметри і створіть свій перший звіт</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Card title="Розклад звітів" className="mb-8">
                <div className="space-y-4">
                    <p className="text-gray-700 mb-4">
                        Налаштуйте автоматичне створення звітів за розкладом:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-medium mb-2">Щоденний звіт</h3>
                            <p className="text-gray-600 text-sm mb-3">
                                Автоматична генерація щоденних звітів о 00:00
                            </p>
                            <button className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark">
                                Налаштувати
                            </button>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-medium mb-2">Тижневий звіт</h3>
                            <p className="text-gray-600 text-sm mb-3">
                                Автоматична генерація звітів щопонеділка
                            </p>
                            <button className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark">
                                Налаштувати
                            </button>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="font-medium mb-2">Місячний звіт</h3>
                            <p className="text-gray-600 text-sm mb-3">
                                Автоматична генерація звітів першого числа кожного місяця
                            </p>
                            <button className="px-3 py-1 bg-primary text-white text-sm rounded hover:bg-primary-dark">
                                Налаштувати
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage; 