import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
<<<<<<< Updated upstream
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
=======
import { useTranslation } from 'react-i18next';
>>>>>>> Stashed changes
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from '../../components/common/Text';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ms, vs, spacing } from '../../utils/responsive';

interface ChangePasswordScreenProps {
  navigation?: any;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();
  const { theme, isDark } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const getPasswordStrength = (pwd: string): {
    level: number;
    label: string;
    color: string;
    requirements: { met: boolean; text: string }[];
  } => {
    const requirements = [
      { met: pwd.length >= 8, text: t('auth.changePassword.requirements.minLength') },
      { met: /[a-z]/.test(pwd), text: t('auth.changePassword.requirements.lowercase') },
      { met: /[A-Z]/.test(pwd), text: t('auth.changePassword.requirements.uppercase') },
      { met: /\d/.test(pwd), text: t('auth.changePassword.requirements.number') },
      { met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd), text: t('auth.changePassword.requirements.specialChar') },
    ];

    const metCount = requirements.filter(r => r.met).length;

    if (metCount <= 2) return { level: 1, label: t('auth.changePassword.strength.weak'), color: theme.colors.error.main, requirements };
    if (metCount === 3) return { level: 2, label: t('auth.changePassword.strength.fair'), color: theme.colors.warning.main, requirements };
    if (metCount === 4) return { level: 3, label: t('auth.changePassword.strength.good'), color: theme.colors.info.main, requirements };
    return { level: 4, label: t('auth.changePassword.strength.strong'), color: theme.colors.success.main, requirements };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = t('auth.changePassword.errors.currentPasswordRequired');
    }

    if (!newPassword) {
      newErrors.newPassword = t('auth.changePassword.errors.newPasswordRequired');
    } else if (newPassword.length < 8) {
      newErrors.newPassword = t('auth.changePassword.errors.minLength');
    } else if (passwordStrength.level < 3) {
      newErrors.newPassword = t('auth.changePassword.errors.weakPassword');
    }

    if (newPassword === currentPassword) {
      newErrors.newPassword = t('auth.changePassword.errors.sameAsCurrent');
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = t('auth.changePassword.errors.passwordsDoNotMatch');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

<<<<<<< Updated upstream
    setIsLoading(true);
=======
    showConfirm(
      t('auth.changePassword.confirmTitle'),
      t('auth.changePassword.confirmMessage'),
      handleConfirmChangePassword,
      undefined,
      t('auth.changePassword.confirmAction'),
      t('common.cancel')
    );
  };

  const handleConfirmChangePassword = async () => {
>>>>>>> Stashed changes
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

<<<<<<< Updated upstream
      Alert.alert(
        'Password Changed',
        'Your password has been updated successfully. Please use your new password next time you sign in.',
        [{ text: 'OK', onPress: () => navigation?.goBack() }]
      );
    } catch (error) {
      setErrors({ currentPassword: 'Current password is incorrect' });
    } finally {
      setIsLoading(false);
=======
      if (response.success) {
        showSuccess(
          t('auth.changePassword.successTitle'),
          response.message || t('auth.changePassword.successMessage'),
          () => navigation?.goBack()
        );
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || t('auth.changePassword.errors.changeFailed');
      showError(t('common.error'), errorMessage);
>>>>>>> Stashed changes
    }
  };

  const handleBack = () => {
    navigation?.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.card }]}
          onPress={handleBack}
          activeOpacity={0.7}>
          <Icon name="arrow-left" size={ms(24)} color={theme.colors.text} />
        </TouchableOpacity>
        <Text variant="h4" color="primary">
          {t('settings.changePassword')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Card variant="default" style={styles.noticeCard}>
            <View style={styles.noticeContent}>
              <View
                style={[
                  styles.noticeIcon,
                  { backgroundColor: theme.colors.info.background },
                ]}>
                <Icon name="shield-lock-outline" size={ms(24)} color={theme.colors.info.main} />
              </View>
              <View style={styles.noticeText}>
                <Text variant="bodySmall" color="primary" style={{ fontWeight: '600' }}>
                  {t('auth.changePassword.notice.title')}
                </Text>
                <Text variant="caption" color="secondary" style={styles.noticeDescription}>
                  {t('auth.changePassword.notice.description')}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.form}>
            <Input
              label={t('auth.changePassword.currentPassword')}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
              }}
              placeholder={t('auth.changePassword.currentPasswordPlaceholder')}
              leftIcon="lock-outline"
              rightIcon={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowCurrentPassword(!showCurrentPassword)}
              secureTextEntry={!showCurrentPassword}
              error={errors.currentPassword}
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <Input
              ref={newPasswordRef}
              label={t('auth.changePassword.newPassword')}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
              }}
              placeholder={t('auth.changePassword.newPasswordPlaceholder')}
              leftIcon="lock-plus-outline"
              rightIcon={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowNewPassword(!showNewPassword)}
              secureTextEntry={!showNewPassword}
              error={errors.newPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />

            {newPassword.length > 0 && (
              <View style={styles.strengthSection}>
                <View style={styles.strengthHeader}>
                  <Text variant="caption" color="secondary">
                    {t('auth.changePassword.strengthLabel')}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: passwordStrength.color, fontWeight: '600' }}>
                    {passwordStrength.label}
                  </Text>
                </View>
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

                <View style={styles.requirementsList}>
                  {passwordStrength.requirements.map((req, index) => (
                    <View key={index} style={styles.requirementRow}>
                      <Icon
                        name={req.met ? 'check-circle' : 'circle-outline'}
                        size={ms(16)}
                        color={req.met ? theme.colors.success.main : theme.colors.secondary.main}
                      />
                      <Text
                        variant="caption"
                        style={{
                          color: req.met ? theme.colors.success.main : theme.colors.secondary.main,
                          marginLeft: ms(8),
                        }}
                      >
                        {req.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Input
              ref={confirmPasswordRef}
              label={t('auth.changePassword.confirmPassword')}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              placeholder={t('auth.changePassword.confirmPasswordPlaceholder')}
              leftIcon="lock-check-outline"
              rightIcon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
              secureTextEntry={!showConfirmPassword}
              error={errors.confirmPassword}
              returnKeyType="done"
            />

            {confirmPassword.length > 0 && newPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Icon
                  name={newPassword === confirmPassword ? 'check-circle' : 'alert-circle'}
                  size={ms(16)}
                  color={
                    newPassword === confirmPassword
                      ? theme.colors.success.main
                      : theme.colors.error.main
                  }
                />
                <Text
                  variant="caption"
                  style={{
                    color:
                      newPassword === confirmPassword
                        ? theme.colors.success.main
                        : theme.colors.error.main,
                    marginLeft: ms(6),
                  }}>
                  {newPassword === confirmPassword ? t('auth.changePassword.passwordsMatch') : t('auth.changePassword.errors.passwordsDoNotMatch')}
                </Text>
              </View>
            )}
          </View>

          <Button
            title={t('auth.changePassword.updateButton')}
            onPress={handleChangePassword}
            loading={isLoading}
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            size="large"
            style={styles.submitButton}
          />

          <TouchableOpacity
            onPress={() => navigation?.navigate('ForgotPassword')}
            activeOpacity={0.7}
            style={styles.forgotLink}>
            <Text variant="body" style={{ color: theme.colors.primary.main }}>
              Forgot your current password?
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: vs(12),
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(10)
  },
  headerSpacer: {
    width: ms(40),
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: vs(20),
    paddingBottom: vs(32),
  },
  noticeCard: {
    marginBottom: vs(24),
    padding: spacing.md,
  },
  noticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: ms(12),
  },
  noticeText: {
    flex: 1,
  },
  noticeDescription: {
    marginTop: vs(2),
    lineHeight: ms(18),
  },
  form: {
    marginBottom: vs(24),
  },
  divider: {
    height: 1,
    marginVertical: vs(20),
  },
  strengthSection: {
    marginTop: vs(-8),
    marginBottom: vs(16),
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  strengthBars: {
    flexDirection: 'row',
    marginBottom: vs(12),
  },
  strengthBar: {
    flex: 1,
    height: ms(4),
    borderRadius: ms(2),
    marginRight: ms(4),
  },
  requirementsList: {
    paddingLeft: spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(6),
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: vs(-8),
  },
  submitButton: {
    marginBottom: vs(16),
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: vs(8),
  },
});

export default ChangePasswordScreen;
