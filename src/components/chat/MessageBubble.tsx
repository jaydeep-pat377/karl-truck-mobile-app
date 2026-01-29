import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  showDateSeparator?: boolean;
  dateSeparatorText?: string;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  isNewMessage?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  showAvatar = true,
  showSenderName = true,
  showDateSeparator = false,
  dateSeparatorText = '',
  isFirstInGroup = true,
  isLastInGroup = true,
  deliveryStatus = 'sent',
  isNewMessage = false,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const fadeAnim = useRef(new Animated.Value(isNewMessage ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(isNewMessage ? 20 : 0)).current;

  // Animate new messages
  useEffect(() => {
    if (isNewMessage) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNewMessage, fadeAnim, slideAnim]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Unknown' || name === 'User') {
      return '?';
    }
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const getDeliveryIcon = () => {
    switch (deliveryStatus) {
      case 'sending':
        return <Icon name="clock-outline" size={ms(12)} color="rgba(255,255,255,0.5)" />;
      case 'sent':
        return <Icon name="check" size={ms(12)} color="rgba(255,255,255,0.7)" />;
      case 'delivered':
        return <Icon name="check-all" size={ms(12)} color="rgba(255,255,255,0.7)" />;
      case 'read':
        return <Icon name="check-all" size={ms(12)} color={colors.info.main} />;
      default:
        return null;
    }
  };

  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={[styles.systemBadge, { backgroundColor: themeColors.card }]}>
          <Text variant="caption" color="hint" style={styles.systemText}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  // Display name with (you) indicator for own messages
  const displayName = isOwnMessage
    ? `${message.sender_name} (you)`
    : message.sender_name;

  // Determine bubble border radius based on grouping
  const getBubbleStyle = () => {
    const baseRadius = ms(18);
    const smallRadius = ms(4);

    if (isOwnMessage) {
      return {
        borderTopLeftRadius: baseRadius,
        borderTopRightRadius: isFirstInGroup ? baseRadius : smallRadius,
        borderBottomLeftRadius: baseRadius,
        borderBottomRightRadius: isLastInGroup ? baseRadius : smallRadius,
      };
    } else {
      return {
        borderTopLeftRadius: isFirstInGroup ? baseRadius : smallRadius,
        borderTopRightRadius: baseRadius,
        borderBottomLeftRadius: isLastInGroup ? baseRadius : smallRadius,
        borderBottomRightRadius: baseRadius,
      };
    }
  };

  return (
    <>
      {/* Date Separator */}
      {showDateSeparator && (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparatorLine, { backgroundColor: themeColors.border }]} />
          <View style={[styles.dateSeparatorBadge, { backgroundColor: themeColors.card }]}>
            <Text variant="captionSmall" color="hint" style={styles.dateSeparatorText}>
              {dateSeparatorText}
            </Text>
          </View>
          <View style={[styles.dateSeparatorLine, { backgroundColor: themeColors.border }]} />
        </View>
      )}

      <Animated.View
        style={[
          styles.container,
          isOwnMessage ? styles.ownContainer : styles.otherContainer,
          !isLastInGroup && styles.groupedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Avatar for other users (left side) - only show for last message in group */}
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            {isLastInGroup ? (
              <View style={[styles.avatar, { backgroundColor: colors.secondary.main }]}>
                <Text style={styles.avatarText}>{getInitials(message.sender_name)}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}

        <View style={[
          styles.messageWrapper,
          isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper,
        ]}>
          {/* Sender name - only show for first message in group */}
          {isFirstInGroup && (
            <Text
              variant="captionSmall"
              style={[
                styles.senderName,
                {
                  color: isOwnMessage ? colors.primary.light : colors.primary.main,
                  textAlign: isOwnMessage ? 'right' : 'left',
                },
              ]}
            >
              {displayName}
            </Text>
          )}

          <View
            style={[
              styles.bubble,
              isOwnMessage
                ? [{ backgroundColor: colors.primary.main }, styles.ownBubbleAlign]
                : [{ backgroundColor: themeColors.card }, styles.otherBubbleAlign],
              getBubbleStyle(),
            ]}
          >
            <Text
              variant="body"
              style={[
                styles.content,
                { color: isOwnMessage ? colors.common.white : themeColors.text.primary },
              ]}
            >
              {message.content}
            </Text>

            <View style={styles.metaContainer}>
              <Text
                variant="captionSmall"
                style={[
                  styles.time,
                  {
                    color: isOwnMessage
                      ? 'rgba(255,255,255,0.7)'
                      : themeColors.text.hint,
                  },
                ]}
              >
                {formatTime(message.created_at)}
              </Text>
              {isOwnMessage && (
                <View style={styles.deliveryStatus}>
                  {getDeliveryIcon()}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Avatar for own messages (right side) - only show for last message in group */}
        {isOwnMessage && (
          <View style={styles.avatarContainer}>
            {isLastInGroup ? (
              <View style={[styles.avatar, { backgroundColor: colors.primary.main }]}>
                <Text style={styles.avatarText}>{getInitials(message.sender_name)}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>
        )}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  groupedContainer: {
    marginBottom: ms(2),
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
    justifyContent: 'flex-start',
  },
  messageWrapper: {
    maxWidth: '75%',
    flexShrink: 1,
  },
  ownMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: ms(36),
    alignItems: 'center',
  },
  avatar: {
    width: ms(32),
    height: ms(32),
    borderRadius: ms(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: ms(32),
    height: ms(32),
  },
  avatarText: {
    color: colors.common.white,
    fontSize: ms(11),
    fontWeight: '600',
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ownBubbleAlign: {
    alignSelf: 'flex-end',
  },
  otherBubbleAlign: {
    alignSelf: 'flex-start',
  },
  senderName: {
    fontWeight: '600',
    marginBottom: ms(4),
    fontSize: ms(12),
    paddingHorizontal: ms(4),
  },
  content: {
    fontSize: ms(15),
    lineHeight: ms(20),
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: ms(4),
    gap: ms(4),
  },
  time: {
    fontSize: ms(11),
  },
  deliveryStatus: {
    marginLeft: ms(2),
  },
  systemContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  systemBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: ms(12),
  },
  systemText: {
    textAlign: 'center',
    fontSize: ms(12),
  },
  dateSeparatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
  },
  dateSeparatorBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: ms(12),
    marginHorizontal: spacing.sm,
  },
  dateSeparatorText: {
    fontSize: ms(11),
    fontWeight: '500',
  },
});

export default MessageBubble;
