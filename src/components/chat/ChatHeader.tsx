import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onInfo?: () => void;
  orderCode?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  subtitle,
  onBack,
  onInfo,
  orderCode,
}) => {
  const { isDark } = useTheme();

  const isOnline = subtitle === 'Online';
  const isConnecting = subtitle === 'Connecting...';

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
    <LinearGradient
      colors={isDark ? ['#1a1a2e', '#16213e'] : [colors.primary.main, colors.primary.dark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Icon name="arrow-left" size={ms(22)} color={colors.common.white} />
      </TouchableOpacity>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={['#ffffff40', '#ffffff20']}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{getInitials(title)}</Text>
        </LinearGradient>
        {isOnline && (
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
          </View>
        )}
      </View>

      {/* Title Info */}
      <TouchableOpacity
        style={styles.titleContainer}
        onPress={onInfo}
        activeOpacity={onInfo ? 0.7 : 1}
        disabled={!onInfo}
      >
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subtitleRow}>
          {isConnecting && (
            <Icon name="loading" size={ms(12)} color="rgba(255,255,255,0.7)" />
          )}
          <Text style={[
            styles.subtitle,
            isOnline && styles.subtitleOnline,
          ]}>
            {subtitle || (orderCode ? `Order #${orderCode}` : 'Chat')}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onInfo}
          activeOpacity={0.7}
        >
          <Icon name="phone-outline" size={ms(20)} color={colors.common.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onInfo}
          activeOpacity={0.7}
        >
          <Icon name="dots-vertical" size={ms(20)} color={colors.common.white} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.md,
  },
  backButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  avatarContainer: {
    marginLeft: spacing.sm,
    position: 'relative',
  },
  avatar: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: {
    color: colors.common.white,
    fontSize: ms(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: ms(16),
    height: ms(16),
    borderRadius: ms(8),
    backgroundColor: colors.common.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: ms(10),
    height: ms(10),
    borderRadius: ms(5),
    backgroundColor: '#22C55E',
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    justifyContent: 'center',
  },
  title: {
    color: colors.common.white,
    fontSize: ms(17),
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: ms(2),
    gap: ms(4),
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: ms(13),
    fontWeight: '400',
  },
  subtitleOnline: {
    color: '#86EFAC',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
  },
  actionButton: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
});

export default ChatHeader;
