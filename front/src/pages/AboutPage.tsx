import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Info, Users, Trophy, Clock, Globe } from 'lucide-react';
import Button from '../components/ui/Button';

const AboutPage: React.FC = () => {
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
                        backgroundImage: "url('https://images.pexels.com/photos/51947/tuscany-grape-field-nature-51947.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-60"></div>
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 font-inter">
                            Про компанію VineGuard
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 font-roboto">
                            Ми розробляємо інтелектуальні рішення для виноградарства, об'єднуючі IoT-технології,
                            аналітику даних та автоматизацію для досягнення максимальної ефективності вашого виноградника.
                        </p>
                    </div>
                </div>
            </section>

            {/* Our Story Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/2">
                            <div className="rounded-component overflow-hidden shadow-xl">
                                <img
                                    src="https://images.pexels.com/photos/760281/pexels-photo-760281.jpeg?auto=compress&cs=tinysrgb&w=1280"
                                    alt="Виноградники"
                                    className="w-full h-auto"
                                />
                            </div>
                        </div>
                        <div className="md:w-1/2">
                            <div className="flex items-center mb-4">
                                <Info className="mr-2 text-primary" size={24} />
                                <h2 className="text-3xl font-bold text-gray-800 font-inter">
                                    Наша історія
                                </h2>
                            </div>
                            <p className="text-gray-600 mb-4 font-roboto">
                                Компанія VineGuard була заснована у 2018 році групою ентузіастів, які об'єднали свої знання у галузі
                                сільського господарства, програмного забезпечення та IoT-технологій. Нашою метою було створення платформи,
                                яка допоможе виноградарям по всьому світу покращити якість їхньої продукції, знизити витрати та
                                мінімізувати вплив на навколишнє середовище.
                            </p>
                            <p className="text-gray-600 mb-6 font-roboto">
                                Сьогодні наша платформа використовується сотнями виноградників по всьому світу, від невеликих сімейних
                                господарств до великих промислових виноробних підприємств.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                                    <Clock className="mr-3 text-primary" size={20} />
                                    <p className="text-gray-800 font-medium">Заснована у 2018</p>
                                </div>
                                <div className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                                    <Users className="mr-3 text-warning" size={20} />
                                    <p className="text-gray-800 font-medium">Команда з 40+ експертів</p>
                                </div>
                                <div className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                                    <Globe className="mr-3 text-success" size={20} />
                                    <p className="text-gray-800 font-medium">12 країн присутності</p>
                                </div>
                                <div className="flex items-center p-3 bg-gray-50 rounded-lg shadow-sm">
                                    <Trophy className="mr-3 text-info" size={20} />
                                    <p className="text-gray-800 font-medium">5 галузевих нагород</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Mission Section */}
            <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 font-inter">
                            Наша місія та цінності
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto font-roboto">
                            Ми прагнемо зробити сучасне виноградарство більш ефективним, стійким та прибутковим
                            за допомогою інноваційних технологій.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-primary transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-xl bg-primary bg-opacity-10 flex items-center justify-center mb-4">
                                <span className="text-primary text-xl font-bold">1</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Інновації
                            </h3>
                            <p className="text-gray-600 font-roboto">
                                Ми постійно розвиваємо наші технології, інтегруючи останні досягнення у галузі IoT,
                                машинного навчання та аналізу даних для створення більш ефективних рішень.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-warning transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-xl bg-warning bg-opacity-10 flex items-center justify-center mb-4">
                                <span className="text-warning text-xl font-bold">2</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Сталий розвиток
                            </h3>
                            <p className="text-gray-600 font-roboto">
                                Ми допомагаємо виноградникам зменшити використання води, пестицидів та інших ресурсів,
                                сприяючи більш екологічному та сталому сільському господарству.
                            </p>
                        </div>

                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-success transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-xl bg-success bg-opacity-10 flex items-center justify-center mb-4">
                                <span className="text-success text-xl font-bold">3</span>
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Партнерство
                            </h3>
                            <p className="text-gray-600 font-roboto">
                                Ми розглядаємо наших клієнтів як партнерів, працюючи разом над досягненням спільних
                                цілей з підвищення якості продукції та ефективності виробництва.
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
        </div>
    );
};

export default AboutPage; 