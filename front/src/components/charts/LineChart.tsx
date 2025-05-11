import React from 'react';
import Card from '../ui/Card';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart
} from 'recharts';

interface LineChartProps {
  title: string;
  data: Array<{ value: number; timestamp: string }>;
  color: string;
  unit: string;
  timeFormat?: 'hour' | 'day' | 'month';
  showCard?: boolean;
  height?: number;
  noDataMessage?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  title,
  data,
  color,
  unit,
  timeFormat = 'hour',
  showCard = true,
  height = 200,
  noDataMessage = 'Немає даних для відображення'
}) => {
  if (data.length === 0) {
    return <div className="text-center py-10 text-gray-500">{noDataMessage}</div>;
  }

  // Сортируем данные по времени
  const sortedData = [...data].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Форматируем данные для recharts и добавляем метки времени
  const chartData = sortedData.map(item => {
    const date = new Date(item.timestamp);
    let formattedTime = '';

    if (timeFormat === 'hour') {
      formattedTime = `${date.getHours().toString().padStart(2, '0')}:00`;
    } else if (timeFormat === 'day') {
      formattedTime = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    } else {
      const monthNames = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];
      formattedTime = monthNames[date.getMonth()];
    }

    return {
      ...item,
      formattedTime,
    };
  });

  // Получаем минимальное и максимальное значения для настройки осей
  const values = chartData.map(d => d.value);
  const min = Math.floor(Math.min(...values) * 0.9);
  const max = Math.ceil(Math.max(...values) * 1.1);

  // Кастомный тултип для отображения информации при наведении
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-md border border-gray-200">
          <p className="font-medium text-gray-800">{`${label}`}</p>
          <p className="text-sm font-medium" style={{ color: color }}>
            {`${payload[0].value.toFixed(1)} ${unit}`}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(payload[0].payload.timestamp).toLocaleString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  const chart = (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="formattedTime"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            domain={[min, max]}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={(value) => `${value.toFixed(1)}`}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, stroke: '#fff', fill: color }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  // Отображение текущего значения
  const currentValue = chartData[chartData.length - 1]?.value.toFixed(1) || '0';

  if (showCard) {
    return (
      <Card title={title} className="h-full">
        <div className="flex justify-end mb-2 pr-4">
          <span className="text-xl font-semibold font-inter" style={{ color }}>
            {currentValue} {unit}
          </span>
        </div>
        {chart}
      </Card>
    );
  }

  return chart;
};

export default LineChart;