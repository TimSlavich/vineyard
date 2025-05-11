import React, { createContext, useContext, useState, useEffect } from 'react';
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
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

    // Функция авторизации
    const login = async (credentials: AuthRequest) => {
        try {
            setLoading(true);
            setError(null);

            // Выполняем вход и получаем токен
            await userApi.login(credentials);

            // Получаем пользователя из localStorage после успешной авторизации
            const userData = getItem<User>('user');

            setIsAuthenticated(true);
            setUser(userData);

            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Функция регистрации
    const register = async (userData: RegisterRequest) => {
        try {
            setLoading(true);
            setError(null);

            // Выполняем регистрацию
            await userApi.register(userData);

            // Получаем пользователя из localStorage после успешной регистрации
            const user = getItem<User>('user');

            setIsAuthenticated(true);
            setUser(user);

            navigate('/');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Функция выхода из системы
    const logout = async () => {
        try {
            setLoading(true);

            await userApi.logout();

            removeItem('authToken');
            removeItem('user');

            setIsAuthenticated(false);
            setUser(null);

            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Функция обновления профиля
    const updateProfile = async (data: UserProfileUpdateRequest) => {
        try {
            setLoading(true);
            setError(null);

            // Обновляем профиль и получаем обновленные данные
            const updatedUser = await userApi.updateProfile(data);

            setItem('user', updatedUser);
            setUser(updatedUser);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Функция изменения пароля
    const changePassword = async (data: PasswordChangeRequest) => {
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
    };

    // Функция удаления аккаунта
    const deleteAccount = async () => {
        try {
            setLoading(true);

            await userApi.deleteAccount();

            removeItem('authToken');
            removeItem('user');

            setIsAuthenticated(false);
            setUser(null);

            navigate('/login');
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    };

    // Функция очистки ошибки
    const clearError = () => {
        setError(null);
    };

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
        throw new Error('useAuth должен использоваться внутри AuthProvider');
    }
    return context;
}; 