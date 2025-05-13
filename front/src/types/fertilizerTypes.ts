export interface NutrientLevel {
    name: string;
    current: number;
    target: number;
    unit: string;
    color: string;
}

export interface FertilizerApiData {
    isActive: boolean;
    autoMode: boolean;
    lastApplication: string;
    nextScheduled: string;
    nutrients: NutrientLevel[];
    lastUpdated: string;
    fertilizerName?: string;
}

export interface ScheduledApplication {
    id: number;
    date: string;
    type: string;
    status: 'заплановано' | 'виконано' | 'скасовано';
    amount?: string;
}

export interface ChartDataPoint {
    value: number;
    timestamp: string;
} 