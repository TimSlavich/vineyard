import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { AuthRequest, RegisterRequest, UserProfileUpdateRequest, PasswordChangeRequest } from '../services/api/types';
import { userApi } from '../services/api';
import { setItem, getItem, removeItem } from '../utils/storage';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    // Данные
    user: User | null;
    isAuthenticated: boolean;

    // Состояния
    loading: boolean;
    error: Error | null;

    // Функции
    login: (credentials: AuthRequest) => Promise<void>;
    register: (userData: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: UserProfileUpdateRequest) => Promise<void>;
    changePassword: (data: PasswordChangeRequest) => Promise<void>;
    deleteAccount: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(getItem<User>('user'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getItem('authToken'));
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const navigate = useNavigate();

    // Проверка аутентификации при загрузке
    useEffect(() => {
        const checkAuth = async () => {
            const token = getItem<string>('authToken');
            const userData = getItem<User>('user');

            if (token && userData) {
                setIsAuthenticated(true);
                setUser(userData);
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        };

        checkAuth();
    }, []);

    // Функция для авторизации
    const login = useCallback(async (credentials: AuthRequest) => {
        try {
            setLoading(true);
            setError(null);

            const response = await userApi.login(credentials);
            const { token, user } = response.data;

            // Сохраняем токен и данные пользователя
            setItem('authToken', token);
            setItem('user', user);

            setIsAuthenticated(true);
            setUser({
                ...user,
                role: user.role as "admin" | "manager" | "viewer"
            });

            // Перенаправляем на главную страницу
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Функция для регистрации
    const register = useCallback(async (userData: RegisterRequest) => {
        try {
            setLoading(true);
            setError(null);

            const response = await userApi.register(userData);
            const { token, user } = response.data;

            // Сохраняем токен и данные пользователя
            setItem('authToken', token);
            setItem('user', user);

            setIsAuthenticated(true);
            setUser({
                ...user,
                role: user.role as "admin" | "manager" | "viewer"
            });

            // Перенаправляем на главную страницу
            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Функция для выхода из системы
    const logout = useCallback(async () => {
        try {
            setLoading(true);

            await userApi.logout();

            // Удаляем токен и данные пользователя
            removeItem('authToken');
            removeItem('user');

            setIsAuthenticated(false);
            setUser(null);

            // Перенаправляем на страницу входа
            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Функция для обновления профиля
    const updateProfile = useCallback(async (data: UserProfileUpdateRequest) => {
        try {
            setLoading(true);
            setError(null);

            const response = await userApi.updateProfile(data);

            // Обновляем данные пользователя
            setItem('user', response.data);
            setUser(response.data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, []);

    // Функция для изменения пароля
    const changePassword = useCallback(async (data: PasswordChangeRequest) => {
        try {
            setLoading(true);
            setError(null);

            await userApi.changePassword(data);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            throw err; // Пробрасываем ошибку для обработки в компоненте
        } finally {
            setLoading(false);
        }
    }, []);

    // Функция для удаления аккаунта
    const deleteAccount = useCallback(async () => {
        try {
            setLoading(true);

            await userApi.deleteAccount();

            // Удаляем токен и данные пользователя
            removeItem('authToken');
            removeItem('user');

            setIsAuthenticated(false);
            setUser(null);

            // Перенаправляем на страницу входа
            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // Функция для очистки ошибки
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                loading,
                error,
                login,
                register,
                logout,
                updateProfile,
                changePassword,
                deleteAccount,
                clearError
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 