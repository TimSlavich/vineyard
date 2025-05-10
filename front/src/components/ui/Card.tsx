import React, { useMemo, memo } from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  headerRight,
  footer,
  className = '',
  hoverable = false,
  onClick,
}) => {
  // Мемоизация классов стилей для повышения производительности
  const cardClasses = useMemo(() => {
    const baseClasses = 'bg-white rounded-component shadow-card overflow-hidden';
    const hoverClasses = hoverable ? 'cursor-pointer transition-shadow duration-200 hover:shadow-elevated' : '';
    return `${baseClasses} ${hoverClasses} ${className}`;
  }, [hoverable, className]);

  // Проверяем, есть ли заголовок или подзаголовок
  const hasHeader = Boolean(title || subtitle || headerRight);

  return (
    <div
      className={cardClasses}
      onClick={onClick}
    >
      {hasHeader && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            {title && <h3 className="text-lg font-inter font-semibold text-gray-800">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 mt-1 font-roboto">{subtitle}</p>}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      <div className="p-6">{children}</div>

      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default memo(Card);