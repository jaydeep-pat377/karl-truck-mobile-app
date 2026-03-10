import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/storage';

const rnBiometrics = new ReactNativeBiometrics({ allowDeviceCredentials: true });

export type BiometryTypeResult = BiometryType | null;

interface UseBiometricsReturn {
  isAvailable: boolean;
  biometryType: BiometryTypeResult;
  isEnabled: boolean;
  isLoading: boolean;
  authenticate: (promptMessage?: string) => Promise<{ success: boolean; error?: string }>;
  enableBiometrics: () => Promise<{ success: boolean; error?: string }>;
  disableBiometrics: () => Promise<void>;
  getBiometryTypeName: () => string;
  openBiometricSettings: () => void;
}

export const useBiometrics = (): UseBiometricsReturn => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryTypeResult>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometricAvailability();
    loadEnabledState();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const { available, biometryType: type } = await rnBiometrics.isSensorAvailable();
      setIsAvailable(available);
      setBiometryType(type || null);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
      setBiometryType(null);
    }
  };

  const loadEnabledState = async () => {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
      setIsEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error loading biometric enabled state:', error);
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  const authenticate = useCallback(async (promptMessage?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: promptMessage || 'Confirm your identity',
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use Passcode',
      });

      return { success };
    } catch (error: any) {
      if (error?.message?.includes('cancel') || error?.message?.includes('Cancel')) {
        return { success: false, error: 'Authentication cancelled' };
      }
      return { success: false, error: error?.message || 'Authentication failed' };
    }
  }, []);

  const enableBiometrics = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAvailable) {
      return { success: false, error: 'Biometric authentication is not available on this device' };
    }

    const result = await authenticate('Enable biometric authentication');

    if (result.success) {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      setIsEnabled(true);
      return { success: true };
    }

    return result;
  }, [isAvailable, authenticate]);

  const disableBiometrics = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    setIsEnabled(false);
  }, []);

  const getBiometryTypeName = useCallback((): string => {
    switch (biometryType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Biometrics':
        return 'Fingerprint';
      default:
        return 'Biometrics';
    }
  }, [biometryType]);

  const openBiometricSettings = useCallback(() => {
    Alert.alert(
      'Biometric Not Set Up',
      'Your device does not have any biometric authentication (fingerprint, face unlock, or PIN) configured. Please set it up in your device settings to use this feature.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.SECURITY_SETTINGS').catch(() => {
                Linking.openSettings();
              });
            } else {
              Linking.openURL('App-Prefs:PASSCODE').catch(() => {
                Linking.openSettings();
              });
            }
          },
        },
      ],
    );
  }, []);

  return {
    isAvailable,
    biometryType,
    isEnabled,
    isLoading,
    authenticate,
    enableBiometrics,
    disableBiometrics,
    getBiometryTypeName,
    openBiometricSettings,
  };
};

export default useBiometrics;
