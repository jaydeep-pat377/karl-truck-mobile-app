import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';
import { Icon } from './Icon';
import { ms, vs, spacing } from '../../utils/responsive';
import { colors } from '../../theme/colors';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
  icon?: string;
  showCloseButton?: boolean;
}

const getIconConfig = (type: AlertType, customIcon?: string) => {
  if (customIcon) {
    return { name: customIcon, color: colors.primary.main };
  }

  switch (type) {
    case 'success':
      return { name: 'check-circle', color: colors.success.main };
    case 'error':
      return { name: 'alert-circle', color: colors.error.main };
    case 'warning':
      return { name: 'alert', color: colors.warning.main };
    case 'info':
      return { name: 'information', color: colors.info.main };
    case 'confirm':
      return { name: 'help-circle', color: colors.primary.main };
    default:
      return { name: 'information', color: colors.primary.main };
  }
};

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  icon,
  showCloseButton = false,
}) => {
  const { theme, isDark } = useTheme();
  const iconConfig = getIconConfig(type, icon);

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose?.();
  };

  const getButtonStyle = (style?: AlertButton['style']) => {
    const modalColors = isDark ? colors.modal.dark : colors.modal.light;
    switch (style) {
      case 'destructive':
        return {
          backgroundColor: colors.error.main,
          textColor: colors.common.white,
        };
      case 'cancel':
        return {
          backgroundColor: modalColors.cancelBg,
          textColor: modalColors.cancelText,
          borderColor: modalColors.cancelBorder,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: theme.colors.primary.main,
          textColor: theme.colors.primary.contrast,
        };
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
              {showCloseButton && (
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Icon
                    name="close"
                    size={ms(20)}
                    color={theme.colors.text.secondary}
                  />
                </TouchableOpacity>
              )}

              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: iconConfig.color + '15' },
                ]}
              >
                <Icon
                  name={iconConfig.name}
                  size={ms(32)}
                  color={iconConfig.color}
                />
              </View>

              <Text
                variant="h4"
                color="primary"
                style={styles.title}
              >
                {title}
              </Text>

              {message && (
                <Text
                  variant="body"
                  color="secondary"
                  style={styles.message}
                >
                  {message}
                </Text>
              )}

              <View style={[
                styles.buttonContainer,
                buttons.length > 1 && styles.buttonRow,
              ]}>
                {buttons.map((button, index) => {
                  const buttonStyle = getButtonStyle(button.style);
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        buttons.length > 1 && styles.buttonHalf,
                        {
                          backgroundColor: buttonStyle.backgroundColor,
                          borderColor: buttonStyle.borderColor,
                          borderWidth: buttonStyle.borderWidth || 0,
                        },
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="button"
                        style={{ color: buttonStyle.textColor }}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: ms(16),
    padding: spacing.lg,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: ms(12),
    right: ms(12),
    padding: ms(4),
  },
  iconContainer: {
    width: ms(64),
    height: ms(64),
    borderRadius: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
  },
  title: {
    textAlign: 'center',
    marginBottom: vs(8),
  },
  message: {
    textAlign: 'center',
    marginBottom: vs(24),
    paddingHorizontal: spacing.sm,
    lineHeight: ms(22),
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: ms(12),
  },
  button: {
    paddingVertical: vs(14),
    borderRadius: ms(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(48),
  },
  buttonHalf: {
    flex: 1,
  },
});

export default AlertModal;
