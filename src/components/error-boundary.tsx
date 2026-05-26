"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="w-full max-w-sm card card-elevated p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)]">
              <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[rgba(19,49,58,0.85)]">
              {this.props.fallbackTitle || "कुछ गड़बड़ हो गई"}
            </h2>
            <p className="mt-2 text-sm text-[rgba(19,49,58,0.55)]">
              {this.props.fallbackMessage || "कृपया पेज रिफ्रेश करें या दोबारा कोशिश करें"}
            </p>
            <p className="mt-1 text-[10px] text-[rgba(19,49,58,0.3)]">
              {this.state.errorMessage}
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
              >
                <RotateCcw className="h-4 w-4" />
                दोबारा कोशिश करें
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-outline"
              >
                <RefreshCw className="h-4 w-4" />
                रिफ्रेश
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
