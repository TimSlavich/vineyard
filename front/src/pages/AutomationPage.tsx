import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { Play, Clock, Settings, Droplets, Leaf, Cpu } from 'lucide-react';
import IrrigationControl from '../components/automation/IrrigationControl';
import FertilizerControl from '../components/automation/FertilizerControl';
import RobotControl from '../components/automation/RobotControl';
import Button from '../components/ui/Button';
import ModalMessage from '../components/ui/ModalMessage';
import { useNavigate } from 'react-router-dom';

const AutomationPage: React.FC = () => {
  // Состояния для взаимодействия с бэкендом
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'maintenance'>('online');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Состояния для автоматических планов и расписаний
  const [autoPlansAvailable, setAutoPlansAvailable] = useState<boolean>(true);
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);

  // Состояния для модалки
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'info' | 'success' | 'error'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalText, setModalText] = useState('');
  const [modalProgress, setModalProgress] = useState<number | null>(null);
  const modalProgressRef = useRef<any>(null);

  const navigate = useNavigate();

  // Эффект для загрузки данных при монтировании компонента
  useEffect(() => {
    fetchAutomationStatus();
  }, []);

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

  // Функция для запуска автоматического плана
  const handleRunAutoPlan = useCallback(async () => {
    setModalType('info');
    setModalTitle('Запуск автоплану');
    setModalText('Виконується запуск автоплану...');
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
        setTimeout(() => {
          setModalType('success');
          setModalTitle('Автоплан запущено');
          setModalText('Автоматичний план запущено успішно!');
          setModalProgress(null);
        }, 500);
      } else {
        setModalProgress(progress);
      }
    }, 80);
  }, []);

  // Функция для настройки расписания
  const handleScheduleAll = useCallback(async () => {
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
        setTimeout(() => {
          setScheduleEnabled(!scheduleEnabled);
          setModalType('success');
          setModalTitle(scheduleEnabled ? 'Розклад вимкнено' : 'Розклад активовано');
          setModalText(scheduleEnabled ? 'Розклад успішно вимкнено.' : 'Розклад успішно активовано.');
          setModalProgress(null);
        }, 500);
      } else {
        setModalProgress(progress);
      }
    }, [scheduleEnabled]);
  }, [scheduleEnabled]);

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
            variant="primary"
            icon={<Play size={16} />}
            responsive
            onClick={handleRunAutoPlan}
            disabled={isLoading || !autoPlansAvailable}
          >
            Запустити автоплан
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IrrigationControl zoneId="zone1" zoneName="Блок A" />
            <IrrigationControl zoneId="zone2" zoneName="Блок B" />
          </div>
        </div>

        {/* Секция удобрений */}
        <div>
          <div className="flex items-center mb-4">
            <Leaf className="mr-2 text-success" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 font-inter">
              Контроль добрив
            </h2>
          </div>
          <FertilizerControl />
        </div>

        {/* Секция контроля роботов */}
        <div>
          <div className="flex items-center mb-4">
            <Cpu className="mr-2 text-primary" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 font-inter">
              Автономні системи
            </h2>
          </div>
          <RobotControl />
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