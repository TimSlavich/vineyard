import React, { useState, useEffect, useRef } from 'react';
import AlertItem from '../components/ui/AlertItem';
import { Bell, Filter } from 'lucide-react';
import { useAlerts, filterAlertsByType, clearAllAlerts } from '../services/notificationService';
import Button from '../components/ui/Button';
import websocketService from '../services/websocketService';
import ModalMessage from '../components/ui/ModalMessage';

type FilterType = 'all' | 'unread' | 'critical' | 'warning' | 'info';

const NotificationsPage: React.FC = () => {
    // Прокрутка страницы вверх при загрузке компонента
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Запрос оповещений при загрузке страницы
    useEffect(() => {
        // Добавляем небольшую задержку, чтобы не отправлять одновременные запросы
        const timeoutId = setTimeout(() => {
            if (websocketService.isConnected()) {
                // Запрашиваем активные оповещения с сервера
                websocketService.requestAlerts();
            }
        }, 100);

        return () => clearTimeout(timeoutId);
    }, []);

    const [alerts, markAsRead, markAllAsRead] = useAlerts();
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    // Добавляем состояние для модального окна подтверждения удаления
    const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

    // Фильтр уведомлений по активному фильтру
    const filteredAlerts = filterAlertsByType(activeFilter);

    // Количество непрочитанных уведомлений
    const unreadCount = alerts.filter(alert => !alert.read).length;

    // Обработчик закрытия меню фильтра при клике вне его
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setIsFilterMenuOpen(false);
            }
        }

        // Добавляем обработчик, если меню открыто
        if (isFilterMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        // Удаляем обработчик при размонтировании компонента или закрытии меню
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterMenuOpen]);

    // Обработчик очистки всех уведомлений
    const handleClearAll = () => {
        clearAllAlerts();
        setClearConfirmOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-16">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-component shadow">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex flex-wrap items-center justify-between">
                            <div className="flex items-center mb-4 md:mb-0">
                                <Bell className="text-primary mr-3" size={24} />
                                <h1 className="text-2xl font-bold text-gray-800 font-inter">Сповіщення</h1>
                                {unreadCount > 0 && (
                                    <span className="ml-3 bg-primary text-white text-xs font-bold px-2 py-1 rounded-full">
                                        {unreadCount} непрочитаних
                                    </span>
                                )}
                            </div>

                            <div className="flex space-x-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={markAllAsRead}
                                    disabled={unreadCount === 0}
                                    className="mr-2"
                                >
                                    Позначити всі як прочитані
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setClearConfirmOpen(true)}
                                    className="border-error text-error hover:bg-error hover:text-white"
                                >
                                    Очистити всі
                                </Button>

                                <div className="relative" ref={filterMenuRef}>
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center"
                                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                    >
                                        <Filter size={16} className="mr-1" />
                                        Фільтр: {activeFilter === 'all' ? 'Всі' :
                                            activeFilter === 'unread' ? 'Непрочитані' :
                                                activeFilter === 'critical' ? 'Критичні' :
                                                    activeFilter === 'warning' ? 'Попередження' : 'Інформаційні'}
                                    </button>

                                    {isFilterMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 py-1">
                                            <button
                                                className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === 'all' ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setActiveFilter('all');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Всі сповіщення
                                            </button>
                                            <button
                                                className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === 'unread' ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setActiveFilter('unread');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Непрочитані
                                            </button>
                                            <button
                                                className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === 'critical' ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setActiveFilter('critical');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Критичні
                                            </button>
                                            <button
                                                className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === 'warning' ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setActiveFilter('warning');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Попередження
                                            </button>
                                            <button
                                                className={`block px-4 py-2 text-sm w-full text-left ${activeFilter === 'info' ? 'bg-gray-100 text-primary font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                onClick={() => {
                                                    setActiveFilter('info');
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Інформаційні
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notifications list */}
                    <div className="p-6">
                        {filteredAlerts.length > 0 ? (
                            <div className="space-y-3">
                                {filteredAlerts.map((alert, index) => (
                                    <AlertItem
                                        key={`notification-page-${alert.id}-${index}`}
                                        alert={alert}
                                        onClick={() => markAsRead(alert.id)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="flex justify-center">
                                    <Bell className="text-gray-300" size={48} />
                                </div>
                                <h3 className="mt-4 text-lg font-medium text-gray-900 font-inter">Немає сповіщень</h3>
                                <p className="mt-2 text-gray-500 font-roboto">
                                    {activeFilter === 'all'
                                        ? 'У вас поки що немає сповіщень.'
                                        : `Немає ${activeFilter === 'unread' ? 'непрочитаних' :
                                            activeFilter === 'critical' ? 'критичних' :
                                                activeFilter === 'warning' ? 'попереджень' : 'інформаційних'} 
                       сповіщень.`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Модальное окно подтверждения удаления всех уведомлений */}
            <ModalMessage
                isOpen={clearConfirmOpen}
                type="confirm"
                title="Видалення сповіщень"
                message="Ви впевнені, що хочете видалити всі сповіщення?"
                onClose={() => setClearConfirmOpen(false)}
                onConfirm={handleClearAll}
            />
        </div>
    );
};

export default NotificationsPage; 