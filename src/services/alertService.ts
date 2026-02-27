

import { AlertType, AlertButton } from '../components/common/AlertModal';
import { captureException, addBreadcrumb } from './sentryService';

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
    if (!this.isReady || this.listeners.size === 0) {

      this.queue.push(config);
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

    // Log full error details for debugging
    console.log('[AlertService] showApiError called with:', JSON.stringify({
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url,
      method: error?.config?.method,
      baseURL: error?.config?.baseURL,
      hasRequest: !!error?.request,
      hasResponse: !!error?.response,
    }, null, 2));

    if (error?.response) {

      const status = error.response.status;
      const data = error.response.data;

      console.log(`[AlertService] API Error - Status: ${status}, URL: ${error?.config?.url}, Data:`, JSON.stringify(data));

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
      console.log('[AlertService] No response received (network/connection issue):', error?.message);
      title = 'Connection Error';
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error?.message) {
      console.log('[AlertService] Error message:', error.message);
      if (error.message.includes('timeout')) {
        title = 'Request Timeout';
        message = 'The request took too long. Please try again.';
      } else if (error.message.includes('Network')) {
        title = 'Network Error';
        message = 'Please check your internet connection and try again.';
      } else {
        message = error.message;
      }
    }

    // Send to Sentry for tracking
    addBreadcrumb({
      category: 'api.error',
      message: `${title}: ${message}`,
      level: 'error',
      data: {
        url: error?.config?.url,
        method: error?.config?.method,
        status: error?.response?.status,
      },
    });
    captureException(error instanceof Error ? error : new Error(`${title}: ${message}`), {
      apiUrl: error?.config?.url,
      apiMethod: error?.config?.method,
      apiStatus: error?.response?.status,
      apiResponseData: JSON.stringify(error?.response?.data),
    });

    console.log(`[AlertService] Showing alert - Title: "${title}", Message: "${message}"`);

    this.showError(title, message, () => {
      console.log(`[AlertService] OK button pressed for error - Title: "${title}", Message: "${message}"`);
    });
  }
}

export const alertService = new AlertService();

export default alertService;
