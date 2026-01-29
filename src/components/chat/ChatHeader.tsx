import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onInfo?: () => void;
  isOnline?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onInfo,
  isOnline,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Determine if subtitle indicates online status
  const isOnlineStatus = subtitle === 'Online';
  const isConnecting = subtitle === 'Connecting...';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.background,
          borderBottomColor: themeColors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Icon name="arrow-left" size={ms(24)} color={themeColors.text.primary} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <View style={styles.titleRow}>
          <Text
            variant="h4"
            style={[styles.title, { color: themeColors.text.primary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
        {subtitle && (
          <View style={styles.subtitleRow}>
            {isOnlineStatus && (
              <View style={[styles.statusDot, styles.onlineDot]} />
            )}
            {isConnecting && (
              <View style={[styles.statusDot, styles.connectingDot]} />
            )}
            <Text
              variant="caption"
              style={[
                styles.subtitle,
                {
                  color: isOnlineStatus
                    ? colors.success.main
                    : isConnecting
                    ? colors.warning.main
                    : themeColors.text.hint,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          </View>
        )}
      </View>

      {onInfo ? (
        <TouchableOpacity
          style={styles.infoButton}
          onPress={onInfo}
          activeOpacity={0.7}
        >
          <Icon
            name="information-outline"
            size={ms(24)}
            color={themeColors.text.primary}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.infoButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
  },
  statusDot: {
    width: ms(8),
    height: ms(8),
    borderRadius: ms(4),
    marginRight: ms(6),
  },
  onlineDot: {
    backgroundColor: colors.success.main,
  },
  connectingDot: {
    backgroundColor: colors.warning.main,
  },
  subtitle: {
    fontSize: ms(12),
  },
  infoButton: {
    width: ms(40),
    height: ms(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatHeader;
