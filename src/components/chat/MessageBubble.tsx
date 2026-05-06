import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, Animated, Image, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Icon } from '../common';
import { colors } from '../../theme/colors';
import { ms, spacing } from '../../utils/responsive';
import { Message } from '../../types/chat';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BUBBLE_COLORS = {
  sent: {
    light: colors.chat.light.sentBubble,
    dark: colors.chat.dark.sentBubble,
  },
  received: {
    light: colors.chat.light.receivedBubble,
    dark: colors.chat.dark.receivedBubble,
  },
};

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|bmp)($|\?)/i;

interface Attachment {
  url?: string;
  type?: string;
  name?: string;
  file_url?: string;
  image_url?: string;
  path?: string;
}

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name: string) => {
  if (!name || name === 'Unknown' || name === 'User') return '?';
  return name.split(' ').map((n) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
};

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

const BUBBLE_RADIUS = ms(16);
const BUBBLE_RADIUS_SMALL = ms(4);

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
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
  const fadeAnim = useRef(new Animated.Value(isNewMessage ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(isNewMessage ? 0.8 : 1)).current;
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Set<string>>(new Set());

  const bubbleColor = isOwnMessage
    ? (isDark ? BUBBLE_COLORS.sent.dark : BUBBLE_COLORS.sent.light)
    : (isDark ? BUBBLE_COLORS.received.dark : BUBBLE_COLORS.received.light);

  const textColor = isDark ? colors.chat.dark.textPrimary : colors.chat.light.textPrimary;
  const timeColor = isDark ? colors.chat.dark.timeText : colors.chat.light.timeText;

  const audioInfo = useMemo((): { url: string; duration: number } | null => {
    if (message.message_type !== 'audio' || !message.attachments || !Array.isArray(message.attachments)) {
      return null;
    }
    const attachment = message.attachments[0] as any;
    if (!attachment) return null;
    const url = attachment.url || attachment.file_url || attachment.path || '';
    const duration = attachment.duration || 0;
    if (!url) return null;
    return { url, duration };
  }, [message.message_type, message.attachments]);

  const imageUrls = useMemo((): string[] => {
    if (message.message_type === 'audio') return [];
    if (!message.attachments || !Array.isArray(message.attachments)) {
      return [];
    }
    return message.attachments
      .map((attachment: Attachment | string) => {
        if (typeof attachment === 'string') return attachment;
        return attachment.url || attachment.file_url || attachment.image_url || attachment.path || null;
      })
      .filter((url): url is string => {
        if (!url) return false;
        return IMAGE_REGEX.test(url) ||
          url.includes('/storage/') || url.includes('supabase') || message.message_type === 'image';
      });
  }, [message.message_type, message.attachments]);

  useEffect(() => {
    if (isNewMessage) {
      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isNewMessage, fadeAnim, scaleAnim]);

  const closeModal = useCallback(() => setSelectedImage(null), []);

  const bubbleRadius = useMemo(() => ({
    borderTopLeftRadius: BUBBLE_RADIUS,
    borderTopRightRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: isLastInGroup ? BUBBLE_RADIUS_SMALL : BUBBLE_RADIUS,
    borderBottomRightRadius: BUBBLE_RADIUS,
  }), [isLastInGroup]);

  const avatarBg = isOwnMessage ? colors.primary.main : colors.secondary.main;
  const senderColor = isOwnMessage ? colors.primary.main : colors.secondary.main;
  const initials = getInitials(message.sender_name);
  const formattedTime = formatTime(message.created_at);

  if (message.message_type === 'system') {
    return (
      <View style={styles.systemContainer}>
        <View style={[styles.systemBadge, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.chat.light.inputBg }]}>
          <Text style={[styles.systemText, { color: isDark ? colors.text.lightMuted : colors.semiTransparent.black50 }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      {showDateSeparator && (
        <View style={styles.dateSeparatorContainer}>
          <View style={[styles.dateSeparatorBadge, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.chat.light.inputBg }]}>
            <Text style={[styles.dateSeparatorText, { color: isDark ? colors.headerOverlay.textBright : colors.semiTransparent.black50 }]}>
              {dateSeparatorText}
            </Text>
          </View>
        </View>
      )}

      <Animated.View
        style={[
          styles.container,
          !isLastInGroup && styles.groupedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isFirstInGroup && showSenderName && (
          <View style={[styles.senderNameRow, styles.senderNameRowLeft]}>
            <Text style={[
              styles.senderName,
              { color: senderColor },
            ]}>
              {isOwnMessage ? `${message.sender_name} (you)` : message.sender_name}
            </Text>
          </View>
        )}

        <View style={[styles.messageRow, styles.messageRowLeft]}>
          <View style={styles.avatarContainer}>
            {isLastInGroup ? (
              <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </View>

          <View style={styles.bubbleWrapper}>
            <View style={[styles.bubble, { backgroundColor: bubbleColor }, bubbleRadius]}>
              {imageUrls.length > 0 && (
                <View style={styles.imagesContainer}>
                  {imageUrls.map((imageUrl, index) => (
                    <TouchableOpacity
                      key={`${imageUrl}-${index}`}
                      onPress={() => setSelectedImage(imageUrl)}
                      activeOpacity={0.9}
                    >
                      {imageError.has(imageUrl) ? (
                        <View style={[styles.imageError, { backgroundColor: isDark ? colors.chat.dark.inputBg : colors.semiTransparent.black05 }]}>
                          <Icon name="image-off-outline" size={ms(28)} color={timeColor} />
                        </View>
                      ) : (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.messageImage}
                          resizeMode="cover"
                          onError={() => setImageError(prev => new Set(prev).add(imageUrl))}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {audioInfo && (
                <VoiceMessagePlayer
                  audioUrl={audioInfo.url}
                  duration={audioInfo.duration}
                  isOwnMessage={isOwnMessage}
                />
              )}

              {message.content && message.content.trim().length > 0 && (
                <Text style={[styles.content, { color: textColor }, imageUrls.length > 0 && styles.contentWithImage]}>
                  {message.content}
                </Text>
              )}

              <View style={styles.metaRow}>
                <Text style={[styles.time, { color: timeColor }]}>
                  {formattedTime}
                </Text>
                {isOwnMessage && deliveryStatus === 'sending' && (
                  <View style={styles.statusIcon}>
                    <Icon name="clock-outline" size={ms(14)} color={timeColor} />
                  </View>
                )}
                {isOwnMessage && deliveryStatus === 'sent' && (
                  <View style={styles.statusIcon}>
                    <Icon name="check" size={ms(14)} color={timeColor} />
                  </View>
                )}
                {isOwnMessage && (deliveryStatus === 'delivered' || deliveryStatus === 'read') && (
                  <View style={styles.statusIcon}>
                    <Icon name="check-all" size={ms(14)} color={deliveryStatus === 'read' ? colors.chat.readTick : timeColor} />
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Animated.View>

      {selectedImage && (
        <Modal visible transparent animationType="fade" onRequestClose={closeModal}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalClose} onPress={closeModal}>
              <View style={styles.modalCloseBtn}>
                <Icon name="close" size={ms(24)} color={colors.common.white} />
              </View>
            </TouchableOpacity>
            <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    marginBottom: ms(16),
    width: '100%',
    alignItems: 'flex-start',
  },
  groupedContainer: {
    marginBottom: ms(4),
  },
  senderNameRow: {
    flexDirection: 'row',
    marginBottom: ms(2),
    paddingHorizontal: spacing.sm,
  },
  senderNameRowLeft: {
    justifyContent: 'flex-start',
    paddingLeft: ms(38) + spacing.sm,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: ms(32),
    marginRight: ms(6),
  },
  avatar: {
    width: ms(28),
    height: ms(28),
    borderRadius: ms(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: ms(28),
    height: ms(28),
  },
  avatarText: {
    color: colors.common.white,
    fontSize: ms(11),
    fontWeight: '600',
  },
  bubbleWrapper: {
    maxWidth: '75%',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: ms(12),
    fontWeight: '600',
    textAlign: 'left',
  },
  bubble: {
    paddingHorizontal: ms(6),
    paddingTop: ms(6),
    paddingBottom: ms(2),
    minWidth: ms(70),
    ...Platform.select({
      ios: {
        shadowColor: colors.common.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  content: {
    fontSize: ms(15),
    lineHeight: ms(20),
    letterSpacing: -0.1,
  },
  contentWithImage: {
    marginTop: ms(6),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: ms(3),
    gap: ms(4),
  },
  time: {
    fontSize: ms(11),
    fontWeight: '400',
  },
  statusIcon: {
    marginLeft: ms(2),
  },

  imagesContainer: {
    marginBottom: ms(4),
    gap: ms(4),
  },
  messageImage: {
    width: ms(240),
    height: ms(180),
    borderRadius: ms(10),
    backgroundColor: colors.semiTransparent.black10,
  },
  imageError: {
    width: ms(240),
    height: ms(120),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  systemContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  systemBadge: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: ms(18),
  },
  systemText: {
    fontSize: ms(12),
    fontWeight: '500',
  },

  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dateSeparatorBadge: {
    paddingHorizontal: ms(14),
    paddingVertical: ms(6),
    borderRadius: ms(18),
  },
  dateSeparatorText: {
    fontSize: ms(12),
    fontWeight: '600',
  },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.semiTransparent.black95,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: ms(50),
    right: ms(16),
    zIndex: 10,
  },
  modalCloseBtn: {
    width: ms(44),
    height: ms(44),
    borderRadius: ms(22),
    backgroundColor: colors.semiTransparent.white20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});

export default MessageBubble;
