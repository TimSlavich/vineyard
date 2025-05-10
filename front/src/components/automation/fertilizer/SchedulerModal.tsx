import React from 'react';
import { Calendar, X, Calculator, Check } from 'lucide-react';
import { ScheduledApplication } from '../../../types/fertilizerTypes';
import Button from '../../ui/Button';

interface SchedulerModalProps {
    open: boolean;
    editingSchedule: ScheduledApplication | null;
    selectedDate: Date | null;
    modalFertilizerName: string;
    modalFieldSize: string;
    modalApplicationRate: string;
    calculatedAmount: string;
    formattedSelectedDate: string;
    formattedFullDate: string;
    showDatePicker: boolean;
    isLoading: boolean;

    onClose: () => void;
    onDateChange: (date: string) => void;
    onFertilizerNameChange: (name: string) => void;
    onFieldSizeChange: (size: string) => void;
    onApplicationRateChange: (rate: string) => void;
    onToggleDatePicker: () => void;
    onSelectDate: (date: Date) => void;
    onConfirm: () => void;
}

const SchedulerModal: React.FC<SchedulerModalProps> = ({
    open,
    editingSchedule,
    selectedDate,
    modalFertilizerName,
    modalFieldSize,
    modalApplicationRate,
    calculatedAmount,
    formattedSelectedDate,
    formattedFullDate,
    showDatePicker,
    isLoading,

    onClose,
    onDateChange,
    onFertilizerNameChange,
    onFieldSizeChange,
    onApplicationRateChange,
    onToggleDatePicker,
    onSelectDate,
    onConfirm
}) => {
    if (!open) return null;

    // Генерация календарной сетки
    const generateCalendarGrid = () => {
        if (!selectedDate) return null;

        const currentMonth = selectedDate.getMonth();
        const currentYear = selectedDate.getFullYear();

        // Получение первого дня месяца
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const startingDay = firstDayOfMonth.getDay() || 7; // 0 - воскресенье, 7 - для понедельника

        // Получение последнего дня месяца
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        const totalDays = lastDayOfMonth.getDate();

        // Текущая дата для сравнения
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Создание дней календаря
        const days = [];

        // Добавление пустых ячеек для первой недели
        for (let i = 1; i < startingDay; i++) {
            days.push(<div key={`empty-${i}`} className="p-2 h-9 flex justify-center items-center"></div>);
        }

        // Добавление дней месяца
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isToday = date.getTime() === today.getTime();
            const isSelectedDay = selectedDate && date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();
            const isPast = date < today;

            days.push(
                <div
                    key={`day-${day}`}
                    className={`p-1 h-9 flex justify-center items-center cursor-pointer rounded-full mx-0.5 
            ${isSelectedDay ? 'bg-primary text-white' : ''} 
            ${isToday && !isSelectedDay ? 'border border-primary text-primary' : ''} 
            ${isPast && !isToday && !isSelectedDay ? 'text-gray-400' : 'hover:bg-gray-100'}`}
                    onClick={() => onSelectDate(date)}
                >
                    {day}
                </div>
            );
        }

        return days;
    };

    const calendarDays = generateCalendarGrid();
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative animate-fade-in">
                <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                >
                    <X size={22} />
                </button>

                <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
                    {editingSchedule ? 'Редагування внесення' : 'Планування внесення'}
                </h3>

                <div className="space-y-4">
                    {/* Выбор даты */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Дата внесення</label>
                        <div
                            className="flex items-center justify-between p-3 border rounded cursor-pointer hover:border-primary"
                            onClick={onToggleDatePicker}
                        >
                            <div className="flex items-center">
                                <Calendar size={18} className="text-gray-400 mr-2" />
                                <span>{formattedSelectedDate}</span>
                            </div>
                            <span className="text-xs text-gray-500">{formattedFullDate}</span>
                        </div>

                        {/* Календарь */}
                        {showDatePicker && selectedDate && (
                            <div className="mt-2 p-3 border rounded-lg shadow-lg bg-white">
                                <div className="flex justify-between items-center mb-3">
                                    <button
                                        className="p-1 hover:bg-gray-100 rounded"
                                        onClick={() => {
                                            const newDate = new Date(selectedDate);
                                            newDate.setMonth(newDate.getMonth() - 1);
                                            onSelectDate(newDate);
                                        }}
                                    >
                                        &lt;
                                    </button>
                                    <div className="font-medium">
                                        {selectedDate.toLocaleString('uk-UA', { month: 'long', year: 'numeric' })}
                                    </div>
                                    <button
                                        className="p-1 hover:bg-gray-100 rounded"
                                        onClick={() => {
                                            const newDate = new Date(selectedDate);
                                            newDate.setMonth(newDate.getMonth() + 1);
                                            onSelectDate(newDate);
                                        }}
                                    >
                                        &gt;
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {daysOfWeek.map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-gray-600 mb-1">
                                            {day}
                                        </div>
                                    ))}
                                    {calendarDays}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Тип удобрения */}
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">Тип добрива</label>
                        <select
                            className="w-full p-3 rounded border border-gray-300 focus:border-primary"
                            value={modalFertilizerName}
                            onChange={(e) => onFertilizerNameChange(e.target.value)}
                        >
                            <option value="">Оберіть тип...</option>
                            <option value="NPK Суміш 20-10-10">NPK Суміш 20-10-10</option>
                            <option value="Азотне добриво">Азотне добриво</option>
                            <option value="Фосфорне добриво">Фосфорне добриво</option>
                            <option value="Калійне добриво">Калійне добриво</option>
                            <option value="Комплексне добриво">Комплексне добриво</option>
                        </select>
                    </div>

                    {/* Калькулятор */}
                    <div className="bg-gray-50 p-3 rounded-component">
                        <div className="flex items-center mb-3">
                            <Calculator size={18} className="text-primary mr-2" />
                            <span className="text-sm font-medium">Розрахунок кількості</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Площа поля (га)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 rounded border border-gray-300 focus:border-primary"
                                    value={modalFieldSize}
                                    onChange={(e) => {
                                        // Проверка и очистка значения
                                        const value = e.target.value;
                                        if (value === '' || parseFloat(value) > 0) {
                                            onFieldSizeChange(value);
                                        }
                                    }}
                                    min="0.1"
                                    step="0.1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Норма внесення (кг/га)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 rounded border border-gray-300 focus:border-primary"
                                    value={modalApplicationRate}
                                    onChange={(e) => {
                                        // Проверка и очистка значения
                                        const value = e.target.value;
                                        if (value === '' || parseFloat(value) > 0) {
                                            onApplicationRateChange(value);
                                        }
                                    }}
                                    min="1"
                                />
                            </div>

                            <div className="bg-white p-2 rounded border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium">Всього потрібно:</span>
                                    <span className="text-lg font-bold text-primary">{calculatedAmount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button
                        className="flex-1 border-gray-300"
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Скасувати
                    </Button>
                    <Button
                        className="flex-1"
                        variant="filled"
                        icon={<Check size={18} />}
                        onClick={onConfirm}
                        disabled={!modalFertilizerName || !selectedDate || isLoading}
                    >
                        {editingSchedule ? 'Оновити' : 'Запланувати'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SchedulerModal; 