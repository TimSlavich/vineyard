import React from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';

interface ModalMessageProps {
    open?: boolean;
    isOpen?: boolean;
    type: 'info' | 'success' | 'error' | 'confirm';
    title: string;
    message?: React.ReactNode;
    onClose: () => void;
    onConfirm?: (() => void) | null;
    children?: React.ReactNode;
}

const iconMap = {
    info: <Info className="text-blue-500" size={32} />,
    success: <CheckCircle className="text-green-500" size={32} />,
    error: <XCircle className="text-red-500" size={32} />,
    confirm: <AlertTriangle className="text-amber-500" size={32} />
};

const ModalMessage: React.FC<ModalMessageProps> = ({
    open = false,
    isOpen = false,
    type = 'info',
    title,
    message,
    onClose,
    onConfirm,
    children,
}) => {
    // Ничего не рендерим, если модальное окно закрыто
    // Используем либо open, либо isOpen
    if (!open && !isOpen) return null;

    // Обработчик подтверждения - вызывает onConfirm и закрывает модальное окно
    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
            // Не закрываем окно здесь, так как функция onConfirm должна сама закрыть его
        } else {
            // Закрываем окно, только если нет функции onConfirm
            onClose();
        }
    };

    // Обработчик клика за пределами модального окна (отключаем для типа confirm)
    const handleBackdropClick = (e: React.MouseEvent) => {
        // Если клик был по фону (не по содержимому), и это не окно подтверждения
        if (e.target === e.currentTarget && type !== 'confirm') {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
            onClick={handleBackdropClick}
            data-modal-type={type}
        >
            <div
                className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 relative animate-fade-in"
                onClick={(e) => e.stopPropagation()} // Предотвращаем всплытие события
            >
                {/* Кнопка закрытия (скрыта для типа confirm) */}
                {type !== 'confirm' && (
                    <button
                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                        onClick={onClose}
                    >
                        <X size={20} />
                    </button>
                )}

                <div className="flex flex-col items-center text-center">
                    <div className="mb-3">{iconMap[type]}</div>
                    {title && <h3 className="text-lg font-bold mb-2 text-gray-800">{title}</h3>}
                    <div className="text-gray-700 mb-5 whitespace-pre-line">{message}</div>
                    {children}

                    {/* Разные типы кнопок в зависимости от типа модального окна */}
                    {type === 'confirm' ? (
                        <div className="flex gap-3">
                            <button
                                className="px-6 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium"
                                onClick={onClose}
                            >
                                Скасувати
                            </button>
                            <button
                                className="px-6 py-2 rounded bg-primary text-white hover:bg-primary-dark font-medium"
                                onClick={handleConfirm}
                            >
                                OK
                            </button>
                        </div>
                    ) : (
                        <button
                            className="px-6 py-2 rounded bg-primary text-white hover:bg-primary-dark font-medium"
                            onClick={onClose}
                        >
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalMessage; 