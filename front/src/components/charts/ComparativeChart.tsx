import React from 'react';
import Card from '../ui/Card';
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface DataSeries {
    id: string;
    name: string;
    data: Array<{ value: number; timestamp: string }>;
    color: string;
    unit: string;
}

interface ComparativeChartProps {
    title: string;
    series: DataSeries[];
    timeFormat?: 'hour' | 'day' | 'month';
    height?: number;
    showDots?: boolean;
    strokeWidth?: number;
    noDataMessage?: string;
}

const ComparativeChart: React.FC<ComparativeChartProps> = ({
    title,
    series,
    timeFormat = 'hour',
    height = 300,
    showDots = true,
    strokeWidth = 2.5,
    noDataMessage = 'Немає даних для відображення'
}) => {
    if (!series || series.length === 0) {
        return <div className="text-center py-10 text-gray-500">{noDataMessage}</div>;
    }

    // Преобразуем данные для построения графика
    // Сначала собираем все временные метки
    const allTimestamps = series.flatMap(s => s.data.map(d => d.timestamp));
    const uniqueTimestamps = [...new Set(allTimestamps)].sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    // Создаем объекты данных для каждой временной метки
    const chartData = uniqueTimestamps.map(timestamp => {
        // Начинаем с базового объекта с временной меткой
        const date = new Date(timestamp);
        let formattedTime = '';

        if (timeFormat === 'hour') {
            formattedTime = `${date.getHours().toString().padStart(2, '0')}:00`;
        } else if (timeFormat === 'day') {
            formattedTime = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
            const monthNames = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
            formattedTime = monthNames[date.getMonth()];
        }

        const dataPoint: Record<string, any> = {
            timestamp,
            formattedTime,
        };

        // Добавляем значения для каждой серии данных с уникальным ключом
        series.forEach((s, idx) => {
            const dataItem = s.data.find(d => d.timestamp === timestamp);
            const uniqueKey = `${s.id}_${idx}`;
            dataPoint[uniqueKey] = dataItem ? dataItem.value : null;
        });

        return dataPoint;
    });

    // Кастомный тултип для отображения информации при наведении
    const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
        if (active && payload && payload.length > 0) {
            return (
                <div className="bg-white p-3 shadow-lg rounded-md border border-gray-200">
                    <p className="font-medium text-gray-800 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => {
                        if (!entry || entry.value === null || entry.value === undefined) return null;

                        // Извлекаем идентификатор серии из ключа данных (удаляем индекс после подчеркивания)
                        const dataKey = entry.dataKey;
                        const seriesId = dataKey.split('_')[0];

                        const dataSeries = series.find(s => s.id === seriesId);
                        if (!dataSeries) return null;

                        return (
                            <p
                                key={`tooltip-${dataKey}-${index}`}
                                className="text-sm font-medium"
                                style={{ color: entry.color }}
                            >
                                {`${dataSeries.name}: ${entry.value.toFixed(1)} ${dataSeries.unit}`}
                            </p>
                        );
                    })}
                    {payload[0]?.payload.timestamp && (
                        <p className="text-xs text-gray-500 mt-1">
                            {new Date(payload[0].payload.timestamp).toLocaleString('uk-UA', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Кастомная легенда
    const CustomLegend = () => (
        <div className="flex flex-wrap justify-center mt-2">
            {series.map((s, idx) => (
                <div key={`legend-${s.id}-${idx}`} className="flex items-center mx-3 mb-1">
                    <div
                        className="w-4 h-4 rounded-full mr-2"
                        style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm text-gray-700 font-medium">{s.name}</span>
                </div>
            ))}
        </div>
    );

    // Создаем текущие значения для отображения
    const currentValues = series.map(s => {
        const lastData = s.data.length > 0 ?
            s.data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] :
            null;

        return {
            id: s.id,
            name: s.name,
            value: lastData ? lastData.value.toFixed(1) : '0',
            unit: s.unit,
            color: s.color
        };
    });

    return (
        <Card title={title} className="h-full">
            <div className="flex justify-end mb-2 pr-4 space-x-6">
                {currentValues.map((value, idx) => (
                    <div key={`current-${value.id}-${idx}`} className="flex items-center">
                        <div
                            className="w-3 h-3 rounded-full mr-1.5"
                            style={{ backgroundColor: value.color }}
                        />
                        <span className="text-xl font-semibold font-inter" style={{ color: value.color }}>
                            {value.value} {value.unit}
                        </span>
                    </div>
                ))}
            </div>

            <div style={{ height: `${height}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="formattedTime"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                            tickLine={false}
                            axisLine={{ stroke: '#E5E7EB' }}
                            tickFormatter={(value) => `${value.toFixed(1)}`}
                            width={40}
                        />
                        {series.length > 1 && (
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickLine={false}
                                axisLine={{ stroke: '#E5E7EB' }}
                                tickFormatter={(value) => `${value.toFixed(1)}`}
                                width={40}
                            />
                        )}
                        <Tooltip content={<CustomTooltip />} />

                        {series.map((s, index) => {
                            const yAxisId = index === 0 ? "left" : "right";
                            const uniqueKey = `${s.id}_${index}`;

                            return (
                                <Line
                                    key={`series-${s.id}-${index}`}
                                    yAxisId={yAxisId}
                                    type="monotone"
                                    dataKey={uniqueKey}
                                    name={s.name}
                                    stroke={s.color}
                                    strokeWidth={strokeWidth}
                                    dot={showDots ? { r: 3, strokeWidth: 2, stroke: '#fff', fill: s.color } : false}
                                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                    connectNulls
                                />
                            );
                        })}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            <CustomLegend />
        </Card>
    );
};

export default ComparativeChart; 