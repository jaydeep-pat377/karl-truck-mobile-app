import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BaseToastProps } from 'react-native-toast-message';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { useTheme } from '../../contexts/ThemeContext';

const TOAST_ICON_MAP: Record<string, { name: string; bg: string; icon: string }> = {
  error: { name: 'alert-circle', bg: colors.error.main, icon: colors.common.white },
  success: { name: 'check-circle', bg: colors.success.main, icon: colors.common.white },
  info: { name: 'information', bg: colors.info.main, icon: colors.common.white },
  warning: { name: 'alert', bg: colors.warning.main, icon: colors.common.white },
};

const ToastContent: React.FC<BaseToastProps & { toastType: string }> = ({
  text1,
  text2,
  toastType,
}) => {
  const { isDark } = useTheme();
  const iconConfig = TOAST_ICON_MAP[toastType] || TOAST_ICON_MAP.error;

  const cardBg = isDark ? colors.dark.card : colors.common.white;
  const borderColor = isDark ? colors.dark.border : colors.grey[10];
  const titleColor = isDark ? colors.dark.text.primary : colors.light.text.primary;
  const messageColor = isDark ? colors.dark.text.secondary : colors.light.text.secondary;

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }]}>
      <View style={[styles.accentBar, { backgroundColor: iconConfig.bg }]} />
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
        <Icon name={iconConfig.name} size={ms(18)} color={iconConfig.icon} />
      </View>
      <View style={styles.textContainer}>
        {text1 ? (
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text style={[styles.message, { color: messageColor }]} numberOfLines={2}>
            {text2}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

export const toastConfig = {
  error: (props: BaseToastProps) => <ToastContent {...props} toastType="error" />,
  success: (props: BaseToastProps) => <ToastContent {...props} toastType="success" />,
  info: (props: BaseToastProps) => <ToastContent {...props} toastType="info" />,
  warning: (props: BaseToastProps) => <ToastContent {...props} toastType="warning" />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '92%',
    minHeight: ms(60),
    borderRadius: ms(12),
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: ms(4),
    borderTopLeftRadius: ms(12),
    borderBottomLeftRadius: ms(12),
  },
  iconContainer: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: ms(14),
  },
  textContainer: {
    flex: 1,
    paddingVertical: ms(12),
    paddingHorizontal: ms(10),
    paddingRight: ms(14),
  },
  title: {
    fontSize: ms(14),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: ms(12),
    fontWeight: '400',
    lineHeight: ms(17),
    marginTop: ms(2),
  },
});

export default toastConfig;
