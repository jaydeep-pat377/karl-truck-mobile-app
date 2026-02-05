import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Input, Button, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { useTranslation } from 'react-i18next';
import { ms, vs, spacing } from '../../utils/responsive';
import { useLogin } from '../../hooks/useLogin';
import { STORAGE_KEYS } from '../../utils/storage';
import { notificationService } from '../../services/notificationService';

interface LoginScreenProps {
  navigation?: any;
  route?: {
    params?: {
      verified?: boolean;
    };
  };
}

// Additional storage keys for remember me
const REMEMBER_ME_EMAIL = 'rememberMeEmail';

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { login, isLoading, error: authError, reset: clearError } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  const passwordRef = useRef<TextInput>(null);

  const loadSavedCredentials = useCallback(async () => {
    try {
      const [savedEmail, savedRememberMe] = await AsyncStorage.multiGet([
        REMEMBER_ME_EMAIL,
        STORAGE_KEYS.REMEMBER_ME,
      ]);

      if (savedRememberMe[1] === 'true' && savedEmail[1]) {
        setEmail(savedEmail[1]);
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    } finally {
      setIsLoadingCredentials(false);
    }
  }, []);

  useEffect(() => {
    loadSavedCredentials();
  }, [loadSavedCredentials]);

  useEffect(() => {
    if (authError) {
      setErrors(prev => ({ ...prev, general: authError }));
    }
  }, [authError]);

  const justVerified = route?.params?.verified;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save or clear remember me credentials
  const handleRememberMe = async (shouldRemember: boolean, userEmail: string) => {
    try {
      if (shouldRemember) {
        await AsyncStorage.multiSet([
          [REMEMBER_ME_EMAIL, userEmail],
          [STORAGE_KEYS.REMEMBER_ME, 'true'],
        ]);
      } else {
        await AsyncStorage.multiRemove([
          REMEMBER_ME_EMAIL,
          STORAGE_KEYS.REMEMBER_ME,
        ]);
      }
    } catch (error) {
      console.error('Error saving remember me:', error);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    clearError();
    setErrors({});

    try {
      const deviceToken = await notificationService.getToken();

      await login(email, password, deviceToken || undefined);
      await handleRememberMe(rememberMe, email);

    } catch (error) {
      console.log('Login error:', error);
    }
  };

  const handleForgotPassword = () => {
    navigation?.navigate('ForgotPassword');
  };

  const toggleRememberMe = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);

    // If unchecking, clear saved credentials immediately
    if (!newValue) {
      await handleRememberMe(false, '');
    }
  };

  if (isLoadingCredentials) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
        extraHeight={120}
      >

          {justVerified && (
            <View
              style={[
                styles.successBanner,
                { backgroundColor: theme.colors.success.background },
              ]}>
              <Icon name="check-circle" size={ms(20)} color={theme.colors.success.main} />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.success.main, marginLeft: ms(8), flex: 1 }}>
                {t('auth.accountVerified')}
              </Text>
            </View>
          )}

          <View style={styles.welcomeSection}>
            <Text variant="h2" color="primary" align="center">
              {t('auth.welcomeBack')}
            </Text>
            <Text variant="body" color="secondary" align="center" style={styles.subtitle}>
              {t('auth.enterCredentials')}
            </Text>
          </View>

          {errors.general && (
            <View
              style={[
                styles.errorBanner,
                { backgroundColor: theme.colors.error.background },
              ]}>
              <Icon name="alert-circle" size={ms(20)} color={theme.colors.error.main} />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error.main, marginLeft: ms(8) }}>
                {errors.general}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Input
              label={t('auth.email')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder={t('auth.emailPlaceholder')}
              leftIcon="email-outline"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Input
              label={t('auth.password')}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
              placeholder={t('auth.passwordPlaceholder')}
              leftIcon="lock-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              secureTextEntry={!showPassword}
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />


            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMe}
                onPress={toggleRememberMe}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: theme.colors.primary.main,
                      backgroundColor: rememberMe
                        ? theme.colors.primary.main
                        : 'transparent',
                    },
                  ]}>
                  {rememberMe && (
                    <Icon name="check"
                      size={ms(12)}
                      color={theme.colors.primary.contrast} />
                  )}
                </View>
                <Text variant="bodySmall" color="secondary">
                  {t('auth.rememberMe')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleForgotPassword}
                activeOpacity={0.7}>
                <Text variant="bodySmall"
                  style={{ color: theme.colors.primary.main }}>
                  {t('auth.forgotPass')}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title={t('auth.signIn')}
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              size="large"
              style={styles.loginButton}
            />

          </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: vs(40),
    paddingBottom: vs(32),
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: vs(32),
  },
  logoContainer: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    shadowColor: colors.common.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    marginBottom: vs(4),
  },
  companyName: {
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(8),
    marginBottom: vs(16),
  },
  welcomeSection: {
    marginBottom: vs(24),
  },
  subtitle: {
    marginTop: vs(4),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(8),
    marginBottom: vs(16),
  },
  form: {
    width: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: vs(-4),
    marginBottom: vs(20),
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(4),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(8),
  },
  loginButton: {
    marginBottom: vs(20),
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: ms(16),
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
