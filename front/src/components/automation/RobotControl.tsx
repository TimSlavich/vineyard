import React, { useContext, useRef, useEffect } from 'react';
import { Battery, MapPin, PowerOff, AlertTriangle, Loader, X } from 'lucide-react';
import Card from '../ui/Card';
import * as Tabs from '@radix-ui/react-tabs';
import RobotDetailsModal from '../ui/RobotDetailsModal';
import ModalMessage from '../ui/ModalMessage';
import { useRobotControl } from '../../hooks/useRobotControl';
import { DeviceSettingsContext } from '../../context/DeviceSettingsContext';

// Импортируем компоненты
import RobotStatusCard from './robot/RobotStatusCard';
import TaskScheduleList from './robot/TaskScheduleList';
import GroupActions from './robot/GroupActions';
import TaskSchedulerModal from './robot/TaskSchedulerModal';
import NavigationModal from './robot/NavigationModal';

interface RobotControlProps {
  status?: 'idle' | 'active' | 'error' | 'maintenance';
  onStatusChange?: (status: 'idle' | 'active' | 'error' | 'maintenance') => void;
}

// Безопасная обертка для проверки наличия контекста
const RobotControlWithProvider: React.FC<RobotControlProps> = (props) => {
  // Проверяем, доступен ли контекст
  const context = useContext(DeviceSettingsContext);

  if (!context) {
    // Если контекст недоступен, показываем сообщение об ошибке
    return (
      <Card
        title="Керування роботами та дронами"
        className="h-full"
      >
        <div className="flex items-center justify-center py-8 text-red-500">
          <AlertTriangle className="mr-2" size={18} />
          <span>Помилка ініціалізації. Оновіть сторінку.</span>
        </div>
      </Card>
    );
  }

  // Если контекст доступен, рендерим основной компонент
  return <RobotControl {...props} />;
};

const RobotControl: React.FC<RobotControlProps> = ({
  status: externalStatus,
  onStatusChange = () => { }
}) => {
  const {
    // Состояния
    selectedTab,
    isLoading,
    isError,
    errorMessage,
    lastUpdated,
    isInitialized,
    detailsModalOpen,
    detailsRobot,
    actionModalOpen,
    actionModalType,
    actionModalTitle,
    actionModalText,
    actionModalPhotos,
    actionProgress,
    navigationModalOpen,
    navigationRobot,
    navigationStep,
    navigationTarget,
    navigationPoints,
    taskSchedulerOpen,
    taskSchedulerRobot,
    taskSchedulerCapability,
    taskSchedulerTime,
    editingTask,
    scheduledTasks,
    deviceRobots,
    selectedRobot,
    showControls,

    // Методы
    setSelectedTab,
    setDetailsModalOpen,
    setActionModalOpen,
    setNavigationModalOpen,
    setTaskSchedulerOpen,
    setTaskSchedulerRobot,
    setTaskSchedulerCapability,
    setTaskSchedulerTime,
    toggleRobotControls,
    handleRobotQuickAction,
    openEditTaskScheduler,
    addScheduledTask,
    handleSystemCheck,
    handleChargeAll,
    handleLocateAll,
    handleEmergencyStop,
    openTaskScheduler,
    showRobotDetails,
    navigateRobot,
    selectNavigationTarget,
    getFilteredRobots,
    sendRobotCommand,
    handleNavigationComplete
  } = useRobotControl();

  // Добавляем ref для отслеживания предыдущего статуса
  const prevStatusRef = useRef(externalStatus);

  // Добавляем ref для таймера debounce
  const statusUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Обрабатываем внешнее состояние, если оно передано
  useEffect(() => {
    // Уйдем, если нет внешнего статуса или нет роботов
    if (!externalStatus || deviceRobots.length === 0) {
      return;
    }

    // Проверяем, нужно ли фактически менять статусы роботов
    const needStatusUpdate = deviceRobots.some(robot =>
      robot.status !== externalStatus &&
      robot.status !== 'maintenance' &&
      robot.id !== 'seeder-1'
    );

    // Обновляем статус только если действительно нужно
    if (needStatusUpdate) {
      // Чтобы избежать зацикливания, используем ref для отслеживания обработки
      const command = externalStatus === 'active' ? 'start' : 'stop';

      // Обновляем статус всех роботов в соответствии с внешним статусом
      deviceRobots.forEach(robot => {
        if (robot.status !== externalStatus && robot.status !== 'maintenance' && robot.id !== 'seeder-1') {
          // Напрямую устанавливаем статус без вызова sendRobotCommand
          if (externalStatus === 'active' && robot.status !== 'active') {
            sendRobotCommand(robot.id, 'start');
          } else if (externalStatus !== 'active' && robot.status === 'active') {
            sendRobotCommand(robot.id, 'stop');
          }
        }
      });
    }
  }, [externalStatus, deviceRobots]);

  // Добавляем обработчик события robot-state-change
  useEffect(() => {
    const handleRobotStateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const { active, excludeRobots } = customEvent.detail;

        // Определяем целевой статус
        const targetStatus = active ? 'active' : 'idle';

        // Обновляем статус всех роботов, кроме исключенных и находящихся в обслуживании
        deviceRobots.forEach(robot => {
          // Проверяем, не входит ли робот в список исключений
          const isExcluded = excludeRobots && excludeRobots.includes(robot.id);

          // Не меняем статус роботов в режиме обслуживания и исключенных роботов
          if (robot.status !== 'maintenance' && !isExcluded && robot.status !== targetStatus) {
            // Отправляем команду роботу напрямую, без взаимодействия с сервером
            sendRobotCommand(robot.id, active ? 'start' : 'stop');
          }
        });
      }
    };

    // Добавляем слушатель события
    window.addEventListener('robot-state-change', handleRobotStateChange);

    // Удаляем слушатель при размонтировании
    return () => {
      window.removeEventListener('robot-state-change', handleRobotStateChange);
    };
  }, [deviceRobots, sendRobotCommand]);

  // Отслеживаем изменения статуса всех роботов с debounce для предотвращения моргания
  useEffect(() => {
    // Предотвращаем циклические обновления - проверяем изменился ли статус роботов
    if (deviceRobots.length > 0) {
      // Если хотя бы один робот активен, считаем статус 'active'
      const isAnyActive = deviceRobots.some(robot => robot.status === 'active');
      const isAnyMaintenance = deviceRobots.some(robot => robot.status === 'maintenance');

      let newStatus: 'idle' | 'active' | 'error' | 'maintenance' = 'idle';

      if (isAnyActive) {
        newStatus = 'active';
      } else if (isAnyMaintenance) {
        newStatus = 'maintenance';
      }

      // Предотвращаем циклические обновления, проверяя изменился ли статус
      if (newStatus !== externalStatus && newStatus !== prevStatusRef.current) {
        // Сохраняем новый статус в ref
        prevStatusRef.current = newStatus;

        // Очищаем предыдущий таймер, если он существует
        if (statusUpdateTimerRef.current) {
          clearTimeout(statusUpdateTimerRef.current);
        }

        // Вызываем onStatusChange только если он существует
        if (typeof onStatusChange === 'function') {
          // Устанавливаем debounce для вызова onStatusChange
          statusUpdateTimerRef.current = setTimeout(() => {
            onStatusChange(newStatus);
          }, 300); // Задержка в 300 мс для предотвращения частых обновлений
        }
      }
    }

    // Очищаем таймер при размонтировании
    return () => {
      if (statusUpdateTimerRef.current) {
        clearTimeout(statusUpdateTimerRef.current);
      }
    };
  }, [deviceRobots, externalStatus]);

  const filteredRobots = getFilteredRobots();

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>Керування роботами та дронами</span>
          {isLoading && (
            <div className="flex items-center text-primary text-sm">
              <Loader size={12} className="animate-spin mr-1" />
              <span className="text-xs">Оновлення...</span>
            </div>
          )}
        </div>
      }
      className="h-full"
    >
      <div className="space-y-6">
        {isError && (
          <div className="p-2 bg-red-50 rounded-component text-center text-sm text-error flex items-center justify-center">
            <AlertTriangle size={14} className="mr-1" />
            {errorMessage || 'Сталася помилка'}
          </div>
        )}

        {!isInitialized ? (
          <div className="py-16 flex justify-center items-center">
            <Loader size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Tabs */}
            <Tabs.Root
              value={selectedTab}
              onValueChange={setSelectedTab}
              className="w-full"
            >
              <Tabs.List className="flex mb-4 border-b border-gray-200">
                <Tabs.Trigger
                  value="all"
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === 'all'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Всі роботи
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="air"
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === 'air'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Дрони
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="ground"
                  className={`px-4 py-2 text-sm font-medium ${selectedTab === 'ground'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Наземні роботи
                </Tabs.Trigger>
              </Tabs.List>

              {/* Robots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRobots.map((robot) => (
                  <RobotStatusCard
                    key={robot.id}
                    robot={robot}
                    isSelected={selectedRobot === robot.id}
                    showControls={showControls}
                    isLoading={isLoading}
                    onToggleControls={toggleRobotControls}
                    onPowerToggle={(robotId) => robot.status === 'active'
                      ? sendRobotCommand(robotId, 'stop')
                      : sendRobotCommand(robotId, 'start')
                    }
                    onShowDetails={showRobotDetails}
                    onNavigate={navigateRobot}
                    onQuickAction={handleRobotQuickAction}
                  />
                ))}
              </div>
            </Tabs.Root>

            {/* Task Schedule List */}
            <TaskScheduleList
              tasks={scheduledTasks}
              isLoading={isLoading}
              onScheduleTask={() => openTaskScheduler(null)}
              onEditTask={openEditTaskScheduler}
            />

            {/* Group Actions */}
            <GroupActions
              isLoading={isLoading}
              onSystemCheck={handleSystemCheck}
              onChargeAll={handleChargeAll}
              onLocateAll={handleLocateAll}
              onEmergencyStop={handleEmergencyStop}
            />
          </>
        )}

        {lastUpdated && (
          <div className="text-xs text-gray-500 text-right">
            Останнє оновлення: {new Date(lastUpdated).toLocaleString('uk-UA')}
          </div>
        )}
      </div>

      {/* Модальные окна */}
      <RobotDetailsModal
        open={detailsModalOpen}
        robot={detailsRobot ? {
          id: detailsRobot.id,
          name: detailsRobot.name,
          type: detailsRobot.type,
          category: detailsRobot.category || 'ground',
          status: detailsRobot.status,
          battery: detailsRobot.battery,
          location: detailsRobot.location,
          currentTask: detailsRobot.currentTask,
          capabilities: detailsRobot.capabilities
        } : null}
        onClose={() => setDetailsModalOpen(false)}
      />

      <ModalMessage
        open={actionModalOpen && !actionModalPhotos}
        type={actionModalType}
        title={actionModalTitle}
        message={actionModalText}
        onClose={() => { setActionModalOpen(false); }}
      >
        {actionProgress !== null && (
          <div className="w-full mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-primary transition-all duration-100"
                style={{ width: `${actionProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">{Math.round(actionProgress)}%</div>
          </div>
        )}
      </ModalMessage>

      {actionModalOpen && actionModalPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              onClick={() => setActionModalOpen(false)}
            >
              <X size={22} />
            </button>
            <h3 className="text-lg font-bold mb-4 text-gray-800">{actionModalTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actionModalPhotos.map((url, i) => (
                <img key={i} src={url} alt="Фото з дрона" className="rounded-lg w-full h-32 object-cover" />
              ))}
            </div>
          </div>
        </div>
      )}

      <NavigationModal
        open={navigationModalOpen}
        robot={navigationRobot}
        step={navigationStep}
        target={navigationTarget}
        navigationPoints={navigationPoints}
        onClose={handleNavigationComplete}
        onSelectTarget={selectNavigationTarget}
      />

      <TaskSchedulerModal
        open={taskSchedulerOpen}
        robot={taskSchedulerRobot}
        robots={deviceRobots}
        capability={taskSchedulerCapability}
        time={taskSchedulerTime}
        editingTask={editingTask}
        onClose={() => { setTaskSchedulerOpen(false); }}
        onRobotChange={(robotId) => {
          const r = deviceRobots.find(r => r.id === robotId) || null;
          setTaskSchedulerRobot(r);
          setTaskSchedulerCapability('');
        }}
        onCapabilityChange={setTaskSchedulerCapability}
        onTimeChange={setTaskSchedulerTime}
        onConfirm={addScheduledTask}
      />
    </Card>
  );
};

export default RobotControlWithProvider;