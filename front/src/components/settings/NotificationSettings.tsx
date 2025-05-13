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
                                    checked={false}
                                    onChange={() => { }}
                                    id={`channel-${channel.type}`}
                                    disabled={true}
                                    aria-label={`Увімкнути ${NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}`}
                                />
                                <div className="ml-2 flex items-center">
                                    <label
                                        htmlFor={`channel-${channel.type}`}
                                        className="font-medium text-gray-500 cursor-not-allowed"
                                    >
                                        {NOTIFICATION_CHANNEL_UA[channel.type] || channel.type}
                                    </label>
                                    <span className="ml-2 text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                                        В розробці
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {settings.length === 0 && (
                    <div className="p-4 bg-gray-50 text-gray-600 rounded-md text-center">
                        Немає доступних каналів сповіщень
                    </div>
                )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">
                    Функціональність усіх сповіщень знаходиться в розробці. Сповіщення будуть доступні у наступних оновленнях системи.
                </p>
            </div>
        </Card>
    );
};

export default NotificationSettings; 