export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  avatar?: string;
}

export interface SensorData {
  id: string;
  type: 'temperature' | 'humidity' | 'soil_moisture' | 'light' | 'wind';
  value: number;
  unit: string;
  timestamp: string;
  location: {
    id: string;
    name: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  status: 'normal' | 'warning' | 'critical';
}

export interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    condition: string;
    icon: string;
  };
  forecast: Array<{
    day: string;
    temperature: {
      min: number;
      max: number;
    };
    condition: string;
    icon: string;
    precipitation: number;
  }>;
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
  sensorId?: string;
  locationId?: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'maintenance';
  battery: number;
  lastSyncTime: string;
  locationId: string;
}

export interface Threshold {
  id: string;
  sensorType: string;
  min: number;
  max: number;
  unit: string;
}

export interface NotificationSetting {
  type: 'email' | 'sms' | 'push';
  enabled: boolean;
  alertTypes: ('info' | 'warning' | 'critical')[];
}

export interface RobotStatus {
  id: string;
  name: string;
  type: 'drone' | 'harvester' | 'seeder' | 'maintenance';
  category: 'air' | 'ground';
  status: 'active' | 'idle' | 'charging' | 'maintenance';
  battery: number;
  location: string;
  currentTask?: string;
  capabilities: string[];
  lastSyncTime: string;
}