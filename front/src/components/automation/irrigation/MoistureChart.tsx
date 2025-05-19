import React from 'react';
import { BarChart } from 'lucide-react';
import LineChart from '../../charts/LineChart';
import { ChartDataPoint } from '../../../types/irrigationTypes';

interface MoistureChartProps {
    moistureData: ChartDataPoint[];
    threshold: number;
}

const MoistureChart: React.FC<MoistureChartProps> = ({ moistureData, threshold }) => {
    // Проверяем, есть ли данные для графика
    if (!moistureData || moistureData.length === 0) {
        return (
            <div className="mt-6">
                <h3 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                    <BarChart size={18} className="mr-2 text-primary" />
                    Динаміка вологості ґрунту
                </h3>
                <div className="h-72 w-full bg-white rounded-lg p-4 border border-gray-100 flex items-center justify-center">
                    <p className="text-gray-500">Немає даних для відображення</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center">
                <BarChart size={18} className="text-primary mr-2" />
                <h3 className="text-sm font-medium">Динаміка вологості</h3>
            </div>
            <div className="h-48 w-full">
                <LineChart
                    title=""
                    data={moistureData}
                    color="#22C55E"
                    unit="%"
                    timeFormat="hour"
                    showCard={false}
                    height={200}
                    threshold={threshold}
                    thresholdLabel="Поріг активації"
                />
            </div>
        </div>
    );
};

export default MoistureChart; 