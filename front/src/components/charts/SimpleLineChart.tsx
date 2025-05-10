import React from 'react';
import {
    ResponsiveContainer,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ComposedChart,
    ReferenceLine,
    TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import {
    BaseChartProps,
    defaultChartSettings,
    calculateAxisDomain
} from './BaseChartUtils';

interface SimpleLineChartProps extends BaseChartProps {
    data: Array<any>;
    xKey: string;
    yKey: string;
    yAxisLabel?: string;
    tooltipValuePrefix?: string;
    tooltipValueSuffix?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
    data,
    xKey,
    yKey,
    color,
    treshold,
    tresholdLabel = defaultChartSettings.tresholdLabel,
    yAxisLabel = "",
    tooltipValuePrefix = "",
    tooltipValueSuffix = "",
    height = defaultChartSettings.height,
    showDots = defaultChartSettings.showDots,
    strokeWidth = defaultChartSettings.strokeWidth
}) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-10 text-gray-500">Немає даних для відображення</div>;
    }

    // Получаем минимальное и максимальное значения для настройки осей
    const values = data.map(d => d[yKey]).filter(v => v !== null && v !== undefined);
    const { min, max } = calculateAxisDomain(values, treshold);

    // Кастомный тултип для отображения информации при наведении
    const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
        if (active && payload && payload.length > 0 && payload[0]?.value !== undefined) {
            return (
                <div className="bg-white p-3 shadow-lg rounded-md border border-gray-200">
                    <p className="font-medium text-gray-800">{label}</p>
                    <p className="text-sm font-medium" style={{ color }}>
                        {`${tooltipValuePrefix}${payload[0].value}${tooltipValueSuffix}`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ height: `${height}px`, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                        dataKey={xKey}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis
                        domain={[min, max]}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickFormatter={(value) => `${value}`}
                        width={40}
                        label={yAxisLabel ? {
                            value: yAxisLabel,
                            angle: -90,
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 }
                        } : undefined}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {treshold && (
                        <ReferenceLine
                            y={treshold}
                            stroke="#F59E0B"
                            strokeDasharray="3 3"
                            label={{ value: tresholdLabel, position: 'insideBottomRight', fill: '#F59E0B', fontSize: 10 }}
                        />
                    )}
                    <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        dot={showDots ? { r: 3, strokeWidth: 2, stroke: '#fff', fill: color } : false}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        connectNulls
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SimpleLineChart; 