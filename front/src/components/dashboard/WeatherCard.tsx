import React, { useMemo } from 'react';
import Card from '../ui/Card';
import { WeatherData } from '../../types';
import { translateWeatherCondition, translateShortDay } from '../../utils/translations';
import { getWeatherIcon } from '../../utils/weatherIcons';

interface WeatherCardProps {
  data: WeatherData;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ data }) => {
  // Мемоизация прогноза для повышения производительности
  const forecastItems = useMemo(() => {
    return data.forecast.map((day, index) => (
      <div key={index} className="flex flex-col items-center">
        <span className="text-xs font-medium text-gray-700 mb-1 font-roboto">
          {translateShortDay(day.day)}
        </span>
        <div className="p-1">
          {getWeatherIcon(day.icon)}
        </div>
        <div className="flex text-xs mt-1 justify-between w-full">
          <span className="text-gray-800 font-medium font-roboto">
            {day.temperature.max}°
          </span>
          <span className="text-gray-500 font-roboto">
            {day.temperature.min}°
          </span>
        </div>
        {day.precipitation > 0 && (
          <span className="text-xs text-blue-500 mt-1 font-roboto">
            {day.precipitation}%
          </span>
        )}
      </div>
    ));
  }, [data.forecast]);

  return (
    <Card title="Погодні умови" className="h-full">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-full mr-4">
              {getWeatherIcon(data.current.icon)}
            </div>
            <div>
              <p className="text-2xl font-semibold font-inter">
                {data.current.temperature}°C
              </p>
              <p className="text-gray-600 text-sm font-roboto">
                {translateWeatherCondition(data.current.condition)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="text-sm text-gray-600 mr-1 font-roboto">
                Вологість:
              </span>
              <span className="text-sm font-medium text-gray-800 font-roboto">
                {data.current.humidity}%
              </span>
            </div>
            <div className="flex items-center justify-end mt-1">
              <span className="text-sm text-gray-600 mr-1 font-roboto">
                Вітер:
              </span>
              <span className="text-sm font-medium text-gray-800 font-roboto">
                {data.current.windSpeed} км/год {data.current.windDirection}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3 font-inter">
            Прогноз на 5 днів
          </h4>
          <div className="grid grid-cols-5 gap-2">
            {forecastItems}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default React.memo(WeatherCard);