import React from 'react';
import Card from '../ui/Card';
import AlertItem from '../ui/AlertItem';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import { useAlerts } from '../../services/notificationService';

const AlertsCard: React.FC = () => {
  const [alerts, markAsRead] = useAlerts();

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