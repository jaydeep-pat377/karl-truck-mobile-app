/**
 * Sentry Error Tracking Service
 * Handles initialization and error reporting for the app
 */

import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_ENV } from '@env';

// Only enable Sentry in production
const isProduction = APP_ENV === 'production';
const isSentryConfigured = isProduction && !!SENTRY_DSN && SENTRY_DSN !== 'your_sentry_dsn_here';

/**
 * Initialize Sentry SDK
 * Should be called as early as possible in app lifecycle
 */
export const initSentry = (): void => {
  if (!isSentryConfigured) {
    if (__DEV__) {
      console.log('[Sentry] Skipping initialization (only enabled in production)');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV || 'production',
    enabled: true,
    debug: false, // Disable debug logs in production

    // Disable native SDK warning alert
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

  console.log(`[Sentry] Initialized for production environment`);
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
export const testSentry = async (): Promise<void> => {
  console.log('[Sentry] Testing integration...');
  console.log('[Sentry] Production mode:', isProduction);
  console.log('[Sentry] Configured:', isSentryConfigured);

  if (!isSentryConfigured) {
    console.log('[Sentry] Not configured - Sentry only runs in production');
    return;
  }

  try {
    const timestamp = new Date().toISOString();

    // Send a test error
    const testError = new Error(`Sentry Test Error - ${timestamp}`);
    const errorId = Sentry.captureException(testError);
    console.log('[Sentry] Error captured with ID:', errorId);

    // Force flush to ensure events are sent immediately
    const flushed = await Sentry.flush(5000);
    console.log('[Sentry] Flush completed:', flushed);
    console.log('[Sentry] Check dashboard: https://truckast.sentry.io/issues/');
  } catch (error) {
    console.log('[Sentry] Test failed:', error);
  }
};

/**
 * Get Sentry status info for debugging
 */
export const getSentryStatus = (): {
  configured: boolean;
  enabled: boolean;
  dsn: string | undefined;
  environment: string;
} => {
  return {
    configured: !!SENTRY_DSN && SENTRY_DSN !== 'your_sentry_dsn_here',
    enabled: isSentryConfigured, // Only true in production
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
