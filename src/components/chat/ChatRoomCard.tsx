import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { ChatRoom } from '../../types/chat';
import { useTimezoneStore } from '../../store/timezoneStore';
import { formatTimeInTz } from '../../utils/timezone';

interface ChatRoomCardProps {
  room: ChatRoom;
  onPress: () => void;
}

export const ChatRoomCard: React.FC<ChatRoomCardProps> = React.memo(({ room, onPress }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const userTzIana = useTimezoneStore((s) => s.timezone.iana_code);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      // 12hr in user's selected timezone, no TZ chip
      return formatTimeInTz(date, userTzIana, false, false);
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: themeColors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
        {room.avatar_url ? (
          <Icon name="account-group" size={ms(24)} color={colors.common.white} />
        ) : (
          <Text variant="body" color="white" style={styles.avatarText}>
            {getInitials(room.name)}
          </Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            variant="body"
            style={[styles.name, { color: themeColors.text.primary }]}
            numberOfLines={1}
          >
            {room.name}
          </Text>
          <Text variant="caption" color="hint">
            {formatTime(room.last_message_at)}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text
            variant="caption"
            color="secondary"
            style={styles.preview}
            numberOfLines={1}
          >
            {room.last_message_preview || 'No messages yet'}
          </Text>
          {room.unread_count && room.unread_count > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.primary.main }]}>
              <Text style={styles.badgeText}>
                {room.unread_count > 99 ? '99+' : room.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Icon name="chevron-right" size={ms(20)} color={themeColors.text.hint} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: ms(12),
  },
  avatar: {
    width: ms(48),
    height: ms(48),
    borderRadius: ms(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ms(4),
  },
  name: {
    flex: 1,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    minWidth: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: ms(6),
  },
  badgeText: {
    color: colors.common.white,
    fontSize: ms(11),
    fontWeight: '700',
  },
});

export default ChatRoomCard;
