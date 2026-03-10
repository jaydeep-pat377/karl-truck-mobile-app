import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  TouchableOpacity,
  TextInput,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../../components/common';
import { colors } from '../../theme/colors';
import { useTranslation } from 'react-i18next';
import { ms, vs, spacing } from '../../utils/responsive';
import { useLogin } from '../../hooks/useLogin';
import { STORAGE_KEYS } from '../../utils/storage';
import { notificationService } from '../../services/notificationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface LoginScreenProps {
  navigation?: any;
  route?: {
    params?: {
      verified?: boolean;
    };
  };
}

const REMEMBER_ME_EMAIL = 'rememberMeEmail';
const REMEMBER_ME_PASSWORD = 'rememberMePassword';

// Custom Animated Input Component
const AnimatedInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon: string;
  secureTextEntry?: boolean;
  rightIcon?: string;
  onRightIconPress?: () => void;
  error?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput>;
  isDark: boolean;
}> = ({
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  rightIcon,
  onRightIconPress,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  returnKeyType,
  onSubmitEditing,
  inputRef,
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
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? colors.grey[60] : colors.grey[50]}
          style={[
            styles.input,
            { color: isDark ? colors.common.white : colors.grey[100] },
          ]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
            <Icon
              name={rightIcon}
              size={ms(20)}
              color={colors.grey[50]}
            />
          </TouchableOpacity>
        )}
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

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();
  const { login, isLoading, error: authError, reset: clearError } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

  const passwordRef = useRef<TextInput>(null);
  const buttonScale = useSharedValue(1);

  const loginColors = isDark ? colors.login.dark : colors.login.light;

  const loadSavedCredentials = useCallback(async () => {
    try {
      const [savedEmail, savedPassword, savedRememberMe] = await AsyncStorage.multiGet([
        REMEMBER_ME_EMAIL,
        REMEMBER_ME_PASSWORD,
        STORAGE_KEYS.REMEMBER_ME,
      ]);

      if (savedRememberMe[1] === 'true' && savedEmail[1]) {
        setEmail(savedEmail[1]);
        if (savedPassword[1]) {
          setPassword(savedPassword[1]);
        }
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

  const handleRememberMe = async (shouldRemember: boolean, userEmail: string, userPassword: string) => {
    try {
      if (shouldRemember) {
        await AsyncStorage.multiSet([
          [REMEMBER_ME_EMAIL, userEmail],
          [REMEMBER_ME_PASSWORD, userPassword],
          [STORAGE_KEYS.REMEMBER_ME, 'true'],
        ]);
      } else {
        await AsyncStorage.multiRemove([
          REMEMBER_ME_EMAIL,
          REMEMBER_ME_PASSWORD,
          STORAGE_KEYS.REMEMBER_ME,
        ]);
      }
    } catch (error) {
      console.error('Error saving remember me:', error);
    }
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    clearError();
    setErrors({});

    try {
      // Save credentials before login attempt if Remember Me is checked
      // This ensures credentials are saved before navigation happens
      await handleRememberMe(rememberMe, email, password);

      const deviceToken = await notificationService.getToken();
      await login(email, password, deviceToken || undefined);
    } catch (error) {
      console.log('Login error:', error);
      // If login fails and Remember Me was checked, clear the saved credentials
      if (rememberMe) {
        await handleRememberMe(false, '', '');
        // Keep the checkbox checked for user to try again
        setRememberMe(true);
      }
    }
  };

  const handleForgotPassword = () => {
    navigation?.navigate('ForgotPassword');
  };

  const toggleRememberMe = async () => {
    const newValue = !rememberMe;
    setRememberMe(newValue);

    if (!newValue) {
      await handleRememberMe(false, '', '');
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

  if (isLoadingCredentials) {
    return (
      <View style={[styles.container, { backgroundColor: loginColors.loadingBg }]} />
    );
  }

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
          {/* Logo Section */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.logoSection}
          >
            <View style={[styles.logoContainer, { backgroundColor: loginColors.logoContainerBg }]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text variant="h1" style={[styles.brandTitle, { color: isDark ? colors.common.white : colors.primary.main }]}>
              Truckast AI
            </Text>
            <Text variant="caption" style={[styles.brandTagline, { color: loginColors.brandTagline }]}>
              Concrete Delivery Management
            </Text>
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
            {/* Welcome Text */}
            <View style={styles.welcomeSection}>
              <Text
                variant="h2"
                style={[
                  styles.welcomeTitle,
                  { color: isDark ? colors.common.white : colors.grey[100] },
                ]}>
                {t('auth.welcomeBack')}
              </Text>
              <Text
                variant="body"
                style={[
                  styles.welcomeSubtitle,
                  { color: isDark ? colors.grey[40] : colors.grey[60] },
                ]}>
                {t('auth.enterCredentials')}
              </Text>
            </View>

            {justVerified && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={[styles.successBanner, { backgroundColor: colors.success.background }]}>
                <Icon name="check-circle" size={ms(18)} color={colors.success.main} />
                <Text variant="bodySmall" style={[styles.bannerText, { color: colors.success.main }]}>
                  {t('auth.accountVerified')}
                </Text>
              </Animated.View>
            )}

            {errors.general && (
              <Animated.View
                entering={FadeInDown.springify()}
                style={[styles.errorBanner, { backgroundColor: colors.error.background }]}>
                <Icon name="alert-circle" size={ms(18)} color={colors.error.main} />
                <Text variant="bodySmall" style={[styles.bannerText, { color: colors.error.main }]}>
                  {errors.general}
                </Text>
              </Animated.View>
            )}

            {/* Form Section */}
            <View style={styles.form}>
              <AnimatedInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                placeholder={t('auth.emailPlaceholder')}
                icon="email-outline"
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                isDark={isDark}
              />

              <AnimatedInput
                inputRef={passwordRef}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: '' });
                }}
                placeholder={t('auth.passwordPlaceholder')}
                icon="lock-outline"
                rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setShowPassword(!showPassword)}
                secureTextEntry={!showPassword}
                error={errors.password}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                isDark={isDark}
              />

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberMe}
                  onPress={toggleRememberMe}
                  activeOpacity={0.7}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: rememberMe ? colors.primary.main : isDark ? colors.grey[60] : colors.grey[40],
                        backgroundColor: rememberMe ? colors.primary.main : colors.common.transparent,
                      },
                    ]}>
                    {rememberMe && (
                      <Icon name="check" size={ms(10)} color={colors.common.white} />
                    )}
                  </View>
                  <Text
                    variant="bodySmall"
                    style={{ color: isDark ? colors.grey[40] : colors.grey[60] }}>
                    {t('auth.rememberMe')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text variant="bodySmall" style={[styles.forgotPassword, { color: colors.primary.main }]}>
                    {t('auth.forgotPass')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Login Button - Outside form card to avoid iOS clipping */}
          <Animated.View
            entering={FadeInUp.delay(300).springify()}
            style={styles.loginButtonWrapper}
          >
            <AnimatedTouchable
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              activeOpacity={0.9}
              style={[styles.loginButton, { shadowColor: colors.primary.dark }, buttonAnimStyle]}>
              <LinearGradient
                colors={[colors.primary.dark, colors.primary.main, colors.primary.light]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButtonGradient}>
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.common.white} />
                ) : (
                  <Text variant="body" style={[styles.loginButtonText, { color: colors.common.white }]}>
                    {t('auth.signIn')}
                  </Text>
                )}
              </LinearGradient>
            </AnimatedTouchable>
          </Animated.View>

          {/* Footer */}
          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.footer}>
            <Text variant="caption" style={[styles.footerText, { color: loginColors.footerText }]}>
              Powered by{' '}
              <Text variant="caption" style={[styles.footerBrand, { color: loginColors.footerBrand }]}>
                Truckast AI
              </Text>
            </Text>
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
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
    paddingTop: vs(50),
    paddingBottom: vs(40),
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: vs(16),
  },
  logoContainer: {
    width: ms(72),
    height: ms(72),
    borderRadius: ms(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(12),
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  logo: {
    width: ms(48),
    height: ms(48),
  },
  brandTitle: {
    fontSize: ms(28),
    fontWeight: '700',
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: ms(12),
    marginTop: vs(4),
    letterSpacing: 0.5,
  },
  formCard: {
    borderRadius: ms(24),
    paddingHorizontal: ms(24),
    paddingTop: ms(24),
    paddingBottom: ms(28),
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  welcomeSection: {
    marginBottom: vs(20),
  },
  welcomeTitle: {
    fontSize: ms(22),
    fontWeight: '700',
    marginBottom: vs(4),
  },
  welcomeSubtitle: {
    fontSize: ms(14),
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(12),
    marginBottom: vs(16),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: ms(12),
    borderRadius: ms(12),
    marginBottom: vs(16),
  },
  bannerText: {
    marginLeft: ms(8),
    flex: 1,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: ms(18),
    height: ms(18),
    borderRadius: ms(5),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(8),
  },
  forgotPassword: {
    fontWeight: '600',
  },
  loginButtonWrapper: {
    marginTop: vs(20),
    width: '100%',
  },
  loginButton: {
    width: '100%',
    height: ms(52),
    borderRadius: ms(14),
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    fontWeight: '700',
    fontSize: ms(16),
    letterSpacing: 0.5,
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

export default LoginScreen;
