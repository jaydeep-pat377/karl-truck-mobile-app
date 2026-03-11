import * as Sentry from '@sentry/react-native';
import { SENTRY_DSN, APP_ENV } from '@env';

let isInitialized = false;

const SENTRY_DSN_VALUE = SENTRY_DSN || '';
const hasDsn = !!SENTRY_DSN_VALUE && SENTRY_DSN_VALUE !== 'your_sentry_dsn_here';

const makeFetchTransport = (options: any) => {
  const { url } = options;
  return {
    send: async (envelope: any) => {
      try {
        const [header, ...items] = envelope;
        const envelopeString = [
          JSON.stringify(header),
          ...items.flatMap(([itemHeader, payload]: [any, any]) => [
            JSON.stringify(itemHeader),
            typeof payload === 'string' ? payload : JSON.stringify(payload),
          ]),
        ].join('\n');

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-sentry-envelope',
          },
          body: envelopeString,
        });

        return {
          statusCode: response.status,
          headers: {
            'x-sentry-rate-limits': response.headers.get('x-sentry-rate-limits') || '',
            'retry-after': response.headers.get('retry-after') || '',
          },
        };
      } catch (error) {
        return { statusCode: 0 };
      }
    },
    flush: async (timeout?: number) => true,
  };
};

export const initSentry = (): void => {
  if (!hasDsn) {
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN_VALUE,
      environment: APP_ENV || 'production',
      enabled: true,
      debug: __DEV__,
      enableNativeNagger: false,
      tracesSampleRate: APP_ENV === 'production' ? 0.2 : 1.0,
      transport: makeFetchTransport,
      beforeSend(event) {
        if (__DEV__ && event.exception?.values?.[0]?.type === 'NetworkError') {
          return null;
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
          if (breadcrumb.data?.url?.includes('password') ||
            breadcrumb.data?.url?.includes('token')) {
            breadcrumb.data.url = '[FILTERED]';
          }
        }
        return breadcrumb;
      },
    });

    isInitialized = true;
  } catch (error) {
    isInitialized = false;
  }
};

export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
}): void => {
  if (!isInitialized) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
};

export const clearUserContext = (): void => {
  if (!isInitialized) return;
  Sentry.setUser(null);
};

export const captureException = (
  error: Error | unknown,
  context?: Record<string, unknown>
): void => {
  if (!isInitialized) {
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

export const captureMessage = (
  message: string,
  level: Sentry.SeverityLevel = 'info'
): void => {
  if (!isInitialized) {
    return;
  }
  Sentry.captureMessage(message, level);
};

export const addBreadcrumb = (breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void => {
  if (!isInitialized) return;
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
};

export const setTag = (key: string, value: string): void => {
  if (!isInitialized) return;
  Sentry.setTag(key, value);
};

export const setTags = (tags: Record<string, string>): void => {
  if (!isInitialized) return;
  Sentry.setTags(tags);
};

export const withErrorBoundary = Sentry.wrap;

export const ErrorBoundary = Sentry.ErrorBoundary;

export const startTransaction = (
  name: string,
  op: string
): Sentry.Span | undefined => {
  if (!isInitialized) return undefined;
  return Sentry.startInactiveSpan({ name, op });
};

export const getSentryStatus = (): {
  configured: boolean;
  initialized: boolean;
  dsn: string | undefined;
  environment: string;
} => {
  return {
    configured: hasDsn,
    initialized: isInitialized,
    dsn: SENTRY_DSN_VALUE ? SENTRY_DSN_VALUE.substring(0, 40) + '...' : undefined,
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
  getSentryStatus,
};
