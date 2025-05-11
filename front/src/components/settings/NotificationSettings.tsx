import React, { useState } from 'react';
import Card from '../ui/Card';
import Switch from '../ui/Switch';
import { NOTIF_LABELS_UA, NOTIFICATION_CHANNEL_UA } from '../../utils/translations';

interface NotificationChannelSetting {
    type: string;
    enabled: boolean;
    alertTypes: string[];
}

interface NotificationSettingsProps {
    settings: NotificationChannelSetting[];
    onToggleChannel: (type: string, enabled: boolean) => void;
    onToggleAlertType: (channelType: string, alertType: string, enabled: boolean) => void;
    onSaveSettings: () => void;
    onResetSettings: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
    settings,
    onToggleChannel,
    onToggleAlertType,
    onSaveSettings,
    onResetSettings
}) => {
    const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

    const toggleDetails = (channelType: string) => {
        setShowDetails(prev => ({
            ...prev,
            [channelType]: !prev[channelType]
        }));
    };

    return (
        <Card title="Налаштування сповіщень" className="mb-6">
            <div className="mb-4 flex flex-wrap gap-2">
                <button
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    onClick={onSaveSettings}
                >
                    Зберегти налаштування
                </button>
                <button
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                    onClick={onResetSettings}
                >
                    Скинути до початкових
                </button>
            </div>

            <div className="space-y-4">
                {settings.map(channel => (
                    <div key={channel.type} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4 bg-gray-50">
                            <div className="flex items-center">
                                <Switch
                                    checked={channel.enabled}
                                    onChange={() => onToggleChannel(channel.type, !channel.enabled)}
                                    id={`channel-${channel.type}`}
                                    aria-label={`Увімкнути ${NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}`}
                                />
                                <label
                                    htmlFor={`channel-${channel.type}`}
                                    className="ml-2 font-medium cursor-pointer"
                                >
                                    {NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}
                                </label>
                            </div>
                            <button
                                onClick={() => toggleDetails(channel.type)}
                                className="text-sm text-primary hover:underline"
                            >
                                {showDetails[channel.type] ? 'Згорнути' : 'Налаштувати'}
                            </button>
                        </div>

                        {showDetails[channel.type] && (
                            <div className="p-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600 mb-3">
                                    Виберіть, які типи сповіщень ви хочете отримувати через {NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}:
                                </p>
                                <div className="space-y-2">
                                    {Object.entries(NOTIF_LABELS_UA).map(([alertType, label]) => (
                                        <div key={alertType} className="flex items-center">
                                            <Switch
                                                checked={channel.alertTypes.includes(alertType)}
                                                onChange={() => onToggleAlertType(
                                                    channel.type,
                                                    alertType,
                                                    !channel.alertTypes.includes(alertType)
                                                )}
                                                id={`channel-${channel.type}-${alertType}`}
                                                disabled={!channel.enabled}
                                                aria-label={`Увімкнути ${label}`}
                                            />
                                            <label
                                                htmlFor={`channel-${channel.type}-${alertType}`}
                                                className={`ml-2 cursor-pointer ${!channel.enabled ? 'text-gray-400' : ''}`}
                                            >
                                                {label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {channel.type === 'browser' && (
                                    <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                                        <p>Браузерні сповіщення будуть відображатися навіть коли вкладка не активна.</p>
                                        <button
                                            onClick={() => {
                                                if ('Notification' in window && Notification.permission !== 'granted') {
                                                    Notification.requestPermission();
                                                }
                                            }}
                                            className="mt-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-800"
                                        >
                                            Запросити дозвіл на сповіщення
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {settings.length === 0 && (
                    <div className="p-4 bg-gray-50 text-gray-600 rounded-md text-center">
                        Немає доступних каналів сповіщень
                    </div>
                )}
            </div>
        </Card>
    );
};

export default NotificationSettings; 