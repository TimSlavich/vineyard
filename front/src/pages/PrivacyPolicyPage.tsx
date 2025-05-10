import React, { useEffect } from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
    // Прокрутка страницы вверх при загрузке компонента
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative py-16 md:py-24 text-white">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: "url('https://images.pexels.com/photos/268533/pexels-photo-268533.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-60"></div>
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 font-inter">
                            Політика конфіденційності
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 font-roboto">
                            Ми серйозно ставимося до захисту ваших персональних даних. Ця сторінка пояснює, які дані ми збираємо і як їх використовуємо.
                        </p>
                    </div>
                </div>
            </section>

            {/* Основная секция */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center mb-8">
                            <Shield className="text-primary mr-3" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 font-inter">
                                Захист ваших даних — наш пріоритет
                            </h2>
                        </div>

                        <p className="text-gray-700 mb-8 text-lg font-roboto">
                            Дата останнього оновлення: 20 липня 2023 року
                        </p>

                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center mb-4">
                                    <FileText className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Які дані ми збираємо
                                    </h3>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary mb-4">
                                    <p className="font-medium text-gray-800 mb-2">Персональні дані</p>
                                    <p className="text-gray-600 font-roboto">
                                        Ім'я, електронна пошта, контактний телефон та адреса, які ви надаєте при реєстрації чи заповненні форм на нашому сайті.
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-warning mb-4">
                                    <p className="font-medium text-gray-800 mb-2">Технічна інформація</p>
                                    <p className="text-gray-600 font-roboto">
                                        IP-адреса, тип і версія браузера, налаштування часового поясу, типи і версії плагінів браузера,
                                        операційна система та платформа, а також інші технології на пристроях, які ви використовуєте для доступу до нашого сайту.
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-success">
                                    <p className="font-medium text-gray-800 mb-2">Дані про використання</p>
                                    <p className="text-gray-600 font-roboto">
                                        Інформація про те, як ви використовуєте наш сайт, продукти та послуги, включаючи повні
                                        URL-адреси, історію переглядів, час перебування на сайті та шляхи навігації через наш сайт.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <Lock className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Як ми використовуємо ваші дані
                                    </h3>
                                </div>
                                <p className="text-gray-600 mb-6 font-roboto">
                                    Ми використовуємо ваші дані для наступних цілей:
                                </p>
                                <ul className="space-y-4 mb-6">
                                    <li className="flex items-start">
                                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                                        <div>
                                            <p className="font-medium text-gray-800">Надання та покращення послуг</p>
                                            <p className="text-gray-600 font-roboto">Обробка ваших сільськогосподарських даних для надання прогнозів, аналітики та рекомендацій щодо управління виноградником.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                                        <div>
                                            <p className="font-medium text-gray-800">Комунікація з вами</p>
                                            <p className="text-gray-600 font-roboto">Відправлення повідомлень про нові функції, оновлення послуг та технічну підтримку.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                                        <div>
                                            <p className="font-medium text-gray-800">Безпека та захист</p>
                                            <p className="text-gray-600 font-roboto">Виявлення, запобігання та розслідування потенційних загроз безпеці та шахрайству.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <Eye className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Ваші права
                                    </h3>
                                </div>
                                <p className="text-gray-600 mb-6 font-roboto">
                                    Ви маєте такі права щодо ваших персональних даних:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Доступ до даних</p>
                                        <p className="text-gray-600 font-roboto">Ви маєте право запитувати копію ваших персональних даних.</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Виправлення даних</p>
                                        <p className="text-gray-600 font-roboto">Ви можете попросити виправити неточні або неповні дані.</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Видалення даних</p>
                                        <p className="text-gray-600 font-roboto">Ви можете попросити видалити ваші персональні дані за певних умов.</p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Обмеження обробки</p>
                                        <p className="text-gray-600 font-roboto">Ви можете попросити обмежити обробку ваших даних за певних обставин.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Заключительная секция */}
            <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900 font-inter">
                            Маєте питання щодо приватності?
                        </h2>
                        <p className="text-lg text-gray-700 mb-8 font-roboto">
                            Якщо у вас виникли запитання щодо нашої політики конфіденційності або обробки ваших персональних даних,
                            будь ласка, зв'яжіться з нашим спеціалістом із захисту даних.
                        </p>
                        <div className="flex justify-center">
                            <a
                                href="mailto:privacy@vineguard.ua"
                                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
                            >
                                Зв'язатися з нами
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PrivacyPolicyPage; 