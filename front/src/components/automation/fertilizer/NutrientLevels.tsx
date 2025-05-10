import React from 'react';
import { NutrientLevel } from '../../../types/fertilizerTypes';

interface NutrientLevelsProps {
    nutrients: NutrientLevel[];
}

const NutrientLevels: React.FC<NutrientLevelsProps> = ({ nutrients }) => {
    return (
        <div className="space-y-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700">Поточні рівні поживних речовин</h3>

            <div className="space-y-3">
                {nutrients.map((nutrient, index) => (
                    <div key={index}>
                        <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{nutrient.name}</span>
                            <span className="text-sm text-gray-600">
                                {Math.round(nutrient.current)} / {Math.round(nutrient.target)} {nutrient.unit}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="h-2.5 rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(100, (nutrient.current / nutrient.target) * 100)}%`,
                                    backgroundColor: nutrient.color
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default NutrientLevels; 