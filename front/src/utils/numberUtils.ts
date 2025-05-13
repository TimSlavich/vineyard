/**
 * Утилиты для форматирования чисел и значений
 */

/**
 * Форматирует число с указанной точностью
 * @param value число для форматирования
 * @param precision количество знаков после запятой (по умолчанию 1)
 * @returns отформатированное число в виде строки
 */
export const formatNumber = (value: number, precision: number = 1): string => {
    return value.toFixed(precision);
};

/**
 * Форматирует значение датчика с сокращением до указанной точности
 * @param value значение для форматирования
 * @param precision количество знаков после запятой (по умолчанию 1)
 * @returns отформатированное значение в виде строки
 */
export const formatSensorValue = (value: number, precision: number = 1): string => {
    // Проверяем, является ли число целым
    if (Number.isInteger(value)) {
        return value.toString();
    }

    // Просто округляем до указанного количества знаков после запятой
    return Number(value.toFixed(precision)).toString();
};

/**
 * Форматирует большие числа с сокращением (K, M, B)
 * @param value число для форматирования
 * @returns отформатированное число со суффиксом K, M или B
 */
export const formatLargeNumber = (value: number): string => {
    if (value < 1000) {
        return formatSensorValue(value, 1);
    } else if (value < 1000000) {
        return formatSensorValue(value / 1000, 1) + 'K';
    } else if (value < 1000000000) {
        return formatSensorValue(value / 1000000, 1) + 'M';
    } else {
        return formatSensorValue(value / 1000000000, 1) + 'B';
    }
}; 