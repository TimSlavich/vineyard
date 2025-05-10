import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ArrowRight, Leaf, BarChart3, Bell } from 'lucide-react';
import { useEffect } from 'react';

const HomePage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('https://images.pexels.com/photos/1277181/pexels-photo-1277181.jpeg?auto=compress&cs=tinysrgb&w=1920')",
          }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        </div>

        <div className="relative container mx-auto px-6 z-10">
          <div className="max-w-2xl text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight font-inter">
              Розумне фермерство з IoT
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-200 font-roboto">
              Оптимізуйте управління вашим виноградником за допомогою моніторингу в реальному часі, предиктивної аналітики та інтелектуальної автоматизації.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-dark"
                  icon={<ArrowRight size={16} />}
                  iconPosition="right"
                >
                  Спробувати демо
                </Button>
              </Link>
              <Link to="/about">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:bg-opacity-10"
                >
                  Дізнатися більше
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* IoT sensor indicators */}
        <div className="absolute w-full h-full top-0 left-0 z-0 pointer-events-none">
          <div className="absolute top-[35%] left-[30%] w-4 h-4 bg-success rounded-full animate-ping opacity-70"></div>
          <div className="absolute top-[35%] left-[30%] w-2 h-2 bg-success rounded-full"></div>

          <div className="absolute top-[40%] left-[60%] w-4 h-4 bg-primary rounded-full animate-ping opacity-70" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-[40%] left-[60%] w-2 h-2 bg-primary rounded-full"></div>

          <div className="absolute top-[65%] left-[75%] w-4 h-4 bg-info rounded-full animate-ping opacity-70" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-[65%] left-[75%] w-2 h-2 bg-info rounded-full"></div>

          <div className="absolute top-[75%] left-[25%] w-4 h-4 bg-warning rounded-full animate-ping opacity-70" style={{ animationDelay: '1.5s' }}></div>
          <div className="absolute top-[75%] left-[25%] w-2 h-2 bg-warning rounded-full"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 font-inter">
              Інтелектуальне управління виноградником
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-roboto">
              Наша IoT-платформа надає все необхідне для моніторингу, аналізу та оптимізації роботи вашого виноградника.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-6">
                <Leaf className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                Моніторинг у реальному часі
              </h3>
              <p className="text-gray-600 font-roboto">
                Відстежуйте температуру, вологість, вологість ґрунту та рівень освітлення в реальному часі за допомогою нашої передової сенсорної мережі.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-6">
                <BarChart3 className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                Предиктивна аналітика
              </h3>
              <p className="text-gray-600 font-roboto">
                Використовуйте історичні дані та машинне навчання для прогнозування спалахів хвороб, впливу погоди та оптимізації часу збору врожаю.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-6">
                <Bell className="text-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                Розумні сповіщення
              </h3>
              <p className="text-gray-600 font-roboto">
                Отримуйте персоналізовані сповіщення, коли умови потребують уваги, що дозволяє вирішувати проблеми до того, як вони вплинуть на якість.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-6">
          <div className="bg-primary rounded-component p-12 flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-2/3 mb-8 md:mb-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-white font-inter">
                Готові трансформувати управління вашим виноградником?
              </h2>
              <p className="text-white text-opacity-90 md:pr-10 font-roboto">
                Приєднуйтесь до сотень виноградників, які вже використовують VineGuard для підвищення врожайності, зниження витрат та виробництва якісного винограду.
              </p>
            </div>
            <div>
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary-dark text-white border-2 border-white-200"
                >
                  Почати роботу
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 font-inter">
              Довіра виноградників по всьому світу
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-roboto">
              Дізнайтеся, що наші клієнти кажуть про свій досвід роботи з VineGuard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 rounded-component p-8 shadow-card">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 font-inter">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600 font-roboto">{testimonial.title}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic font-roboto">{testimonial.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Mock testimonials data
const testimonials = [
  {
    name: "Роберт Мондаві",
    title: "Власник, Виноградники Напа Веллі",
    quote: "VineGuard змінив спосіб управління нашим виноградником. Моніторинг в реальному часі допоміг нам зменшити використання води на 30%, одночасно покращуючи якість винограду.",
    avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    name: "Софія Мартінез",
    title: "Виноградар, Сонома Вайнс",
    quote: "Предиктивне моделювання хвороб стало справжнім проривом. Ми змогли зменшити використання пестицидів за рахунок більш точного застосування.",
    avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
  {
    name: "Жан-П'єр Дюран",
    title: "Менеджер, Маєтки Бордо",
    quote: "Після впровадження VineGuard ми побачили зростання врожайності на 15% та помітне покращення однорідності на різних ділянках нашого виноградника.",
    avatar: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=600",
  },
];

export default HomePage;