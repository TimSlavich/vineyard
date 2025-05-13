import React, { useMemo } from 'react';

interface UserAvatarProps {
    name?: string;
    email?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

// Палитра цветов, гармонирующая с основной темой
const COLORS = [
    { bg: '#10B981', text: '#FFFFFF' }, // Зеленый (primary)
    { bg: '#3B82F6', text: '#FFFFFF' }, // Синий
    { bg: '#F59E0B', text: '#FFFFFF' }, // Оранжевый
    { bg: '#8B5CF6', text: '#FFFFFF' }, // Фиолетовый
    { bg: '#EC4899', text: '#FFFFFF' }, // Розовый
    { bg: '#14B8A6', text: '#FFFFFF' }, // Бирюзовый
    { bg: '#6366F1', text: '#FFFFFF' }, // Индиго
    { bg: '#F97316', text: '#FFFFFF' }, // Темно-оранжевый
];

const UserAvatar: React.FC<UserAvatarProps> = ({
    name,
    email,
    size = 'md',
    className = ''
}) => {
    // Размеры в зависимости от параметра size
    const dimensions = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base'
    };

    // Получаем инициал из имени или email
    const initial = useMemo(() => {
        if (name && name.trim()) {
            return name.trim()[0].toUpperCase();
        }
        if (email && email.trim()) {
            return email.trim()[0].toUpperCase();
        }
        return '?';
    }, [name, email]);

    // Генерируем стабильный цвет на основе имени или email
    const colorIndex = useMemo(() => {
        const identifier = (name || email || '').trim();
        if (!identifier) return 0;

        // Вычисляем сумму кодов всех символов для стабильного определения цвета
        let sum = 0;
        for (let i = 0; i < identifier.length; i++) {
            sum += identifier.charCodeAt(i);
        }
        return sum % COLORS.length;
    }, [name, email]);

    const { bg, text } = COLORS[colorIndex];

    return (
        <div
            className={`${dimensions[size]} rounded-full flex items-center justify-center font-medium ${className}`}
            style={{ backgroundColor: bg, color: text }}
            aria-label={name || email || 'Користувач'}
        >
            {initial}
        </div>
    );
};

export default UserAvatar; 