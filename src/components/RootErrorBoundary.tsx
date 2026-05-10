/**
 * RootErrorBoundary — variante "Future" du ErrorBoundary, alignée tokens v2.
 *
 * Différenciée de l'ErrorBoundary existant : utilise les classes btn-cta-* et
 * les tokens typo (text-title-lg, text-body-base) du DS v2.
 *
 * Usage recommandé : wrapper <App /> dans main.tsx, OU wrapper individuellement
 * les routes critiques pour un fallback localisé.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    if (this.props.onError) {
      try { this.props.onError(error, errorInfo); } catch { /* ignore */ }
    }
    if (typeof console !== "undefined") {
      console.error("[RootErrorBoundary]", error, errorInfo);
    }
  }

  reset = () => this.setState({ error: null, errorInfo: null });
  goHome = () => { if (typeof window !== "undefined") window.location.href = "/"; };

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const dev = (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) ?? false;
    const showDetails = this.props.showDetails ?? dev;

    return (
      <div role="alert" className="min-h-screen flex items-center justify-center px-5 bg-background">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 ring-1 ring-destructive/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-destructive" aria-hidden="true" />
          </div>
          <h1 className="text-title-lg font-bold mb-3">Oups, un imprévu</h1>
          <p className="text-body-base text-muted-foreground mb-8">
            Quelque chose s'est mal passé de notre côté. On a noté l'erreur. Tu peux réessayer ou revenir à l'accueil.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onClick={this.reset} className="btn-cta-primary text-sm h-11 px-5">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Réessayer
            </button>
            <button type="button" onClick={this.goHome} className="btn-cta-secondary text-sm h-11 px-5">
              <Home className="w-4 h-4" aria-hidden="true" />
              Accueil
            </button>
          </div>
          {showDetails && this.state.error ? (
            <details className="mt-10 text-left text-xs bg-muted rounded-2xl p-4">
              <summary className="cursor-pointer font-semibold mb-2">Détails techniques (dev)</summary>
              <pre className="whitespace-pre-wrap break-words">{this.state.error.toString()}</pre>
              {this.state.errorInfo ? (
                <pre className="whitespace-pre-wrap break-words mt-3 opacity-80">{this.state.errorInfo.componentStack}</pre>
              ) : null}
            </details>
          ) : null}
        </div>
      </div>
    );
  }
}

export default RootErrorBoundary;
