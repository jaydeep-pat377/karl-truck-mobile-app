

import { AlertType, AlertButton } from '../components/common/AlertModal';
import { captureException, addBreadcrumb } from './sentryService';
import Toast from 'react-native-toast-message';

export interface AlertConfig {
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: string;
  showCloseButton?: boolean;
  autoDismiss?: boolean;
  autoDismissTimeout?: number;
}

type AlertListener = (config: AlertConfig) => void;

class AlertService {
  private listeners: Set<AlertListener> = new Set();
  private queue: AlertConfig[] = [];
  private isReady: boolean = false;

  // Deduplication — prevent identical alerts within 2 seconds
  private lastAlertTitle: string | null = null;
  private lastAlertTime: number = 0;
  private static readonly DEDUP_WINDOW_MS = 2000;
  private static readonly MAX_QUEUE_SIZE = 3;

  subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    this.isReady = true;

    this.processQueue();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.isReady = false;
      }
    };
  }

  show(config: AlertConfig): void {
    // Deduplicate: skip if same title shown within 2 seconds
    const now = Date.now();
    if (config.title === this.lastAlertTitle && now - this.lastAlertTime < AlertService.DEDUP_WINDOW_MS) {
      return;
    }
    this.lastAlertTitle = config.title;
    this.lastAlertTime = now;

    if (!this.isReady || this.listeners.size === 0) {
      if (this.queue.length < AlertService.MAX_QUEUE_SIZE) {
        this.queue.push(config);
      }
      return;
    }

    this.listeners.forEach(listener => listener(config));
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.isReady) {
      const config = this.queue.shift();
      if (config) {

        setTimeout(() => this.show(config), 100);
      }
    }
  }

  showError(title: string, message?: string, onOk?: () => void): void {
    this.show({
      type: 'error',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
    });
  }

  showSuccess(title: string, message?: string, onOk?: () => void): void {
    this.show({
      type: 'success',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
    });
  }

  showWarning(title: string, message?: string, onOk?: () => void): void {
    this.show({
      type: 'warning',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
    });
  }

  showInfo(title: string, message?: string, onOk?: () => void): void {
    this.show({
      type: 'info',
      title,
      message,
      buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
    });
  }

  showApiError(error: any): void {
    let title = 'Error';
    let message = 'Something went wrong. Please try again.';

    if (error?.response) {

      const status = error.response.status;
      const data = error.response.data;

      if (data?.message) {
        message = data.message;
      } else if (data?.error) {
        message = data.error;
      }

      switch (status) {
        case 400:
          title = 'Invalid Request';
          break;
        case 401:
          title = 'Session Expired';
          message = 'Please log in again to continue.';
          break;
        case 403:
          title = 'Access Denied';
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          title = 'Not Found';
          message = data?.message || 'The requested resource was not found.';
          break;
        case 422:
          title = 'Validation Error';

          if (data?.errors && Array.isArray(data.errors)) {
            message = data.errors.map((e: any) => e.message || e).join('\n');
          }
          break;
        case 429:
          title = 'Too Many Requests';
          message = 'Please wait a moment before trying again.';
          break;
        case 500:
        case 502:
        case 503:
          title = 'Server Error';
          message = 'Our servers are experiencing issues. Please try again later.';
          break;
        default:
          title = 'Error';
      }
    } else if (error?.request) {
      // Request was made but no response received - differentiate between timeout and connection failure
      const errorCode = error?.code;
      const errorMessage = error?.message?.toLowerCase() || '';

      if (errorCode === 'ECONNABORTED' || errorMessage.includes('timeout')) {
        // Request timeout - server took too long to respond
        title = 'Request Timeout';
        message = 'The server is taking too long to respond. Please try again.';
      } else if (errorCode === 'ERR_NETWORK' || errorMessage.includes('network error')) {
        // Network error - device may be offline or server unreachable
        title = 'Network Error';
        message = 'Unable to reach the server. Please check your internet connection.';
      } else if (errorMessage.includes('certificate') || errorMessage.includes('ssl') || errorMessage.includes('tls')) {
        // SSL/TLS certificate issues
        title = 'Security Error';
        message = 'Unable to establish a secure connection. Please try again later.';
      } else {
        // Generic connection failure
        title = 'Connection Error';
        message = 'Unable to connect to the server. Please check your internet connection.';
      }
    } else if (error?.message) {
      const errorMessage = error.message.toLowerCase();
      if (errorMessage.includes('timeout')) {
        title = 'Request Timeout';
        message = 'The request took too long. Please try again.';
      } else if (errorMessage.includes('network')) {
        title = 'Network Error';
        message = 'Please check your internet connection and try again.';
      } else {
        message = error.message;
      }
    }


    const status = error?.response?.status;

    addBreadcrumb({
      category: 'api.error',
      message: `${title}: ${message}`,
      level: 'error',
      data: {
        url: error?.config?.url,
        method: error?.config?.method,
        status,
      },
    });

    // Only capture server errors (5xx) and network/timeout errors to Sentry.
    // Client errors (400, 422, 403, 404, 429) are user mistakes or expected
    // conditions — they flood Sentry with non-actionable noise.
    if (!status || status >= 500) {
      captureException(error instanceof Error ? error : new Error(`${title}: ${message}`), {
        apiUrl: error?.config?.url,
        apiMethod: error?.config?.method,
        apiStatus: status,
        apiResponseData: JSON.stringify(error?.response?.data),
      });
    }

    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 5000,
      autoHide: true,
      topOffset: 50,
    });
  }
}

export const alertService = new AlertService();

export default alertService;
