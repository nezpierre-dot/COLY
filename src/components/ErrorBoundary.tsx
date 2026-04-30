import { Component, type ReactNode } from "react";
import { logClientError } from "@/lib/errorTracking";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    void logClientError({
      message: error.message || "React render error",
      stack: error.stack,
      metadata: { componentStack: info.componentStack, type: "react.errorBoundary" },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Une erreur est survenue</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Notre équipe a été informée du problème. Tu peux recharger la page pour continuer.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
