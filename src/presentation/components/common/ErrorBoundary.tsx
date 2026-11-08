import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Bulkhead Pattern Error Boundary (Michael T. Nygard, Release It!)
 * Catches unhandled React runtime errors, isolates failures, prevents WSOD,
 * and preserves user local storage state. Styled strictly with DESIGN.md tokens.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[BulkheadErrorBoundary] Uncaught React runtime error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#faf5e8] flex items-center justify-center p-4 sm:p-6 antialiased">
          <div className="w-full max-w-xl bg-white rounded-[16px] border border-[#e0e2e6] shadow-lg p-6 sm:p-8">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#ffebe6] text-[#aa2d00] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-['Roboto_Slab'] text-2xl font-black text-[#040e20] leading-tight">
                  Ops, ocorreu uma interrupção inesperada
                </h1>
                <p className="font-['Inter'] text-sm text-[#525965] mt-1">
                  Isolamento de falhas ativo — seus dados salvos permanecem seguros.
                </p>
              </div>
            </div>

            {/* Explanation & Reassurance */}
            <div className="bg-[#faf5e8] rounded-xl p-4 border border-[#e0e2e6] mb-6">
              <p className="font-['Inter'] text-sm text-[#333840] leading-relaxed">
                Não se preocupe: suas anotações, roteiros e seleções registradas no dispositivo foram gravados
                automaticamente no armazenamento local (Zero Data Loss) e não foram perdidos.
              </p>
            </div>

            {/* Technical Details (Collapsible) */}
            {this.state.error && (
              <details className="mb-6 group">
                <summary className="font-['Inter'] text-xs font-semibold text-[#525965] cursor-pointer hover:text-[#040e20] transition-colors py-1">
                  Ver detalhes técnicos da ocorrência
                </summary>
                <div className="mt-2 p-3 bg-[#181d26] text-[#faf5e8] rounded-lg text-xs font-mono overflow-x-auto max-h-40">
                  <p className="font-bold text-[#fcab79]">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[#9297a0] text-[11px] whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#181d26] hover:bg-[#333840] text-white font-['Inter'] text-sm font-semibold rounded-xl shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recuperar Dados e Recarregar
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-[#faf5e8] text-[#181d26] font-['Inter'] text-sm font-semibold rounded-xl border border-[#181d26] transition-colors"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
