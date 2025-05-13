import React, { useState, useRef, useEffect } from 'react';
import LineChart from '../components/charts/LineChart';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Calendar, Download, Filter, BarChart2, Loader2, ChevronDown, X, Settings, Clock, ArrowRight, Sun, CloudRain } from 'lucide-react';
import { Link } from 'react-router-dom';
import useSensorData from '../hooks/useSensorData';
import { getUserData } from '../utils/storage';

// Расширяю интерфейс Window
declare global {
  interface Window {
    loggedSensorInfo?: boolean;
  }
}

// Типы для фильтров
type LocationFilter = string | null;
type SensorTypeFilter = string | null;

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('24h');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Получаем данные с датчиков из хука useSensorData
  const { sensorData: allSensorData, refreshSensorData, isConnected } = useSensorData();

  // Проверяем роль пользователя
  const userRole = getUserData()?.role || '';
  const isNewUser = userRole === 'new_user';

  // Состояние для отслеживания процесса обновления данных
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Состояния для фильтров
  const [locationFilter, setLocationFilter] = useState<LocationFilter>(null);
  const [sensorTypeFilter, setSensorTypeFilter] = useState<SensorTypeFilter>(null);

  // Effect для обновления данных при изменении периода или фильтров
  const [chartKey, setChartKey] = useState(0);
  useEffect(() => {
    // Инкрементируем chartKey при изменении dateRange, customDateRange, 
    // locationFilter, sensorTypeFilter или при получении новых данных
    setChartKey(prevKey => prevKey + 1);
  }, [dateRange, customDateRange, locationFilter, sensorTypeFilter, allSensorData]);

  // Получение временных границ в зависимости от выбранного периода
  const getTimeRange = () => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        startDate = new Date(customDateRange.from);
        now.setHours(23, 59, 59, 999); // Конец дня
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { start: startDate, end: now };
  };

  // Получение актуальных данных датчиков и локаций для фильтров
  const getAvailableSensorTypes = () => {
    return [...new Set(allSensorData.map(s => s.type))];
  };

  const getAvailableLocations = () => {
    return [...new Set(allSensorData.map(s => s.location_id))];
  };

  // Обработка данных для графиков (как в DashboardPage)
  const processChartData = (sensorType: string, locationId: string) => {
    // Проверяем соответствие выбранным фильтрам
    if (
      (locationFilter && locationId !== locationFilter) ||
      (sensorTypeFilter && sensorType !== sensorTypeFilter)
    ) {
      return []; // Возвращаем пустой массив, если не соответствует фильтрам
    }

    // Фильтруем датчики по типу и локации
    const filteredSensors = allSensorData.filter(
      reading => reading.type === sensorType && reading.location_id === locationId
    );

    // Проверяем, есть ли данные
    if (filteredSensors.length === 0) {
      console.log('Нет данных для графика:', { sensorType, locationId });
      return [];
    }

    // Применяем фильтры по времени
    const { start, end } = getTimeRange();
    const timeFilteredSensors = filteredSensors.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= start && readingDate <= end;
    });

    // Группируем данные по временной метке (округляем до минуты)
    const groupedByTimestamp: Record<string, number[]> = {};

    timeFilteredSensors.forEach(reading => {
      const date = new Date(reading.timestamp);
      const timestampKey = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours(),
        date.getMinutes()
      ).toISOString();

      if (!groupedByTimestamp[timestampKey]) {
        groupedByTimestamp[timestampKey] = [];
      }

      groupedByTimestamp[timestampKey].push(reading.value);
    });

    // Вычисляем среднее значение для каждой временной метки
    const averagedData = Object.entries(groupedByTimestamp).map(([timestamp, values]) => {
      const sum = values.reduce((acc, value) => acc + value, 0);
      const average = values.length > 0 ? sum / values.length : 0;

      return {
        value: Number(average.toFixed(2)),
        timestamp,
        count: values.length
      };
    });

    // Сортируем по времени
    return averagedData
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  // Определяем видимость блоков с учетом локаций
  const availableLocations = getAvailableLocations();
  const isLocationVisible = (locId: string) => !locationFilter || locationFilter === locId;

  // Определяем видимость графиков в зависимости от выбранных фильтров
  const isSensorTypeVisible = (sensorType: string) => !sensorTypeFilter || sensorTypeFilter === sensorType;

  // Функция для ручного обновления данных
  const handleRefreshData = () => {
    if (!isConnected) {
      return;
    }

    setIsRefreshing(true);
    refreshSensorData();

    setTimeout(() => {
      setIsRefreshing(false);
    }, 3000);
  };

  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Функция для сброса всех фильтров
  const resetFilters = () => {
    setLocationFilter(null);
    setSensorTypeFilter(null);
  };

  // Обработчики для выбора фильтров
  const handleLocationFilter = (location: string) => {
    setLocationFilter(prev => prev === location ? null : location);
  };

  const handleSensorTypeFilter = (type: string) => {
    setSensorTypeFilter(prev => prev === type ? null : type);
  };

  // Закрытие меню и календаря при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsCustomDatePickerOpen(false);
      }
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target as Node)) {
        setIsDateMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Изменяем функцию форматирования ID локации для кнопок фильтров
  const formatLocationId = (locId: string) => {
    // Для всех других локаций пытаемся извлечь вторую цифру
    const match = locId.match(/location_\d+_(\d+)/);
    if (match && match[1]) {
      return `Блок ${match[1]}`;
    }

    // Если ничего не сработало, возвращаем исходный ID
    return locId;
  };

  // Функция для генерации инсайтов на основе данных сенсоров
  const generateInsights = () => {
    if (!allSensorData || allSensorData.length === 0) {
      return [];
    }

    const insights = [];
    const { start, end } = getTimeRange();
    const timeFilteredData = allSensorData.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      return readingDate >= start && readingDate <= end;
    });

    // Группируем данные по типам сенсоров и локациям
    const dataByTypeAndLocation: Record<string, Record<string, any[]>> = {};

    timeFilteredData.forEach(reading => {
      const { type, location_id, value, timestamp } = reading;

      if (!dataByTypeAndLocation[type]) {
        dataByTypeAndLocation[type] = {};
      }

      if (!dataByTypeAndLocation[type][location_id]) {
        dataByTypeAndLocation[type][location_id] = [];
      }

      dataByTypeAndLocation[type][location_id].push({ value, timestamp });
    });

    // 1. Анализ температуры между блоками
    if (dataByTypeAndLocation.temperature) {
      const locations = Object.keys(dataByTypeAndLocation.temperature);

      if (locations.length >= 2) {
        const locationData = locations.map(locId => {
          const readings = dataByTypeAndLocation.temperature[locId];
          const avgTemp = readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
          return {
            location: formatLocationId(locId),
            avgTemp: parseFloat(avgTemp.toFixed(1))
          };
        });

        locationData.sort((a, b) => b.avgTemp - a.avgTemp);

        if (locationData.length >= 2) {
          const tempDiff = (locationData[0].avgTemp - locationData[1].avgTemp).toFixed(1);
          insights.push({
            title: 'Динаміка температури',
            text: `Температура в ${locationData[0].location} була в середньому на ${tempDiff}°C вища, ніж у ${locationData[1].location} за обраний період.`,
            icon: 'BarChart2'
          });
        }
      }
    }

    // 2. Анализ влажности почвы
    if (dataByTypeAndLocation.soil_moisture) {
      for (const locId in dataByTypeAndLocation.soil_moisture) {
        const readings = dataByTypeAndLocation.soil_moisture[locId]
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (readings.length > 0) {
          // Проверяем тенденцию изменения влажности почвы
          const recentReadings = readings.slice(-Math.min(10, readings.length));

          let decreasing = true;
          for (let i = 1; i < recentReadings.length; i++) {
            if (recentReadings[i].value > recentReadings[i - 1].value) {
              decreasing = false;
              break;
            }
          }

          if (decreasing && recentReadings.length >= 3) {
            insights.push({
              title: 'Тенденції вологості ґрунту',
              text: `Рівень вологості ґрунту в ${formatLocationId(locId)} постійно знижується протягом останніх ${Math.min(3, recentReadings.length)} днів, незважаючи на недавні опади.`,
              icon: 'BarChart2'
            });
            break;
          }
        }
      }
    }

    // 3. Анализ корреляции утренней влажности и дневных пиков температуры
    if (dataByTypeAndLocation.humidity && dataByTypeAndLocation.temperature) {
      const locations = Object.keys(dataByTypeAndLocation.humidity)
        .filter(locId => dataByTypeAndLocation.temperature[locId]);

      if (locations.length > 0) {
        const correlationFound = locations.some(locId => {
          const humidityReadings = dataByTypeAndLocation.humidity[locId]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          const tempReadings = dataByTypeAndLocation.temperature[locId]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          // Группируем по дням
          const readingsByDay: Record<string, { morningHumidity?: number, maxTemp?: number }> = {};

          humidityReadings.forEach(reading => {
            const date = new Date(reading.timestamp);
            const hours = date.getHours();
            const dayKey = date.toISOString().split('T')[0];

            if (!readingsByDay[dayKey]) {
              readingsByDay[dayKey] = {};
            }

            // Утренняя влажность (6-9 утра)
            if (hours >= 6 && hours <= 9) {
              if (!readingsByDay[dayKey].morningHumidity || reading.value < readingsByDay[dayKey].morningHumidity) {
                readingsByDay[dayKey].morningHumidity = reading.value;
              }
            }
          });

          tempReadings.forEach(reading => {
            const date = new Date(reading.timestamp);
            const dayKey = date.toISOString().split('T')[0];

            if (!readingsByDay[dayKey]) {
              readingsByDay[dayKey] = {};
            }

            // Максимальная дневная температура
            if (!readingsByDay[dayKey].maxTemp || reading.value > readingsByDay[dayKey].maxTemp) {
              readingsByDay[dayKey].maxTemp = reading.value;
            }
          });

          // Проверяем корреляцию
          const days = Object.keys(readingsByDay).filter(day =>
            readingsByDay[day].morningHumidity !== undefined &&
            readingsByDay[day].maxTemp !== undefined
          );

          return days.length >= 2;
        });

        if (correlationFound) {
          insights.push({
            title: 'Кореляція вологості',
            text: 'Спостерігається сильна кореляція між вранішнім рівнем вологості та денними піками температури.',
            icon: 'BarChart2'
          });
        }
      }
    }

    // 4. Анализ суточной амплитуды температуры
    if (dataByTypeAndLocation.temperature) {
      for (const locId in dataByTypeAndLocation.temperature) {
        const readings = dataByTypeAndLocation.temperature[locId];

        if (readings.length > 10) {
          // Группируем по дням
          const readingsByDay: Record<string, { min: number, max: number }> = {};

          readings.forEach(reading => {
            const date = new Date(reading.timestamp);
            const dayKey = date.toISOString().split('T')[0];

            if (!readingsByDay[dayKey]) {
              readingsByDay[dayKey] = { min: reading.value, max: reading.value };
            } else {
              readingsByDay[dayKey].min = Math.min(readingsByDay[dayKey].min, reading.value);
              readingsByDay[dayKey].max = Math.max(readingsByDay[dayKey].max, reading.value);
            }
          });

          // Вычисляем среднюю амплитуду
          const days = Object.keys(readingsByDay);
          if (days.length > 0) {
            const amplitudes = days.map(day => readingsByDay[day].max - readingsByDay[day].min);
            const avgAmplitude = amplitudes.reduce((sum, amp) => sum + amp, 0) / amplitudes.length;

            insights.push({
              title: 'Коливання температури',
              text: `У ${formatLocationId(locId)} середня добова амплітуда температур складає ${avgAmplitude.toFixed(1)}°C, що важливо для визрівання винограду.`,
              icon: 'BarChart2'
            });
            break;
          }
        }
      }
    }

    // 5. Анализ оптимальности освещения
    if (dataByTypeAndLocation.light) {
      for (const locId in dataByTypeAndLocation.light) {
        const readings = dataByTypeAndLocation.light[locId];

        if (readings.length > 0) {
          // Вычисляем среднее значение освещенности в дневное время
          const dayTimeReadings = readings.filter(reading => {
            const date = new Date(reading.timestamp);
            const hours = date.getHours();
            return hours >= 9 && hours <= 18; // дневное время
          });

          if (dayTimeReadings.length > 0) {
            const avgLight = dayTimeReadings.reduce((sum, r) => sum + r.value, 0) / dayTimeReadings.length;

            // Определяем оптимальность освещения (пример значений)
            let status = '';
            if (avgLight < 10000) {
              status = 'недостатньо для оптимального фотосинтезу';
            } else if (avgLight > 50000) {
              status = 'перевищує оптимальний рівень, що може призвести до стресу рослин';
            } else {
              status = 'знаходиться в оптимальному діапазоні для росту винограду';
            }

            insights.push({
              title: 'Рівень освітленості',
              text: `У ${formatLocationId(locId)} середній рівень освітленості ${avgLight.toFixed(0)} lux ${status}.`,
              icon: 'Sun'
            });
            break;
          }
        }
      }
    }

    // 6. Анализ влажности воздуха
    if (dataByTypeAndLocation.humidity) {
      const locations = Object.keys(dataByTypeAndLocation.humidity);
      const locationData = locations.map(locId => {
        const readings = dataByTypeAndLocation.humidity[locId];
        const avgHumidity = readings.reduce((sum, r) => sum + r.value, 0) / readings.length;
        return {
          location: formatLocationId(locId),
          avgHumidity: parseFloat(avgHumidity.toFixed(1))
        };
      });

      if (locationData.length > 0) {
        const highestHumidityLoc = locationData.reduce((prev, current) =>
          (prev.avgHumidity > current.avgHumidity) ? prev : current
        );

        let riskLevel = '';
        if (highestHumidityLoc.avgHumidity > 80) {
          riskLevel = 'високий ризик розвитку грибкових захворювань';
        } else if (highestHumidityLoc.avgHumidity > 70) {
          riskLevel = 'помірний ризик розвитку грибкових захворювань';
        } else {
          riskLevel = 'низький ризик розвитку грибкових захворювань';
        }

        insights.push({
          title: 'Ризик захворювань',
          text: `У ${highestHumidityLoc.location} середня вологість повітря ${highestHumidityLoc.avgHumidity}% - ${riskLevel}.`,
          icon: 'CloudRain'
        });
      }
    }

    // Если нет достаточно данных для анализа, добавляем базовый инсайт
    if (insights.length === 0) {
      insights.push({
        title: 'Аналіз даних',
        text: 'Недостатньо даних для формування детальних інсайтів. Збільште часовий проміжок або додайте більше датчиків.',
        icon: 'BarChart2'
      });
    }

    // Ограничиваем количество инсайтов до 6
    return insights.slice(0, 6);
  };

  return (
    <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
            Аналітика та інсайти
          </h1>
          <div className="flex justify-between items-center">
            <p className="text-gray-600 font-roboto">
              Аналізуйте історичні дані та знаходьте закономірності для покращення управління виноградником
              {isConnected ?
                <span className="ml-2 text-green-600 text-sm">(підключено)</span> :
                <span className="ml-2 text-error text-sm">(не підключено)</span>
              }
            </p>
          </div>
        </div>

        <div className="mt-4 md:mt-0 flex flex-wrap gap-3">
          <div className="relative inline-block" ref={dateMenuRef}>
            <Button
              variant="outline"
              className="flex items-center gap-2 pr-3 pl-4 py-1.5 shadow-sm hover:shadow"
              icon={<Calendar size={16} className="text-primary" />}
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
            >
              <span className="font-medium flex items-center">
                {dateRange === '24h' && 'Останні 24 години'}
                {dateRange === '7d' && 'Останні 7 днів'}
                {dateRange === '30d' && 'Останні 30 днів'}
                {dateRange === 'custom' && (
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    <span>{customDateRange.from} <ArrowRight size={11} className="inline mx-1" /> {customDateRange.to}</span>
                  </span>
                )}
                <ChevronDown size={15} className={`ml-2 text-gray-500 transition-transform duration-200 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
              </span>
            </Button>

            {/* Выпадающее меню с периодами */}
            {isDateMenuOpen && (
              <div className="absolute z-10 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 transform transition-all duration-200 ease-out">
                <div className="py-1.5">
                  <h4 className="text-xs uppercase text-gray-500 font-semibold px-4 py-2 border-b border-gray-100">Оберіть період</h4>
                  <ul className="py-1">
                    <li>
                      <button
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 ${dateRange === '24h' ? 'text-primary font-medium' : 'text-gray-700'}`}
                        onClick={() => {
                          setDateRange('24h');
                          setIsDateMenuOpen(false);
                        }}
                      >
                        <Clock size={16} className={dateRange === '24h' ? 'text-primary' : 'text-gray-400'} />
                        Останні 24 години
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 ${dateRange === '7d' ? 'text-primary font-medium' : 'text-gray-700'}`}
                        onClick={() => {
                          setDateRange('7d');
                          setIsDateMenuOpen(false);
                        }}
                      >
                        <Clock size={16} className={dateRange === '7d' ? 'text-primary' : 'text-gray-400'} />
                        Останні 7 днів
                      </button>
                    </li>
                    <li>
                      <button
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 ${dateRange === '30d' ? 'text-primary font-medium' : 'text-gray-700'}`}
                        onClick={() => {
                          setDateRange('30d');
                          setIsDateMenuOpen(false);
                        }}
                      >
                        <Clock size={16} className={dateRange === '30d' ? 'text-primary' : 'text-gray-400'} />
                        Останні 30 днів
                      </button>
                    </li>
                    <li className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 ${dateRange === 'custom' ? 'text-primary font-medium' : 'text-gray-700'}`}
                        onClick={() => {
                          setDateRange('custom');
                          setIsDateMenuOpen(false);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-3">
                            <Calendar size={16} className={dateRange === 'custom' ? 'text-primary' : 'text-gray-400'} />
                            Власний період
                          </span>
                          <Settings
                            size={15}
                            className="ml-2 text-gray-500 hover:text-primary transition-colors duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDateMenuOpen(false);
                              setIsCustomDatePickerOpen(true);
                            }}
                          />
                        </div>
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Календарь для выбора собственного периода */}
          {dateRange === 'custom' && (
            <div className="relative inline-block" ref={datePickerRef}>
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200 py-1.5 px-3"
                icon={<Settings size={15} className="text-primary" />}
                onClick={() => setIsCustomDatePickerOpen(!isCustomDatePickerOpen)}
              >
                Налаштувати
              </Button>

              {isCustomDatePickerOpen && (
                <div className="absolute z-20 mt-2 w-80 bg-white rounded-lg shadow-xl p-5 border border-gray-200 transform transition-all duration-200 ease-out">
                  <div className="flex justify-between items-center mb-5 pb-2 border-b border-gray-100">
                    <h4 className="font-semibold text-gray-800">Виберіть період</h4>
                    <button
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                      onClick={() => setIsCustomDatePickerOpen(false)}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Від</label>
                      <input
                        type="date"
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary transition-colors duration-200"
                        value={customDateRange.from}
                        max={customDateRange.to}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">До</label>
                      <input
                        type="date"
                        className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:ring-primary focus:border-primary transition-colors duration-200"
                        value={customDateRange.to}
                        min={customDateRange.from}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCustomDatePickerOpen(false)}
                    >
                      Скасувати
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => setIsCustomDatePickerOpen(false)}
                    >
                      Застосувати
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            to="/reports"
            className="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 hover:shadow text-gray-text font-medium transition-all duration-200 ease-in-out rounded-component px-3 py-1.5 text-base shadow-sm"
          >
            <Download size={15} className="text-primary" />
            Експорт
          </Link>

          <Button
            variant={comparisonMode ? 'primary' : 'outline'}
            className="flex items-center gap-2 hover:shadow transition-all duration-200 py-1.5 px-3"
            icon={<BarChart2 size={15} className={comparisonMode ? '' : 'text-primary'} />}
            onClick={() => setComparisonMode(!comparisonMode)}
          >
            Порівняти
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-component shadow-card p-4 mb-8 hover:shadow-lg transition-shadow duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center text-gray-700">
              <Filter size={16} className="mr-2 text-primary" />
              <span className="font-medium font-inter">Фільтри:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableLocations.map(locId => (
                <button
                  key={locId}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${locationFilter === locId ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => handleLocationFilter(locId)}
                >
                  {formatLocationId(locId)}
                </button>
              ))}

              {getAvailableSensorTypes().map(sensorType => {
                // Преобразуем названия типов сенсоров для отображения
                const sensorDisplayNames: Record<string, string> = {
                  'temperature': 'Температура',
                  'humidity': 'Вологість',
                  'soil_moisture': 'Вологість ґрунту',
                  'soil_temperature': 'Темп. ґрунту',
                  'light': 'Освітленість',
                  'ph': 'Кислотність pH',
                  'wind_speed': 'Швидкість вітру',
                  'wind_direction': 'Напрямок вітру',
                  'rainfall': 'Опади',
                  'co2': 'Рівень CO₂'
                };

                const displayName = sensorDisplayNames[sensorType] || sensorType;

                return (
                  <button
                    key={sensorType}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${sensorTypeFilter === sensorType ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => handleSensorTypeFilter(sensorType)}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing || !isConnected}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${isRefreshing
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
                }`}
            >
              <Loader2 size={14} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Оновлення...' : 'Оновити дані'}
            </button>

            <button
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary hover:bg-gray-100 rounded-full transition-colors duration-200"
              onClick={resetFilters}
            >
              <Loader2 size={14} className="mr-1.5" />
              Скинути
            </button>
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="space-y-8">
        {/* Динамически отображаем графики для всех доступных типов датчиков */}
        {getAvailableSensorTypes().map(sensorType => {
          // Преобразуем названия типов сенсоров для отображения
          const sensorDisplayNames: Record<string, string> = {
            'temperature': 'Температура',
            'humidity': 'Вологість',
            'soil_moisture': 'Вологість ґрунту',
            'soil_temperature': 'Темп. ґрунту',
            'light': 'Освітленість',
            'ph': 'Кислотність pH',
            'wind_speed': 'Швидкість вітру',
            'wind_direction': 'Напрямок вітру',
            'rainfall': 'Опади',
            'co2': 'Рівень CO₂'
          };

          const displayName = sensorDisplayNames[sensorType] || sensorType;

          // Определяем единицы измерения для разных типов датчиков
          const sensorUnits: Record<string, string> = {
            'temperature': '°C',
            'humidity': '%',
            'soil_moisture': '%',
            'soil_temperature': '°C',
            'light': 'lux',
            'ph': '',
            'wind_speed': 'км/г',
            'wind_direction': '',
            'rainfall': 'мм',
            'co2': 'ppm'
          };

          const unit = sensorUnits[sensorType] || '';

          // Определяем цвета для разных типов датчиков
          const sensorColors: Record<string, string> = {
            'temperature': '#F59E0B',
            'humidity': '#3B82F6',
            'soil_moisture': '#10B981',
            'soil_temperature': '#F97316',
            'light': '#FBBF24',
            'ph': '#8B5CF6',
            'wind_speed': '#60A5FA',
            'wind_direction': '#A1A1AA',
            'rainfall': '#60A5FA',
            'co2': '#EC4899'
          };

          const color = sensorColors[sensorType] || '#6B7280';

          return isSensorTypeVisible(sensorType) && (
            <div key={`charts-${sensorType}`} className={`grid ${comparisonMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
              {availableLocations.map(locId => (
                isLocationVisible(locId) && (
                  isNewUser ? (
                    <Card key={`${sensorType}-card-${locId}`} title={`${displayName} (${formatLocationId(locId)})`} className="h-full">
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                        <p className="text-lg text-gray-600 text-center font-medium font-roboto">
                          Очікування даних з датчиків...
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <LineChart
                      key={`${sensorType}-chart-${locId}-${chartKey}`}
                      title={`${displayName} (${formatLocationId(locId)})`}
                      data={processChartData(sensorType, locId)}
                      color={color}
                      unit={unit}
                      height={280}
                    />
                  )
                )
              ))}
            </div>
          );
        })}
      </div>

      {/* Insights section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 font-inter">
          Ключові інсайти
        </h2>

        {isNewUser ? (
          <div className="bg-white rounded-component shadow-card p-6 mb-8 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg text-gray-600 text-center font-medium font-roboto">
                Очікування даних з датчиків...
              </p>
              <p className="text-sm text-gray-500 text-center mt-2 font-roboto">
                Зв'яжіться з технічною підтримкою для налаштування доступу до даних
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generateInsights().map((insight, index) => (
              <Card key={`insight-${index}`}>
                <div className="flex items-start">
                  <div className="p-3 rounded-full bg-primary bg-opacity-10 mr-4">
                    {insight.icon === 'BarChart2' && <BarChart2 className="text-primary" size={20} />}
                    {insight.icon === 'Sun' && <Sun className="text-primary" size={20} />}
                    {insight.icon === 'CloudRain' && <CloudRain className="text-primary" size={20} />}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1 font-inter">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-roboto">
                      {insight.text}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;