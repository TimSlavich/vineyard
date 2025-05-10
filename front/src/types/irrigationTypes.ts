// Интерфейс для данных от API
export interface IrrigationApiData {
    isActive: boolean;
    currentMoisture: number;
    threshold: number;
    isIrrigating: boolean;
    schedule: IrrigationSchedule;
    lastUpdated: string;
}

export interface IrrigationSchedule {
    enabled: boolean;
    startTime: string;
    duration: number;
    days: string[];
}

export interface ChartDataPoint {
    value: number;
    timestamp: string;
} 