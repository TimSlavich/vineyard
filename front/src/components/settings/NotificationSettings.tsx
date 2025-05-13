import React from 'react';
import Card from '../ui/Card';
import Switch from '../ui/Switch';
import { NOTIFICATION_CHANNEL_UA } from '../../utils/translations';

interface NotificationChannelSetting {
    type: string;
    enabled: boolean;
    alertTypes: string[];
}

interface NotificationSettingsProps {
    settings: NotificationChannelSetting[];
    onToggleChannel: (channelType: string, enabled: boolean) => void;
    onSaveSettings: () => void;
    onResetSettings: () => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
    settings,
    onToggleChannel,
    onSaveSettings,
    onResetSettings
}) => {
    // Запрос разрешения на браузерные уведомления
    const requestNotificationPermission = () => {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
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
                {settings.map(channel => {
                    const isBrowserChannel = channel.type === 'browser';

                    return (
                        <div key={channel.type} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-gray-50">
                                <div className="flex items-center">
                                    <Switch
                                        checked={isBrowserChannel ? channel.enabled : false}
                                        onChange={() => {
                                            if (isBrowserChannel) {
                                                // Если включаем уведомления, запрашиваем разрешение
                                                if (!channel.enabled) {
                                                    requestNotificationPermission();
                                                }
                                                onToggleChannel(channel.type, !channel.enabled);
                                            }
                                        }}
                                        id={`channel-${channel.type}`}
                                        disabled={!isBrowserChannel}
                                        aria-label={`Увімкнути ${NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}`}
                                    />
                                    <div className="ml-2 flex items-center">
                                        <label
                                            htmlFor={`channel-${channel.type}`}
                                            className={`font-medium ${isBrowserChannel ? 'text-gray-800 cursor-pointer' : 'text-gray-500 cursor-not-allowed'}`}
                                        >
                                            {NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}
                                        </label>
                                        {!isBrowserChannel && (
                                            <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                                В розробці
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {settings.length === 0 && (
                    <div className="p-4 bg-gray-50 text-gray-600 rounded-md text-center">
                        Немає доступних каналів сповіщень
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                    Функціональність email та SMS сповіщень знаходиться в розробці. Наразі працюють тільки браузерні сповіщення.
                </p>
            </div>
        </Card>
    );
};

export default NotificationSettings; 