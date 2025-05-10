import React from 'react';
import { BarChart } from 'lucide-react';
import SimpleLineChart from '../../charts/SimpleLineChart';
import { ChartDataPoint } from '../../../types/irrigationTypes';

interface MoistureChartProps {
    moistureData: ChartDataPoint[];
    threshold: number;
}

const MoistureChart: React.FC<MoistureChartProps> = ({ moistureData, threshold }) => {
    return (
        <div className="mt-6">
            <h3 className="text-base font-medium text-gray-700 mb-3 flex items-center">
                <BarChart size={18} className="mr-2 text-primary" />
                Динаміка вологості ґрунту
            </h3>
            <div className="h-72 w-full bg-white rounded-lg p-4 border border-gray-100">
                <SimpleLineChart
                    data={moistureData.map(d => ({
                        ...d,
                        formattedDate: new Date(d.timestamp).toLocaleTimeString('uk-UA', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })
                    }))}
                    xKey="formattedDate"
                    yKey="value"
                    color="#3B82F6"
                    treshold={threshold}
                    tresholdLabel="Поріг активації"
                    yAxisLabel="Вологість (%)"
                    tooltipValuePrefix=""
                    tooltipValueSuffix="%"
                    height={260}
                />
            </div>
        </div>
    );
};

export default MoistureChart; 