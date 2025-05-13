import React from 'react';
import { AlertCircle } from 'lucide-react';

interface NewUserBannerProps {
    className?: string;
}

/**
 * Баннер, отображаемый для новых пользователей (role = new_user)
 */
const NewUserBanner: React.FC<NewUserBannerProps> = ({ className = '' }) => {
    return (
        <div className={`bg-yellow-50 text-yellow-800 py-2 px-4 flex items-center justify-center text-sm ${className}`}>
            <AlertCircle size={16} className="mr-2" />
            <span className="font-medium">Ви ще не підключені до системи. Зв'яжіться з технічною підтримкою для завершення налаштування.</span>
        </div>
    );
};

export default NewUserBanner; 