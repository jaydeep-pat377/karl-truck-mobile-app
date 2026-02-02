import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onInfo?: () => void;
  orderCode?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onBack,
  onInfo,
  orderCode,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Icon name="arrow-left" size={ms(20)} color={themeColors.text.primary} />
      </TouchableOpacity>

      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
        <Text style={styles.avatarText}>{getInitials(title)}</Text>
      </View>

      {/* Title Info */}
      <TouchableOpacity
        style={styles.titleContainer}
        onPress={onInfo}
        activeOpacity={onInfo ? 0.7 : 1}
        disabled={!onInfo}
      >
        <Text style={[styles.title, { color: themeColors.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {orderCode && (
          <View style={styles.orderBadge}>
            <Icon name="clipboard-text-outline" size={ms(10)} color={colors.primary.main} />
            <Text style={styles.orderText}>
              #{orderCode}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  avatarText: {
    color: colors.common.white,
    fontSize: ms(15),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    fontSize: ms(16),
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    marginTop: ms(2),
  },
  orderText: {
    color: colors.primary.main,
    fontSize: ms(12),
    fontWeight: '500',
  },
});

export default ChatHeader;
