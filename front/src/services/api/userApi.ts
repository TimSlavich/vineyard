import { User } from '../../types';
import { BaseApi } from './baseApi';
import {
    ApiResponse,
    AuthRequest,
    AuthResponse,
    PasswordChangeRequest,
    RegisterRequest,
    UserProfileUpdateRequest
} from './types';
import { getItem, setItem, removeItem, getUserData } from '../../utils/storage';
import { clearAuthAndRedirect } from './baseApi';
import websocketService, { initializeWebSocketConnection } from '../websocketService';

/**
 * Сервис для работы с пользователями
 */
export class UserApi extends BaseApi {
    /**
     * Авторизация пользователя
     * @param credentials данные для авторизации
     * @returns токен и данные пользователя
     */
    async login(credentials: AuthRequest): Promise<AuthResponse> {
        try {
            // Сначала отключаем существующее WebSocket соединение, если есть
            websocketService.disconnect();

            // Выполняем запрос на API
            const response = await this.post<AuthResponse>('/auth/login', credentials, { requireAuth: false });

            if (!response || !response.access_token) {
                throw new Error('Получен некорректный ответ при авторизации. Токен не получен.');
            }

            // Сохраняем токены в localStorage
            if (response.access_token) {
                setItem('accessToken', response.access_token);
            }

            if (response.refresh_token) {
                setItem('refreshToken', response.refresh_token);
            }

            // Получаем и сохраняем данные профиля
            try {
                const userProfile = await this.getProfile();

                // После успешного входа инициализируем WebSocket соединение
                setTimeout(async () => {
                    try {
                        await initializeWebSocketConnection();

                        // Запрашиваем новые данные датчиков
                        setTimeout(() => {
                            if (websocketService.isConnected()) {
                                websocketService.requestSensorData();
                            }
                        }, 1000);
                    } catch (wsError) {
                        console.error('Ошибка при инициализации WebSocket после входа в систему:', wsError);
                    }
                }, 500);

            } catch (profileError) {
                console.error('Не удалось получить профиль пользователя:', profileError);
            }

            return response;
        } catch (error: any) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    /**
     * Выход пользователя из системы
     * @returns статус операции
     */
    async logout(): Promise<boolean> {
        try {
            // Получаем refresh токен
            const refreshToken = getItem<string>('refreshToken', '');

            if (refreshToken) {
                // Отправляем запрос на отзыв токена
                await this.post<ApiResponse<null>>(
                    '/auth/logout',
                    { refresh_token: refreshToken },
                    { skipRedirect: true }  // Предотвращаем автоматический редирект
                ).catch(err => {
                    console.warn('Ошибка при запросе на отзыв токена:', err);
                    // Игнорируем ошибку - очистим токены в любом случае
                });
            }

            // Очищаем все данные, связанные с пользователем
            removeItem('accessToken');
            removeItem('refreshToken');
            removeItem('user');
            removeItem('isAuthenticated');

            // Очищаем данные о датчиках, чтобы избежать конфликтов при следующем входе
            removeItem('vineguard_latest_sensor_data');
            removeItem('vineguard_sensor_history');

            // Перенаправляем на страницу входа
            clearAuthAndRedirect(true);

            return true;
        } catch (error) {
            console.error('Error during logout:', error);

            // Очищаем данные авторизации с редиректом даже при ошибке
            clearAuthAndRedirect(true);

            return false;
        }
    }

    /**
     * Регистрация нового пользователя
     * @param userData данные пользователя
     * @returns результат операции
     */
    async register(userData: RegisterRequest): Promise<AuthResponse> {
        try {
            // Отправляем запрос на регистрацию
            const response = await this.post<AuthResponse & Record<string, any>>('/auth/register', userData, { requireAuth: false });

            // Проверяем ответ более мягко, без жесткого требования access_token
            if (!response) {
                throw new Error('Получен пустой ответ при регистрации');
            }

            // Проверяем, содержит ли ответ данные пользователя
            const hasUserData = response.username || response.email;

            // Если регистрация прошла успешно, но токен не получен, 
            // выполняем вход с теми же учетными данными
            if (!response.access_token && hasUserData) {
                try {
                    // Выполняем вход для получения токена
                    const loginResponse = await this.login({
                        username: userData.username,
                        password: userData.password
                    });

                    // Используем данные входа
                    if (loginResponse.access_token) {
                        return loginResponse;
                    }
                } catch (loginError) {
                    console.warn('Не удалось выполнить вход после регистрации:', loginError);
                    // В случае ошибки продолжаем использовать данные из регистрации
                }
            }

            // Сохраняем токены в localStorage, если они есть
            if (response.access_token) {
                setItem('accessToken', response.access_token);
            } else {
                console.warn('В ответе отсутствует токен доступа');
                // Если нет токена, но есть данные о пользователе, преобразуем их в стандартный формат
                if (hasUserData) {
                    const userProfile = {
                        id: response.id || Math.floor(Math.random() * 10000) + 1, // Генерируем уникальный ID, если его нет
                        username: response.username || userData.username,
                        email: response.email || userData.email,
                        first_name: response.first_name || userData.first_name || '',
                        last_name: response.last_name || userData.last_name || '',
                        is_active: response.is_active !== undefined ? response.is_active : true,
                        role: response.role || 'new_user',
                        is_admin: response.is_admin || false,
                        sensor_count: response.sensor_count || 5,
                        created_at: response.created_at || new Date().toISOString(),
                        updated_at: response.updated_at || new Date().toISOString()
                    };
                    setItem('user', userProfile);
                }
            }

            if (response.refresh_token) {
                setItem('refreshToken', response.refresh_token);
            } else {
                console.warn('В ответе отсутствует токен обновления');
            }

            // Если токены получены, пытаемся запросить профиль пользователя
            if (response.access_token) {
                try {
                    const userProfile = await this.getProfile();
                    setItem('user', userProfile);
                } catch (profileError) {
                    console.warn('Failed to fetch user profile after registration, but registration itself was successful:', profileError);

                    // Создаем профиль на основе данных регистрации
                    const userProfile = {
                        id: response.id || Math.floor(Math.random() * 10000) + 1, // Генерируем уникальный ID, если его нет
                        username: response.username || userData.username || response.email?.split('@')[0] || 'user',
                        email: response.email || userData.email || '',
                        first_name: response.first_name || userData.first_name || '',
                        last_name: response.last_name || userData.last_name || '',
                        is_active: response.is_active !== undefined ? response.is_active : true,
                        role: response.role || 'new_user',
                        is_admin: response.is_admin || false,
                        sensor_count: response.sensor_count || 5,
                        created_at: response.created_at || new Date().toISOString(),
                        updated_at: response.updated_at || new Date().toISOString()
                    };

                    setItem('user', userProfile);
                }
            }

            return response;
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    }

    /**
     * Получает профиль пользователя
     * @returns данные пользователя
     */
    async getProfile(): Promise<User> {
        try {
            // Проверяем наличие токена перед запросом
            const token = getItem<string>('accessToken');
            const userData = getUserData();

            // Если есть локальный профиль, но нет токена - используем локальный профиль вместо запроса к серверу
            if (!token && userData) {
                return userData;
            }

            if (!token) {
                throw new Error('Требуется авторизация');
            }

            const apiUserData = await this.get<User>('/auth/me');

            if (!apiUserData) {
                throw new Error('Получен пустой ответ при запросе профиля пользователя');
            }

            // Проверяем, что полученные данные содержат необходимые поля
            // Сервер может не возвращать поле name, но должен возвращать id и email
            if (!apiUserData.id || !apiUserData.email) {
                console.warn('Полученный профиль не содержит обязательные поля (id или email)');
                throw new Error('Получены некорректные данные профиля');
            }

            // Создаем структурированный профиль с гарантированными полями
            const userProfile = {
                id: apiUserData.id,
                username: apiUserData.username || apiUserData.email.split('@')[0],
                email: apiUserData.email,
                first_name: apiUserData.first_name || '',
                last_name: apiUserData.last_name || '',
                is_active: apiUserData.is_active !== undefined ? apiUserData.is_active : true,
                role: apiUserData.role || 'new_user',
                is_admin: apiUserData.is_admin || false,
                sensor_count: apiUserData.sensor_count || 5,
                created_at: apiUserData.created_at || new Date().toISOString(),
                updated_at: apiUserData.updated_at || new Date().toISOString()
            };

            // Сохраняем данные пользователя
            setItem('user', userProfile);
            return userProfile;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    }

    /**
     * Обновляет профиль пользователя
     * @param data данные для обновления
     * @returns обновленные данные пользователя
     */
    async updateProfile(data: UserProfileUpdateRequest): Promise<User> {
        try {
            const updatedUser = await this.patch<User>('/auth/me', data);

            // Сохраняем обновленные данные пользователя в localStorage
            setItem('user', updatedUser);

            return updatedUser;
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Изменяет пароль пользователя
     * @param data данные для изменения пароля
     * @returns результат операции
     */
    async changePassword(data: PasswordChangeRequest): Promise<ApiResponse<null>> {
        try {
            return await this.put<ApiResponse<null>>('/auth/me/password', data);
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    /**
     * Удаляет аккаунт пользователя
     * @returns результат операции
     */
    async deleteAccount(): Promise<ApiResponse<null>> {
        try {
            const result = await this.delete<ApiResponse<null>>('/auth/me');

            // Очищаем данные авторизации с редиректом
            clearAuthAndRedirect(true);

            return result;
        } catch (error) {
            console.error('Error deleting account:', error);

            // При критических ошибках очищаем данные авторизации с редиректом
            if (error instanceof Error && (error as any).status >= 400) {
                clearAuthAndRedirect(true);
            }

            throw error;
        }
    }

    /**
     * Проверяет доступность имени пользователя
     * @param username имя пользователя для проверки
     * @returns true, если имя доступно
     */
    async checkUsername(username: string): Promise<boolean> {
        try {
            // Здесь мы можем использовать специальный эндпоинт для проверки username,
            // но пока такого эндпоинта нет, мы просто возвращаем успех
            // В реальной реализации здесь будет запрос к API
            // return this.get<boolean>(`/auth/check-username/${username}`);
            return true;
        } catch (error) {
            console.error('Error checking username:', error);
            throw error;
        }
    }

    /**
     * Автоматический вход под демо-пользователем
     * @returns токен и данные пользователя демо-аккаунта
     */
    async loginAsDemo(): Promise<AuthResponse> {
        try {
            // Вход с фиксированными учетными данными демо-пользователя
            const response = await this.post<AuthResponse>('/auth/login', {
                username: 'demo_user',
                password: 'demo'
            }, { requireAuth: false });

            if (!response || !response.access_token) {
                throw new Error('Получен некорректный ответ при авторизации. Токен не получен.');
            }

            // Сохраняем токены в localStorage
            if (response.access_token) {
                setItem('accessToken', response.access_token);
            }

            if (response.refresh_token) {
                setItem('refreshToken', response.refresh_token);
            }

            // После успешного входа получаем данные пользователя и сохраняем их
            try {
                const userData = await this.getProfile();
                setItem('user', userData);
            } catch (profileError) {
                console.warn('Failed to fetch user profile after demo login, but login itself was successful:', profileError);
            }

            return response;
        } catch (error) {
            console.error('Error during demo login:', error);
            throw error;
        }
    }
}

// Создаем экземпляр API для пользователей
export const userApi = new UserApi(); 