import React, { useEffect } from 'react';
import { Mail, Phone, MapPin, Linkedin, Instagram, Send } from 'lucide-react';
import Button from '../components/ui/Button';

const ContactPage: React.FC = () => {
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
                        backgroundImage: "url('https://images.pexels.com/photos/442151/pexels-photo-442151.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
                    }}
                >
                    <div className="absolute inset-0 bg-black bg-opacity-60"></div>
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-6 font-inter">
                            Зв'язатися з нами
                        </h1>
                        <p className="text-xl text-gray-200 mb-8 font-roboto">
                            Маєте питання щодо нашої системи? Бажаєте дізнатись більше про розумне управління виноградниками?
                            Наша команда готова допомогти вам!
                        </p>
                    </div>
                </div>
            </section>

            {/* Контактная информация */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4 text-gray-900 font-inter">
                            Наші контакти
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto font-roboto">
                            Зв'яжіться з нами одним із зручних для вас способів
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-primary text-center transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-4 mx-auto">
                                <Phone className="text-primary" size={24} />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Телефон
                            </h3>
                            <p className="text-gray-600 font-roboto mb-2">
                                Гаряча лінія (цілодобово)
                            </p>
                            <a href="tel:+38095530477" className="text-primary font-medium hover:underline">
                                +38 (095) 533-04-77
                            </a>
                            <p className="text-gray-600 font-roboto mt-4 mb-2">
                                Відділ продажів
                            </p>
                            <a href="tel:+38095530477" className="text-primary font-medium hover:underline">
                                +38 (095) 533-04-77
                            </a>
                        </div>

                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-warning text-center transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-full bg-warning bg-opacity-10 flex items-center justify-center mb-4 mx-auto">
                                <Mail className="text-warning" size={24} />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Електронна пошта
                            </h3>
                            <p className="text-gray-600 font-roboto mb-2">
                                Загальні питання
                            </p>
                            <a href="mailto:timofiislavich@gmail.com" className="text-warning font-medium hover:underline">
                                timofiislavich@gmail.com
                            </a>
                            <p className="text-gray-600 font-roboto mt-4 mb-2">
                                Технічна підтримка
                            </p>
                            <a href="mailto:timofiislavich@gmail.com" className="text-warning font-medium hover:underline">
                                timofiislavich@gmail.com
                            </a>
                        </div>

                        <div className="bg-white p-8 rounded-component shadow-lg border-t-4 border-success text-center transform transition-transform duration-300 hover:-translate-y-2">
                            <div className="w-16 h-16 rounded-full bg-success bg-opacity-10 flex items-center justify-center mb-4 mx-auto">
                                <MapPin className="text-success" size={24} />
                            </div>
                            <h3 className="text-xl font-semibold mb-3 text-gray-800 font-inter">
                                Адреса
                            </h3>
                            <p className="text-gray-600 font-roboto mb-2">
                                Головний офіс
                            </p>
                            <p className="text-gray-800 font-medium">
                                м. Київ, вул. Богдана Гаврилішина, 6а, офіс 305
                            </p>
                            <p className="text-gray-600 font-roboto mt-4 mb-2">
                                Режим роботи
                            </p>
                            <p className="text-gray-800 font-medium">
                                Пн-Пт: 9:00 - 18:00
                            </p>
                        </div>
                    </div>

                    {/* Социальные сети */}
                    <div className="border-t border-gray-200 pt-16">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold mb-4 text-gray-900 font-inter">
                                Соціальні мережі
                            </h2>
                            <p className="text-xl text-gray-700 max-w-3xl mx-auto font-roboto">
                                Слідкуйте за нашими оновленнями та новинами у соціальних мережах
                            </p>
                        </div>

                        <div className="flex justify-center items-center space-x-8">
                            <a href="https://www.linkedin.com/in/slavich-timofii-78b344253/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                    <Linkedin className="text-blue-700" size={28} />
                                </div>
                                <span className="text-gray-800 font-medium">LinkedIn</span>
                            </a>
                            <a href="https://www.instagram.com/s_love.ich/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-3">
                                    <Instagram className="text-pink-600" size={28} />
                                </div>
                                <span className="text-gray-800 font-medium">Instagram</span>
                            </a>
                            <a href="tg://s_love_ich" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                    <Send className="text-blue-400" size={28} />
                                </div>
                                <span className="text-gray-800 font-medium">Telegram</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Форма обратной связи */}
            <section className="py-16 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="container mx-auto px-6">
                    <div className="max-w-3xl mx-auto bg-white rounded-component shadow-lg p-8 md:p-12">
                        <h2 className="text-3xl font-bold mb-6 text-gray-900 text-center font-inter">
                            Напишіть нам
                        </h2>
                        <p className="text-center text-gray-700 mb-8 font-roboto">
                            Заповніть форму, і ми зв'яжемося з вами найближчим часом
                        </p>

                        <form className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Ваше ім'я *
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Введіть ваше ім'я"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Електронна пошта *
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Введіть вашу електронну пошту"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                                    Тема
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Введіть тему повідомлення"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                                    Повідомлення *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Введіть ваше повідомлення"
                                    required
                                ></textarea>
                            </div>

                            <div className="text-center">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="bg-primary hover:bg-primary-dark text-white px-8"
                                >
                                    Надіслати
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default ContactPage; 