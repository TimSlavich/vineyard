import { useState, useCallback } from 'react';

interface PaginationOptions {
    initialPage?: number;
    initialPerPage?: number;
    totalItems?: number;
}

/**
 * Хук для управления пагинацией
 * @param options настройки пагинации
 * @returns методы и состояния для работы с пагинацией
 */
export const usePagination = (options: PaginationOptions = {}) => {
    const {
        initialPage = 1,
        initialPerPage = 10,
        totalItems = 0
    } = options;

    const [page, setPage] = useState(initialPage);
    const [perPage, setPerPage] = useState(initialPerPage);
    const [total, setTotal] = useState(totalItems);

    /**
     * Вычисляет общее количество страниц
     */
    const totalPages = Math.max(1, Math.ceil(total / perPage));

    /**
     * Вычисляет индексы элементов на текущей странице
     */
    const startIndex = (page - 1) * perPage;
    const endIndex = Math.min(startIndex + perPage - 1, total - 1);

    /**
     * Переход на следующую страницу
     */
    const nextPage = useCallback(() => {
        setPage(prev => Math.min(prev + 1, totalPages));
    }, [totalPages]);

    /**
     * Переход на предыдущую страницу
     */
    const prevPage = useCallback(() => {
        setPage(prev => Math.max(prev - 1, 1));
    }, []);

    /**
     * Переход на конкретную страницу
     * @param newPage номер страницы
     */
    const goToPage = useCallback((newPage: number) => {
        setPage(Math.max(1, Math.min(newPage, totalPages)));
    }, [totalPages]);

    /**
     * Изменение количества элементов на странице
     * @param newPerPage новое количество элементов на странице
     */
    const changePerPage = useCallback((newPerPage: number) => {
        setPerPage(newPerPage);
        setPage(1); // Сбрасываем на первую страницу при изменении perPage
    }, []);

    /**
     * Обновление общего количества элементов
     * @param newTotal новое общее количество элементов
     */
    const updateTotal = useCallback((newTotal: number) => {
        setTotal(newTotal);
        // Если текущая страница становится недоступной, переходим на последнюю
        const newTotalPages = Math.max(1, Math.ceil(newTotal / perPage));
        if (page > newTotalPages) {
            setPage(newTotalPages);
        }
    }, [page, perPage]);

    /**
     * Генерирует массив номеров страниц для отображения
     * @param maxButtons максимальное количество кнопок пагинации
     * @returns массив номеров страниц
     */
    const getPageNumbers = useCallback((maxButtons: number = 5) => {
        // Если страниц меньше, чем максимальное количество кнопок
        if (totalPages <= maxButtons) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        // Вычисляем количество кнопок по бокам от текущей
        const sideButtons = Math.floor((maxButtons - 1) / 2);

        // Начальная и конечная страницы
        let startPage = Math.max(1, page - sideButtons);
        let endPage = Math.min(totalPages, page + sideButtons);

        // Корректируем, если не хватает кнопок с одной стороны
        if (startPage === 1) {
            endPage = Math.min(totalPages, startPage + maxButtons - 1);
        }
        if (endPage === totalPages) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
    }, [page, totalPages]);

    return {
        page,
        perPage,
        total,
        totalPages,
        startIndex,
        endIndex,
        nextPage,
        prevPage,
        goToPage,
        changePerPage,
        updateTotal,
        getPageNumbers
    };
};

export default usePagination; 