import { useState, useEffect } from 'react';

/**
 * Хук для работы с localStorage с типизацией
 * @param key Ключ для сохранения в localStorage
 * @param initialValue Начальное значение, если в localStorage нет данных
 * @returns [хранимое значение, функция для обновления значения]
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    // Состояние для хранения значения
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    // Функция для обновления значения
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Ошибка при записи в localStorage (ключ: ${key}):`, error);
        }
    };

    // Синхронизация между вкладками
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch {
                    // Игнорируем ошибки при синхронизации
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue];
}

export default useLocalStorage; 