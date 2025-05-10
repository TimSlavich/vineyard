import React from 'react';
import { Sun, CloudRain, CloudDrizzle, Cloud, CloudSun, CloudFog, CloudLightning, CloudSnow } from 'lucide-react';

// Размеры по умолчанию
const DEFAULT_SIZE = 24;

// Типы погодных условий и соответствующие цвета
export type WeatherIconType =
    | 'sun'
    | 'cloud-rain'
    | 'cloud-drizzle'
    | 'cloud'
    | 'cloud-sun'
    | 'cloud-fog'
    | 'cloud-lightning'
    | 'cloud-snow';

// Цвета для иконок по умолчанию
const iconColors = {
    'sun': 'text-amber-500',
    'cloud-rain': 'text-blue-500',
    'cloud-drizzle': 'text-blue-400',
    'cloud': 'text-gray-500',
    'cloud-sun': 'text-amber-400',
    'cloud-fog': 'text-gray-400',
    'cloud-lightning': 'text-amber-600',
    'cloud-snow': 'text-blue-200'
};

interface WeatherIconProps {
    type: WeatherIconType;
    size?: number;
    customColor?: string;
    className?: string;
}

/**
 * Компонент для отображения погодной иконки
 */
export const WeatherIcon: React.FC<WeatherIconProps> = ({
    type,
    size = DEFAULT_SIZE,
    customColor,
    className = ''
}) => {
    const colorClass = customColor || iconColors[type] || 'text-gray-500';
    const combinedClassName = `${colorClass} ${className}`.trim();

    switch (type) {
        case 'sun':
            return <Sun size={size} className={combinedClassName} />;
        case 'cloud-rain':
            return <CloudRain size={size} className={combinedClassName} />;
        case 'cloud-drizzle':
            return <CloudDrizzle size={size} className={combinedClassName} />;
        case 'cloud':
            return <Cloud size={size} className={combinedClassName} />;
        case 'cloud-sun':
            return <CloudSun size={size} className={combinedClassName} />;
        case 'cloud-fog':
            return <CloudFog size={size} className={combinedClassName} />;
        case 'cloud-lightning':
            return <CloudLightning size={size} className={combinedClassName} />;
        case 'cloud-snow':
            return <CloudSnow size={size} className={combinedClassName} />;
        default:
            return <Sun size={size} className={combinedClassName} />;
    }
};

/**
 * Функция-утилита для получения иконки по имени
 */
export const getWeatherIcon = (
    iconName: string,
    size = DEFAULT_SIZE,
    customColor?: string,
    className?: string
) => {
    return <WeatherIcon type={iconName as WeatherIconType} size={size} customColor={customColor} className={className} />;
}; 