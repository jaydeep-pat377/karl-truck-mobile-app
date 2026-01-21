import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { ms, vs, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';

interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const { theme, isDark } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={isLoading ? undefined : onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: colors.error.main + '15' }]}>
                <Icon name="logout" size={ms(26)} color={colors.error.main} />
              </View>

              {/* Title */}
              <Text variant="h3" color="primary" style={styles.title}>
                {t('auth.logout') || 'Sign Out'}
              </Text>

              {/* Message */}
              <Text variant="body" color="secondary" style={styles.message}>
                {t('auth.logoutConfirm') || 'Are you sure you want to sign out of your account?'}
              </Text>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { backgroundColor: isDark ? theme.colors.surface : colors.grey[5] },
                  ]}
                  onPress={onClose}
                  activeOpacity={0.7}
                  disabled={isLoading}>
                  <Text variant="button" style={{ color: theme.colors.text.primary }}>
                    {t('common.cancel') || 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.logoutButton,
                    { backgroundColor: colors.error.main },
                    isLoading && styles.buttonDisabled,
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.7}
                  disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.common.white} />
                  ) : (
                    <>
                      <Icon name="logout" size={ms(18)} color={colors.common.white} style={styles.buttonIcon} />
                      <Text variant="button" style={{ color: colors.common.white }}>
                        {t('auth.logout') || 'Sign Out'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: ms(320),
    borderRadius: ms(16),
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.common.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconContainer: {
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  title: {
    marginBottom: vs(4),
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: vs(16),
    lineHeight: ms(20),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: ms(10),
    width: '100%',
  },
  button: {
    flex: 1,
    height: ms(44),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelButton: {},
  logoutButton: {},
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: ms(6),
  },
});

export default LogoutModal;
