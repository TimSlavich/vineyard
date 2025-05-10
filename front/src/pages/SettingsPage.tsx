import React, { useState, useEffect, useMemo, memo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useDeviceSettings } from '../context/DeviceSettingsContext';
import { Bell, Smartphone, Save, RefreshCw } from 'lucide-react';
import ModalMessage from '../components/ui/ModalMessage';
import { devices as initialDevices, thresholds as initialThresholds, notificationSettings as initialNotificationSettings } from '../data/mockData';
import { getUserData } from '../utils/storage';
import { useNavigate } from 'react-router-dom';
import {
  DEVICE_TYPE_UA,
  DEVICE_NAME_UA,
  SENSOR_TYPE_UA,
  NOTIF_LABELS_UA
} from '../utils/translations';

// Компонент для отображения списка устройств
const DevicesTab = memo(({
  allDevices,
  handleUpdateStatus,
  getDeviceStatusClass
}: {
  allDevices: any[],
  handleUpdateStatus: () => void,
  getDeviceStatusClass: (status: string) => string
}) => {
  return (
    <Card title="Пристрої та датчики" className="mb-6">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-gray-300"
          leftIcon={<RefreshCw size={14} />}
          onClick={handleUpdateStatus}
        >
          Оновити статус
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
                  Остання синхронізація
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allDevices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {device.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {device.type}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeviceStatusClass(device.status)}`}>
                      {device.status === 'online' ? 'Онлайн' :
                        device.status === 'offline' ? 'Офлайн' :
                          device.status === 'maintenance' ? 'Обслуговування' :
                            device.status === 'active' ? 'Активний' :
                              device.status === 'idle' ? 'Очікування' :
                                device.status === 'charging' ? 'Заряджається' : device.status
                      }
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
                    {new Date(device.lastSyncTime).toLocaleString('uk-UA')}
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
  handleResetThresholds
}: {
  localThresholds: any[],
  handleThresholdChange: (id: string, field: 'min' | 'max', value: number) => void,
  handleSaveThresholds: () => void,
  handleResetThresholds: () => void
}) => {
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
      </div>

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
                    {SENSOR_TYPE_UA[threshold.sensorType]}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-24 px-3 py-1 border border-gray-300 rounded-md text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={threshold.min}
                      onChange={(e) => handleThresholdChange(threshold.id, 'min', parseFloat(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      className="w-24 px-3 py-1 border border-gray-300 rounded-md text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={threshold.max}
                      onChange={(e) => handleThresholdChange(threshold.id, 'max', parseFloat(e.target.value))}
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
    </Card>
  );
});

// Основной компонент страницы настроек
const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const { devices, setDevices, thresholds, setThresholds, notificationSettings, setNotificationSettings, robots, setRobots } = useDeviceSettings();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsDevice, setDetailsDevice] = useState<any>(null);
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [thresholdResetModalOpen, setThresholdResetModalOpen] = useState(false);
  const [notifSaveModalOpen, setNotifSaveModalOpen] = useState(false);
  const [notifResetModalOpen, setNotifResetModalOpen] = useState(false);
  const userData = getUserData() || { name: '', email: '' };
  const [account, setAccount] = useState({
    name: userData.name || '',
    email: userData.email || '',
    timezone: 'Europe/Kyiv',
  });
  const [accountNameEdit, setAccountNameEdit] = useState(account.name);
  const [accountNameChanged, setAccountNameChanged] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
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

  useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  // Объединяем устройства и роботов для таблицы
  const allDevices = useMemo(() => [
    ...devices.map(d => ({
      id: d.id,
      name: DEVICE_NAME_UA[d.name] || d.name,
      type: DEVICE_TYPE_UA[d.type] || d.type,
      status: d.status,
      battery: d.battery,
      lastSyncTime: d.lastSyncTime,
      location: d.locationId === 'loc1' ? 'Блок A' : 'Блок B',
      isRobot: false,
    })),
    ...robots.map(r => ({
      id: r.id,
      name: DEVICE_NAME_UA[r.name] || r.name,
      type: DEVICE_TYPE_UA[r.type] || r.type,
      status: r.status,
      battery: r.battery,
      lastSyncTime: r.lastSyncTime,
      location: r.location,
      isRobot: true,
    }))
  ], [devices, robots]);

  const handleThresholdChange = (id: string, field: 'min' | 'max', value: number) => {
    setLocalThresholds(prev =>
      prev.map(threshold =>
        threshold.id === id ? { ...threshold, [field]: value } : threshold
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

  // Обновить статус (lastSyncTime)
  const handleUpdateStatus = () => {
    const now = new Date().toISOString();
    setDevices(prev => prev.map(d => ({ ...d, lastSyncTime: now })));
    setRobots(prev => prev.map(r => ({ ...r, lastSyncTime: now })));
  };

  // Сохранить изменения порогов
  const handleSaveThresholds = () => {
    setThresholds(localThresholds);
    setSaveModalOpen(true);
  };

  // Сбросить к стандартным
  const handleResetThresholds = () => {
    setLocalThresholds(initialThresholds);
    setThresholdResetModalOpen(true);
  };

  // Сохранить настройки уведомлений
  const handleSaveNotifications = () => {
    setNotifSaveModalOpen(true);
  };

  // Сбросить настройки уведомлений к стандартным
  const handleResetNotifications = () => {
    setNotificationSettings(initialNotificationSettings);
    setNotifResetModalOpen(true);
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
          className={getTabClass('notifications')}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell className="inline-block w-4 h-4 mr-1 -mt-0.5" />
          Сповіщення
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
          handleUpdateStatus={handleUpdateStatus}
          getDeviceStatusClass={getDeviceStatusClass}
        />
      )}

      {/* Вкладка "Пороговые значения" */}
      {activeTab === 'thresholds' && (
        <ThresholdsTab
          localThresholds={localThresholds}
          handleThresholdChange={handleThresholdChange}
          handleSaveThresholds={handleSaveThresholds}
          handleResetThresholds={handleResetThresholds}
        />
      )}

      {/* Вкладка "Уведомления" */}
      {activeTab === 'notifications' && (
        <Card title="Налаштування сповіщень" className="mb-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save size={14} />}
              onClick={handleSaveNotifications}
            >
              Зберегти зміни
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300"
              onClick={handleResetNotifications}
            >
              Скинути до початкових
            </Button>
          </div>

          <div className="space-y-6">
            {notificationSettings.map((setting) => (
              <div key={setting.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {setting.type === 'email' ? 'Email сповіщення' :
                        setting.type === 'sms' ? 'SMS сповіщення' :
                          'Push сповіщення'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {setting.type === 'email' ? 'Отримувати сповіщення на електронну пошту' :
                        setting.type === 'sms' ? 'Отримувати сповіщення на телефон' :
                          'Отримувати сповіщення в браузері та додатку'}
                    </p>
                  </div>
                  <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                    <input
                      type="checkbox"
                      name={`toggle-${setting.type}`}
                      id={`toggle-${setting.type}`}
                      checked={setting.enabled}
                      onChange={(e) => handleNotificationToggle(setting.type as any, e.target.checked)}
                      className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    />
                    <label
                      htmlFor={`toggle-${setting.type}`}
                      className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${setting.enabled ? 'bg-primary' : 'bg-gray-300'}`}
                    ></label>
                  </div>
                </div>

                {setting.enabled && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Типи сповіщень:</p>
                    {(['info', 'warning', 'critical'] as const).map((alertType) => (
                      <div key={alertType} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`${setting.type}-${alertType}`}
                          checked={setting.alertTypes.includes(alertType)}
                          onChange={(e) => handleAlertTypeToggle(setting.type as any, alertType, e.target.checked)}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`${setting.type}-${alertType}`}
                          className="ml-2 block text-sm text-gray-900"
                        >
                          {NOTIF_LABELS_UA[alertType]}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
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
                  onClick={() => {
                    setAccount(a => ({ ...a, name: accountNameEdit }));
                    setAccountNameChanged(false);
                    setAccountModalOpen(true);
                  }}
                  disabled={!accountNameChanged}
                >
                  Зберегти
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

      <ModalMessage
        isOpen={notifSaveModalOpen}
        onClose={() => setNotifSaveModalOpen(false)}
        title="Налаштування сповіщень збережено"
        type="success"
      >
        Налаштування сповіщень було успішно збережено.
      </ModalMessage>

      <ModalMessage
        isOpen={notifResetModalOpen}
        onClose={() => setNotifResetModalOpen(false)}
        title="Налаштування сповіщень скинуто"
        type="success"
      >
        Налаштування сповіщень було скинуто до початкових значень.
      </ModalMessage>

      {/* Модалка деталей устройства/робота */}
      <ModalMessage
        isOpen={detailsOpen}
        type="info"
        title={detailsDevice?.name || 'Деталі'}
        message={detailsDevice && (
          <div className="space-y-2 text-left">
            <div><b>Тип:</b> {detailsDevice.type}</div>
            <div><b>Статус:</b> {detailsDevice.status === 'online' ? 'онлайн' : detailsDevice.status === 'offline' ? 'офлайн' : detailsDevice.status === 'maintenance' ? 'обслуговування' : detailsDevice.status === 'active' ? 'активний' : detailsDevice.status === 'idle' ? 'очікує' : detailsDevice.status === 'charging' ? 'заряджається' : detailsDevice.status}</div>
            <div><b>Батарея:</b> {detailsDevice.battery}%</div>
            <div><b>Локація:</b> {detailsDevice.location}</div>
            <div><b>Остання синхронізація:</b> {detailsDevice.lastSyncTime ? new Date(detailsDevice.lastSyncTime).toLocaleString('uk-UA') : '-'}</div>
            {detailsDevice.isRobot && detailsDevice.capabilities && (
              <div><b>Можливості:</b> {detailsDevice.capabilities.join(', ')}</div>
            )}
          </div>
        )}
        onClose={() => setDetailsOpen(false)}
      />
      <ModalMessage
        isOpen={accountModalOpen}
        type="success"
        title="Зміни акаунта збережено"
        message="Всі зміни профілю успішно збережено."
        onClose={() => setAccountModalOpen(false)}
      />
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
            <div className="flex gap-3 justify-end pt-2">
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
        message={
          <div className="space-y-3">
            <div>Ви точно хочете видалити акаунт? Всі ваші дані буде втрачено безповоротно.</div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => { setDeleteModalOpen(false); setDeleteStep(0); setDeletePassword(''); }}>Скасувати</Button>
              <Button
                variant="primary"
                className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={() => {
                  // Удаляем всё из localStorage, делаем редирект
                  localStorage.clear();
                  setDeleteModalOpen(false);
                  setTimeout(() => {
                    navigate('/');
                  }, 200);
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