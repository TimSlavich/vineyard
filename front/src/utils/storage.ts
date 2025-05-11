/**
 * Утилиты для безопасной работы с localStorage
 */

/**
 * Проверяет доступность localStorage
 */
export const isLocalStorageAvailable = (): boolean => {
    try {
        const testKey = '__test__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.error('localStorage недоступен:', e);
        return false;
    }
};

/**
 * Получает значение из localStorage
 * @param key ключ
 * @param defaultValue значение по умолчанию
 * @returns значение или значение по умолчанию
 */
export function getItem<T>(key: string, defaultValue: T | null = null): T | null {
    try {
        if (!isLocalStorageAvailable()) {
            console.warn(`localStorage недоступен, возвращаем значение по умолчанию для ${key}`);
            return defaultValue;
        }

        const item = localStorage.getItem(key);

        // Если элемент отсутствует, возвращаем значение по умолчанию
        if (item === null) {
            return defaultValue;
        }

        // Проверка на строку "undefined" и пустую строку
        if (item === "undefined" || item === "") {
            console.warn(`Получено невалидное значение "${item}" для ключа ${key}, возвращаем значение по умолчанию`);
            return defaultValue;
        }

        try {
            // Парсим JSON значение
            return JSON.parse(item);
        } catch (parseError) {
            console.error(`Ошибка при парсинге JSON для ключа ${key}:`, parseError, "Значение:", item);

            // Если не удалось распарсить, возвращаем само значение как строку, если это строковый тип
            if (typeof defaultValue === 'string') {
                return item as unknown as T;
            }

            return defaultValue;
        }
    } catch (error) {
        console.error(`Error getting item ${key} from localStorage:`, error);
        return defaultValue;
    }
}

/**
 * Сохраняет значение в localStorage
 * @param key ключ
 * @param value значение
 * @returns успешность операции
 */
export function setItem<T>(key: string, value: T): boolean {
    try {
        if (!isLocalStorageAvailable()) return false;

        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Error setting item ${key} in localStorage:`, error);
        return false;
    }
}

/**
 * Удаляет значение из localStorage
 * @param key ключ
 * @returns успешность операции
 */
export function removeItem(key: string): boolean {
    try {
        if (!isLocalStorageAvailable()) return false;

        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error(`Error removing item ${key} from localStorage:`, error);
        return false;
    }
}

/**
 * Проверяет, авторизован ли пользователь
 * @returns статус авторизации
 */
export function isAuthenticated(): boolean {
    // Проверяем наличие токена
    const token = getItem('accessToken');

    // Проверяем наличие данных пользователя с действительным ID
    const user = getItem<any>('user');
    const hasValidUserId = user && typeof user === 'object' &&
        (user.id !== undefined && user.id !== null);

    // Если есть токен или данные пользователя с ID, считаем пользователя авторизованным
    return !!token || !!hasValidUserId;
}

/**
 * Обновляет токены доступа (для отладки)
 * @param accessToken новый токен доступа
 * @param refreshToken новый токен обновления
 */
export function updateTokens(accessToken: string, refreshToken: string): void {
    setItem('accessToken', accessToken);
    setItem('refreshToken', refreshToken);
    console.log('Токены обновлены');
}

/**
 * Сохраняет статус авторизации и данные пользователя
 * @param status статус авторизации
 * @param userData данные пользователя
 * @returns успешность операции
 */
export function setAuthenticated(status: boolean, userData?: any): boolean {
    try {
        if (status && userData) {
            setItem('user', userData);
        } else if (!status) {
            removeItem('accessToken');
            removeItem('refreshToken');
            removeItem('user');
        }
        return true;
    } catch (error) {
        console.error('Error setting authentication status:', error);
        return false;
    }
}

/**
 * Получает данные пользователя
 */
export const getUserData = (): any => {
    const userData = getItem<any>('user', null);

    // Проверяем, что у пользователя есть данные и ID
    if (userData && userData.id !== undefined) {
        // Если id является строкой и может быть преобразован в число, преобразуем его
        if (typeof userData.id === 'string' && !isNaN(Number(userData.id))) {
            userData.id = Number(userData.id);
            // Обновляем данные в localStorage с конвертированным ID
            setItem('user', userData);
            console.log('ID пользователя конвертирован из строки в число:', userData.id);
        }
    }

    return userData;
};

/**
 * Удаляет данные авторизации
 */
export const logout = (): boolean => {
    try {
        // Удаляем все токены и данные авторизации
        removeItem('accessToken');
        removeItem('refreshToken');
        removeItem('user');
        removeItem('isAuthenticated');
        return true;
    } catch (e) {
        console.error('Ошибка при выходе из системы:', e);
        return false;
    }
}; 