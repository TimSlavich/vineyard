import { useState, useCallback, useRef } from 'react';

/**
 * Тип состояния для API запроса
 */
interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    success: boolean;
}

/**
 * Тип опций для хука useApi
 */
interface UseApiOptions {
    /** Автоматически сбрасывать ошибку при новом запросе */
    resetErrorOnRequest?: boolean;
    /** Автоматически сбрасывать успех при новом запросе */
    resetSuccessOnRequest?: boolean;
    /** Автоматически сбрасывать данные при новом запросе */
    resetDataOnRequest?: boolean;
}

/**
 * Хук для работы с API запросами
 * @param apiFunction функция API, которая будет вызываться
 * @param options опции хука
 * @returns объект с данными, состоянием загрузки, ошибкой и функцией запроса
 */
export function useApi<T, P extends any[]>(
    apiFunction: (...args: P) => Promise<T>,
    options: UseApiOptions = {}
) {
    const {
        resetErrorOnRequest = true,
        resetSuccessOnRequest = true,
        resetDataOnRequest = false
    } = options;

    const [state, setState] = useState<ApiState<T>>({
        data: null,
        loading: false,
        error: null,
        success: false
    });

    // Сохраняем ссылку на текущую функцию API
    const apiFunctionRef = useRef(apiFunction);
    apiFunctionRef.current = apiFunction;

    // Сохраняем ссылку на текущие опции
    const optionsRef = useRef({
        resetErrorOnRequest,
        resetSuccessOnRequest,
        resetDataOnRequest
    });
    optionsRef.current = {
        resetErrorOnRequest,
        resetSuccessOnRequest,
        resetDataOnRequest
    };

    /**
     * Выполняет API запрос
     * @param args аргументы для API функции
     * @returns результат API запроса
     */
    const execute = useCallback(
        async (...args: P) => {
            const {
                resetErrorOnRequest,
                resetSuccessOnRequest,
                resetDataOnRequest
            } = optionsRef.current;

            try {
                // Устанавливаем состояние загрузки
                setState(prev => ({
                    ...prev,
                    loading: true,
                    error: resetErrorOnRequest ? null : prev.error,
                    success: resetSuccessOnRequest ? false : prev.success,
                    data: resetDataOnRequest ? null : prev.data
                }));

                // Выполняем API запрос
                const result = await apiFunctionRef.current(...args);

                // Устанавливаем успешный результат
                setState({
                    data: result,
                    loading: false,
                    error: null,
                    success: true
                });

                return result;
            } catch (error) {
                // Устанавливаем ошибку
                setState({
                    data: null,
                    loading: false,
                    error: error instanceof Error ? error : new Error(String(error)),
                    success: false
                });

                throw error;
            }
        },
        []
    );

    /**
     * Сбрасывает состояние API запроса
     */
    const reset = useCallback(() => {
        setState({
            data: null,
            loading: false,
            error: null,
            success: false
        });
    }, []);

    return {
        ...state,
        execute,
        reset
    };
} 