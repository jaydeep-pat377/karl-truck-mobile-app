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
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Input, Button, Card, Icon, AlertModal } from '../../components/common';
import { ms, vs, spacing } from '../../utils/responsive';
import { useAlert, useChangePassword } from '../../hooks';

interface ChangePasswordScreenProps {
  navigation?: any;
}

export const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({
  navigation,
}) => {
  const { theme, isDark } = useTheme();
  const { alertState, hideAlert, showSuccess, showError, showConfirm } = useAlert();
  const { changePassword, isLoading } = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      { met: pwd.length >= 8, text: 'At least 8 characters' },
      { met: /[a-z]/.test(pwd), text: 'One lowercase letter' },
      { met: /[A-Z]/.test(pwd), text: 'One uppercase letter' },
      { met: /\d/.test(pwd), text: 'One number' },
      { met: /[!@#$%^&*(),.?":{}|<>]/.test(pwd), text: 'One special character' },
    ];

    const metCount = requirements.filter(r => r.met).length;

    if (metCount <= 2) return { level: 1, label: 'Weak', color: theme.colors.error.main, requirements };
    if (metCount === 3) return { level: 2, label: 'Fair', color: theme.colors.warning.main, requirements };
    if (metCount === 4) return { level: 3, label: 'Good', color: theme.colors.info.main, requirements };
    return { level: 4, label: 'Strong', color: theme.colors.success.main, requirements };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (passwordStrength.level < 3) {
      newErrors.newPassword = 'Please create a stronger password';
    }

    if (newPassword === currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = () => {
    if (!validateForm()) return;

    showConfirm(
      'Change Password',
      'Are you sure you want to change your password? You will need to use your new password for future sign-ins.',
      handleConfirmChangePassword,
      undefined,
      'Yes, Change',
      'Cancel'
    );
  };

  const handleConfirmChangePassword = async () => {
    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (response.success) {
        showSuccess(
          'Password Changed',
          response.message || 'Your password has been updated successfully. Please use your new password next time you sign in.',
          () => navigation?.goBack()
        );
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to change password';
      showError('Error', errorMessage);
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
          Change Password
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
                  Keep your account secure
                </Text>
                <Text variant="caption" color="secondary" style={styles.noticeDescription}>
                  Choose a strong password that you don't use for other accounts.
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.form}>
            <Input
              label="Current Password"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
              }}
              placeholder="Enter current password"
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
              label="New Password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
              }}
              placeholder="Create new password"
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
                    Password Strength:
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
                        }}>
                        {req.text}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <Input
              ref={confirmPasswordRef}
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              placeholder="Confirm new password"
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
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          <Button
            title="Update Password"
            onPress={handleChangePassword}
            loading={isLoading}
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
            size="large"
            style={styles.submitButton}
          />

        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
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
