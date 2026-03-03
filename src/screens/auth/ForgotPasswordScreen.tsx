import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon, AlertModal } from '../../components/common';
import { colors } from '../../theme/colors';
import { ms, vs, spacing } from '../../utils/responsive';
import { useForgotPassword } from '../../hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ForgotPasswordScreenProps {
  navigation?: any;
}

// Custom Animated Input Component
const AnimatedInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: string;
  error?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  isDark: boolean;
}> = ({
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType,
  onSubmitEditing,
  autoFocus,
  isDark,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);
  const loginColors = isDark ? colors.login.dark : colors.login.light;

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, { damping: 15 });
  }, [isFocused]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnim.value,
      [0, 1],
      [loginColors.inputBorder, colors.primary.main]
    ),
    transform: [{ scale: withSpring(isFocused ? 1.01 : 1, { damping: 15 }) }],
  }));

  return (
    <View style={styles.inputWrapper}>
      <Animated.View
        style={[
          styles.inputContainer,
          { backgroundColor: loginColors.inputBg },
          containerAnimStyle,
          error && styles.inputError,
        ]}>
        <Icon
          name={icon}
          size={ms(20)}
          color={isFocused ? colors.primary.main : colors.grey[50]}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? colors.grey[60] : colors.grey[50]}
          style={[
            styles.input,
            { color: isDark ? colors.common.white : colors.grey[100] },
          ]}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </Animated.View>
      {error && (
        <Animated.Text
          entering={FadeInDown.duration(200)}
          style={styles.errorText}>
          {error}
        </Animated.Text>
      )}
    </View>
  );
};

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const {
    forgotPassword,
    isLoading,
    isSuccess,
    isError,
    error: apiError,
    reset,
  } = useForgotPassword();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const buttonScale = useSharedValue(1);

  const loginColors = isDark ? colors.login.dark : colors.login.light;

  useEffect(() => {
    if (isSuccess) {
      setShowSuccessModal(true);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError && apiError) {
      setError(apiError);
    }
  }, [isError, apiError]);

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

    try {
      await forgotPassword(email);
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate('Login');
    }
  };

  const handleModalClose = () => {
    setShowSuccessModal(false);
    reset();
    setEmail('');
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      navigation?.navigate('Login');
    }
  };

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.common.transparent}
        translucent
      />

      {/* Gradient Background */}
      <LinearGradient
        colors={loginColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Decorative Circles */}
      <View style={[styles.decorativeCircle, styles.circle1, { backgroundColor: loginColors.decorativeCircle, opacity: loginColors.circleOpacity1 }]} />
      <View style={[styles.decorativeCircle, styles.circle2, { backgroundColor: loginColors.decorativeCircle, opacity: loginColors.circleOpacity2 }]} />
      <View style={[styles.decorativeCircle, styles.circle3, { backgroundColor: loginColors.decorativeCircle, opacity: loginColors.circleOpacity3 }]} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
          {/* Icon Section */}
          <Animated.View
            entering={FadeInDown.delay(150).springify()}
            style={styles.iconSection}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.warning.background }]}>
              <Icon
                name="lock-reset"
                size={ms(36)}
                color={colors.warning.main}
              />
            </View>
          </Animated.View>

          {/* Form Container */}
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
            {/* Header Text */}
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

            {/* Form Section */}
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

              {/* Submit Button */}
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

              {/* Back to Login */}
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

          {/* Footer */}
          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.footer}>
            <Text variant="caption" style={[styles.footerText, { color: loginColors.footerText }]}>
              Powered by{' '}
              <Text variant="caption" style={[styles.footerBrand, { color: loginColors.footerBrand }]}>
                Truckast
              </Text>
            </Text>
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>

      <AlertModal
        visible={showSuccessModal}
        type="success"
        title="Email Sent"
        message={`Password reset link has been sent to ${email}`}
        buttons={[
          {
            text: 'OK',
            onPress: handleModalClose,
          },
        ]}
        onClose={handleModalClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.8,
    top: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.3,
  },
  circle2: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    bottom: SCREEN_HEIGHT * 0.1,
    left: -SCREEN_WIDTH * 0.3,
  },
  circle3: {
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    bottom: -SCREEN_WIDTH * 0.1,
    right: SCREEN_WIDTH * 0.1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: vs(60),
    paddingBottom: vs(24),
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: vs(20),
  },
  iconContainer: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    borderRadius: ms(24),
    padding: ms(24),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: vs(24),
  },
  title: {
    fontSize: ms(22),
    fontWeight: '700',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(14),
    textAlign: 'center',
    lineHeight: ms(20),
    paddingHorizontal: spacing.sm,
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: vs(16),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ms(16),
    paddingVertical: ms(14),
    borderRadius: ms(14),
    borderWidth: 1.5,
    gap: ms(12),
  },
  inputError: {
    borderColor: colors.error.main,
  },
  input: {
    flex: 1,
    fontSize: ms(15),
    padding: 0,
  },
  errorText: {
    fontSize: ms(12),
    color: colors.error.main,
    marginTop: vs(6),
    marginLeft: ms(4),
  },
  submitButton: {
    marginTop: vs(8),
    marginBottom: vs(20),
    borderRadius: ms(14),
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontWeight: '700',
    fontSize: ms(16),
    letterSpacing: 0.5,
  },
  backToLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLoginText: {
    fontWeight: '600',
    marginLeft: ms(6),
  },
  footer: {
    alignItems: 'center',
    marginTop: vs(24),
  },
  footerText: {
    fontSize: ms(12),
  },
  footerBrand: {
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
