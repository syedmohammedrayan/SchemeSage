import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

/**
 * ErrorBoundary — catches React render errors and shows a graceful fallback.
 * Wraps the entire app in App.tsx to prevent blank screens on unhandled errors.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({ errorInfo: info.componentStack || '' });

    // If Sentry is configured, report the error
    if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
      (window as any).__SENTRY__.captureException(error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-lg w-full border-destructive/30 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center text-sm">
                An unexpected error occurred. Your data is safe — this is a display issue only.
              </p>

              {this.state.error && (
                <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground break-all">
                  <p className="font-semibold text-foreground mb-1">Error:</p>
                  {this.state.error.message}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  className="flex-1"
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                If this persists, please contact{' '}
                <a href="mailto:support@schemesage.gov.in" className="underline text-accent">
                  support@schemesage.gov.in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
