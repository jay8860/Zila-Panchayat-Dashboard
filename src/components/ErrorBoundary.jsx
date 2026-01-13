import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full bg-card m-4 rounded-xl border border-red-500/20">
                    <AlertTriangle className="text-red-500 mb-4" size={48} />
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-muted-foreground mb-4 max-w-md">
                        The dashboard encountered an error while rendering this component. This might be due to unexpected data format.
                    </p>
                    <div className="bg-muted p-2 rounded text-xs font-mono text-left w-full max-w-md overflow-auto mb-4 border border-border">
                        {this.state.error?.toString()}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <RefreshCcw size={16} />
                        <span>Reload Page</span>
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
