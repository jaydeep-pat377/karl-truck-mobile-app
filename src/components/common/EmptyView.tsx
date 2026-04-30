import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { fontFamily } from '../../theme/typography';
import { ms, vs } from '../../utils/responsive';
import Text from './Text';
import Icon from './Icon';

export interface EmptyViewProps {

  icon?: string;
  iconSize?: number;
  iconColor?: string;

  title?: string;
  subtitle?: string;

  actionLabel?: string;
  onAction?: () => void;

  compact?: boolean;
  style?: object;
}

export const EmptyViewPresets = {
  orders: {
    icon: 'clipboard-text-outline',
    titleKey: 'emptyView.orders.title',
    subtitleKey: 'emptyView.orders.subtitle',
  },
  tickets: {
    icon: 'ticket-outline',
    titleKey: 'emptyView.tickets.title',
    subtitleKey: 'emptyView.tickets.subtitle',
  },
  notifications: {
    icon: 'bell-outline',
    titleKey: 'emptyView.notifications.title',
    subtitleKey: 'emptyView.notifications.subtitle',
  },
  trucks: {
    icon: 'truck-alert',
    titleKey: 'emptyView.trucks.title',
    subtitleKey: 'emptyView.trucks.subtitle',
  },
  search: {
    icon: 'magnify',
    titleKey: 'emptyView.search.title',
    subtitleKey: 'emptyView.search.subtitle',
  },
  data: {
    icon: 'database-off-outline',
    titleKey: 'emptyView.data.title',
    subtitleKey: 'emptyView.data.subtitle',
  },
  network: {
    icon: 'wifi-off',
    titleKey: 'emptyView.network.title',
    subtitleKey: 'emptyView.network.subtitle',
  },
  error: {
    icon: 'alert-circle-outline',
    titleKey: 'emptyView.error.title',
    subtitleKey: 'emptyView.error.subtitle',
  },
} as const;

export type EmptyViewPresetKey = keyof typeof EmptyViewPresets;

interface EmptyViewWithPresetProps extends Omit<EmptyViewProps, 'icon' | 'title' | 'subtitle'> {
  preset: EmptyViewPresetKey;

  title?: string;
  subtitle?: string;
  icon?: string;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  icon = 'inbox-outline',
  iconSize,
  iconColor,
  title,
  subtitle,
  actionLabel,
  onAction,
  compact = false,
  style,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('common.noData');

  const defaultIconSize = compact ? ms(48) : ms(64);
  const finalIconColor = iconColor || themeColors.text.hint;

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View style={[styles.iconContainer, { backgroundColor: finalIconColor + '10' }]}>
        <Icon
          name={icon}
          size={iconSize || defaultIconSize}
          color={finalIconColor}
        />
      </View>
      <Text
        variant={compact ? 'body' : 'h3'}
        style={[
          styles.title,
          compact && styles.titleCompact,
          { color: themeColors.text.primary },
        ]}>
        {resolvedTitle}
      </Text>
      {subtitle && (
        <Text
          variant={compact ? 'caption' : 'body'}
          style={[
            styles.subtitle,
            compact && styles.subtitleCompact,
            { color: themeColors.text.secondary },
          ]}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary.main }]}
          onPress={onAction}
          activeOpacity={0.7}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const EmptyViewWithPreset: React.FC<EmptyViewWithPresetProps> = ({
  preset,
  title,
  subtitle,
  icon,
  ...props
}) => {
  const presetConfig = EmptyViewPresets[preset];
  const { t } = useTranslation();

  return (
    <EmptyView
      icon={icon || presetConfig.icon}
      title={title || t(presetConfig.titleKey)}
      subtitle={subtitle || t(presetConfig.subtitleKey)}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(32),
    paddingVertical: vs(48),
    minHeight: vs(300),
  },
  containerCompact: {
    paddingVertical: vs(24),
    minHeight: vs(150),
  },
  iconContainer: {
    width: ms(100),
    height: ms(100),
    borderRadius: ms(50),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(16),
  },
  title: {
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
    marginBottom: vs(8),
  },
  titleCompact: {
    marginBottom: vs(4),
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: ms(22),
    maxWidth: ms(280),
  },
  subtitleCompact: {
    maxWidth: ms(240),
  },
  actionButton: {
    marginTop: vs(24),
    paddingHorizontal: ms(24),
    paddingVertical: vs(12),
    borderRadius: ms(8),
  },
  actionButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: ms(14),
    color: colors.common.white,
  },
});

export default EmptyView;
