import React, { useState, useRef, useEffect } from 'react';
import LineChart from '../components/charts/LineChart';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { sensorData } from '../data/mockData';
import { Calendar, Download, Filter, BarChart2, RefreshCw, ChevronDown, X, Settings, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// Типы для фильтров
type LocationFilter = 'loc1' | 'loc2' | null;
type SensorTypeFilter = 'temperature' | 'humidity' | 'soil_moisture' | null;

const AnalyticsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('24h');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [isCustomDatePickerOpen, setIsCustomDatePickerOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Состояния для фильтров
  const [locationFilter, setLocationFilter] = useState<LocationFilter>(null);
  const [sensorTypeFilter, setSensorTypeFilter] = useState<SensorTypeFilter>(null);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Функция для сброса всех фильтров
  const resetFilters = () => {
    setLocationFilter(null);
    setSensorTypeFilter(null);
  };

  // Обработчики для выбора фильтров
  const handleLocationFilter = (location: LocationFilter) => {
    setLocationFilter(prev => prev === location ? null : location);
  };

  const handleSensorTypeFilter = (type: SensorTypeFilter) => {
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

  // Effect для обновления данных при изменении периода
  const [chartKey, setChartKey] = useState(0);
  useEffect(() => {
    // Инкрементируем chartKey при изменении dateRange или customDateRange
    // для обновления графиков
    setChartKey(prevKey => prevKey + 1);
  }, [dateRange, customDateRange]);

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

  // Модифицированная функция фильтрации с учетом выбранных фильтров
  const filterData = (type: string, locationId: string) => {
    // Проверяем соответствие выбранным фильтрам
    if (
      (locationFilter && locationId !== locationFilter) ||
      (sensorTypeFilter && type !== sensorTypeFilter)
    ) {
      return []; // Возвращаем пустой массив, если не соответствует фильтрам
    }

    const { start, end } = getTimeRange();

    return sensorData
      .filter(reading => {
        const readingDate = new Date(reading.timestamp);
        return reading.type === type &&
          reading.location.id === locationId &&
          readingDate >= start &&
          readingDate <= end;
      })
      .map(reading => ({
        value: reading.value,
        timestamp: reading.timestamp,
      }));
  };

  const temperatureDataA = filterData('temperature', 'loc1');
  const humidityDataA = filterData('humidity', 'loc1');
  const soilMoistureDataA = filterData('soil_moisture', 'loc1');

  const temperatureDataB = filterData('temperature', 'loc2');
  const humidityDataB = filterData('humidity', 'loc2');
  const soilMoistureDataB = filterData('soil_moisture', 'loc2');

  // Определяем видимость графиков в зависимости от выбранных фильтров
  const showTemperatureCharts = !sensorTypeFilter || sensorTypeFilter === 'temperature';
  const showHumidityCharts = !sensorTypeFilter || sensorTypeFilter === 'humidity';
  const showSoilMoistureCharts = !sensorTypeFilter || sensorTypeFilter === 'soil_moisture';

  // Определяем видимость блоков с учетом только фильтров
  const showBlockA = !locationFilter || locationFilter === 'loc1';
  const showBlockB = !locationFilter || locationFilter === 'loc2';

  return (
    <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
            Аналітика та інсайти
          </h1>
          <p className="text-gray-600 font-roboto">
            Аналізуйте історичні дані та знаходьте закономірності для покращення управління виноградником
          </p>
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
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${locationFilter === 'loc1' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleLocationFilter('loc1')}
              >
                Блок A
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${locationFilter === 'loc2' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleLocationFilter('loc2')}
              >
                Блок B
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${sensorTypeFilter === 'temperature' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleSensorTypeFilter('temperature')}
              >
                Температура
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${sensorTypeFilter === 'humidity' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleSensorTypeFilter('humidity')}
              >
                Вологість
              </button>
              <button
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${sensorTypeFilter === 'soil_moisture' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => handleSensorTypeFilter('soil_moisture')}
              >
                Вологість ґрунту
              </button>
            </div>
          </div>

          <button
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary hover:bg-gray-100 rounded-full transition-colors duration-200"
            onClick={resetFilters}
          >
            <RefreshCw size={14} className="mr-1.5" />
            Скинути
          </button>
        </div>
      </div>

      {/* Charts grid */}
      <div className="space-y-8">
        {/* Temperature charts */}
        {showTemperatureCharts && (
          <div className={`grid ${comparisonMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {showBlockA && (
              <LineChart
                key={`temp-chart-a-${chartKey}`}
                title="Температура (Блок A)"
                data={temperatureDataA}
                color="#F59E0B"
                unit="°C"
                height={280}
              />
            )}

            {showBlockB && (
              <LineChart
                key={`temp-chart-b-${chartKey}`}
                title="Температура (Блок B)"
                data={temperatureDataB}
                color="#F59E0B"
                unit="°C"
                height={280}
              />
            )}
          </div>
        )}

        {/* Humidity charts */}
        {showHumidityCharts && (
          <div className={`grid ${comparisonMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {showBlockA && (
              <LineChart
                key={`humidity-chart-a-${chartKey}`}
                title="Вологість (Блок A)"
                data={humidityDataA}
                color="#3B82F6"
                unit="%"
                height={280}
              />
            )}

            {showBlockB && (
              <LineChart
                key={`humidity-chart-b-${chartKey}`}
                title="Вологість (Блок B)"
                data={humidityDataB}
                color="#3B82F6"
                unit="%"
                height={280}
              />
            )}
          </div>
        )}

        {/* Soil Moisture charts */}
        {showSoilMoistureCharts && (
          <div className={`grid ${comparisonMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            {showBlockA && (
              <LineChart
                key={`soil-chart-a-${chartKey}`}
                title="Вологість ґрунту (Блок A)"
                data={soilMoistureDataA}
                color="#10B981"
                unit="%"
                height={280}
              />
            )}

            {showBlockB && (
              <LineChart
                key={`soil-chart-b-${chartKey}`}
                title="Вологість ґрунту (Блок B)"
                data={soilMoistureDataB}
                color="#10B981"
                unit="%"
                height={280}
              />
            )}
          </div>
        )}
      </div>

      {/* Insights section */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 font-inter">
          Ключові інсайти
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-start">
              <div className="p-3 rounded-full bg-primary bg-opacity-10 mr-4">
                <BarChart2 className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1 font-inter">
                  Динаміка температури
                </h3>
                <p className="text-sm text-gray-600 font-roboto">
                  Температура в Блоку А була в середньому на 3,2°C вища, ніж у Блоку B за останній тиждень.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start">
              <div className="p-3 rounded-full bg-primary bg-opacity-10 mr-4">
                <BarChart2 className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1 font-inter">
                  Кореляція вологості
                </h3>
                <p className="text-sm text-gray-600 font-roboto">
                  Спостерігається сильна кореляція між вранішнім рівнем вологості та денними піками температури.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start">
              <div className="p-3 rounded-full bg-primary bg-opacity-10 mr-4">
                <BarChart2 className="text-primary" size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1 font-inter">
                  Тенденції вологості ґрунту
                </h3>
                <p className="text-sm text-gray-600 font-roboto">
                  Рівень вологості ґрунту в Блоку B постійно знижується протягом останніх 3 днів, незважаючи на недавні опади.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;