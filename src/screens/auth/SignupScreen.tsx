
import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/common';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ms, vs, spacing } from '../../utils/responsive';

interface SignupScreenProps {
  navigation?: any;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;

    if (strength <= 1) return { level: 1, label: t('auth.signup.passwordStrength.weak'), color: theme.colors.error.main };
    if (strength === 2) return { level: 2, label: t('auth.signup.passwordStrength.fair'), color: theme.colors.warning.main };
    if (strength === 3) return { level: 3, label: t('auth.signup.passwordStrength.good'), color: theme.colors.info.main };
    return { level: 4, label: t('auth.signup.passwordStrength.strong'), color: theme.colors.success.main };
  };

  const passwordStrength = getPasswordStrength(password);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = t('auth.signup.fullNameRequired');
    }

    if (!email.trim()) {
      newErrors.email = t('auth.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!phone.trim()) {
      newErrors.phone = t('auth.signup.phoneRequired');
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = t('auth.signup.invalidPhone');
    }

    if (!password) {
      newErrors.password = t('auth.passwordRequired');
    } else if (password.length < 8) {
      newErrors.password = t('auth.signup.passwordMinLength');
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = t('auth.signup.passwordsNoMatch');
    }

    if (!acceptedTerms) {
      newErrors.terms = t('auth.signup.termsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      navigation?.navigate('VerifyOTP', { email, mode: 'signup' });
    } catch (error) {
      setErrors({ general: t('auth.signup.signupFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    navigation?.navigate('Login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text variant="h2" color="primary" style={styles.title}>
              {t('auth.signup.title')}
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              {t('auth.signup.subtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            {errors.general && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: theme.colors.error.background },
                ]}>
                <Icon name="alert-circle" size={ms(20)} color={theme.colors.error.main} />
                <Text variant="bodySmall" style={{ color: theme.colors.error.main, marginLeft: ms(8) }}>
                  {errors.general}
                </Text>
              </View>
            )}

            <Input
              label={t('auth.signup.fullName')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('auth.signup.fullNamePlaceholder')}
              leftIcon="account-outline"
              error={errors.fullName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />

            <Input
              ref={emailRef}
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.signup.emailPlaceholder')}
              leftIcon="email-outline"
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
            />

            <Input
              ref={phoneRef}
              label={t('auth.signup.phoneNumber')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.signup.phoneNumberPlaceholder')}
              leftIcon="phone-outline"
              error={errors.phone}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Input
              ref={passwordRef}
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.signup.passwordPlaceholder')}
              leftIcon="lock-outline"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
              secureTextEntry={!showPassword}
              error={errors.password}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            level <= passwordStrength.level
                              ? passwordStrength.color
                              : isDark
                                ? theme.colors.dark.border
                                : theme.colors.light.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  variant="captionSmall"
                  style={{ color: passwordStrength.color, marginLeft: ms(8) }}
                >
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            <Input
              ref={confirmPasswordRef}
              label={t('auth.confirmPassword')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.signup.confirmPasswordPlaceholder')}
              leftIcon="lock-check-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: errors.terms
                      ? theme.colors.error.main
                      : acceptedTerms
                        ? theme.colors.primary.main
                        : theme.colors.dark.border,
                    backgroundColor: acceptedTerms
                      ? theme.colors.primary.main
                      : 'transparent',
                  },
                ]}>
                {acceptedTerms && (
                  <Icon name="check" size={ms(14)} color={theme.colors.primary.contrast} />
                )}
              </View>
              <Text variant="bodySmall" color="secondary" style={styles.termsText}>
                {t('auth.signup.termsAgree')}{' '}
                <Text variant="bodySmall" style={{ color: theme.colors.primary.main }}>
                  {t('auth.signup.termsOfService')}
                </Text>
                {' '}{t('auth.signup.and')}{' '}
                <Text variant="bodySmall" style={{ color: theme.colors.primary.main }}>
                  {t('auth.signup.privacyPolicy')}
                </Text>
              </Text>
            </TouchableOpacity>
            {errors.terms && (
              <Text variant="caption" style={{ color: theme.colors.error.main, marginTop: vs(4) }}>
                {errors.terms}
              </Text>
            )}

            <Button
              title={t('auth.signup.createAccount')}
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
              size="large"
              style={styles.signupButton}
            />

            <View style={styles.loginContainer}>
              <Text variant="body" color="secondary">
                {t('auth.hasAccount')}{' '}
              </Text>
              <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
                <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
                  {t('auth.signIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: vs(20),
    paddingBottom: vs(32),
  },
  header: {
    alignItems: 'center',
    marginBottom: vs(24),
  },
  logoContainer: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  title: {
    marginBottom: vs(4),
  },
  subtitle: {
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(8),
    marginBottom: vs(16),
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(-8),
    marginBottom: vs(16),
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: ms(4),
    borderRadius: ms(2),
    marginRight: ms(4),
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: vs(8),
    marginBottom: vs(24),
  },
  checkbox: {
    width: ms(20),
    height: ms(20),
    borderRadius: ms(4),
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(12),
    marginTop: vs(2),
  },
  termsText: {
    flex: 1,
    lineHeight: ms(20),
  },
  signupButton: {
    marginBottom: vs(16),
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SignupScreen;
