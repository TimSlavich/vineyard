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
 * Безопасно получает значение из localStorage
 */
export const getItem = <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
        if (!isLocalStorageAvailable()) return defaultValue;

        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;

        try {
            return JSON.parse(item) as T;
        } catch (e) {
            return item as unknown as T;
        }
    } catch (e) {
        console.error(`Ошибка при получении данных из localStorage (ключ: ${key}):`, e);
        return defaultValue;
    }
};

/**
 * Безопасно устанавливает значение в localStorage
 */
export const setItem = <T>(key: string, value: T): boolean => {
    try {
        if (!isLocalStorageAvailable()) return false;

        const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, valueToStore);
        return true;
    } catch (e) {
        console.error(`Ошибка при сохранении данных в localStorage (ключ: ${key}):`, e);
        return false;
    }
};

/**
 * Безопасно удаляет значение из localStorage
 */
export const removeItem = (key: string): boolean => {
    try {
        if (!isLocalStorageAvailable()) return false;

        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error(`Ошибка при удалении данных из localStorage (ключ: ${key}):`, e);
        return false;
    }
};

/**
 * Проверяет, авторизован ли пользователь
 */
export const isAuthenticated = (): boolean => {
    try {
        const authValue = localStorage.getItem('isAuthenticated');
        return authValue === 'true';
    } catch (e) {
        console.error('Ошибка при проверке авторизации:', e);
        return false;
    }
};

/**
 * Получает данные пользователя
 */
export const getUserData = (): any => {
    return getItem('user', null);
};

/**
 * Устанавливает авторизацию пользователя
 */
export const setAuthenticated = (value: boolean, userData?: any): boolean => {
    try {
        // Сохраняем именно строковое значение
        localStorage.setItem('isAuthenticated', value ? 'true' : 'false');

        if (value && userData) {
            try {
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (e) {
                console.error('Ошибка при сохранении данных пользователя:', e);
                return false;
            }
        }

        return true;
    } catch (e) {
        console.error('Ошибка при установке статуса авторизации:', e);
        return false;
    }
};

/**
 * Удаляет данные авторизации
 */
export const logout = (): boolean => {
    try {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        return true;
    } catch (e) {
        console.error('Ошибка при выходе из системы:', e);
        return false;
    }
}; 