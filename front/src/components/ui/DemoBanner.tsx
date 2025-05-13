import React from 'react';
import { Info } from 'lucide-react';

interface DemoBannerProps {
    className?: string;
}

/**
 * Баннер, отображаемый в демо-режиме
 */
const DemoBanner: React.FC<DemoBannerProps> = ({ className = '' }) => {
    return (
        <div className={`bg-primary-light text-primary-dark py-2 px-4 flex items-center justify-center text-sm ${className}`}>
            <Info size={16} className="mr-2" />
            <span className="font-medium">Ви працюєте в демо-режимі. Усі зміни будуть скинуті при виході з системи.</span>
        </div>
    );
};

export default DemoBanner; 