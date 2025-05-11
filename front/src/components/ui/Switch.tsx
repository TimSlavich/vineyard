import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: () => void;
    id: string;
    disabled?: boolean;
    label?: string;
    'aria-label'?: string;
    className?: string;
}

const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    id,
    disabled = false,
    label,
    'aria-label': ariaLabel,
    className = ''
}) => {
    return (
        <label
            htmlFor={id}
            className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={onChange}
                className="sr-only peer"
                disabled={disabled}
                aria-label={ariaLabel || label}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            {label && <span className="ml-3 text-sm font-medium text-gray-900">{label}</span>}
        </label>
    );
};

export default Switch; 