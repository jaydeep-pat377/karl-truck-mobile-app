/**
 * VerifyOTPScreen
 *
 * OTP verification screen with:
 * - 6-digit code input with auto-focus
 * - Countdown timer for resend
 * - Clear visual feedback
 * - Theme-aware (light/dark)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Button } from '../../components/common/Button';
import { ms, vs, spacing } from '../../utils/responsive';

interface VerifyOTPScreenProps {
  navigation?: any;
  route?: {
    params?: {
      email?: string;
      phone?: string;
      mode?: 'signup' | 'forgotPassword';
    };
  };
}

const OTP_LENGTH = 6;
const RESEND_TIMEOUT = 60; // seconds

export const VerifyOTPScreen: React.FC<VerifyOTPScreenProps> = ({
  navigation,
  route,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const email = route?.params?.email || 'your email';
  const mode = route?.params?.mode || 'signup';
  const isPasswordReset = mode === 'forgotPassword';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_TIMEOUT);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 500);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');

    if (numericValue.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = numericValue;
      setOtp(newOtp);
      setError('');

      // Auto-focus next input
      if (numericValue && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits entered
      if (index === OTP_LENGTH - 1 && numericValue) {
        const fullOtp = newOtp.join('');
        if (fullOtp.length === OTP_LENGTH) {
          Keyboard.dismiss();
          handleVerify(fullOtp);
        }
      }
    } else if (numericValue.length === OTP_LENGTH) {
      // Handle paste
      const digits = numericValue.split('');
      setOtp(digits);
      inputRefs.current[OTP_LENGTH - 1]?.focus();
      Keyboard.dismiss();
      handleVerify(numericValue);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError(t('auth.otp.enterAllDigits'));
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For demo: 123456 is valid
      if (code === '123456') {
        if (isPasswordReset) {
          navigation?.navigate('ResetPassword', { token: code });
        } else {
          navigation?.navigate('Login', { verified: true });
        }
      } else {
        setError(t('auth.otp.invalidCode'));
        setOtp(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError(t('auth.otp.verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResendTimer(RESEND_TIMEOUT);
      setCanResend(false);
      setOtp(Array(OTP_LENGTH).fill(''));
      setError('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation?.goBack();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOtpComplete = otp.every(digit => digit !== '');

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

        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: theme.colors.info.background },
            ]}
          >
            <Icon
              name="shield-check-outline"
              size={ms(40)}
              color={theme.colors.info.main}
            />
          </View>

          <Text variant="h2" color="primary" style={styles.title}>
            {isPasswordReset ? t('auth.otp.verifyIdentity') : t('auth.otp.verifyEmail')}
          </Text>
          <Text variant="body" color="secondary" style={styles.subtitle}>
            {t('auth.otp.enterCode')}
          </Text>
          <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
            {email}
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: error
                    ? theme.colors.error.main
                    : digit
                    ? theme.colors.primary.main
                    : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              selectionColor={theme.colors.primary.main}
            />
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={ms(16)} color={theme.colors.error.main} />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.error.main, marginLeft: ms(6) }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Verify Button */}
        <Button
          title={t('auth.otp.verifyCode')}
          onPress={() => handleVerify()}
          loading={isLoading}
          disabled={isLoading || !isOtpComplete}
          size="large"
          style={styles.verifyButton}
        />

        {/* Resend Section */}
        <View style={styles.resendContainer}>
          {!canResend ? (
            <View style={styles.timerContainer}>
              <Icon name="clock-outline" size={ms(18)} color={theme.colors.secondary.main} />
              <Text variant="body" color="secondary" style={styles.timerText}>
                {t('auth.otp.resendCodeIn')}{' '}
                <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
                  {formatTime(resendTimer)}
                </Text>
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleResend}
              disabled={isLoading}
              activeOpacity={0.7}
              style={styles.resendButton}
            >
              <Text variant="body" color="secondary">
                {t('auth.otp.didntReceiveCode')}{' '}
              </Text>
              <Text variant="body" style={{ color: theme.colors.primary.main, fontWeight: '600' }}>
                {t('auth.otp.resend')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Icon name="information-outline" size={ms(18)} color={theme.colors.secondary.main} />
          <Text variant="caption" color="hint" style={styles.helpText}>
            {t('auth.otp.checkSpam')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    marginBottom: vs(16),
  },
  otpInput: {
    width: ms(48),
    height: ms(56),
    borderRadius: ms(12),
    borderWidth: 2,
    fontSize: ms(24),
    fontWeight: '700',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  verifyButton: {
    marginBottom: vs(24),
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: vs(24),
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    marginLeft: ms(8),
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: vs(12),
  },
  helpText: {
    marginLeft: ms(8),
    flex: 1,
    lineHeight: ms(18),
  },
});

export default VerifyOTPScreen;
