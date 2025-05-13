import React, { useEffect } from 'react';
import { Cookie, CheckCircle, Settings, AlertCircle } from 'lucide-react';

const CookiesPolicyPage: React.FC = () => {
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
                        backgroundImage: "url('https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-60"></div>
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 font-inter">
                            Політика використання файлів cookie
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 font-roboto">
                            Дізнайтеся, як ми використовуємо файли cookie для покращення вашого досвіду
                            користування нашою платформою.
                        </p>
                    </div>
                </div>
            </section>

            {/* Основная секция */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center mb-8">
                            <Cookie className="text-primary mr-3" size={32} />
                            <h2 className="text-3xl font-bold text-gray-800 font-inter">
                                Що таке файли cookie?
                            </h2>
                        </div>

                        <p className="text-gray-700 mb-8 text-lg font-roboto">
                            Файли cookie — це невеликі текстові файли, які зберігаються на вашому пристрої
                            (комп'ютері, планшеті або мобільному телефоні) під час відвідування веб-сайтів.
                            Вони дозволяють веб-сайтам запам'ятовувати ваші дії та уподобання протягом певного
                            часу, щоб вам не доводилося вводити їх знову під час кожного відвідування сайту або
                            переходу від однієї сторінки до іншої.
                        </p>

                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center mb-4">
                                    <CheckCircle className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Які файли cookie ми використовуємо
                                    </h3>
                                </div>
                                <div className="grid gap-6">
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-primary">
                                        <p className="font-medium text-gray-800 mb-2">Необхідні файли cookie</p>
                                        <p className="text-gray-600 font-roboto">
                                            Ці файли cookie необхідні для функціонування нашого веб-сайту.
                                            Вони дозволяють вам переміщатися по сайту та використовувати його функції.
                                            Ці файли cookie не можна відключити в наших системах.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-warning">
                                        <p className="font-medium text-gray-800 mb-2">Аналітичні файли cookie</p>
                                        <p className="text-gray-600 font-roboto">
                                            Ці файли cookie дозволяють нам підраховувати відвідування та джерела трафіку,
                                            щоб ми могли вимірювати та покращувати ефективність нашого сайту. Вони допомагають
                                            нам дізнаватися, які сторінки найбільш і найменш популярні, і бачити, як відвідувачі
                                            переміщаються по сайту.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-success">
                                        <p className="font-medium text-gray-800 mb-2">Функціональні файли cookie</p>
                                        <p className="text-gray-600 font-roboto">
                                            Ці файли cookie дозволяють веб-сайту запам'ятовувати вибір, який ви робите
                                            (наприклад, вашу мову або регіон, в якому ви знаходитесь), щоб забезпечити
                                            покращену та персоналізовану функціональність.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <Settings className="text-primary mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Управління файлами cookie
                                    </h3>
                                </div>
                                <p className="text-gray-600 mb-6 font-roboto">
                                    Більшість веб-браузерів дозволяють контролювати файли cookie через
                                    налаштування браузера. Однак, якщо ви обмежите здатність веб-сайтів
                                    встановлювати файли cookie, це може вплинути на загальний користувацький
                                    досвід. Ось як ви можете змінити налаштування у різних браузерах:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Google Chrome</p>
                                        <ol className="text-gray-600 font-roboto list-decimal pl-5 space-y-1">
                                            <li>Відкрийте Chrome</li>
                                            <li>Натисніть на три крапки у верхньому правому куті</li>
                                            <li>Виберіть "Налаштування"</li>
                                            <li>Прокрутіть вниз і натисніть "Розширені"</li>
                                            <li>У розділі "Конфіденційність та безпека" натисніть "Налаштування вмісту"</li>
                                            <li>Натисніть "Файли cookie"</li>
                                        </ol>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-lg">
                                        <p className="font-medium text-gray-800 mb-2">Mozilla Firefox</p>
                                        <ol className="text-gray-600 font-roboto list-decimal pl-5 space-y-1">
                                            <li>Відкрийте Firefox</li>
                                            <li>Натисніть на три смужки у верхньому правому куті</li>
                                            <li>Виберіть "Налаштування"</li>
                                            <li>Перейдіть до вкладки "Приватність і безпека"</li>
                                            <li>У розділі "Захист від відстеження" виберіть "Налаштувати"</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center mb-4">
                                    <AlertCircle className="text-warning mr-3" size={24} />
                                    <h3 className="text-2xl font-semibold text-gray-800 font-inter">
                                        Політика третіх сторін
                                    </h3>
                                </div>
                                <p className="text-gray-600 mb-6 font-roboto">
                                    Наш веб-сайт може містити посилання на інші веб-сайти або використовувати
                                    сервіси третіх сторін, які мають власні політики щодо файлів cookie. Ми
                                    рекомендуємо вам ознайомитися з політиками щодо файлів cookie цих сторін,
                                    оскільки ми не контролюємо, як вони використовують файли cookie. Нижче
                                    наведено список деяких сторонніх сервісів, які ми використовуємо:
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start p-4 bg-gray-50 rounded-lg">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0">
                                            <span className="text-blue-600 font-bold">G</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800 mb-1">Google Analytics</p>
                                            <p className="text-gray-600 font-roboto text-sm">
                                                Використовується для аналізу використання веб-сайту.
                                                <a href="https://policies.google.com/privacy" className="text-primary underline ml-1" target="_blank" rel="noopener noreferrer">
                                                    Політика конфіденційності Google
                                                </a>
                                            </p>
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
                            Зміни до цієї політики
                        </h2>
                        <p className="text-lg text-gray-700 mb-8 font-roboto">
                            Ми можемо час від часу оновлювати нашу політику щодо файлів cookie. Будь-які зміни
                            будуть опубліковані на цій сторінці. Ми рекомендуємо періодично перевіряти цю
                            сторінку, щоб бути в курсі будь-яких змін.
                        </p>
                        <div className="flex justify-center">
                            <a
                                href="mailto:privacy@vineguard.ua"
                                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
                            >
                                Запитання щодо файлів cookie
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default CookiesPolicyPage; 