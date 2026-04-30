import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTranslation } from 'react-i18next';
import { ms, vs, spacing } from '../../utils/responsive';

interface LoginScreenProps {
  navigation?: any;
  route?: {
    params?: {
      verified?: boolean;
    };
  };
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordRef = useRef<TextInput>(null);

  // Check if user just verified their account
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

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Navigate to main app
      navigation?.navigate('Main');
    } catch (error) {
      setErrors({ general: t('auth.loginFailed') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation?.navigate('ForgotPassword');
  };

  const handleSignup = () => {
    navigation?.navigate('Signup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

<<<<<<< Updated upstream
          {justVerified && (
            <View
              style={[
                styles.successBanner,
                { backgroundColor: theme.colors.success.background },
              ]}
            >
              <Icon name="check-circle" size={ms(20)} color={theme.colors.success.main} />
=======
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
              {t('auth.brandTagline')}
            </Text>
          </Animated.View>


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

            <View style={styles.welcomeSection}>
>>>>>>> Stashed changes
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
              ref={passwordRef}
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
                onPress={() => setRememberMe(!rememberMe)}
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

<<<<<<< Updated upstream
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
=======

          <Animated.View
            entering={FadeInUp.delay(500).springify()}
            style={styles.footer}>
            <Text variant="caption" style={[styles.footerText, { color: loginColors.footerText }]}>
              {t('auth.poweredBy')}{' '}
              <Text variant="caption" style={[styles.footerBrand, { color: loginColors.footerBrand }]}>
                Truckast AI
              </Text>
            </Text>
          </Animated.View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
>>>>>>> Stashed changes
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
    shadowColor: '#000',
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
