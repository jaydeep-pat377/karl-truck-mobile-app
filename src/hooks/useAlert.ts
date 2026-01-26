import { useState, useCallback } from 'react';
import { AlertType, AlertButton } from '../components/common/AlertModal';

interface AlertConfig {
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: string;
  showCloseButton?: boolean;
}

interface AlertState extends AlertConfig {
  visible: boolean;
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertState({
      ...config,
      visible: true,
      buttons: config.buttons || [{ text: 'OK', style: 'default' }],
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods for common alert types
  const showSuccess = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showAlert({
        type: 'success',
        title,
        message,
        buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
      });
    },
    [showAlert]
  );

  const showError = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showAlert({
        type: 'error',
        title,
        message,
        buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
      });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showAlert({
        type: 'warning',
        title,
        message,
        buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
      });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showAlert({
        type: 'info',
        title,
        message,
        buttons: [{ text: 'OK', onPress: onOk, style: 'default' }],
      });
    },
    [showAlert]
  );

  const showConfirm = useCallback(
    (
      title: string,
      message?: string,
      onConfirm?: () => void,
      onCancel?: () => void,
      confirmText = 'Confirm',
      cancelText = 'Cancel'
    ) => {
      showAlert({
        type: 'confirm',
        title,
        message,
        buttons: [
          { text: cancelText, onPress: onCancel, style: 'cancel' },
          { text: confirmText, onPress: onConfirm, style: 'default' },
        ],
      });
    },
    [showAlert]
  );

  return {
    alertState,
    showAlert,
    hideAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirm,
  };
};

export default useAlert;
