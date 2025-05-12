import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import AlertItem from './AlertItem';
import { useNavigate } from 'react-router-dom';
import { useAlerts, getAlerts } from '../../services/notificationService';

interface NotificationCenterProps {
    className?: string;
}

const NotificationCenter = ({ className = '' }: NotificationCenterProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [alerts, markAsRead, markAllAsRead] = useAlerts();
    const navigate = useNavigate();
    const notificationRef = useRef<HTMLDivElement>(null);

    // Подсчет непрочитанных уведомлений
    const unreadCount = alerts.filter(alert => !alert.read).length;

    // Получение только последних 4 уведомлений для отображения
    const recentAlerts = [...alerts]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 4);

    // Обработчик перехода на страницу всех уведомлений
    const handleViewAllNotifications = () => {
        navigate('/notifications');
        setIsOpen(false);
    };

    // Обработчик переключения меню уведомлений
    const toggleNotifications = () => {
        setIsOpen(prev => !prev);
    };

    // Закрытие при клике вне области
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Обработчик для отметки уведомления как прочитанного
    const handleMarkAsRead = (id: string) => {
        markAsRead(id);
    };

    // Обработчик для отметки всех оповещений как прочитанных
    const handleMarkAllAsRead = () => {
        markAllAsRead();
    };

    return (
        <div className={`relative ${className}`} ref={notificationRef}>
            {/* Кнопка уведомлений */}
            <button
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 relative"
                onClick={toggleNotifications}
                aria-label="Відкрити сповіщення"
                aria-expanded={isOpen}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 bg-error text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Выпадающее меню уведомлений */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-component shadow-lg z-50 border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800 font-inter">Сповіщення</h3>
                        {unreadCount > 0 && (
                            <button
                                className="text-sm text-primary hover:text-primary-dark font-medium"
                                onClick={handleMarkAllAsRead}
                                aria-label="Позначити все як прочитане"
                            >
                                Позначити все як прочитане
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {recentAlerts.length > 0 ? (
                            <div className="py-2">
                                {recentAlerts.map(alert => (
                                    <div key={alert.id} className="px-4">
                                        <AlertItem
                                            alert={alert}
                                            onClick={() => handleMarkAsRead(alert.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-gray-500">
                                Немає сповіщень
                            </div>
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                        <button
                            className="w-full text-center text-primary hover:text-primary-dark text-sm font-medium"
                            onClick={handleViewAllNotifications}
                            aria-label="Переглянути всі сповіщення"
                        >
                            Переглянути всі сповіщення
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(NotificationCenter); 