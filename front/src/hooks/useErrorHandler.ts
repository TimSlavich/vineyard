import { useState } from 'react';

interface ErrorHandlerOptions {
    /** Автоматически очищать ошибку через заданное время (мс) */
    autoClearTimeout?: number;
}

/**
 * Хук для обработки ошибок
 * @param options настройки обработчика ошибок
 * @returns методы и состояния для работы с ошибками
 */
export const useErrorHandler = (options: ErrorHandlerOptions = {}) => {
    const { autoClearTimeout } = options;
    const [error, setError] = useState<Error | null>(null);

    /**
     * Устанавливает ошибку
     * @param err ошибка для установки
     */
    const handleError = (err: unknown) => {
        const errorObject = err instanceof Error ? err : new Error(String(err));
        setError(errorObject);

        if (autoClearTimeout) {
            setTimeout(() => setError(null), autoClearTimeout);
        }
    };

    /**
     * Очищает ошибку
     */
    const clearError = () => setError(null);

    /**
     * Обертка для асинхронных функций
     * @param asyncFunction асинхронная функция для выполнения
     * @returns функция, которая выполняет asyncFunction и обрабатывает ошибки
     */
    const withErrorHandling = <T extends any[], R>(asyncFunction: (...args: T) => Promise<R>) => {
        return async (...args: T): Promise<R | undefined> => {
            try {
                clearError();
                return await asyncFunction(...args);
            } catch (err) {
                handleError(err);
                return undefined;
            }
        };
    };

    return {
        error,
        handleError,
        clearError,
        withErrorHandling,
        hasError: error !== null
    };
};

export default useErrorHandler; 