import React from 'react';
import { Leaf, AlertTriangle, Loader } from 'lucide-react';
import Card from '../ui/Card';
import ModalMessage from '../ui/ModalMessage';
import { useFertilizerControl } from '../../hooks/useFertilizerControl';

// Импортируем компоненты
import NutrientLevels from './fertilizer/NutrientLevels';
import NutrientChart from './fertilizer/NutrientChart';
import ApplicationHistory from './fertilizer/ApplicationHistory';
import ControlPanel from './fertilizer/ControlPanel';
import SchedulerModal from './fertilizer/SchedulerModal';

const FertilizerControl: React.FC = () => {
  const {
    // Состояния
    isActive,
    autoMode,
    nutrients,
    fieldSize,
    applicationRate,
    isLoading,
    isError,
    errorMessage,
    lastUpdated,
    isInitialized,
    nitrogenHistory,
    scheduledApplications,
    fieldSizeText,
    applicationRateText,
    fertilizerName,
    lastApplication,
    nextScheduled,
    modalMsgOpen,
    modalMsgType,
    modalMsgTitle,
    modalMsgText,
    modalMsgOnConfirm,
    schedulerModalOpen,
    editingSchedule,
    showDatePicker,
    selectedDate,
    modalFertilizerName,
    modalFieldSize,
    modalApplicationRate,
    formattedSelectedDate,
    formattedFullDate,
    calculatedAmount,

    // Методы
    setModalMsgOpen,
    handleToggleSystem,
    handleToggleAutoMode,
    handleApplyNow,
    handleOpenScheduler,
    handleConfirmSchedule,
    handleEditApplication,
    handleDeleteApplication,
    formatDate,
    setFieldSizeText,
    setApplicationRateText,
    setFieldSize,
    setApplicationRate,
    setShowDatePicker,
    setSelectedDate,
    setModalFertilizerName,
    setModalFieldSize,
    setModalApplicationRate,
    setSchedulerModalOpen,
    showModalMsg
  } = useFertilizerControl();

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Leaf size={20} className="text-green-500 mr-2" />
            <span>Система внесення добрив</span>
          </div>
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
      <div className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Левая колонка - панель управления */}
            <div>
              <ControlPanel
                isActive={isActive}
                autoMode={autoMode}
                fieldSize={fieldSize}
                applicationRate={applicationRate}
                fieldSizeText={fieldSizeText}
                applicationRateText={applicationRateText}
                isLoading={isLoading}
                fertilizerName={fertilizerName}
                nextScheduled={nextScheduled}
                lastApplication={lastApplication}
                onToggleSystem={handleToggleSystem}
                onToggleAutoMode={handleToggleAutoMode}
                onFieldSizeTextChange={setFieldSizeText}
                onApplicationRateTextChange={setApplicationRateText}
                onFieldSizeChange={() => {
                  const size = parseFloat(fieldSizeText);
                  if (!isNaN(size) && size > 0) {
                    setFieldSize(size);
                  }
                }}
                onApplicationRateChange={() => {
                  const rate = parseFloat(applicationRateText);
                  if (!isNaN(rate) && rate > 0) {
                    setApplicationRate(rate);
                  }
                }}
                onApplyNow={() => {
                  handleApplyNow();
                }}
                onError={(message) => {
                  showModalMsg('error', message || 'Введіть коректні значення площі та норми внесення');
                }}
              />

              {/* История и план внесения */}
              <ApplicationHistory
                scheduledApplications={scheduledApplications}
                isLoading={isLoading}
                onScheduleNew={() => handleOpenScheduler()}
                onEditApplication={handleEditApplication}
                onDeleteApplication={handleDeleteApplication}
                formatDate={formatDate}
              />
            </div>

            {/* Правая колонка - уровни питательных веществ и график */}
                    <div>
              {/* Уровни питательных веществ */}
              <NutrientLevels nutrients={nutrients} />

              {/* График изменения уровня азота (основной показатель) */}
              <NutrientChart
                nutrientData={nitrogenHistory}
                targetLevel={nutrients[0].target}
                color={nutrients[0].color}
                nutrientName={nutrients[0].name}
              />
            </div>
          </div>
        )}

        {lastUpdated && (
          <div className="text-xs text-gray-500 text-right">
            Останнє оновлення: {new Date(lastUpdated).toLocaleString('uk-UA')}
          </div>
        )}
              </div>

      {/* Модальные окна */}
      <ModalMessage
        open={modalMsgOpen}
        type={modalMsgType}
        title={modalMsgTitle}
        message={modalMsgText}
        onClose={() => setModalMsgOpen(false)}
        onConfirm={modalMsgOnConfirm}
      />

      <SchedulerModal
        open={schedulerModalOpen}
        editingSchedule={editingSchedule}
        selectedDate={selectedDate}
        modalFertilizerName={modalFertilizerName}
        modalFieldSize={modalFieldSize}
        modalApplicationRate={modalApplicationRate}
        calculatedAmount={calculatedAmount}
        formattedSelectedDate={formattedSelectedDate}
        formattedFullDate={formattedFullDate}
        showDatePicker={showDatePicker}
        isLoading={isLoading}
        onClose={() => setSchedulerModalOpen(false)}
        onDateChange={() => { }} // Не используется напрямую, заменено на onSelectDate
        onFertilizerNameChange={setModalFertilizerName}
        onFieldSizeChange={setModalFieldSize}
        onApplicationRateChange={setModalApplicationRate}
        onToggleDatePicker={() => setShowDatePicker(!showDatePicker)}
        onSelectDate={setSelectedDate}
        onConfirm={handleConfirmSchedule}
      />
    </Card>
  );
};

export default FertilizerControl;