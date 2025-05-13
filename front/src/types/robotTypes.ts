export interface RobotStatus {
    id: string;
    name: string;
    type: 'drone' | 'harvester' | 'seeder' | 'maintenance';
    category?: 'air' | 'ground';
    status: 'active' | 'idle' | 'charging' | 'maintenance';
    battery: number;
    location: string;
    currentTask?: string;
    capabilities: string[];
    lastSyncTime?: string;
    lastActive?: string;
    lastMaintenance?: string;
}

export interface ScheduledTask {
    id: number;
    device: string;
    task: string;
    time: string;
    status: 'pending' | 'in-progress' | 'completed' | 'scheduled';
}

export interface RobotsApiData {
    robots: RobotStatus[];
    scheduledTasks: ScheduledTask[];
    lastUpdated: string;
} 