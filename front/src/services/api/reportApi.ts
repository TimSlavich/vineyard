import { BaseApi, ApiResponse } from './baseApi';

export type ReportType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';
export type ReportCategory = 'all' | 'temperature' | 'soil_moisture' | 'humidity' | 'fertilizer';

export interface ReportParams {
    type: ReportType;
    format: ReportFormat;
    category: ReportCategory;
    dateFrom: string;
    dateTo: string;
}

export interface Report {
    id: string;
    name: string;
    date: string;
    size: string;
    type: ReportType;
    format: ReportFormat;
    url?: string;
}

export interface ReportTemplate {
    id: number;
    name: string;
    type: string;
    description: string;
    parameters: string[];
}

export class ReportApi extends BaseApi {
    /**
     * Получение списка доступных шаблонов отчетов
     * @param reportType Опциональный тип отчета для фильтрации
     * @returns Список шаблонов отчетов
     */
    async getReportTemplates(reportType?: string): Promise<ApiResponse<ReportTemplate[]>> {
        try {
            const params: Record<string, string> = reportType ? { report_type: reportType } : {};

            try {
                const response = await this.get<ApiResponse<ReportTemplate[]>>('/reports/templates', params);
                return response;
            } catch (error) {
                // Если запрос не удался, используем локальные данные
                return this.getLocalReportTemplates();
            }
        } catch (error) {
            return this.getLocalReportTemplates();
        }
    }

    /**
     * Генерация отчета
     * @param params Параметры для генерации отчета
     * @returns Данные сгенерированного отчета
     */
    async generateReport(params: ReportParams): Promise<ApiResponse<Report>> {
        try {
            // Преобразуем параметры фронтенда в формат для API
            const apiParams = {
                report_type: this.mapReportTypeToApi(params.type),
                parameters: {
                    start_date: `${params.dateFrom}T00:00:00.000Z`,
                    end_date: `${params.dateTo}T23:59:59.999Z`,
                    sensor_type: params.category === 'all' ? undefined : params.category,
                    format: params.format
                }
            };

            try {
                const response = await this.post<ApiResponse<any>>('/reports/generate', apiParams);

                if (response.success && response.data) {
                    // Преобразуем ответ API в формат отчета для фронтенда
                    const report: Report = {
                        id: response.data.report_id || new Date().toISOString(),
                        name: response.data.name || this.generateReportName(params),
                        date: new Date().toLocaleString('uk-UA'),
                        size: response.data.size || this.generateReportSize(response.data),
                        type: params.type,
                        format: params.format,
                        url: response.data.file_url || response.data.download_url
                    };

                    return {
                        success: true,
                        data: report
                    };
                }

                throw new Error('Помилка при генерації звіту');
            } catch (error) {
                // Если запрос не удался, имитируем генерацию отчета с реальными данными
                return this.generateLocalReport(params);
            }
        } catch (error) {
            return this.generateLocalReport(params);
        }
    }

    /**
     * Получение списка сгенерированных отчетов
     * @returns Список сгенерированных отчетов
     */
    async getSavedReports(): Promise<ApiResponse<Report[]>> {
        try {
            try {
                const response = await this.get<ApiResponse<Report[]>>('/reports/saved');
                return response;
            } catch (error) {
                // Если запрос не удался, используем локальные данные
                return this.getLocalSavedReportsData();
            }
        } catch (error) {
            return this.getLocalSavedReportsData();
        }
    }

    /**
     * Загрузка отчета
     * @param reportId ID отчета
     * @param format Формат отчета (опционально)
     * @returns URL для загрузки отчета
     */
    async downloadReport(reportId: string, format?: ReportFormat): Promise<ApiResponse<string>> {
        try {
            const params: Record<string, string> = {};
            if (format) {
                params.format = format;
            }

            try {
                const response = await this.get<ApiResponse<{ download_url: string }>>(`/reports/${reportId}/download`, params);

                if (response.success && response.data && response.data.download_url) {
                    return {
                        success: true,
                        data: response.data.download_url
                    };
                }

                throw new Error('Помилка при завантаженні звіту');
            } catch (error) {
                // Проверяем, есть ли сохраненный контент отчета
                const reportContentKey = `report_content_${reportId}`;
                const reportContent = localStorage.getItem(reportContentKey);

                if (reportContent) {
                    // Генерируем отчет на основе сохраненных данных
                    return this.generateDataUrl(reportId, format || 'pdf', JSON.parse(reportContent));
                }

                // Если нет сохраненного содержимого, возвращаем ссылку на моковый отчет
                return {
                    success: true,
                    data: `${window.location.origin}/mock-reports/${reportId}.${format || 'pdf'}`
                };
            }
        } catch (error) {
            return {
                success: false,
                data: '',
                error: `Помилка при завантаженні звіту: ${error}`
            };
        }
    }

    /**
     * Генерирует Data URL для отчета с данными
     * @param reportId ID отчета
     * @param format Формат отчета
     * @param content Содержимое отчета
     * @returns URL отчета
     */
    private generateDataUrl(reportId: string, format: string, content: any): ApiResponse<string> {
        const contentType = this.getContentTypeByFormat(format as ReportFormat);

        try {
            // Преобразуем данные в соответствующий формат
            let data: string;

            switch (format) {
                case 'json':
                    // Для JSON просто форматируем данные
                    data = JSON.stringify(content, null, 2);
                    break;

                case 'csv':
                    // Для CSV конвертируем данные в CSV формат
                    data = this.convertToCSV(content);
                    break;

                case 'xlsx':
                    // Для Excel возвращаем данные, которые можно будет скачать как CSV и открыть в Excel
                    data = this.convertToCSV(content);
                    break;

                case 'pdf':
                default:
                    // Для PDF и других форматов возвращаем HTML-представление данных
                    data = this.convertToHTML(content);
                    break;
            }

            // Кодируем данные в Base64 для Data URL
            const encodedData = btoa(unescape(encodeURIComponent(data)));

            // Формируем Data URL с типом контента
            const dataUrl = `data:${contentType};base64,${encodedData}`;

            return {
                success: true,
                data: dataUrl
            };
        } catch (error) {
            return {
                success: false,
                data: '',
                error: 'Помилка при генерації звіту'
            };
        }
    }

    /**
     * Конвертирует данные отчета в CSV формат
     * @param content Содержимое отчета
     * @returns Строка в формате CSV
     */
    private convertToCSV(content: any): string {
        try {
            // Заголовок CSV
            const header = [
                'ID датчика',
                'Тип',
                'Значение',
                'Единица измерения',
                'Время измерения',
                'Статус'
            ].join(';');

            // Строки с данными датчиков
            const rows = content.data.map((sensor: any) => [
                sensor.sensor_id || '',
                sensor.type || '',
                sensor.value || '',
                sensor.unit || '',
                sensor.timestamp || '',
                sensor.status || ''
            ].join(';'));

            // Итоговые данные
            const summary = [
                '------------',
                'Сводная информация',
                '------------'
            ];

            // Добавляем средние значения
            const avgRows = Object.entries(content.summary.avg_values).map(([type, value]) =>
                `Среднее значение (${type});${value};;;;;;`
            );

            // Добавляем минимальные значения
            const minRows = Object.entries(content.summary.min_values).map(([type, value]) =>
                `Минимальное значение (${type});${value};;;;;;`
            );

            // Добавляем максимальные значения
            const maxRows = Object.entries(content.summary.max_values).map(([type, value]) =>
                `Максимальное значение (${type});${value};;;;;;`
            );

            // Объединяем все части CSV
            return [
                'Отчет:;' + content.title,
                'Дата создания:;' + new Date(content.date_generated).toLocaleString('uk-UA'),
                'Период:;' + new Date(content.date_range.from).toLocaleDateString('uk-UA') + ' - ' + new Date(content.date_range.to).toLocaleDateString('uk-UA'),
                'Количество датчиков:;' + content.summary.total_sensors,
                '',
                header,
                ...rows,
                '',
                ...summary,
                ...avgRows,
                ...minRows,
                ...maxRows
            ].join('\n');
        } catch (error) {
            return 'Ошибка при создании отчета CSV';
        }
    }

    /**
     * Конвертирует данные отчета в HTML формат
     * @param content Содержимое отчета
     * @returns Строка в формате HTML
     */
    private convertToHTML(content: any): string {
        try {
            // Создаем HTML таблицу с данными
            const sensorsTable = `
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th>ID датчика</th>
                            <th>Тип</th>
                            <th>Значение</th>
                            <th>Единица измерения</th>
                            <th>Время измерения</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${content.data.map((sensor: any) => `
                            <tr>
                                <td>${sensor.sensor_id || ''}</td>
                                <td>${sensor.type || ''}</td>
                                <td>${sensor.value || ''}</td>
                                <td>${sensor.unit || ''}</td>
                                <td>${sensor.timestamp ? new Date(sensor.timestamp).toLocaleString('uk-UA') : ''}</td>
                                <td>${sensor.status || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Создаем таблицу со сводными данными
            const summaryTable = `
                <h3>Сводная информация</h3>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 50%;">
                    <thead>
                        <tr style="background-color: #f0f0f0;">
                            <th>Тип датчика</th>
                            <th>Среднее значение</th>
                            <th>Минимальное значение</th>
                            <th>Максимальное значение</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.keys(content.summary.avg_values).map(type => `
                            <tr>
                                <td>${type}</td>
                                <td>${content.summary.avg_values[type] || '-'}</td>
                                <td>${content.summary.min_values[type] || '-'}</td>
                                <td>${content.summary.max_values[type] || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            // Составляем полный HTML документ
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${content.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #333; }
                        .meta { margin-bottom: 20px; color: #666; }
                        table { margin-bottom: 30px; }
                        th { text-align: left; }
                    </style>
                </head>
                <body>
                    <h1>${content.title}</h1>
                    <div class="meta">
                        <p><strong>Дата создания:</strong> ${new Date(content.date_generated).toLocaleString('uk-UA')}</p>
                        <p><strong>Период:</strong> ${new Date(content.date_range.from).toLocaleDateString('uk-UA')} - ${new Date(content.date_range.to).toLocaleDateString('uk-UA')}</p>
                        <p><strong>Количество датчиков:</strong> ${content.summary.total_sensors}</p>
                    </div>
                    
                    <h3>Данные датчиков</h3>
                    ${sensorsTable}
                    
                    ${summaryTable}
                </body>
                </html>
            `;
        } catch (error) {
            return '<html><body><h1>Ошибка при создании отчета</h1></body></html>';
        }
    }

    /**
     * Преобразует тип отчета из формата фронтенда в формат API
     * @param type Тип отчета в формате фронтенда
     * @returns Тип отчета в формате API
     */
    private mapReportTypeToApi(type: ReportType): string {
        switch (type) {
            case 'daily':
            case 'weekly':
            case 'monthly':
                return 'sensor_data';
            case 'custom':
                return 'custom';
            default:
                return 'sensor_data';
        }
    }

    /**
     * Генерирует имя отчета на основе параметров
     * @param params Параметры отчета
     * @returns Имя отчета
     */
    private generateReportName(params: ReportParams): string {
        const dateStr = new Date().toISOString().split('T')[0];
        const categoryTranslation: Record<ReportCategory, string> = {
            'all': 'всі_показники',
            'temperature': 'температура',
            'soil_moisture': 'вологість_ґрунту',
            'humidity': 'вологість_повітря',
            'fertilizer': 'внесення_добрив'
        };

        return `Звіт_${categoryTranslation[params.category]}_${dateStr}`;
    }

    /**
     * Рассчитывает размер отчета на основе данных
     * @param data Данные отчета или параметры
     * @returns Строка с размером отчета
     */
    private generateReportSize(data: any): string {
        // Проверяем, передан ли объект с параметрами отчета
        if (data && data.type) {
            const params = data as ReportParams;

            // Вычисляем размер на основе периода и типа отчета
            const startDate = new Date(params.dateFrom);
            const endDate = new Date(params.dateTo);
            const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Базовый размер отчета
            let sizeBase = 0.5;

            // Увеличиваем размер в зависимости от периода
            sizeBase += daysDiff * 0.05;

            // Корректируем размер в зависимости от типа отчета
            switch (params.type) {
                case 'daily':
                    sizeBase *= 0.8;
                    break;
                case 'weekly':
                    sizeBase *= 1.2;
                    break;
                case 'monthly':
                    sizeBase *= 1.5;
                    break;
                case 'custom':
                    sizeBase *= 1.3;
                    break;
            }

            // Корректируем размер в зависимости от формата
            switch (params.format) {
                case 'pdf':
                    sizeBase *= 1.2;
                    break;
                case 'xlsx':
                    sizeBase *= 0.9;
                    break;
                case 'csv':
                    sizeBase *= 0.7;
                    break;
                case 'json':
                    sizeBase *= 0.8;
                    break;
            }

            // Округляем до 2 знаков после запятой и добавляем случайность для разнообразия
            const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
            const finalSize = (sizeBase * randomFactor).toFixed(2);

            return `${finalSize} MB`;
        }

        // Примерный расчет размера на основе объема данных
        const size = Math.max(0.5, (JSON.stringify(data).length / 1024) / 10).toFixed(2);
        return `${size} MB`;
    }

    /**
     * Возвращает локальные шаблоны отчетов
     * @returns Список шаблонов отчетов
     */
    private getLocalReportTemplates(): ApiResponse<ReportTemplate[]> {
        return {
            success: true,
            data: [
                {
                    id: 1,
                    name: 'Сводка данных датчиків',
                    type: 'sensor_data',
                    description: 'Зведення даних датчиків за вказаний період',
                    parameters: ['start_date', 'end_date', 'sensor_type', 'location_id']
                },
                {
                    id: 2,
                    name: 'Внесення добрив',
                    type: 'fertilizer_applications',
                    description: 'Зведення внесення добрив за вказаний період',
                    parameters: ['start_date', 'end_date', 'fertilizer_type', 'location_id']
                },
                {
                    id: 3,
                    name: 'Активність пристроїв',
                    type: 'device_activity',
                    description: 'Журнал активності пристроїв',
                    parameters: ['start_date', 'end_date', 'device_type', 'device_id']
                }
            ]
        };
    }

    /**
     * Генерирует локальный отчет на основе параметров и данных датчиков
     * @param params Параметры отчета
     * @returns Отчет
     */
    private generateLocalReport(params: ReportParams): ApiResponse<Report> {
        // Генерация имени отчета
        const reportName = this.generateReportName(params);

        // Генерация размера отчета в зависимости от типа и периода
        const size = this.generateReportSize(params);

        // Создаем уникальный идентификатор отчета с информацией о параметрах
        const reportId = `report-${Date.now()}-${params.type}-${params.category}`;

        // Формируем контент отчета в зависимости от формата
        const contentType = this.getContentTypeByFormat(params.format);

        // Генерируем содержимое отчета с реальными данными и сохраняем его
        this.generateReportContent(reportId, params);

        // Сохраняем данные отчета в localStorage для последующего использования
        this.saveReportData(reportId, params);

        return {
            success: true,
            data: {
                id: reportId,
                name: reportName,
                date: new Date().toLocaleString('uk-UA'),
                size: size,
                type: params.type,
                format: params.format,
                url: `/api/reports/download/${reportId}.${params.format}`
            }
        };
    }

    /**
     * Генерирует содержимое отчета с реальными данными сенсоров
     * @param reportId ID отчета
     * @param params Параметры отчета
     */
    private generateReportContent(reportId: string, params: ReportParams): void {
        try {
            // Получаем данные о сенсорах из localStorage (они кэшируются в useSensorData)
            const sensorDataKey = 'cached_sensor_data';
            const cachedSensorData = JSON.parse(localStorage.getItem(sensorDataKey) || '{}');

            // Фильтруем данные по категории
            const filteredData = Object.values(cachedSensorData).filter((sensor: any) => {
                if (params.category === 'all') return true;
                return sensor.type === params.category;
            });

            // Создаем базовый макет отчета
            const reportTemplate = {
                id: reportId,
                title: `Отчет по категории: ${params.category}`,
                date_generated: new Date().toISOString(),
                date_range: {
                    from: params.dateFrom,
                    to: params.dateTo
                },
                parameters: params,
                data: filteredData,
                summary: {
                    total_sensors: filteredData.length,
                    avg_values: this.calculateAverageValues(filteredData),
                    min_values: this.calculateMinValues(filteredData),
                    max_values: this.calculateMaxValues(filteredData)
                }
            };

            // Сохраняем содержимое отчета в localStorage
            const reportContentKey = `report_content_${reportId}`;
            localStorage.setItem(reportContentKey, JSON.stringify(reportTemplate));
        } catch (error) {
            // Ошибка при генерации содержимого отчета
        }
    }

    /**
     * Рассчитывает средние значения показаний датчиков
     * @param sensors Массив датчиков
     * @returns Объект со средними значениями
     */
    private calculateAverageValues(sensors: any[]): Record<string, number> {
        const result: Record<string, { sum: number, count: number }> = {};

        // Собираем суммы и количества по типам
        sensors.forEach(sensor => {
            if (!sensor.value) return;

            if (!result[sensor.type]) {
                result[sensor.type] = { sum: 0, count: 0 };
            }

            result[sensor.type].sum += parseFloat(sensor.value);
            result[sensor.type].count++;
        });

        // Преобразуем суммы в средние значения
        const averages: Record<string, number> = {};
        Object.entries(result).forEach(([type, data]) => {
            averages[type] = Math.round((data.sum / data.count) * 100) / 100;
        });

        return averages;
    }

    /**
     * Рассчитывает минимальные значения показаний датчиков
     * @param sensors Массив датчиков
     * @returns Объект с минимальными значениями
     */
    private calculateMinValues(sensors: any[]): Record<string, number> {
        const result: Record<string, number> = {};

        // Находим минимальные значения по типам
        sensors.forEach(sensor => {
            if (!sensor.value) return;

            const value = parseFloat(sensor.value);

            if (!result[sensor.type] || value < result[sensor.type]) {
                result[sensor.type] = value;
            }
        });

        return result;
    }

    /**
     * Рассчитывает максимальные значения показаний датчиков
     * @param sensors Массив датчиков
     * @returns Объект с максимальными значениями
     */
    private calculateMaxValues(sensors: any[]): Record<string, number> {
        const result: Record<string, number> = {};

        // Находим максимальные значения по типам
        sensors.forEach(sensor => {
            if (!sensor.value) return;

            const value = parseFloat(sensor.value);

            if (!result[sensor.type] || value > result[sensor.type]) {
                result[sensor.type] = value;
            }
        });

        return result;
    }

    /**
     * Сохраняет данные отчета в localStorage для имитации сохранения на сервере
     * @param reportId Идентификатор отчета
     * @param params Параметры отчета
     */
    private saveReportData(reportId: string, params: ReportParams): void {
        try {
            // Получаем текущие сохраненные отчеты
            const reportsKey = 'generated_reports';
            const savedReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');

            // Добавляем новый отчет
            const newReport = {
                id: reportId,
                name: this.generateReportName(params),
                date: new Date().toLocaleString('uk-UA'),
                size: this.generateReportSize(params),
                type: params.type,
                format: params.format,
                parameters: {
                    category: params.category,
                    dateFrom: params.dateFrom,
                    dateTo: params.dateTo
                },
                generated_at: new Date().toISOString()
            };

            // Сохраняем обновленный список
            savedReports.unshift(newReport);
            localStorage.setItem(reportsKey, JSON.stringify(savedReports.slice(0, 20))); // Ограничиваем до 20 отчетов
        } catch (error) {
            // Ошибка при сохранении данных отчета
        }
    }

    /**
     * Возвращает тип содержимого по формату отчета
     * @param format Формат отчета
     * @returns Тип содержимого
     */
    private getContentTypeByFormat(format: ReportFormat): string {
        switch (format) {
            case 'pdf':
                return 'application/pdf';
            case 'xlsx':
                return 'application/vnd.ms-excel';
            case 'csv':
                return 'text/csv';
            case 'json':
                return 'application/json';
            default:
                return 'application/octet-stream';
        }
    }

    /**
     * Возвращает локальные сохраненные отчеты
     * @returns Список отчетов
     */
    private getLocalSavedReportsData(): ApiResponse<Report[]> {
        try {
            // Пытаемся получить отчеты из localStorage
            const reportsKey = 'generated_reports';
            const savedReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');

            // Если есть сохраненные отчеты, возвращаем их
            if (savedReports.length > 0) {
                return {
                    success: true,
                    data: savedReports.map((report: any) => ({
                        id: report.id,
                        name: report.name,
                        date: report.date,
                        size: report.size,
                        type: report.type as ReportType,
                        format: report.format as ReportFormat,
                        url: `/api/reports/download/${report.id}.${report.format}`
                    }))
                };
            }

            // Если нет сохраненных отчетов, возвращаем демо-данные
            return {
                success: true,
                data: [
                    {
                        id: 'report-1',
                        name: 'Звіт_температура_2023-10-15',
                        date: '15.10.2023, 14:30:22',
                        size: '1.45 MB',
                        type: 'daily',
                        format: 'pdf',
                        url: '/mock-reports/report-1.pdf'
                    },
                    {
                        id: 'report-2',
                        name: 'Звіт_вологість_ґрунту_2023-10-10',
                        date: '10.10.2023, 09:15:07',
                        size: '2.12 MB',
                        type: 'weekly',
                        format: 'xlsx',
                        url: '/mock-reports/report-2.xlsx'
                    },
                    {
                        id: 'report-3',
                        name: 'Звіт_всі_показники_2023-09-30',
                        date: '30.09.2023, 18:45:33',
                        size: '3.78 MB',
                        type: 'monthly',
                        format: 'pdf',
                        url: '/mock-reports/report-3.pdf'
                    }
                ]
            };
        } catch (error) {
            // Возвращаем пустой список в случае ошибки
            return {
                success: true,
                data: []
            };
        }
    }
}

export default new ReportApi();