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

export interface ZoneMoistureData {
    timestamp: string;
    moisture: number;
}

export interface MoistureHistory {
    zone_id: string;
    data: ZoneMoistureData[];
}

export interface IrrigationScheduleUpdate {
    active: boolean;
    nextWatering: string;
}

export interface IrrigationZone {
    id: string;
    name: string;
    location: string;
    state?: {
        is_active?: boolean;
        is_irrigating?: boolean;
        current_moisture?: number;
        threshold?: number;
    };
} 