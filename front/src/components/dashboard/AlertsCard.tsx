import React from 'react';
import Card from '../ui/Card';
import AlertItem from '../ui/AlertItem';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import { useAlerts } from '../../services/notificationService';
import { getUserData } from '../../utils/storage';
import { Loader2 } from 'lucide-react';

const AlertsCard: React.FC = () => {
  const [alerts, markAsRead] = useAlerts();

  // Проверяем роль пользователя
  const userRole = getUserData()?.role || '';
  const isNewUser = userRole === 'new_user';

  // Для пользователя new_user показываем заглушку
  if (isNewUser) {
    return (
      <Card
        title="Останні сповіщення"
        className="h-full"
      >
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-lg text-gray-600 text-center font-medium font-roboto">
            Очікування даних з датчиків...
          </p>
        </div>
      </Card>
    );
  }

  // Сортировка оповещений по дате (новые в начале)
  const recentAlerts = [...alerts]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  return (
    <Card
      title="Останні сповіщення"
      className="h-full"
      footer={
        <div className="flex justify-center">
          <Link to="/notifications">
            <Button
              variant="ghost"
              className="text-primary w-full text-center"
              aria-label="Переглянути всі сповіщення"
            >
              Переглянути всі сповіщення
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-2">
        {recentAlerts.length > 0 ? (
          recentAlerts.map((alert, index) => (
            <AlertItem
              key={`dashboard-${alert.id}-${index}`}
              alert={alert}
              onClick={() => markAsRead(alert.id)}
            />
          ))
        ) : (
          <p className="text-gray-500 text-center py-4 font-roboto">
            Немає сповіщень
          </p>
        )}
      </div>
    </Card>
  );
};

export default React.memo(AlertsCard);