/**
 * Global Alert Context
 * Provides app-wide alert functionality and listens to alertService events
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AlertModal, AlertType, AlertButton } from '../components/common/AlertModal';
import { alertService, AlertConfig } from '../services/alertService';

// Context state
interface AlertState {
  visible: boolean;
  type: AlertType;
  title: string;
  message?: string;
  buttons: AlertButton[];
  icon?: string;
  showCloseButton?: boolean;
}

// Context value
interface GlobalAlertContextValue {
  showAlert: (config: AlertConfig) => void;
  showError: (title: string, message?: string, onOk?: () => void) => void;
  showSuccess: (title: string, message?: string, onOk?: () => void) => void;
  showWarning: (title: string, message?: string, onOk?: () => void) => void;
  showInfo: (title: string, message?: string, onOk?: () => void) => void;
  showConfirm: (
    title: string,
    message?: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => void;
  hideAlert: () => void;
}

// Default state
const initialState: AlertState = {
  visible: false,
  type: 'info',
  title: '',
  message: '',
  buttons: [{ text: 'OK', style: 'default' }],
};

// Create context
const GlobalAlertContext = createContext<GlobalAlertContextValue | undefined>(undefined);

// Provider props
interface GlobalAlertProviderProps {
  children: ReactNode;
}

/**
 * GlobalAlertProvider
 * Wraps the app and provides global alert functionality
 */
export const GlobalAlertProvider: React.FC<GlobalAlertProviderProps> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>(initialState);

  // Show alert
  const showAlert = useCallback((config: AlertConfig) => {
    setAlertState({
      visible: true,
      type: config.type || 'info',
      title: config.title,
      message: config.message,
      buttons: config.buttons || [{ text: 'OK', style: 'default' }],
      icon: config.icon,
      showCloseButton: config.showCloseButton,
    });
  }, []);

  // Hide alert
  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  // Convenience methods
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

  // Subscribe to alertService events (for alerts from outside React)
  useEffect(() => {
    const unsubscribe = alertService.subscribe(showAlert);
    return unsubscribe;
  }, [showAlert]);

  const contextValue: GlobalAlertContextValue = {
    showAlert,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showConfirm,
    hideAlert,
  };

  return (
    <GlobalAlertContext.Provider value={contextValue}>
      {children}
      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        icon={alertState.icon}
        showCloseButton={alertState.showCloseButton}
        onClose={hideAlert}
      />
    </GlobalAlertContext.Provider>
  );
};

/**
 * useGlobalAlert hook
 * Access global alert functions from any component
 */
export const useGlobalAlert = (): GlobalAlertContextValue => {
  const context = useContext(GlobalAlertContext);
  if (!context) {
    throw new Error('useGlobalAlert must be used within a GlobalAlertProvider');
  }
  return context;
};

export default GlobalAlertProvider;
