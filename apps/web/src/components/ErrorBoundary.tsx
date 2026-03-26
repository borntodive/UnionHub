import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Something went wrong
          </h1>
          <p className="text-gray-500 max-w-md">
            An unexpected error occurred. Please reload the page.
          </p>
          <button
            className="px-4 py-2 bg-[#177246] text-white rounded-lg hover:bg-[#145e39] transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-left text-xs text-red-700 max-w-2xl overflow-auto">
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
