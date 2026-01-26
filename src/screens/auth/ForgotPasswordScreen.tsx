import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Input, Button, Icon, AlertModal } from '../../components/common';
import { ms, vs, spacing } from '../../utils/responsive';
import { useForgotPassword } from '../../hooks';

interface ForgotPasswordScreenProps {
  navigation?: any;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const { theme } = useTheme();
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

  // Handle API success
  useEffect(() => {
    if (isSuccess) {
      setShowSuccessModal(true);
    }
  }, [isSuccess]);

  // Handle API error
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
      // Error is handled by the hook
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

            <Text variant="h2" color="primary" style={styles.title}>
              {t('auth.forgotPassword.title')}
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
              disabled={isLoading}
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

      {/* Success Modal */}
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
});

export default ForgotPasswordScreen;
