import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Play, Clock, Settings, Droplets, Leaf, Cpu } from 'lucide-react';
import IrrigationControl from '../components/automation/IrrigationControl';
import FertilizerControl from '../components/automation/FertilizerControl';
import RobotControl from '../components/automation/RobotControl';
import Button from '../components/ui/Button';
import ModalMessage from '../components/ui/ModalMessage';
import { useNavigate } from 'react-router-dom';
import { irrigationApi } from '../services/api/irrigationApi';
import { IrrigationZone } from '../types/irrigationTypes';
import useSensorData from '../hooks/useSensorData';
import { useIrrigationControl } from '../hooks/useIrrigationControl';

// Определяем типы для статуса робота
type RobotControlStatus = 'idle' | 'active' | 'error' | 'maintenance';

const AutomationPage: React.FC = () => {
  // Состояния для взаимодействия с бэкендом
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Состояния для автоматических планов и расписаний
  const [autoPlansAvailable, setAutoPlansAvailable] = useState<boolean>(true);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);

  // Состояние для хранения зон полива
  const [irrigationZones, setIrrigationZones] = useState<IrrigationZone[]>([]);

  // Состояния для модалки
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'info' | 'success' | 'error'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalProgress, setModalProgress] = useState<number | null>(null);
  const modalProgressRef = useRef<any>(null);

  // Получаем данные о сенсорах через хук
  const { latestSensorData, getDataByType } = useSensorData();

  // Инициализируем хук useIrrigationControl для первой зоны (если есть)
  const firstZone = irrigationZones.length > 0 ? irrigationZones[0] : { id: 'default', name: 'Default Zone' };
  const { toggleSchedule, startAutoPlan, globalEnableSchedule, handleToggleSystem } = useIrrigationControl(firstZone.id, firstZone.name);

  // Состояния для систем удобрений и автоматического режима
  const [fertilizerSystemActive, setFertilizerSystemActive] = useState<boolean>(false);
  const [automaticModeActive, setAutomaticModeActive] = useState<boolean>(false);
  const [robotStatus, setRobotStatus] = useState<RobotControlStatus>('idle');

  const navigate = useNavigate();

  // Эффект для загрузки данных при монтировании компонента
  useEffect(() => {
    fetchAutomationStatus();
    fetchIrrigationZones();
  }, []);

  // Эффект для обновления зон при изменении данных сенсоров
  useEffect(() => {
    if (Object.keys(latestSensorData).length > 0) {
      fetchIrrigationZones(false);
    }
  }, [latestSensorData]);

  // Функция для получения статуса систем автоматизации
  const fetchAutomationStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      // Имитация запроса к API
      setTimeout(() => {
        setSystemStatus('online');
        setLastSyncTime(new Date().toISOString());
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Помилка при отриманні статусу автоматизації:', error);
      setSystemStatus('offline');
      setIsLoading(false);
    }
  }, []);

  // Функция для получения списка зон полива
  const fetchIrrigationZones = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);

    try {
      // Получаем данные сенсоров с типом soil_moisture
      const soilMoistureSensors = getDataByType('soil_moisture');

      // Если данных нет, создадим тестовые данные для демонстрации
      if (!soilMoistureSensors || soilMoistureSensors.length === 0) {
        return;
      } else {
        // Передаем данные сенсоров в метод getZones
        const response = await irrigationApi.getZones(soilMoistureSensors);

        if (response.success && response.data) {
          // Создаем локальное состояние для зон, без вызова API
          const zonesWithState = response.data.map(zone => ({
            ...zone,
            state: {
              is_active: false,
              is_irrigating: false,
              current_moisture: 35 + Math.random() * 10,
              threshold: 60
            }
          }));

          setIrrigationZones(zonesWithState);
        }
      }
    } catch (error) {
      console.error('Помилка при отриманні зон поливу:', error);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [getDataByType]);

  // Модифицированная функция для запуска автоматического плана
  const handleRunAutoPlan = useCallback(async () => {
    // Определяем, активен ли автоплан (используем текущее состояние isIrrigating первой зоны)
    const isAutoPlanActive = irrigationZones.length > 0 &&
      irrigationZones.some(zone => zone.state?.is_irrigating);

    // Показываем модальное окно с информацией
    setModalType('info');
    setModalTitle(isAutoPlanActive ? 'Зупинка автоплану' : 'Запуск автоплану');
    setModalText(isAutoPlanActive ? 'Виконується зупинка автоплану...' : 'Виконується запуск автоплану...');
    setModalProgress(0);
    setModalOpen(true);

    let progress = 0;
    if (modalProgressRef.current) clearInterval(modalProgressRef.current);

    modalProgressRef.current = setInterval(() => {
      progress += 10 + Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        setModalProgress(progress);
        clearInterval(modalProgressRef.current);

        if (!isAutoPlanActive) {
          // ВКЛЮЧАЕМ АВТОПЛАН И ВСЕ СИСТЕМЫ

          // Удаляем включение расписания полива при запуске автоплана
          // Теперь автоплан работает независимо от расписания

          // Обновляем состояние зон полива
          const updatedZones = irrigationZones.map(zone => ({
            ...zone,
            state: {
              ...zone.state,
              is_active: true,
              is_irrigating: true
            }
          }));
          setIrrigationZones(updatedZones);

          // Запускаем автоплан для первой зоны (визуализация)
          startAutoPlan();

          // Включаем систему удобрений и автоматический режим
          setFertilizerSystemActive(true);
          setAutomaticModeActive(true);

          // Создаем события для активации всех роботов, кроме "Робот-сіяч 1" (id: "seeder-1")
          // который всегда должен оставаться в режиме обслуживания
          const robotActivationEvent = new CustomEvent('robot-state-change', {
            detail: {
              active: true,
              excludeRobots: ['seeder-1'] // Исключаем "Робот-сіяч 1"
            }
          });
          window.dispatchEvent(robotActivationEvent);

          // Устанавливаем общее состояние роботов на активное
          setRobotStatus('active');

          // Глобально включаем систему полива
          // Добавляем небольшую задержку для последовательной анимации
          setTimeout(() => {
            handleToggleSystem(true);
          }, 300);
        } else {
          // ВЫКЛЮЧАЕМ АВТОПЛАН И ВСЕ СИСТЕМЫ

          // Удаляем деактивацию расписания при остановке автоплана
          // Теперь автоплан работает независимо от расписания

          // Обновляем состояние зон полива
          const updatedZones = irrigationZones.map(zone => ({
            ...zone,
            state: {
              ...zone.state,
              is_active: false,
              is_irrigating: false
            }
          }));
          setIrrigationZones(updatedZones);

          // Выключаем систему удобрений и автоматический режим
          setFertilizerSystemActive(false);
          setAutomaticModeActive(false);

          // Создаем события для деактивации всех роботов, кроме "Робот-сіяч 1"
          // который всегда должен оставаться в режиме обслуживания
          const robotDeactivationEvent = new CustomEvent('robot-state-change', {
            detail: {
              active: false,
              excludeRobots: ['seeder-1'] // Исключаем "Робот-сіяч 1"
            }
          });
          window.dispatchEvent(robotDeactivationEvent);

          // Устанавливаем общее состояние роботов на неактивное
          setRobotStatus('idle');

          // Глобально выключаем систему полива
          // Добавляем небольшую задержку для последовательной анимации
          setTimeout(() => {
            handleToggleSystem(false);
          }, 300);
        }

        setTimeout(() => {
          setModalType('success');
          setModalTitle(isAutoPlanActive ? 'Автоплан зупинено' : 'Автоплан запущено');
          setModalText(isAutoPlanActive
            ? 'Автоматичний план зупинено, всі системи вимкнено.'
            : 'Автоматичний план запущено успішно, усі системи увімкнено!');
          setModalProgress(null);
        }, 500);
      } else {
        setModalProgress(progress);
      }
    }, 80);
  }, [irrigationZones, startAutoPlan, handleToggleSystem]);

  // Функция для настройки расписания
  const handleScheduleAll = useCallback(async () => {
    // Показываем модальное окно с информацией
    setModalType('info');
    setModalTitle(scheduleEnabled ? 'Вимкнення розкладу' : 'Активація розкладу');
    setModalText(scheduleEnabled ? 'Вимикаємо розклад...' : 'Активуємо розклад...');
    setModalProgress(0);
    setModalOpen(true);

    let progress = 0;
    if (modalProgressRef.current) clearInterval(modalProgressRef.current);

    modalProgressRef.current = setInterval(() => {
      progress += 15 + Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        setModalProgress(progress);
        clearInterval(modalProgressRef.current);

        // Переключаем состояние глобально
        const newScheduleState = !scheduleEnabled;
        setScheduleEnabled(newScheduleState);

        if (irrigationZones.length > 0) {
          // Вызываем функцию глобальной синхронизации для всех зон
          // передаем соответствующее значение
          globalEnableSchedule(newScheduleState);

          // Если расписание включается, активируем роботов
          if (newScheduleState) {
            // Создаем события для активации всех роботов, кроме "Робот-сіяч 1"
            const robotActivationEvent = new CustomEvent('robot-state-change', {
              detail: {
                active: true,
                excludeRobots: ['seeder-1'] // Исключаем "Робот-сіяч 1"
              }
            });
            window.dispatchEvent(robotActivationEvent);
            setRobotStatus('active');
          } else {
            // Если расписание выключается, деактивируем роботов
            const robotDeactivationEvent = new CustomEvent('robot-state-change', {
              detail: {
                active: false,
                excludeRobots: ['seeder-1'] // Исключаем "Робот-сіяч 1"
              }
            });
            window.dispatchEvent(robotDeactivationEvent);
            setRobotStatus('idle');
          }

          // Обновляем все активные зоны полива через API
          irrigationApi.updateAllZonesSchedules(newScheduleState)
            .catch((error: Error) => {
              console.error('Ошибка при обновлении расписания:', error.message);
            });
        }

        setTimeout(() => {
          setModalType('success');
          setModalTitle(scheduleEnabled ? 'Розклад вимкнено' : 'Розклад активовано');
          setModalText(scheduleEnabled ? 'Розклад успішно вимкнено.' : 'Розклад успішно активовано.');
          setModalProgress(null);
        }, 500);
      } else {
        setModalProgress(progress);
      }
    }, 80);
  }, [scheduleEnabled, irrigationZones, globalEnableSchedule]);

  // Добавляю обработчик для кнопки 'Налаштувати'
  const handleOpenSettings = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // Мемоизация форматированного времени
  const formattedLastSyncTime = useMemo(() => {
    return lastSyncTime ? new Date(lastSyncTime).toLocaleString('uk-UA') : '';
  }, [lastSyncTime]);

  // Мемоизация строки статуса
  const statusText = useMemo(() => {
    switch (systemStatus) {
      case 'online': return 'онлайн';
      case 'maintenance': return 'обслуговування';
      case 'offline': return 'офлайн';
      default: return 'невідомо';
    }
  }, [systemStatus]);

  // Мемоизация класса статуса
  const statusClass = useMemo(() => {
    return systemStatus === 'online' ? 'text-green-600' : 'text-red-600';
  }, [systemStatus]);

  // Группировка зон по локации
  const zonesByLocation = useMemo(() => {
    const grouped: Record<string, IrrigationZone[]> = {};

    irrigationZones.forEach(zone => {
      if (!grouped[zone.location]) {
        grouped[zone.location] = [];
      }
      grouped[zone.location].push(zone);
    });

    return grouped;
  }, [irrigationZones]);

  return (
    <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
            Керування автоматизацією
          </h1>
          <p className="text-gray-600 font-roboto">
            Керуйте автоматизованими системами та плануйте операції
          </p>
          {lastSyncTime && (
            <p className="text-xs text-gray-500 mt-1">
              Статус системи: <span className={`font-medium ${statusClass}`}>
                {statusText}
              </span> | Останнє оновлення: {formattedLastSyncTime}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            icon={<Clock size={16} />}
            className={`border-primary ${scheduleEnabled ? 'bg-primary-light text-primary' : 'text-primary'}`}
            responsive
            onClick={handleScheduleAll}
            disabled={isLoading}
          >
            {scheduleEnabled ? 'Розклад активний' : 'Активувати розклад'}
          </Button>
          <Button
            variant={irrigationZones.some(zone => zone.state?.is_irrigating) ? 'outline' : 'primary'}
            icon={<Play size={16} />}
            responsive
            onClick={handleRunAutoPlan}
            disabled={isLoading || !autoPlansAvailable}
            className={irrigationZones.some(zone => zone.state?.is_irrigating) ? 'bg-primary-light text-primary border-primary' : ''}
          >
            {irrigationZones.some(zone => zone.state?.is_irrigating) ? 'Зупинити автоплан' : 'Запустити автоплан'}
          </Button>
        </div>
      </div>

      <div className="space-y-10">
        {/* Секция полива */}
        <div>
          <div className="flex items-center mb-4">
            <Droplets className="mr-2 text-primary" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 font-inter">
              Керування поливом
            </h2>
          </div>

          {/* Отображаем зоны сгруппированные по локациям */}
          {Object.entries(zonesByLocation).map(([location, zones]) => (
            <div key={location} className="mb-8">
              <h3 className="text-lg font-medium text-gray-700 mb-3">
                {location}
              </h3>
              <div className={`grid gap-6 ${zones.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                {zones.map(zone => (
                  <IrrigationControl
                    key={zone.id}
                    zoneId={zone.id}
                    zoneName={zone.name}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Если нет зон, показываем сообщение о загрузке или ошибке */}
          {irrigationZones.length === 0 && (
            <div className="bg-white rounded-lg p-8 text-center shadow-sm border border-gray-100">
              {isLoading ? (
                <p className="text-gray-500">Завантаження зон поливу...</p>
              ) : (
                <p className="text-gray-500">Зони поливу не знайдено</p>
              )}
            </div>
          )}
        </div>

        {/* Секция удобрений */}
        <div>
          <div className="flex items-center mb-4">
            <Leaf className="mr-2 text-success" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 font-inter">
              Контроль добрив
            </h2>
          </div>
          <FertilizerControl
            isActive={fertilizerSystemActive}
            autoMode={automaticModeActive}
            onToggle={setFertilizerSystemActive}
            onToggleAutoMode={setAutomaticModeActive}
          />
        </div>

        {/* Секция контроля роботов */}
        <div>
          <div className="flex items-center mb-4">
            <Cpu className="mr-2 text-primary" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 font-inter">
              Автономні системи
            </h2>
          </div>
          <RobotControl
            status={robotStatus}
            onStatusChange={setRobotStatus}
          />
        </div>

        {/* Системные настройки */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Settings className="mr-2 text-gray-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-800 font-inter">
                Налаштування системи
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={handleOpenSettings}
            >
              Налаштувати
            </Button>
          </div>
        </div>
      </div>

      {/* Модальное окно с прогрессом */}
      <ModalMessage
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        type={modalType}
      >
        <div>
          <p>{modalText}</p>
          {modalProgress !== null && (
            <div className="mt-4">
              <div className="h-2 w-full bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-primary rounded-full transition-all duration-200"
                  style={{ width: `${modalProgress}%` }}
                ></div>
              </div>
              <div className="text-right text-xs text-gray-500 mt-1">
                {Math.round(modalProgress)}%
              </div>
            </div>
          )}
        </div>
      </ModalMessage>
    </div>
  );
};

export default memo(AutomationPage);