/**
 * Sentry Error Tracking Service
 * Handles initialization and error reporting for the app
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_ENV } from '@env';

// Check if Sentry is configured
const isSentryConfigured = !!SENTRY_DSN && SENTRY_DSN !== 'your_sentry_dsn_here';

/**
 * Initialize Sentry SDK
 * Should be called as early as possible in app lifecycle
 */
export const initSentry = (): void => {
  if (!isSentryConfigured) {
    console.log('[Sentry] DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV || 'development',
    enabled: true,
    debug: false, // Disable debug alerts

    // Disable native SDK warning alert in development
    enableNativeNagger: false,

    // Performance Monitoring
    tracesSampleRate: APP_ENV === 'production' ? 0.2 : 1.0,

    // Session Replay (optional - for mobile)
    _experiments: {
      profilesSampleRate: APP_ENV === 'production' ? 0.1 : 1.0,
    },

    // Integrations
    integrations: [
      Sentry.reactNativeTracingIntegration(),
    ],

    // Filter out common non-actionable errors
    beforeSend(event, hint) {
      // Filter out network errors in development
      if (__DEV__ && event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      return event;
    },

    // Sanitize sensitive data
    beforeBreadcrumb(breadcrumb) {
      // Remove sensitive data from breadcrumbs
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data?.url?.includes('password') ||
            breadcrumb.data?.url?.includes('token')) {
          breadcrumb.data.url = '[FILTERED]';
        }
      }
      return breadcrumb;
    },
  });

  console.log(`[Sentry] Initialized for ${APP_ENV} environment`);
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
}): void => {
  if (!isSentryConfigured) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

/**
 * Clear user context on logout
 */
export const clearUserContext = (): void => {
  if (!isSentryConfigured) return;

  Sentry.setUser(null);
};

/**
 * Capture an exception manually
 */
export const captureException = (
  error: Error | unknown,
  context?: Record<string, unknown>
): void => {
  if (!isSentryConfigured) {
    console.error('[Sentry] Error (not reported):', error);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture a message/log
 */
export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void => {
  if (!isSentryConfigured) {
    console.log(`[Sentry] Message (not reported): ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
};

/**
 * Add a breadcrumb for debugging
 */
export const addBreadcrumb = (breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void => {
  if (!isSentryConfigured) return;

  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
};

/**
 * Set custom tags for filtering in Sentry dashboard
 */
export const setTag = (key: string, value: string): void => {
  if (!isSentryConfigured) return;

  Sentry.setTag(key, value);
};

/**
 * Set multiple tags at once
 */
export const setTags = (tags: Record<string, string>): void => {
  if (!isSentryConfigured) return;

  Sentry.setTags(tags);
};

/**
 * Wrap a component with Sentry error boundary
 */
export const withErrorBoundary = Sentry.wrap;

/**
 * Create a custom error boundary component
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Start a performance transaction
 */
export const startTransaction = (
  name: string,
  op: string
): Sentry.Span | undefined => {
  if (!isSentryConfigured) return undefined;

  return Sentry.startInactiveSpan({ name, op });
};

/**
 * Test Sentry integration - sends a test error
 * Call this to verify Sentry is working correctly
 */
export const testSentry = (): void => {
  console.log('[Sentry] Testing Sentry integration...');
  console.log('[Sentry] DSN configured:', isSentryConfigured);
  console.log('[Sentry] DSN:', SENTRY_DSN?.substring(0, 30) + '...');

  if (!isSentryConfigured) {
    console.log('[Sentry] ERROR: DSN not configured!');
    return;
  }

  try {
    // Send a test message
    Sentry.captureMessage('Sentry Test Message - Integration Working!', 'info');
    console.log('[Sentry] Test message sent successfully');

    // Send a test error
    throw new Error('Sentry Test Error - This is a test exception');
  } catch (error) {
    Sentry.captureException(error);
    console.log('[Sentry] Test error captured and sent');
    console.log('[Sentry] Check your Sentry dashboard: https://sentry.io');
  }
};

/**
 * Get Sentry status info for debugging
 */
export const getSentryStatus = (): {
  configured: boolean;
  dsn: string | undefined;
  environment: string;
} => {
  return {
    configured: isSentryConfigured,
    dsn: SENTRY_DSN ? SENTRY_DSN.substring(0, 40) + '...' : undefined,
    environment: APP_ENV || 'development',
  };
};

export default {
  init: initSentry,
  setUserContext,
  clearUserContext,
  captureException,
  captureMessage,
  addBreadcrumb,
  setTag,
  setTags,
  withErrorBoundary,
  ErrorBoundary,
  startTransaction,
  testSentry,
  getSentryStatus,
};
