/**
 * Утилиты для перевода различных значений на украинский язык
 */

// Перевод погодных условий
export const translateWeatherCondition = (condition: string): string => {
    const translations: Record<string, string> = {
        'Sunny': 'Сонячно',
        'Partly Cloudy': 'Мінлива хмарність',
        'Cloudy': 'Хмарно',
        'Rain': 'Дощ',
        'Scattered Showers': 'Місцями дощ',
        'Thunderstorm': 'Гроза',
        'Snow': 'Сніг',
        'Fog': 'Туман',
        'Clear': 'Ясно',
        'Hot': 'Спека',
        'Mild': 'Помірно',
        'Cool': 'Прохолодно',
        'Cold': 'Холодно'
    };
    return translations[condition] || condition;
};

// Перевод коротких названий дней недели
export const translateShortDay = (day: string): string => {
    const translations: Record<string, string> = {
        'Mon': 'Пн',
        'Tue': 'Вт',
        'Wed': 'Ср',
        'Thu': 'Чт',
        'Fri': 'Пт',
        'Sat': 'Сб',
        'Sun': 'Нд'
    };
    return translations[day] || day;
};

// Перевод полных названий дней недели
export const translateDay = (day: string): string => {
    const translations: Record<string, string> = {
        'monday': 'Понеділок',
        'tuesday': 'Вівторок',
        'wednesday': 'Середа',
        'thursday': 'Четвер',
        'friday': 'П\'ятниця',
        'saturday': 'Субота',
        'sunday': 'Неділя'
    };
    return translations[day.toLowerCase()] || day;
};

// Перевод месяцев
export const translateMonth = (month: string): string => {
    const translations: Record<string, string> = {
        'January': 'Січень',
        'February': 'Лютий',
        'March': 'Березень',
        'April': 'Квітень',
        'May': 'Травень',
        'June': 'Червень',
        'July': 'Липень',
        'August': 'Серпень',
        'September': 'Вересень',
        'October': 'Жовтень',
        'November': 'Листопад',
        'December': 'Грудень'
    };
    return translations[month] || month;
};

// Короткие названия месяцев для графиков
export const getShortMonthName = (monthIndex: number): string => {
    const monthNames = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
    return monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : '';
};

/**
 * Константы перевода для использования в приложении
 */

// Словари для перевода устройств
export const DEVICE_TYPE_UA: Record<string, string> = {
    'Soil Moisture': 'Вологість ґрунту',
    'Multi-sensor': 'Мульти-сенсор',
    'Leaf Wetness': 'Вологість листя',
    'Temperature': 'Температура',
    'Humidity': 'Вологість',
    'drone': 'Дрон',
    'harvester': 'Комбайн',
    'seeder': 'Сіяч',
    'maintenance': 'Технічний робот',
};

export const DEVICE_NAME_UA: Record<string, string> = {
    'Soil Sensor #103': 'Датчик вологості ґрунту #103',
    'Weather Station #247': 'Метеостанція #247',
    'Leaf Wetness #78': 'Датчик вологості листя #78',
    'Soil Sensor #104': 'Датчик вологості ґрунту #104',
    'Temperature #355': 'Датчик температури #355',
    'Дрон-розвідник 1': 'Дрон-розвідник 1',
    'Дрон-обприскувач 1': 'Дрон-обприскувач 1',
    'Робот-комбайн 1': 'Робот-комбайн 1',
    'Робот-сіяч 1': 'Робот-сіяч 1',
    'Робот-технік 1': 'Робот-технік 1',
};

// Словари для перевода типов сенсоров и уведомлений
export const SENSOR_TYPE_UA: Record<string, string> = {
    'temperature': 'Температура',
    'humidity': 'Вологість',
    'soil_moisture': 'Вологість ґрунту',
    'soil_temperature': 'Температура ґрунту',
    'light': 'Освітленість',
    'ph': 'Кислотність pH',
    'wind_speed': 'Швидкість вітру',
    'wind_direction': 'Напрям вітру',
    'rainfall': 'Опади',
    'co2': 'Рівень CO₂'
};

export const NOTIF_LABELS_UA: Record<string, string> = {
    'info': 'Інформаційні сповіщення',
    'warning': 'Попереджувальні сповіщення',
    'critical': 'Критичні сповіщення',
};

export const ALERT_TYPE_UA: Record<string, string> = {
    'high': 'Високе значення',
    'low': 'Низьке значення',
    'normal': 'Нормальне значення',
    'offline': 'Пристрій не в мережі',
    'system': 'Системне повідомлення',
    'update': 'Оновлення системи'
};

export const NOTIFICATION_CHANNEL_UA: Record<string, string> = {
    'browser': 'Браузерні сповіщення',
    'email': 'Електронна пошта',
    'sms': 'SMS-повідомлення',
    'push': 'Push-сповіщення',
    'telegram': 'Telegram-повідомлення',
    'mobile': 'Мобільний додаток'
};

// Словарь для статусов устройств
export const DEVICE_STATUS_UA: Record<string, string> = {
    'online': 'Онлайн',
    'offline': 'Офлайн',
    'maintenance': 'Обслуговування',
    'active': 'Активний',
    'idle': 'Очікування',
    'charging': 'Заряджається',
};

// Функция для перевода для удобства использования
export const translateDeviceType = (type: string): string => {
    return DEVICE_TYPE_UA[type] || type;
};

export const translateDeviceName = (name: string): string => {
    return DEVICE_NAME_UA[name] || name;
};

export const translateSensorType = (type: string): string => {
    return SENSOR_TYPE_UA[type] || type;
};

export const translateDeviceStatus = (status: string): string => {
    return DEVICE_STATUS_UA[status] || status;
}; 