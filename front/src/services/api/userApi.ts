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
import { currentUser as mockUser } from '../../data/mockData';
import { getItem, setItem } from '../../utils/storage';

/**
 * Сервис для работы с пользователями
 */
export class UserApi extends BaseApi {
    /**
     * Авторизация пользователя
     * @param credentials данные для авторизации
     * @returns токен и данные пользователя
     */
    async login(credentials: AuthRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<AuthResponse>>('/auth/login', credentials, { requireAuth: false });

            // Временное решение с использованием моковых данных
            // В реальном приложении требуется проверка учетных данных
            if (credentials.email !== mockUser.email) {
                throw new Error('Неверный email или пароль');
            }

            const token = `mock-token-${Date.now()}`;

            // Сохраняем токен в localStorage
            setItem('authToken', token);
            setItem('user', mockUser);

            return {
                success: true,
                data: {
                    token,
                    user: {
                        id: mockUser.id,
                        name: mockUser.name,
                        email: mockUser.email,
                        role: mockUser.role
                    }
                }
            };
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    /**
     * Регистрация пользователя
     * @param userData данные для регистрации
     * @returns токен и данные пользователя
     */
    async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<AuthResponse>>('/auth/register', userData, { requireAuth: false });

            // Временное решение с использованием моковых данных
            // В реальном приложении требуется проверка и сохранение в базу данных
            if (userData.password !== userData.confirmPassword) {
                throw new Error('Пароли не совпадают');
            }

            const token = `mock-token-${Date.now()}`;
            const newUser = {
                id: `user-${Date.now()}`,
                name: userData.name,
                email: userData.email,
                role: 'viewer' as const
            };

            // Сохраняем токен в localStorage
            setItem('authToken', token);
            setItem('user', newUser);

            return {
                success: true,
                data: {
                    token,
                    user: newUser
                }
            };
        } catch (error) {
            console.error('Error during registration:', error);
            throw error;
        }
    }

    /**
     * Выход из системы
     * @returns результат операции
     */
    async logout(): Promise<ApiResponse<null>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.post<ApiResponse<null>>('/auth/logout');

            // Удаляем токен из localStorage
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');

            return {
                success: true,
                data: null,
                message: 'Выход выполнен успешно'
            };
        } catch (error) {
            console.error('Error during logout:', error);
            throw error;
        }
    }

    /**
     * Получает данные текущего пользователя
     * @returns данные пользователя
     */
    async getCurrentUser(): Promise<ApiResponse<User>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.get<ApiResponse<User>>('/users/me');

            // Временное решение с использованием моковых данных
            const user = getItem<User>('user');
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }

            return {
                success: true,
                data: user
            };
        } catch (error) {
            console.error('Error getting current user:', error);
            throw error;
        }
    }

    /**
     * Обновляет профиль пользователя
     * @param data данные для обновления
     * @returns обновленные данные пользователя
     */
    async updateProfile(data: UserProfileUpdateRequest): Promise<ApiResponse<User>> {
        try {
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<User>>('/users/me', data);

            // Временное решение с использованием моковых данных
            const user = getItem<User>('user');
            if (!user) {
                throw new Error('Пользователь не авторизован');
            }

            const updatedUser = {
                ...user,
                ...data
            };

            // Сохраняем обновленные данные в localStorage
            setItem('user', updatedUser);

            return {
                success: true,
                data: updatedUser
            };
        } catch (error) {
            console.error('Error updating profile:', error);
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
            // TODO: Заменить на реальный API запрос
            // return this.put<ApiResponse<null>>('/users/me/password', data);

            // Временное решение - просто возвращаем успешный результат
            // В реальном приложении требуется проверка старого пароля и сохранение нового
            if (data.newPassword !== data.confirmPassword) {
                throw new Error('Пароли не совпадают');
            }

            return {
                success: true,
                data: null,
                message: 'Пароль успешно изменен'
            };
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
            // TODO: Заменить на реальный API запрос
            // return this.delete<ApiResponse<null>>('/users/me');

            // Временное решение - удаляем данные из localStorage
            localStorage.clear();

            return {
                success: true,
                data: null,
                message: 'Аккаунт успешно удален'
            };
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }
}

// Экспортируем экземпляр API для использования в приложении
export const userApi = new UserApi(); 