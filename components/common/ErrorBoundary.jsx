import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            {this.props.fallbackTitle || 'Erro inesperado'}
          </h3>
          <p className="text-sm text-red-600 text-center mb-4 max-w-md">
            {this.props.fallbackMessage || 'Ocorreu um erro ao carregar este componente. Tente recarregar a página.'}
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={this.handleRetry}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
            
            {this.props.showDetails && process.env.NODE_ENV === 'development' && (
              <Button 
                onClick={() => {}}
                variant="ghost"
                size="sm"
                className="text-red-600"
              >
                Detalhes (Console)
              </Button>
            )}
          </div>
          
          {process.env.NODE_ENV === 'development' && this.props.showStackTrace && (
            <details className="mt-4 text-xs text-red-700 max-w-full overflow-auto">
              <summary className="cursor-pointer font-medium mb-2">Stack Trace</summary>
              <pre className="whitespace-pre-wrap bg-red-100 p-2 rounded border">
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;