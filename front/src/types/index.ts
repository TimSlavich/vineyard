export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  role?: 'admin' | 'new_user' | 'demo';
  is_admin?: boolean;
  sensor_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SensorData {
  id: string;
  type: 'temperature' | 'humidity' | 'soil_moisture' | 'soil_temperature' | 'light' | 'ph' | 'wind_speed' | 'wind_direction' | 'rainfall' | 'co2' | string;
  value: number;
  unit: string;
  timestamp: string;
  location: {
    id: string;
    name: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  status: 'normal' | 'warning' | 'critical' | string;
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
  lastSyncTime?: string;
  lastActive?: string;
  lastMaintenance?: string;
}

export interface SensorAlert {
  id: number;
  sensor_id: string;
  sensor_type: string;
  alert_type: 'high' | 'low' | 'normal' | 'system';
  value: number;
  threshold_value: number;
  unit: string;
  location_id: string;
  device_id?: string;
  message: string;
  timestamp: string;
  is_active: boolean;
  resolved_at?: string;
  user_id?: number;
}