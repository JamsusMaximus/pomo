"use client";

import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle runtime errors
 *
 * Prevents entire app from crashing when a component throws an error.
 * Shows user-friendly error message with option to retry.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallbackTitle="Timer Error">
 *   <TimerComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Import dynamically to avoid bundling in client components
    import("@/lib/error-reporting").then(({ reportError }) => {
      reportError(error, {
        extra: {
          componentStack: errorInfo.componentStack,
          errorBoundary: this.props.fallbackTitle || "ErrorBoundary",
        },
        tags: {
          boundary: this.props.fallbackTitle || "unknown",
        },
      });
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle = "Something went wrong", fallbackMessage } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{fallbackTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {fallbackMessage || "An unexpected error occurred. Please try again."}
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Error Details (Dev Only)
                    </summary>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                      {this.state.error.toString()}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <Button onClick={this.handleReset} className="w-full">
                Try Again
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
