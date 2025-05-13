/**
 * Утилиты для работы с датами и временем
 */

/**
 * Форматирует относительное время для отображения в уведомлениях
 * @param timestamp - ISO строка даты и времени
 * @param localeUkr - использовать украинскую локализацию (по умолчанию true)
 * @returns Форматированная строка "5 минут назад" и т.п.
 */
export const formatRelativeTime = (timestamp: string, localeUkr = true): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (localeUkr) {
        if (diffMins < 60) {
            return `${diffMins} ${getUkrMinutePluralForm(diffMins)} тому`;
        } else if (diffHours < 24) {
            return `${diffHours} ${getUkrHourPluralForm(diffHours)} тому`;
        } else {
            return `${diffDays} ${getUkrDayPluralForm(diffDays)} тому`;
        }
    } else {
        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }
};

/**
 * Возвращает правильную форму множественного числа для слова "минута" в украинском языке
 */
const getUkrMinutePluralForm = (count: number): string => {
    if (count === 1) return 'хвилину';
    if (count >= 2 && count <= 4) return 'хвилини';
    return 'хвилин';
};

/**
 * Возвращает правильную форму множественного числа для слова "час" в украинском языке
 */
const getUkrHourPluralForm = (count: number): string => {
    if (count === 1) return 'годину';
    if (count >= 2 && count <= 4) return 'години';
    return 'годин';
};

/**
 * Возвращает правильную форму множественного числа для слова "день" в украинском языке
 */
const getUkrDayPluralForm = (count: number): string => {
    if (count === 1) return 'день';
    if (count >= 2 && count <= 4) return 'дні';
    return 'днів';
};

/**
 * Форматирует дату и время в локализованный формат
 * @param timestamp - ISO строка даты и времени
 * @param options - опции форматирования
 * @returns Форматированная строка даты и времени
 */
export const formatDateTime = (
    timestamp: string,
    options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }
): string => {
    return new Date(timestamp).toLocaleString('uk-UA', options);
};

/**
 * Форматирует дату в локализованный формат
 * @param timestamp - ISO строка даты и времени
 * @returns Форматированная строка даты
 */
export const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Форматирует дату в локальный формат даты и времени
 * @param date дата для форматирования (строка ISO или объект Date)
 * @param locale локаль для форматирования (по умолчанию 'uk-UA')
 * @returns форматированная дата и время
 */
export const formatDateTimeWithLocale = (date: string | Date, locale: string = 'uk-UA'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        return dateObj.toLocaleString(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid date';
    }
};

/**
 * Форматирует дату в локальный формат даты
 * @param date дата для форматирования (строка ISO или объект Date)
 * @param locale локаль для форматирования (по умолчанию 'uk-UA')
 * @returns форматированная дата
 */
export const formatDateWithLocale = (date: string | Date, locale: string = 'uk-UA'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        return dateObj.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
};

/**
 * Форматирует дату в локальный формат времени
 * @param date дата для форматирования (строка ISO или объект Date)
 * @param locale локаль для форматирования (по умолчанию 'uk-UA')
 * @returns форматированное время
 */
export const formatTime = (date: string | Date, locale: string = 'uk-UA'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;

        return dateObj.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return 'Invalid time';
    }
};

/**
 * Возвращает время, прошедшее с указанной даты
 * @param date дата для расчета (строка ISO или объект Date)
 * @param locale локаль для форматирования (по умолчанию 'uk-UA')
 * @returns строка с прошедшим временем
 */
export const timeAgo = (date: string | Date, locale: string = 'uk-UA'): string => {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

        // Если меньше минуты
        if (diffInSeconds < 60) {
            return locale === 'uk-UA' ? 'щойно' : 'just now';
        }

        // Если меньше часа
        if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return locale === 'uk-UA'
                ? `${minutes} ${minutes === 1 ? 'хвилину' : minutes < 5 ? 'хвилини' : 'хвилин'} тому`
                : `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
        }

        // Если меньше суток
        if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return locale === 'uk-UA'
                ? `${hours} ${hours === 1 ? 'годину' : hours < 5 ? 'години' : 'годин'} тому`
                : `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
        }

        // Если меньше недели
        if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return locale === 'uk-UA'
                ? `${days} ${days === 1 ? 'день' : days < 5 ? 'дні' : 'днів'} тому`
                : `${days} ${days === 1 ? 'day' : 'days'} ago`;
        }

        // Иначе возвращаем дату
        return formatDateWithLocale(dateObj, locale);
    } catch (error) {
        return 'Invalid date';
    }
};

/**
 * Парсит дату из строки в объект Date
 * @param dateStr строка с датой
 * @param timeZone временная зона (по умолчанию локальная)
 * @returns объект Date
 */
export const parseDate = (dateStr: string, timeZone?: string): Date => {
    try {
        // Если передана строка в формате ISO, используем стандартный конструктор
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
            return new Date(dateStr);
        }

        // Иначе пробуем парсить с учетом временной зоны
        const options: Intl.DateTimeFormatOptions = {
            timeZone
        };

        // Если временная зона не указана, используем локальную
        const formatter = new Intl.DateTimeFormat('en-US', options);
        const parts = formatter.formatToParts(new Date(dateStr));

        // Извлекаем компоненты даты из частей
        const dateComponents: Record<string, string> = {};
        parts.forEach(part => {
            if (part.type !== 'literal') {
                dateComponents[part.type] = part.value;
            }
        });

        // Создаем объект Date из компонентов
        const year = parseInt(dateComponents.year, 10);
        const month = parseInt(dateComponents.month, 10) - 1; // В JavaScript месяцы начинаются с 0
        const day = parseInt(dateComponents.day, 10);
        const hour = dateComponents.hour ? parseInt(dateComponents.hour, 10) : 0;
        const minute = dateComponents.minute ? parseInt(dateComponents.minute, 10) : 0;
        const second = dateComponents.second ? parseInt(dateComponents.second, 10) : 0;

        return new Date(year, month, day, hour, minute, second);
    } catch (error) {
        return new Date(); // Возвращаем текущую дату в случае ошибки
    }
};

/**
 * Форматирует длительность в читаемый вид
 * @param durationInSeconds длительность в секундах
 * @param locale локаль для форматирования (по умолчанию 'uk-UA')
 * @returns строка с длительностью
 */
export const formatDuration = (durationInSeconds: number, locale: string = 'uk-UA'): string => {
    try {
        const hours = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds % 3600) / 60);
        const seconds = durationInSeconds % 60;

        if (locale === 'uk-UA') {
            // Форматирование для украинской локали
            if (hours > 0) {
                return `${hours} ${hours === 1 ? 'година' : hours < 5 ? 'години' : 'годин'} ${minutes} ${minutes === 1 ? 'хвилина' : minutes < 5 ? 'хвилини' : 'хвилин'}`;
            } else if (minutes > 0) {
                return `${minutes} ${minutes === 1 ? 'хвилина' : minutes < 5 ? 'хвилини' : 'хвилин'} ${seconds} ${seconds === 1 ? 'секунда' : seconds < 5 ? 'секунди' : 'секунд'}`;
            } else {
                return `${seconds} ${seconds === 1 ? 'секунда' : seconds < 5 ? 'секунди' : 'секунд'}`;
            }
        } else {
            // Форматирование для английской локали
            if (hours > 0) {
                return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
            } else if (minutes > 0) {
                return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
            } else {
                return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
            }
        }
    } catch (error) {
        return 'Invalid duration';
    }
};

/**
 * Форматирует относительное время коротко для отображения в уведомлениях 
 * (например "5 хв" вместо "5 хвилин тому")
 * 
 * @param timestamp - ISO строка даты и времени
 * @param localeUkr - использовать украинскую локализацию (по умолчанию true)
 * @returns Форматированная строка "5 хв" и т.п.
 */
export const formatRelativeTimeShort = (timestamp: string, localeUkr = true): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000); // Округляем минуты, а не обрезаем
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (localeUkr) {
        if (diffMins < 60) {
            return `${diffMins} хв`;
        } else if (diffHours < 24) {
            return `${diffHours} год`;
        } else {
            return `${diffDays} д`;
        }
    } else {
        if (diffMins < 60) {
            return `${diffMins}m`;
        } else if (diffHours < 24) {
            return `${diffHours}h`;
        } else {
            return `${diffDays}d`;
        }
    }
};

/**
 * Форматирует дату из различных форматов в читаемый вид для отчетов
 * @param dateString строка с датой в любом формате
 * @returns отформатированная строка даты
 */
export const formatReportDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';

    try {
        // Проверяем, если это уже форматированная дата (ДД.ММ.ГГГГ ЧЧ:ММ)
        if (/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/.test(dateString)) {
            return dateString;
        }

        // Пробуем разные форматы даты
        let date: Date;
        if (dateString.includes('T') || dateString.includes('Z') || dateString.includes('+')) {
            // ISO формат
            date = new Date(dateString);
        } else {
            // Обычный формат
            date = new Date(dateString);
        }

        // Проверяем валидность даты
        if (isNaN(date.getTime())) {
            return dateString; // Возвращаем исходную строку если не удалось распарсить
        }

        // Форматируем в ДД.ММ.ГГГГ ЧЧ:ММ
        return new Intl.DateTimeFormat('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        return dateString;
    }
}; 