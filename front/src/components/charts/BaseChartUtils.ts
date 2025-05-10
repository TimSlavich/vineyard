/**
 * Общие утилиты для работы с графиками.
 * Этот файл содержит общие функции и типы, используемые во всех компонентах графиков.
 */
import { getShortMonthName } from '../../utils/translations';

/**
 * Преобразует timestamp в форматированную строку времени в зависимости от выбранного формата.
 * 
 * @param timestamp - Строка timestamp ISO формата
 * @param timeFormat - Формат времени ('hour', 'day' или 'month')
 * @returns Форматированная строка времени
 */
export const formatTimeFromTimestamp = (timestamp: string, timeFormat: 'hour' | 'day' | 'month' = 'hour'): string => {
    const date = new Date(timestamp);
    let formattedTime = '';

    if (timeFormat === 'hour') {
        formattedTime = `${date.getHours().toString().padStart(2, '0')}:00`;
    } else if (timeFormat === 'day') {
        formattedTime = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    } else {
        formattedTime = getShortMonthName(date.getMonth());
    }

    return formattedTime;
};

/**
 * Форматирует дату в локализованную строку для отображения в tooltip.
 * 
 * @param timestamp - Строка timestamp ISO формата
 * @returns Локализованная строка даты и времени
 */
export const formatDateToLocale = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Вычисляет минимальное и максимальное значения для графика с учетом порога.
 * 
 * @param values - Массив числовых значений
 * @param treshold - Значение порога (опционально)
 * @returns Объект с минимальным и максимальным значениями
 */
export const calculateAxisDomain = (values: number[], treshold?: number): { min: number, max: number } => {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);

    // Добавляем отступ к минимуму и учитываем порог при определении максимума
    const min = Math.max(0, Math.floor(dataMin * 0.9));
    const max = treshold ?
        Math.ceil(Math.max(dataMax, treshold) * 1.1) :
        Math.ceil(dataMax * 1.1);

    return { min, max };
};

/**
 * Типы для компонентов графиков
 */
export interface ChartDataPoint {
    value: number;
    timestamp: string;
    [key: string]: any;
}

export interface BaseChartProps {
    color: string;
    height?: number;
    showDots?: boolean;
    strokeWidth?: number;
    treshold?: number;
    tresholdLabel?: string;
}

export const defaultChartSettings = {
    height: 200,
    showDots: true,
    strokeWidth: 2.5,
    tresholdLabel: "Поріг"
}; 