import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  responsive?: boolean;
}

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  icon,
  leftIcon,
  iconPosition = 'left',
  responsive = false,
  ...props
}: ButtonProps) => {
  // Формирование классов стилей
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 ease-in-out rounded-component focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50';

  const variantClasses = {
    primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-text shadow-sm',
    outline: 'border border-gray-300 hover:bg-gray-100 text-gray-text',
    ghost: 'hover:bg-gray-100 text-gray-text',
  };

  const sizeClasses = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-sm py-1 px-3',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-6',
  };

  const responsiveClasses = responsive ? 'sm:text-left sm:flex-nowrap sm:space-x-2' : '';
  const widthClass = fullWidth ? 'w-full' : '';
  const mobileClasses = responsive ? 'text-xs sm:text-sm md:text-base' : '';

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${responsiveClasses} ${mobileClasses} ${className}`;

  // Иконки
  const renderLeftIcon = leftIcon || (icon && iconPosition === 'left') ? (
    <span className={`${children ? 'mr-2' : ''} flex-shrink-0`}>
      {leftIcon || icon}
    </span>
  ) : null;

  const renderRightIcon = icon && iconPosition === 'right' ? (
    <span className={`${children ? 'ml-2' : ''} flex-shrink-0`}>
      {icon}
    </span>
  ) : null;

  return (
    <button
      className={buttonClasses}
      {...props}
    >
      {renderLeftIcon}
      <span className={responsive ? 'truncate' : ''}>{children}</span>
      {renderRightIcon}
    </button>
  );
};

export default React.memo(Button);