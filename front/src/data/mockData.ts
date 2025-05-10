import { SensorData, Alert, Device, WeatherData, User, Threshold, NotificationSetting } from '../types';

// Current user
export const currentUser: User = {
  id: '1',
  name: 'Emma Thompson',
  email: 'emma@vineguard.com',
  role: 'admin',
  avatar: 'https://i.pravatar.cc/150?img=1',
};

// Generate sensor readings for the past 24 hours
const generateSensorReadings = (type: string, minValue: number, maxValue: number, unit: string, locationId: string, locationName: string): SensorData[] => {
  const now = new Date();
  const readings: SensorData[] = [];

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now);
    timestamp.setHours(now.getHours() - i);

    // Generate a value with some randomness but following a pattern
    const hourFactor = Math.sin((timestamp.getHours() / 24) * Math.PI * 2);
    const value = minValue + (maxValue - minValue) * (0.5 + 0.4 * hourFactor + 0.1 * Math.random());

    // Determine status based on thresholds
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (type === 'temperature') {
      if (value > 32 || value < 10) status = 'critical';
      else if (value > 30 || value < 15) status = 'warning';
    } else if (type === 'humidity') {
      if (value < 30 || value > 80) status = 'critical';
      else if (value < 40 || value > 70) status = 'warning';
    } else if (type === 'soil_moisture') {
      if (value < 20) status = 'critical';
      else if (value < 30) status = 'warning';
    }

    readings.push({
      id: `${type}-${i}`,
      type: type as any,
      value: Number(value.toFixed(1)),
      unit,
      timestamp: timestamp.toISOString(),
      location: {
        id: locationId,
        name: locationName,
        coordinates: {
          lat: 38.5 + Math.random() * 0.1,
          lng: -122.8 + Math.random() * 0.1,
        },
      },
      status,
    });
  }

  return readings;
};

// Generate all sensor data
export const sensorData: SensorData[] = [
  ...generateSensorReadings('temperature', 15, 35, '°C', 'loc1', 'Block A'),
  ...generateSensorReadings('humidity', 30, 80, '%', 'loc1', 'Block A'),
  ...generateSensorReadings('soil_moisture', 20, 60, '%', 'loc1', 'Block A'),
  ...generateSensorReadings('light', 0, 1000, 'lux', 'loc1', 'Block A'),
  ...generateSensorReadings('wind', 0, 25, 'km/h', 'loc1', 'Block A'),

  ...generateSensorReadings('temperature', 15, 35, '°C', 'loc2', 'Block B'),
  ...generateSensorReadings('humidity', 30, 80, '%', 'loc2', 'Block B'),
  ...generateSensorReadings('soil_moisture', 20, 60, '%', 'loc2', 'Block B'),
  ...generateSensorReadings('light', 0, 1000, 'lux', 'loc2', 'Block B'),
  ...generateSensorReadings('wind', 0, 25, 'km/h', 'loc2', 'Block B'),
];

// Get latest readings for each sensor type and location
export const getLatestReadings = (): SensorData[] => {
  const latestByTypeAndLocation: Record<string, SensorData> = {};

  sensorData.forEach(reading => {
    const key = `${reading.type}_${reading.location.id}`;
    if (!latestByTypeAndLocation[key] || new Date(reading.timestamp) > new Date(latestByTypeAndLocation[key].timestamp)) {
      latestByTypeAndLocation[key] = reading;
    }
  });

  return Object.values(latestByTypeAndLocation);
};

// Weather data
export const weatherData: WeatherData = {
  current: {
    temperature: 26,
    humidity: 45,
    windSpeed: 12,
    windDirection: 'NW',
    condition: 'Sunny',
    icon: 'sun',
  },
  forecast: [
    {
      day: 'Mon',
      temperature: { min: 18, max: 26 },
      condition: 'Sunny',
      icon: 'sun',
      precipitation: 0
    },
    {
      day: 'Tue',
      temperature: { min: 17, max: 28 },
      condition: 'Partly Cloudy',
      icon: 'cloud-sun',
      precipitation: 0
    },
    {
      day: 'Wed',
      temperature: { min: 19, max: 29 },
      condition: 'Cloudy',
      icon: 'cloud',
      precipitation: 20
    },
    {
      day: 'Thu',
      temperature: { min: 16, max: 24 },
      condition: 'Rain',
      icon: 'cloud-rain',
      precipitation: 70
    },
    {
      day: 'Fri',
      temperature: { min: 15, max: 23 },
      condition: 'Scattered Showers',
      icon: 'cloud-drizzle',
      precipitation: 40
    },
  ],
};

// Alerts
export const alerts: Alert[] = [
  {
    id: '1',
    title: 'Критична температура',
    message: 'Температура на ділянці "Північний схил" перевищила 32°C більше ніж на 2 години',
    type: 'critical',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    read: false,
    sensorId: 'temperature-0',
    locationId: 'loc1',
  },
  {
    id: '2',
    title: 'Низька вологість ґрунту',
    message: 'Вологість ґрунту на ділянці "Південний схил" нижче оптимального рівня',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: true,
    sensorId: 'soil_moisture-5',
    locationId: 'loc2',
  },
  {
    id: '3',
    title: 'Оновлення системи',
    message: 'Система VineGuard була оновлена до версії 2.4.1',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    read: true,
  },
  {
    id: '4',
    title: 'Датчик відключений',
    message: 'Датчик №247 на ділянці "Північний схил" не в мережі',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    read: true,
    locationId: 'loc1',
  },
  {
    id: '5',
    title: 'Низький заряд батареї',
    message: 'Рівень заряду батареї пристрою №103 нижче 15%',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(), // 16 hours ago
    read: true,
  },
];

// Devices
export const devices: Device[] = [
  {
    id: 'dev1',
    name: 'Soil Sensor #103',
    type: 'Soil Moisture',
    status: 'online',
    battery: 12,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    locationId: 'loc1',
  },
  {
    id: 'dev2',
    name: 'Weather Station #247',
    type: 'Multi-sensor',
    status: 'offline',
    battery: 80,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    locationId: 'loc1',
  },
  {
    id: 'dev3',
    name: 'Leaf Wetness #78',
    type: 'Leaf Wetness',
    status: 'online',
    battery: 65,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    locationId: 'loc1',
  },
  {
    id: 'dev4',
    name: 'Soil Sensor #104',
    type: 'Soil Moisture',
    status: 'online',
    battery: 92,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
    locationId: 'loc2',
  },
  {
    id: 'dev5',
    name: 'Temperature #355',
    type: 'Temperature',
    status: 'maintenance',
    battery: 45,
    lastSyncTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    locationId: 'loc2',
  },
];

// Thresholds
export const thresholds: Threshold[] = [
  { id: '1', sensorType: 'temperature', min: 15, max: 30, unit: '°C' },
  { id: '2', sensorType: 'humidity', min: 40, max: 70, unit: '%' },
  { id: '3', sensorType: 'soil_moisture', min: 30, max: 60, unit: '%' },
  { id: '4', sensorType: 'light', min: 100, max: 800, unit: 'lux' },
  { id: '5', sensorType: 'wind', min: 0, max: 20, unit: 'km/h' },
];

// Notification settings
export const notificationSettings: NotificationSetting[] = [
  { type: 'email', enabled: true, alertTypes: ['warning', 'critical'] },
  { type: 'sms', enabled: true, alertTypes: ['critical'] },
  { type: 'push', enabled: true, alertTypes: ['info', 'warning', 'critical'] },
];