import React, { useEffect } from 'react';
import { ScrollText, AlertCircle, Clock, Book } from 'lucide-react';

const TermsPage: React.FC = () => {
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
                        backgroundImage: "url('https://images.pexels.com/photos/2227776/pexels-photo-2227776.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-60"></div>
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 font-inter">
                            Умови надання послуг
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 font-roboto">
                            Будь ласка, уважно ознайомтеся з цими умовами перед використанням
                            нашої платформи.
                        </p>
                    </div>
                </div>
            </section>

            {/* Основная секция */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center mb-8">
                            <ScrollText className="text-primary mr-3" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 font-inter">
                                Умови використання платформи VineGuard
                            </h2>
                        </div>

                        <p className="text-gray-700 mb-8 text-lg font-roboto">
                            Дата останнього оновлення: 15 серпня 2023 року
                        </p>

                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center mb-4">
                                    <Book className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Загальні положення
                                    </h3>
                                </div>
                                <div className="space-y-6 text-gray-600 font-roboto">
                                    <p>
                                        Ласкаво просимо до VineGuard — IoT-платформи для розумного управління
                                        виноградниками. Використовуючи наш веб-сайт та послуги, ви погоджуєтеся
                                        з цими умовами. Якщо ви не згодні з будь-якою частиною цих умов, будь
                                        ласка, не використовуйте нашу платформу.
                                    </p>
                                    <p>
                                        VineGuard надає інструменти для аналізу даних, моніторингу стану ґрунту,
                                        погодних умов та інших факторів, що впливають на вирощування винограду.
                                        Наша мета — допомогти виноградарям оптимізувати процеси та підвищити
                                        ефективність своїх господарств.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <AlertCircle className="text-warning mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Основні умови
                                    </h3>
                                </div>
                                <div className="grid gap-6">
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary">
                                        <p className="font-medium text-gray-800 mb-2">Обліковий запис</p>
                                        <p className="text-gray-600 font-roboto">
                                            Для використання більшості функцій нашої платформи вам потрібно створити
                                            обліковий запис. Ви несете відповідальність за збереження конфіденційності
                                            своїх облікових даних та за всі дії, що відбуваються під вашим обліковим записом.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-warning">
                                        <p className="font-medium text-gray-800 mb-2">Ліцензія та використання</p>
                                        <p className="text-gray-600 font-roboto">
                                            Ми надаємо вам обмежену, невиключну, непередавану ліцензію на використання
                                            нашої платформи. Ви не маєте права копіювати, модифікувати, розповсюджувати,
                                            продавати або здавати в оренду будь-яку частину нашої платформи або послуг.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-success">
                                        <p className="font-medium text-gray-800 mb-2">Дані та конфіденційність</p>
                                        <p className="text-gray-600 font-roboto">
                                            Ми збираємо та обробляємо ваші дані відповідно до нашої Політики конфіденційності.
                                            Використовуючи нашу платформу, ви погоджуєтеся з нашими методами збору,
                                            використання та розкриття цих даних.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <Clock className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Підписки та оплата
                                    </h3>
                                </div>
                                <div className="space-y-6 text-gray-600 font-roboto">
                                    <p>
                                        VineGuard пропонує різні плани підписки. Вартість та функціональність
                                        кожного плану чітко описані на нашому веб-сайті. Оплата за підписку
                                        стягується щомісячно або щорічно, залежно від обраного вами плану.
                                    </p>
                                    <p>
                                        Ви можете скасувати свою підписку в будь-який час, але ми не надаємо
                                        відшкодування за частково використані періоди підписки.
                                    </p>
                                    <div className="mt-6 border-t border-gray-200 pt-6">
                                        <h4 className="text-xl font-semibold text-gray-800 mb-4">
                                            Доступні плани підписки
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                                <h5 className="text-lg font-semibold text-primary mb-2">Базовий</h5>
                                                <p className="text-3xl font-bold mb-4">€49<span className="text-gray-500 text-sm font-normal">/місяць</span></p>
                                                <ul className="space-y-2 mb-4">
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Моніторинг до 5 га</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Базова аналітика даних</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Email підтримка</span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="bg-primary bg-opacity-5 p-6 rounded-lg shadow-md border-2 border-primary relative">
                                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs py-1 px-3 rounded-full uppercase font-semibold">Популярний</div>
                                                <h5 className="text-lg font-semibold text-primary mb-2">Професійний</h5>
                                                <p className="text-3xl font-bold mb-4">€99<span className="text-gray-500 text-sm font-normal">/місяць</span></p>
                                                <ul className="space-y-2 mb-4">
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Моніторинг до 20 га</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Розширена аналітика</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Пріоритетна підтримка</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Автоматизація процесів</span>
                                                    </li>
                                                </ul>
                                            </div>
                                            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                                <h5 className="text-lg font-semibold text-primary mb-2">Корпоративний</h5>
                                                <p className="text-3xl font-bold mb-4">€249<span className="text-gray-500 text-sm font-normal">/місяць</span></p>
                                                <ul className="space-y-2 mb-4">
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Необмежена площа</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Повна автоматизація</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>Цілодобова підтримка</span>
                                                    </li>
                                                    <li className="flex items-start">
                                                        <span className="text-green-500 mr-2">✓</span>
                                                        <span>API інтеграція</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
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
                            Маєте додаткові запитання?
                        </h2>
                        <p className="text-lg text-gray-700 mb-8 font-roboto">
                            Якщо у вас є питання щодо наших умов або ви хочете отримати більше інформації
                            про наші послуги, будь ласка, зв'яжіться з нашою командою підтримки.
                        </p>
                        <div className="flex justify-center">
                            <a
                                href="mailto:support@vineguard.ua"
                                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
                            >
                                Зв'язатися з підтримкою
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default TermsPage; 