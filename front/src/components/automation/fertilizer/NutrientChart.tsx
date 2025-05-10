import React from 'react';
import { BarChart } from 'lucide-react';
import LineChart from '../../charts/LineChart';
import { ChartDataPoint } from '../../../types/fertilizerTypes';

interface NutrientChartProps {
    nutrientData: ChartDataPoint[];
    targetLevel: number;
    color: string;
    nutrientName: string;
}

const NutrientChart: React.FC<NutrientChartProps> = ({
    nutrientData,
    color,
    nutrientName
}) => {
    return (
        <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <BarChart size={16} className="mr-2 text-primary" />
                Динаміка рівня {nutrientName}
            </h3>
            <div className="h-64 w-full bg-white rounded-lg p-4 border border-gray-100">
                <LineChart
                    title=""
                    data={nutrientData}
                    color={color}
                    unit="ppm"
                    timeFormat="day"
                    showCard={false}
                    height={230}
                />
            </div>
        </div>
    );
};

export default NutrientChart; 