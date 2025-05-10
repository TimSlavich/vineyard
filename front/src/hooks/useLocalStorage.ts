import { useState, useEffect, useCallback } from 'react';

/**
 * Хук для работы с localStorage с кэшированием и типизацией
 * @param key Ключ для сохранения в localStorage
 * @param initialValue Начальное значение, если в localStorage нет данных
 * @returns [хранимое значение, функция для обновления значения]
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // Кэшируем состояние, чтобы не обращаться к localStorage при каждом рендере
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            // Пытаемся получить данные из localStorage
            const item = window.localStorage.getItem(key);
            // Если данные есть, парсим JSON; иначе, используем initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // В случае ошибки используем initialValue
            console.error(`Ошибка при чтении из localStorage (ключ: ${key}):`, error);
            return initialValue;
        }
    });

    // Функция для обновления значения в состоянии и localStorage
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            // Позволяет передавать функцию для обновления значения
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Обновляем состояние
            setStoredValue(valueToStore);

            // Сохраняем в localStorage
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Ошибка при записи в localStorage (ключ: ${key}):`, error);
        }
    }, [key, storedValue]);

    // Эффект для синхронизации между вкладками
    useEffect(() => {
        // Обработчик события 'storage'
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    // Обновляем состояние при изменении localStorage в другой вкладке
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.error(`Ошибка при обработке изменения localStorage (ключ: ${key}):`, error);
                }
            }
        };

        // Добавляем обработчик события
        window.addEventListener('storage', handleStorageChange);

        // Очищаем обработчик при размонтировании
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [storedValue, setValue];
}

export default useLocalStorage; 