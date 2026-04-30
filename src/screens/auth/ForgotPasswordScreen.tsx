/**
 * ForgotPasswordScreen
 *
 * Password recovery flow:
 * - Email input for recovery
 * - Clear instructions
 * - Success feedback
 * - Theme-aware (light/dark)
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { ms, vs, spacing } from '../../utils/responsive';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setError(t('auth.forgotPassword.emailRequired'));
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(emailValue)) {
      setError(t('auth.forgotPassword.invalidEmail'));
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsSubmitted(true);
    } catch (err) {
      setError(t('auth.forgotPassword.sendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Show success feedback
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation?.goBack();
  };

  const handleVerifyOTP = () => {
    navigation?.navigate('VerifyOTP', { email, mode: 'forgotPassword' });
  };

  // Success State
  if (isSubmitted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.card }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(24)} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Success Icon */}
          <View style={styles.successContainer}>
            <View
              style={[
                styles.successIcon,
                { backgroundColor: theme.colors.success.background },
              ]}
            >
              <Icon
                name="email-check-outline"
                size={ms(48)}
                color={theme.colors.success.main}
              />
            </View>

            <Text variant="h2" color="primary" style={styles.successTitle}>
              {t('auth.forgotPassword.checkEmail')}
            </Text>

            <Text variant="body" color="secondary" style={styles.successText}>
              {t('auth.forgotPassword.sentResetLink')}
            </Text>
            <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
              {email}
            </Text>

            <View style={styles.instructionCard}>
              <View style={styles.instructionRow}>
                <Icon name="numeric-1-circle" size={ms(24)} color={theme.colors.primary.main} />
                <Text variant="bodySmall" color="secondary" style={styles.instructionText}>
                  {t('auth.forgotPassword.instruction1')}
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <Icon name="numeric-2-circle" size={ms(24)} color={theme.colors.primary.main} />
                <Text variant="bodySmall" color="secondary" style={styles.instructionText}>
                  {t('auth.forgotPassword.instruction2')}
                </Text>
              </View>
              <View style={styles.instructionRow}>
                <Icon name="numeric-3-circle" size={ms(24)} color={theme.colors.primary.main} />
                <Text variant="bodySmall" color="secondary" style={styles.instructionText}>
                  {t('auth.forgotPassword.instruction3')}
                </Text>
              </View>
            </View>

            <Button
              title={t('auth.forgotPassword.enterOtpCode')}
              onPress={handleVerifyOTP}
              size="large"
              style={styles.otpButton}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={isLoading}
              activeOpacity={0.7}
              style={styles.resendButton}
            >
              <Text variant="body" color="secondary">
                {t('auth.forgotPassword.didntReceiveEmail')}{' '}
              </Text>
              <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
                {t('auth.forgotPassword.resend')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Email Input State
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.card }]}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Icon name="arrow-left" size={ms(24)} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.warning.background },
              ]}
            >
              <Icon
                name="lock-reset"
                size={ms(40)}
                color={theme.colors.warning.main}
              />
            </View>

<<<<<<< Updated upstream
            <Text variant="h2" color="primary" style={styles.title}>
              {t('auth.forgotPassword.title')}
=======

          <Animated.View
            entering={FadeInUp.delay(200).springify()}
            style={[
              styles.formCard,
              {
                backgroundColor: loginColors.glassCardBg,
                borderColor: loginColors.glassCardBorder,
                shadowColor: isDark ? colors.common.black : colors.grey[60],
              },
            ]}
          >

            <View style={styles.headerSection}>
              <Text
                variant="h2"
                style={[
                  styles.title,
                  { color: isDark ? colors.common.white : colors.grey[100] },
                ]}>
                {t('auth.forgotPassword.title')}
              </Text>
              <Text
                variant="body"
                style={[
                  styles.subtitle,
                  { color: isDark ? colors.grey[40] : colors.grey[60] },
                ]}>
                {t('auth.forgotPassword.subtitle')}
              </Text>
            </View>


            <View style={styles.form}>
              <AnimatedInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                icon="email-outline"
                error={error}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                isDark={isDark}
              />


              <AnimatedTouchable
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={0.9}
                style={[styles.submitButton, { shadowColor: colors.primary.dark }, buttonAnimStyle]}>
                <LinearGradient
                  colors={[colors.primary.dark, colors.primary.main, colors.primary.light]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.common.white} />
                  ) : (
                    <Text variant="body" style={[styles.submitButtonText, { color: colors.common.white }]}>
                      {t('auth.forgotPassword.sendResetLink')}
                    </Text>
                  )}
                </LinearGradient>
              </AnimatedTouchable>


              <TouchableOpacity
                onPress={handleBack}
                activeOpacity={0.7}
                style={styles.backToLogin}
              >
                <Icon name="arrow-left" size={ms(16)} color={colors.primary.main} />
                <Text variant="bodySmall" style={[styles.backToLoginText, { color: colors.primary.main }]}>
                  {t('auth.forgotPassword.backToSignIn')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>


          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.footer}>
            <Text variant="caption" style={[styles.footerText, { color: loginColors.footerText }]}>
              {t('auth.poweredBy')}{' '}
              <Text variant="caption" style={[styles.footerBrand, { color: loginColors.footerBrand }]}>
                Truckast AI
              </Text>
>>>>>>> Stashed changes
            </Text>
            <Text variant="body" color="secondary" style={styles.subtitle}>
              {t('auth.forgotPassword.subtitle')}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label={t('auth.emailAddress')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
              }}
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
              leftIcon="email-outline"
              error={error}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            <Button
              title={t('auth.forgotPassword.sendResetLink')}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading || !email.trim()}
              size="large"
              style={styles.submitButton}
            />

            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.7}
              style={styles.backToLogin}
            >
              <Icon name="arrow-left" size={ms(18)} color={theme.colors.primary.main} />
              <Text variant="body" style={{ color: theme.colors.primary.main, marginLeft: ms(8) }}>
                {t('auth.forgotPassword.backToSignIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: vs(16),
  },
  backButton: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  header: {
    alignItems: 'center',
    marginBottom: vs(32),
  },
  iconContainer: {
    width: ms(80),
    height: ms(80),
    borderRadius: ms(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  title: {
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: ms(22),
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginTop: vs(8),
    marginBottom: vs(24),
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Success state styles
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: vs(24),
  },
  successIcon: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(24),
  },
  successTitle: {
    marginBottom: vs(12),
  },
  successText: {
    textAlign: 'center',
    marginBottom: vs(4),
  },
  instructionCard: {
    width: '100%',
    marginTop: vs(32),
    marginBottom: vs(24),
    paddingVertical: vs(16),
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(8),
    paddingHorizontal: spacing.md,
  },
  instructionText: {
    marginLeft: ms(12),
    flex: 1,
  },
  otpButton: {
    width: '100%',
    marginBottom: vs(16),
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(12),
  },
});

export default ForgotPasswordScreen;
