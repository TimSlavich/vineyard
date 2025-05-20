import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useDeviceSettings } from '../context/DeviceSettingsContext';
import { Bell, Smartphone, Save, RefreshCw } from 'lucide-react';
import ModalMessage from '../components/ui/ModalMessage';
import { getUserData, setItem } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import {
  translateDeviceStatus,
  translateSensorType,
  translateSensorLocation
} from '../utils/translations';
import {
  loadUserSettings,
  saveUserSettings,
  resetUserSettings,
  updateNotificationChannel,
  UserSettings
} from '../services/userSettingsService';
import useSensorData from '../hooks/useSensorData';
import { NotificationSetting } from '../types';
import { userApi } from '../services/api/userApi';

// Компонент для отображения списка устройств
const DevicesTab = memo(({
  allDevices,
  getDeviceStatusClass,
  setDetailsOpen,
  setDetailsDevice,
  handleUpdateStatus,
  formatSensorValue,
  isRefreshingData
}: {
  allDevices: any[],
  getDeviceStatusClass: (status: string) => string,
  setDetailsOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setDetailsDevice: React.Dispatch<React.SetStateAction<any>>,
  handleUpdateStatus: () => void,
  formatSensorValue: (value: number | string, unit?: string) => string,
  isRefreshingData: boolean
}) => {
  return (
    <Card title="Пристрої та датчики" className="mb-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300"
          leftIcon={<RefreshCw size={14} className={isRefreshingData ? "animate-spin" : ""} />}
          onClick={handleUpdateStatus}
          disabled={isRefreshingData}
        >
          {isRefreshingData ? "Оновлення..." : "Оновити статус"}
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Назва
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Батарея
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Розташування
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Останнє оновлення
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дії
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => {
                  setDetailsDevice(device);
                  setDetailsOpen(true);
                }}>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {device.name}
                    {device.isSensor && device.value !== undefined && (
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        {formatSensorValue(device.value, device.unit)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {device.type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeviceStatusClass(device.status)}`}>
                      {translateDeviceStatus(device.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div
                          className={`h-2.5 rounded-full ${device.battery > 60 ? 'bg-green-500' : device.battery > 20 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${device.battery}%` }}
                        ></div>
                      </div>
                      <span>{device.battery}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {device.location}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(device.lastSyncTime).toLocaleString('uk-UA', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <button
                      className="text-primary hover:text-primary-dark transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsDevice(device);
                        setDetailsOpen(true);
                      }}
                    >
                      Деталі
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
});

// Компонент для отображения порогов
const ThresholdsTab = memo(({
  localThresholds,
  handleThresholdChange,
  handleSaveThresholds,
  handleResetThresholds,
  handleTestAlert,
  loading
}: {
  localThresholds: any[],
  handleThresholdChange: (id: string, field: 'min' | 'max', value: number) => void,
  handleSaveThresholds: () => void,
  handleResetThresholds: () => void,
  handleTestAlert: () => void,
  loading: boolean
}) => {
  // Безопасное преобразование строки в число
  const safeParseFloat = (value: string): number => {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return 0;

    // Округляем до 2 знаков после запятой для более читаемых значений
    return Math.round(parsed * 100) / 100;
  };

  return (
    <Card title="Порогові значення" className="mb-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Save size={14} />}
          onClick={handleSaveThresholds}
        >
          Зберегти зміни
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300"
          onClick={handleResetThresholds}
        >
          Скинути до початкових
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-warning text-warning"
          onClick={handleTestAlert}
        >
          Тестове оповіщення
        </Button>
      </div>

      {loading ? (
        <div className="p-6 flex justify-center items-center">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin"></div>
            <span className="text-gray-600">Завантаження порогових значень...</span>
          </div>
        </div>
      ) : (!localThresholds || localThresholds.length === 0) ? (
        <div className="p-6 flex justify-center">
          <p className="text-gray-600">Порогові значення відсутні. Натисніть "Скинути до початкових", щоб створити їх.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип датчика
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Мінімум
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Максимум
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Одиниці виміру
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {localThresholds.map((threshold) => (
                  <tr key={threshold.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {translateSensorType(threshold.sensorType)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-24 px-3 py-1 border border-gray-300 rounded-md text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={threshold.min ?? ''}
                        min="0"
                        step="0.1"
                        onChange={(e) => handleThresholdChange(threshold.id, 'min', safeParseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-24 px-3 py-1 border border-gray-300 rounded-md text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        value={threshold.max ?? ''}
                        min="0"
                        step="0.1"
                        onChange={(e) => handleThresholdChange(threshold.id, 'max', safeParseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {threshold.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
});

// Основной компонент страницы настроек
const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const {
    thresholds,
    setNotificationSettings,
    fetchThresholds,
    updateAllThresholds,
    resetThresholds,
    loading
  } = useDeviceSettings();

  // Добавляем получение данных с датчиков через хук
  const { latestSensorData, refreshSensorData } = useSensorData();

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDevice, setDetailsDevice] = useState<any>(null);
  const [localThresholds, setLocalThresholds] = useState<any[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [thresholdResetModalOpen, setThresholdResetModalOpen] = useState(false);
  const [notifSaveModalOpen, setNotifSaveModalOpen] = useState(false);
  const [notifResetModalOpen, setNotifResetModalOpen] = useState(false);
  const userData = getUserData() || { first_name: '', last_name: '', email: '' };
  const [account, setAccount] = useState({
    name: [userData.first_name, userData.last_name].filter(Boolean).join(' '),
    email: userData.email || '',
    timezone: 'Europe/Kyiv',
  });
  const [accountNameEdit, setAccountNameEdit] = useState(account.name);
  const [accountNameChanged, setAccountNameChanged] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountUpdateSuccess, setAccountUpdateSuccess] = useState(false);
  const [accountUpdateError, setAccountUpdateError] = useState('');
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();
  const [userSettings, setUserSettings] = useState<UserSettings>(loadUserSettings());

  // Состояние для отслеживания процесса обновления данных
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Кэш для названий локаций, чтобы не пересчитывать их при каждом рендере
  const locationCache = useMemo(() => new Map<string, string>(), []);

  // Инициализация при загрузке компонента
  useEffect(() => {
    // При монтировании компонента запрашиваем актуальные пороговые значения
    fetchThresholds();

    // Запрашиваем актуальные данные с датчиков
    refreshSensorData();

    // Устанавливаем таймер для повторного запроса через 1 секунду, если данные не пришли
    const timer = setTimeout(() => {
      if (thresholds.length === 0 && !loading.thresholds) {
        fetchThresholds();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Обновляем локальные пороговые значения при получении от сервера
  useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  // При переключении на вкладку пороговых значений, повторно запрашиваем данные если их нет
  useEffect(() => {
    if (activeTab === 'thresholds' && thresholds.length === 0 && !loading.thresholds) {
      fetchThresholds();
    }
  }, [activeTab]);

  // Форматируем значение датчика с учетом единиц измерения
  const formatSensorValue = (value: number | string, unit?: string): string => {
    if (!unit) return `${value}`;

    // Единицы измерения, которые идут сразу после значения без пробела
    const noSpaceUnits = ['°C', '°F', '%'];
    if (noSpaceUnits.includes(unit)) {
      return `${value}${unit}`;
    }

    // Единицы измерения со специальным форматированием
    if (unit === 'lux') return `${value} lx`;

    // Все остальные единицы измерения с пробелом
    return `${value} ${unit}`;
  };

  // Функция для определения локации датчика с кэшированием
  const getSensorLocation = useCallback((sensor: any, cleanId: string): string => {
    // Проверяем, есть ли эта локация в кэше
    const cacheKey = `${sensor.location_id}_${cleanId}_${sensor.type}`;
    if (locationCache.has(cacheKey)) {
      return locationCache.get(cacheKey)!;
    }

    let locationId = sensor.location_id;

    // Если локация не указана, определяем на основе ID или типа
    if (!locationId || locationId === 'undefined') {
      const idNumber = parseInt(cleanId, 10);

      if (!isNaN(idNumber)) {
        // Распределяем по математическому остатку
        locationId = `loc${(idNumber % 5) + 1}`;
      } else {
        // По типу датчика
        switch (sensor.type) {
          case 'temperature': locationId = 'loc1'; break;
          case 'humidity': locationId = 'loc2'; break;
          case 'soil_moisture': locationId = 'loc3'; break;
          case 'wind_speed':
          case 'wind_direction': locationId = 'outdoor'; break;
          case 'light':
          case 'co2': locationId = 'greenhouse'; break;
          default: locationId = 'field';
        }
      }
    }

    // Формируем название локации
    let result: string;
    const locationNumber = locationId.split(/[_-]/).pop();
    if (locationNumber && !isNaN(parseInt(locationNumber, 10))) {
      result = `Локація ${locationNumber}`;
    } else {
      // Специальные локации
      const specialLocations: Record<string, string> = {
        'greenhouse': 'Теплиця',
        'field': 'Поле',
        'outdoor': 'Зовнішній майданчик'
      };

      result = specialLocations[locationId] || translateSensorLocation(locationId);
    }

    // Сохраняем результат в кэше
    locationCache.set(cacheKey, result);
    return result;
  }, [locationCache]);

  // Объединяем устройства и датчики для таблицы
  const allDevices = useMemo(() => {
    // Создаем устройства из реальных данных датчиков
    const sensorDevices = Object.values(latestSensorData).map(sensor => {
      // Очищаем ID для лучшего отображения
      const cleanId = sensor.sensor_id.split(/[_-]/).pop() || sensor.sensor_id;

      // Извлекаем числовое значение и округляем до 2 знаков
      const value = typeof sensor.value === 'number'
        ? Math.round(sensor.value * 100) / 100
        : Math.round(parseFloat(String(sensor.value)) * 100) / 100;

      // Получаем название локации
      const location = getSensorLocation(sensor, cleanId);

      return {
        id: sensor.sensor_id,
        name: `${translateSensorType(sensor.type)} #${cleanId}`,
        type: translateSensorType(sensor.type),
        status: 'online',
        battery: Math.floor(Math.random() * 60) + 40,
        lastSyncTime: sensor.timestamp,
        locationId: sensor.location_id,
        location,
        value,
        unit: sensor.unit,
        isSensor: true,
      }
    });

    return sensorDevices;
  }, [latestSensorData]);

  const handleThresholdChange = (id: string, field: 'min' | 'max', value: number) => {
    // Проверяем значение на NaN и ограничиваем отрицательные значения
    // для типов датчиков, которые не могут иметь отрицательные значения
    const threshold = localThresholds.find(t => t.id === id);
    let validValue = isNaN(value) ? 0 : value;

    // Для некоторых типов датчиков (температура) разрешаем отрицательные значения
    if (threshold && ['humidity', 'soil_moisture', 'light', 'wind_speed', 'rainfall', 'co2'].includes(threshold.sensorType)) {
      validValue = Math.max(0, validValue);
    }

    // Округляем до 2 знаков после запятой
    validValue = Math.round(validValue * 100) / 100;

    setLocalThresholds(prev =>
      prev.map(threshold =>
        threshold.id === id ? { ...threshold, [field]: validValue } : threshold
      )
    );
  };

  const handleNotificationToggle = (type: 'email' | 'sms' | 'push', enabled: boolean) => {
    setNotificationSettings(prev =>
      prev.map(setting =>
        setting.type === type ? { ...setting, enabled } : setting
      )
    );
  };

  const handleAlertTypeToggle = (
    type: 'email' | 'sms' | 'push',
    alertType: 'info' | 'warning' | 'critical',
    enabled: boolean
  ) => {
    setNotificationSettings(prev =>
      prev.map(setting => {
        if (setting.type === type) {
          const alertTypes = enabled
            ? [...setting.alertTypes, alertType]
            : setting.alertTypes.filter(t => t !== alertType);
          return { ...setting, alertTypes };
        }
        return setting;
      })
    );
  };

  const getTabClass = (tab: string) => {
    return `px-4 py-2 font-medium rounded-md transition-colors ${activeTab === tab
      ? 'bg-primary text-white'
      : 'text-gray-700 hover:bg-gray-100'
      }`;
  };

  const getDeviceStatusClass = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'bg-success bg-opacity-10 text-success';
      case 'offline':
        return 'bg-error bg-opacity-10 text-error';
      case 'maintenance':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'idle':
        return 'bg-blue-100 text-blue-700';
      case 'charging':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Обновить статус и актуальные данные
  const handleUpdateStatus = () => {
    if (isRefreshingData) return; // Предотвращаем повторные запросы

    setIsRefreshingData(true);

    // Запрашиваем актуальные данные с датчиков
    refreshSensorData();

    // Устанавливаем таймер для сброса состояния
    setTimeout(() => {
      setIsRefreshingData(false);
    }, 2000);
  };

  // Сохранить изменения порогов
  const handleSaveThresholds = () => {
    // Используем функцию из контекста для сохранения
    updateAllThresholds(localThresholds)
      .then(() => {
        // При успехе показываем уведомление
        setSaveModalOpen(true);
      })
      .catch(error => {
        console.error('Помилка при збереженні порогових значень:', error);

        // Отображаем ошибку пользователю
        import('../services/notificationService').then(({ addAlert }) => {
          addAlert({
            title: 'Помилка',
            message: 'Не вдалося зберегти порогові значення',
            type: 'critical',
            sensorId: 'threshold-save-error',
          });
        });
      });
  };

  // Сбросить к стандартным
  const handleResetThresholds = () => {
    // Используем функцию resetThresholds из контекста
    resetThresholds()
      .then(() => {
        setThresholdResetModalOpen(true);
      })
      .catch(error => {
        console.error('Ошибка при сбросе пороговых значений:', error);

        // Отображаем ошибку пользователю
        import('../services/notificationService').then(({ addAlert }) => {
          addAlert({
            title: 'Помилка',
            message: 'Не вдалося скинути порогові значення',
            type: 'critical',
            sensorId: 'threshold-reset-error',
          });
        });
      });
  };

  // Сохранить настройки уведомлений
  const handleSaveNotifications = () => {
    setNotifSaveModalOpen(true);
  };

  // Сбросить настройки уведомлений к стандартным
  const handleResetNotifications = () => {
    const defaultSettings: NotificationSetting[] = [
      { type: 'email' as 'email', enabled: true, alertTypes: ['warning', 'critical'] },
      { type: 'sms' as 'sms', enabled: true, alertTypes: ['critical'] },
      { type: 'push' as 'push', enabled: true, alertTypes: ['info', 'warning', 'critical'] }
    ];
    setNotificationSettings(defaultSettings);
    setNotifResetModalOpen(true);
  };

  // Функция для отправки тестового оповещения
  const handleTestAlert = () => {
    // Создаем переменную для хранения состояния кнопки
    const btnElement = document.querySelector('button.border-warning');
    const originalText = btnElement?.textContent || 'Тестове сповіщення';

    if (btnElement) {
      btnElement.textContent = 'Відправка...';
      btnElement.setAttribute('disabled', 'true');
    }

    // Отправляем тестовое оповещение через WebSocket
    import('../services/websocketService').then(({ default: websocketService }) => {
      // Флаг для отслеживания, было ли уже добавлено оповещение
      let alertAdded = false;

      websocketService.sendTestAlert();

      // Устанавливаем обработчик для получения ответа от сервера
      const unsubscribe = websocketService.subscribe('request_completed', (data) => {
        // Проверяем, что это ответ на тестовое оповещение и что оповещение еще не было добавлено
        if (!alertAdded && data && data.message && (data.message.includes('Тестове сповіщення') || data.message.includes('Тестовое оповещение'))) {
          alertAdded = true;
          unsubscribe();

          // Импортируем addAlert для создания оповещения
          import('../services/notificationService').then(({ addAlert }) => {
            addAlert({
              title: 'Тестове сповіщення',
              message: 'Тестове сповіщення успішно отримано. Система сповіщень працює нормально.',
              type: 'info',
              sensorId: 'test-notification',
            });
          });

          // Возвращаем кнопку в исходное состояние
          if (btnElement) {
            btnElement.textContent = originalText;
            btnElement.removeAttribute('disabled');
          }
        }
      });

      // Устанавливаем таймаут на 3 секунды
      setTimeout(() => {
        // Возвращаем кнопку в исходное состояние
        if (btnElement) {
          btnElement.textContent = originalText;
          btnElement.removeAttribute('disabled');
        }
      }, 3000);
    });
  };

  // Обработчики для настроек уведомлений
  const handleToggleNotificationChannel = (channelType: string, enabled: boolean) => {
    const updatedSettings = updateNotificationChannel(channelType, { enabled });
    setUserSettings(updatedSettings);
  };

  const handleToggleNotificationAlertType = (channelType: string, alertType: string, enabled: boolean) => {
    const channel = userSettings.notifications.channels.find(ch => ch.type === channelType);
    if (!channel) return;

    const alertTypes = enabled
      ? [...channel.alertTypes, alertType]
      : channel.alertTypes.filter(t => t !== alertType);

    const updatedSettings = updateNotificationChannel(channelType, { alertTypes });
    setUserSettings(updatedSettings);
  };

  const handleSaveNotificationSettings = () => {
    saveUserSettings(userSettings);
    setNotifSaveModalOpen(true);
  };

  const handleResetNotificationSettings = () => {
    const defaultSettings = resetUserSettings();
    setUserSettings(defaultSettings);
    setNotifResetModalOpen(true);
  };

  // Функция для обновления имени пользователя
  const handleUpdateUserName = async () => {
    if (!accountNameChanged || !accountNameEdit.trim()) return;

    setIsUpdatingAccount(true);
    setAccountUpdateError('');

    try {
      // Разделяем полное имя на имя и фамилию
      const nameParts = accountNameEdit.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Вызываем API для обновления профиля
      const updatedUserData = await userApi.updateProfile({
        first_name: firstName,
        last_name: lastName
      });

      // Обновляем данные в localStorage
      setItem('user', updatedUserData);

      // Формируем полное имя из first_name и last_name
      const fullName = [updatedUserData.first_name, updatedUserData.last_name].filter(Boolean).join(' ');

      // Обновляем локальное состояние
      setAccount(prev => ({ ...prev, name: fullName }));
      setAccountNameEdit(fullName);
      setAccountNameChanged(false);
      setAccountUpdateSuccess(true);
    } catch (error) {
      console.error('Помилка при оновленні імені користувача:', error);
      setAccountUpdateError(error instanceof Error ? error.message : 'Не вдалося оновити ім\'я користувача');
      setAccountUpdateSuccess(false);
    } finally {
      setIsUpdatingAccount(false);
      setAccountModalOpen(true);
    }
  };

  return (
    <div className="px-6 py-8 md:px-8 lg:px-12 min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 font-inter">
          Налаштування
        </h1>
        <p className="text-gray-600 font-roboto">
          Керуйте пристроями, сповіщеннями та системними параметрами
        </p>
      </div>

      {/* Вкладки настроек */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={getTabClass('devices')}
          onClick={() => setActiveTab('devices')}
        >
          <Smartphone className="inline-block w-4 h-4 mr-1 -mt-0.5" />
          Пристрої
        </button>
        <button
          className={getTabClass('thresholds')}
          onClick={() => setActiveTab('thresholds')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path>
            <path d="M5 20V4"></path>
          </svg>
          Порогові значення
        </button>
        <button
          className={getTabClass('account')}
          onClick={() => setActiveTab('account')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="inline-block w-4 h-4 mr-1 -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Обліковий запис
        </button>
      </div>

      {/* Вкладка "Устройства" */}
      {activeTab === 'devices' && (
        <DevicesTab
          allDevices={allDevices}
          getDeviceStatusClass={getDeviceStatusClass}
          setDetailsOpen={setDetailsOpen}
          setDetailsDevice={setDetailsDevice}
          handleUpdateStatus={handleUpdateStatus}
          formatSensorValue={formatSensorValue}
          isRefreshingData={isRefreshingData}
        />
      )}

      {/* Вкладка "Пороговые значения" */}
      {activeTab === 'thresholds' && (
        <ThresholdsTab
          localThresholds={localThresholds}
          handleThresholdChange={handleThresholdChange}
          handleSaveThresholds={handleSaveThresholds}
          handleResetThresholds={handleResetThresholds}
          handleTestAlert={handleTestAlert}
          loading={loading.thresholds}
        />
      )}

      {/* Вкладка "Аккаунт" */}
      {activeTab === 'account' && (
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 font-inter">
              Налаштування акаунта
            </h2>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                Повне ім'я
              </label>
              <div className="flex gap-3 items-center">
                <input
                  type="text"
                  className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto h-12 p-4 text-lg"
                  value={accountNameEdit}
                  onChange={e => { setAccountNameEdit(e.target.value); setAccountNameChanged(e.target.value !== account.name); }}
                />
                <Button
                  onClick={handleUpdateUserName}
                  disabled={!accountNameChanged || isUpdatingAccount}
                >
                  {isUpdatingAccount ? 'Зберігаю...' : 'Зберегти'}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                Електронна пошта
              </label>
              <input
                type="email"
                className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto bg-gray-50 h-12 p-4 text-lg"
                value={account.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                Пароль
              </label>
              <div className="mt-1">
                <Button variant="outline" onClick={() => setPasswordModalOpen(true)}>
                  Змінити пароль
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 font-roboto">
                Часовий пояс
              </label>
              <select
                className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto"
                value={account.timezone}
                onChange={e => setAccount(a => ({ ...a, timezone: e.target.value }))}
              >
                <option value="Europe/Kyiv">Київ (Україна)</option>
                <option value="Europe/Warsaw">Варшава (Польща)</option>
                <option value="Europe/Berlin">Берлін (Німеччина)</option>
                <option value="Europe/London">Лондон (Велика Британія)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-800 mb-3 font-inter">
                Небезпечна зона
              </h3>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-red-50 rounded-component">
                <div>
                  <p className="text-sm font-medium text-gray-900 font-roboto">
                    Видалити акаунт
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-roboto">
                    Назавжди видалити акаунт та всі пов'язані дані.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-3 md:mt-0 border-red-300 text-error hover:bg-red-100"
                  onClick={() => { setDeleteModalOpen(true); setDeleteStep(0); setDeletePassword(''); setDeleteError(''); }}
                >
                  Видалити акаунт
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Модальные окна */}
      <ModalMessage
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="Порогові значення збережено"
        type="success"
      >
        Нові порогові значення було успішно збережено.
      </ModalMessage>

      <ModalMessage
        isOpen={thresholdResetModalOpen}
        onClose={() => setThresholdResetModalOpen(false)}
        title="Порогові значення скинуто"
        type="success"
      >
        Порогові значення було скинуто до початкових.
      </ModalMessage>

      {/* Модалка деталей устройства */}
      <ModalMessage
        isOpen={detailsOpen}
        type="info"
        title={detailsDevice?.name || 'Деталі пристрою'}
        message={detailsDevice && (
          <div className="space-y-3 text-left">
            <div><b>ID:</b> {detailsDevice.id}</div>
            <div><b>Тип:</b> {detailsDevice.type}</div>
            {detailsDevice.status && (
              <div className="flex items-center">
                <b className="mr-2">Статус:</b>
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getDeviceStatusClass(detailsDevice.status)}`}>
                  {translateDeviceStatus(detailsDevice.status)}
                </span>
              </div>
            )}
            <div className="flex items-center">
              <b className="mr-2">Батарея:</b>
              <div className="flex items-center">
                <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                  <div
                    className={`h-2.5 rounded-full ${detailsDevice.battery > 60 ? 'bg-green-500' : detailsDevice.battery > 20 ? 'bg-yellow-400' : 'bg-red-500'}`}
                    style={{ width: `${detailsDevice.battery}%` }}
                  ></div>
                </div>
                <span>{detailsDevice.battery}%</span>
              </div>
            </div>
            <div><b>Локація:</b> {detailsDevice.location}</div>
            <div><b>Остання синхронізація:</b> {detailsDevice.lastSyncTime ? new Date(detailsDevice.lastSyncTime).toLocaleString('uk-UA', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : '-'}</div>

            {/* Показываем значение датчика, если это датчик */}
            {detailsDevice.isSensor && detailsDevice.value !== undefined && (
              <div className="mt-2 p-3 bg-primary bg-opacity-5 rounded-lg">
                <div className="text-lg font-medium text-primary">
                  {formatSensorValue(detailsDevice.value, detailsDevice.unit)}
                </div>
                <div className="text-sm text-gray-600">
                  Поточне значення
                </div>
              </div>
            )}
          </div>
        )}
        onClose={() => setDetailsOpen(false)}
      />
      <ModalMessage
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title={accountUpdateSuccess ? "Профіль оновлено" : "Помилка оновлення"}
        type={accountUpdateSuccess ? "success" : "error"}
      >
        {accountUpdateSuccess
          ? "Ім'я користувача успішно оновлено."
          : `Помилка при оновленні імені користувача: ${accountUpdateError || 'Невідома помилка'}`}
      </ModalMessage>
      <ModalMessage
        isOpen={passwordModalOpen}
        type="info"
        title="Зміна пароля"
        message={
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Старий пароль"
              className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto h-12 p-4 text-lg"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Новий пароль"
              className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto h-12 p-4 text-lg"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Підтвердити новий пароль"
              className="block w-full rounded-component border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 font-roboto h-12 p-4 text-lg"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {passwordError && <div className="text-error text-sm">{passwordError}</div>}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => { setPasswordModalOpen(false); setPasswordError(''); }}
              >
                Скасувати
              </Button>
              <Button
                onClick={() => {
                  if (!oldPassword || !newPassword || !confirmPassword) {
                    setPasswordError('Заповніть всі поля');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPasswordError('Паролі не співпадають');
                    return;
                  }
                  setPasswordError('');
                  setPasswordModalOpen(false);
                  setPasswordSuccess(true);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Зберегти
              </Button>
            </div>
          </div>
        }
        onClose={() => { setPasswordModalOpen(false); setPasswordError(''); }}
      />
      <ModalMessage
        isOpen={passwordSuccess}
        type="success"
        title="Пароль змінено"
        message="Пароль успішно змінено."
        onClose={() => setPasswordSuccess(false)}
      />
      <ModalMessage
        isOpen={deleteModalOpen && deleteStep === 0}
        type="error"
        title="Видалення акаунта"
        hideDefaultButtons={true}
        message={
          <div className="space-y-3">
            <div>Ви дійсно хочете видалити акаунт? Це дія незворотна. Для підтвердження введіть пароль:</div>
            <input
              type="password"
              placeholder="Пароль"
              className="block w-full rounded-component border-gray-300 shadow-sm focus:border-error focus:ring focus:ring-error focus:ring-opacity-50 font-roboto h-12 p-4 text-lg"
              value={deletePassword}
              onChange={e => setDeletePassword(e.target.value)}
            />
            {deleteError && <div className="text-error text-sm">{deleteError}</div>}
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setDeleteError(''); setDeletePassword(''); }}>Скасувати</Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={() => {
                  if (!deletePassword) {
                    setDeleteError('Введіть пароль');
                    return;
                  }
                  setDeleteError('');
                  setDeleteStep(1);
                }}
              >
                Далі
              </Button>
            </div>
          </div>
        }
        onClose={() => { setDeleteModalOpen(false); setDeleteError(''); setDeletePassword(''); }}
      />
      <ModalMessage
        isOpen={deleteModalOpen && deleteStep === 1}
        type="error"
        title="Підтвердження видалення"
        hideDefaultButtons={true}
        message={
          <div className="space-y-3">
            <div>Ви точно хочете видалити акаунт? Всі ваші дані буде втрачено безповоротно.</div>
            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setDeleteStep(0); setDeletePassword(''); }}>Скасувати</Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={async () => {
                  try {
                    // Отображаем состояние загрузки на кнопке
                    const btnElement = document.querySelector('.bg-red-500.hover\\:bg-red-600');
                    if (btnElement) {
                      const originalText = btnElement.textContent;
                      btnElement.textContent = 'Видалення...';
                      btnElement.setAttribute('disabled', 'true');
                    }

                    // Вызываем API для удаления аккаунта
                    await userApi.deleteAccount();

                    setTimeout(() => {
                      navigate('/');
                    }, 200);

                    // В случае успеха API метод сам выполнит редирект
                  } catch (error) {
                    console.error('Помилка при видаленні акаунта:', error);

                    // В случае ошибки вручную очищаем локальное хранилище и перенаправляем
                    localStorage.clear();
                    setDeleteModalOpen(false);
                    setTimeout(() => {
                      navigate('/');
                    }, 200);
                  }
                }}
              >
                Видалити назавжди
              </Button>
            </div>
          </div>
        }
        onClose={() => { setDeleteModalOpen(false); setDeleteStep(0); setDeletePassword(''); }}
      />
    </div>
  );
};

export default memo(SettingsPage);