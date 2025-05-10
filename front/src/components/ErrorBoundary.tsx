import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('Ошибка перехвачена ErrorBoundary:', error);
        console.error('Информация о компоненте:', errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Отображаем запасной UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="fallback-container">
                    <h1 className="fallback-title">Что-то пошло не так</h1>
                    <p className="fallback-text">
                        В приложении произошла ошибка. Пожалуйста, обновите страницу или вернитесь на главную.
                    </p>
                    <div style={{ marginTop: '1rem' }}>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-4 py-2 bg-primary text-white rounded-md mr-2"
                        >
                            На главную
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                        >
                            Обновить страницу
                        </button>
                    </div>
                    {this.state.error && (
                        <div
                            style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                backgroundColor: '#f8f8f8',
                                borderRadius: '4px',
                                color: '#e53e3e',
                                maxWidth: '500px',
                                overflow: 'auto'
                            }}
                        >
                            <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Информация об ошибке:</p>
                            <p style={{ fontFamily: 'monospace' }}>{this.state.error.toString()}</p>
                        </div>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 