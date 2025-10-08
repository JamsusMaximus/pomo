/**
 * Centralized error reporting utility
 *
 * Currently logs to console, but infrastructure is ready for:
 * - Sentry integration
 * - Custom error tracking API
 * - Analytics service integration
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

interface ErrorContext {
  user?: {
    id: string;
    email?: string;
  };
  extra?: Record<string, unknown>;
  tags?: Record<string, string>;
}

class ErrorReporter {
  private isProduction = process.env.NODE_ENV === "production";
  private isEnabled = true; // Can be toggled based on user preferences

  /**
   * Report an error with context
   */
  captureError(error: Error, context?: ErrorContext) {
    if (!this.isEnabled) return;

    // Always log to console in development
    if (!this.isProduction) {
      console.error("🚨 Error Report:", {
        error,
        message: error.message,
        stack: error.stack,
        ...context,
      });
    }

    // TODO: Send to error tracking service in production
    // Example Sentry integration:
    // if (this.isProduction && typeof Sentry !== 'undefined') {
    //   Sentry.captureException(error, {
    //     user: context?.user,
    //     extra: context?.extra,
    //     tags: context?.tags,
    //   });
    // }

    // Example custom API:
    // fetch('/api/errors', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     message: error.message,
    //     stack: error.stack,
    //     context,
    //     timestamp: Date.now(),
    //   }),
    // });
  }

  /**
   * Report a message (non-error)
   */
  captureMessage(
    message: string,
    level: "info" | "warning" | "error" = "info",
    context?: ErrorContext
  ) {
    if (!this.isEnabled) return;

    if (!this.isProduction) {
      const emoji = level === "error" ? "❌" : level === "warning" ? "⚠️" : "ℹ️";
      console.log(`${emoji} ${message}`, context);
    }

    // TODO: Send to error tracking service
  }

  /**
   * Set user context for all future error reports
   */
  setUser(user: { id: string; email?: string } | null) {
    // TODO: Implement Sentry.setUser(user)
    if (!this.isProduction && user) {
      console.log("👤 Error reporting user context set:", user.id);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, data?: Record<string, unknown>) {
    if (!this.isProduction) {
      console.log("🍞 Breadcrumb:", message, data);
    }
    // TODO: Implement Sentry.addBreadcrumb()
  }

  /**
   * Enable/disable error reporting (for user privacy preferences)
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Singleton instance
export const errorReporter = new ErrorReporter();

// Convenience functions
export const reportError = (error: Error, context?: ErrorContext) =>
  errorReporter.captureError(error, context);

export const reportMessage = (
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ErrorContext
) => errorReporter.captureMessage(message, level, context);

export const setErrorReportingUser = (user: { id: string; email?: string } | null) =>
  errorReporter.setUser(user);

export const addErrorBreadcrumb = (message: string, data?: Record<string, unknown>) =>
  errorReporter.addBreadcrumb(message, data);
